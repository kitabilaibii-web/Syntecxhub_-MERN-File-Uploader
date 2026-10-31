const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

let gfsBucket;
router.use(authMiddleware);

// ==========================================
// INITIALIZE GRIDFS
// ==========================================

mongoose.connection.once("open", () => {
    gfsBucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: "uploads"
    });

    console.log("Upload routes: GridFS initialized!");
});

// ==========================================
// MULTER CONFIGURATION
// ==========================================

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            return cb(null, true);
        }

        const error = new Error(
            "Only JPG, PNG, WEBP and PDF files are allowed."
        );

        error.status = 400;
        cb(error);
    }
});

// ==========================================
// CHECK GRIDFS
// ==========================================

function checkGridFS(req, res, next) {
    if (!gfsBucket) {
        return res.status(503).json({
            success: false,
            message: "File storage is not ready. Please try again."
        });
    }

    next();
}

// ==========================================
// 1. UPLOAD FILE
// POST /api/files/upload
// ==========================================

router.post(
    "/upload",
    (req, res, next) => {
        upload.single("file")(req, res, (error) => {
            if (error) {
                return next(error);
            }

            next();
        });
    },
    checkGridFS,
    (req, res, next) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a file to upload."
            });
        }

      
const uploadStream = gfsBucket.openUploadStream(
    req.file.originalname,
    {
        contentType: req.file.mimetype,
        metadata: {
            uploadedAt: new Date(),
            userId: req.user.userId
        }
    }
);


        uploadStream.on("error", next);

        uploadStream.on("finish", () => {
            res.status(201).json({
                success: true,
                message: "File uploaded successfully!",
                file: {
                    id: uploadStream.id,
                    filename: uploadStream.filename,
                    contentType: req.file.mimetype,
                    size: req.file.size,
                    url: `/api/files/${uploadStream.id}`
                }
            });
        });

        uploadStream.end(req.file.buffer);
    }
);

// ==========================================
// 2. GET ALL FILES
// GET /api/files
// ==========================================

router.get("/", checkGridFS, async (req, res, next) => {
    try {
       
const files = await mongoose.connection.db
    .collection("uploads.files")
    .find({
        "metadata.userId": req.user.userId
    })
    .sort({ uploadDate: -1 })
    .toArray();


        res.status(200).json({
            success: true,
            count: files.length,
            files: files.map((file) => ({
                id: file._id,
                filename: file.filename,
                contentType:
    file.contentType ||
    file.metadata?.contentType ||
    (
        /\.png$/i.test(file.filename)
            ? "image/png"
            : /\.(jpg|jpeg)$/i.test(file.filename)
            ? "image/jpeg"
            : /\.webp$/i.test(file.filename)
            ? "image/webp"
            : /\.pdf$/i.test(file.filename)
            ? "application/pdf"
            : "application/octet-stream"
    ),
                size: file.length,
                uploadDate: file.uploadDate,
                url: `/api/files/${file._id}`
            }))
        });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// 3. VIEW / RETRIEVE FILE BY ID
// GET /api/files/:id
// ==========================================

router.get("/:id", checkGridFS, async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid file ID."
            });
        }

        const fileId = new mongoose.Types.ObjectId(
            req.params.id
        );

      const file = await mongoose.connection.db
    .collection("uploads.files")
    .findOne({
        _id: fileId,
        "metadata.userId": req.user.userId
    });

        if (!file) {
            return res.status(404).json({
                success: false,
                message: "File not found."
            });
        }

        res.setHeader(
            "Content-Type",
            file.contentType || "application/octet-stream"
        );

        // Ask the browser to display supported files inline.
        res.setHeader(
    "Content-Disposition",
    `inline; filename="${file.filename.replace(/["\\]/g, "_")}"`
);

        const downloadStream =
            gfsBucket.openDownloadStream(fileId);

        downloadStream.on("error", (error) => {
            console.error("GridFS download error:", error.message);

            if (!res.headersSent) {
                next(error);
            } else {
                res.destroy(error);
            }
        });

        downloadStream.pipe(res);
    } catch (error) {
        next(error);
    }
});

// ==========================================
// 4. DELETE FILE BY ID
// DELETE /api/files/:id
// ==========================================

router.delete("/:id", checkGridFS, async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid file ID."
            });
        }

        const fileId = new mongoose.Types.ObjectId(
            req.params.id
        );
const file = await mongoose.connection.db
    .collection("uploads.files")
    .findOne({
        _id: fileId,
        "metadata.userId": req.user.userId
    });

        if (!file) {
            return res.status(404).json({
                success: false,
                message: "File not found."
            });
        }

        await gfsBucket.delete(fileId);

        res.status(200).json({
            success: true,
            message: "File deleted successfully!"
        });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// 5. ERROR HANDLING
// ==========================================

router.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    console.error("File API Error:", error.message);

    const status = error.status ||
        (error instanceof multer.MulterError ? 400 : 500);

    res.status(status).json({
        success: false,
        message: status >= 500
            ? "An unexpected server error occurred."
            : error.message
    });
});

module.exports = router;
