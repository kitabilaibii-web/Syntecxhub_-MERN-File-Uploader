const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const uploadRoutes = require("./routes/uploadRoutes");
const authRoutes = require("./routes/authRoutes");
app.use(cors());
app.use(express.json());
app.use("/api/files", uploadRoutes);
app.use("/api/auth", authRoutes);
let gfsBucket;

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "MERN File Uploader API is running!"
    });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connected successfully!");

        const database = mongoose.connection.db;

        gfsBucket = new mongoose.mongo.GridFSBucket(database, {
            bucketName: "uploads"
        });

        console.log("GridFS initialized successfully!");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}

startServer();
