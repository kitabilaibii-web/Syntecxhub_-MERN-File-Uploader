import { useEffect, useState } from "react";
import ResetPassword from "./ResetPassword";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import "./App.css";
import Auth from "./Auth";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const API_URL = "http://localhost:5000/api/files";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileUrls, setFileUrls] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [authData, setAuthData] = useState(() => {
    try {
      const saved = localStorage.getItem("filevaultAuth");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [fileFilter, setFileFilter] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("home");
  const [darkMode, setDarkMode] = useState(false);

  // ==========================================
  // FILE TYPE AND UPLOAD DATE
  // ==========================================

  const getFileType = (file) => {
    const filename = file.filename || "";

    if (/\.pdf$/i.test(filename)) return "PDF";
    if (/\.png$/i.test(filename)) return "PNG";
    if (/\.jpe?g$/i.test(filename)) return "JPG";
    if (/\.webp$/i.test(filename)) return "WEBP";

    return "Unknown";
  };

  const formatUploadDate = (date) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isImageFile = (file) => {
    return (
      file.contentType?.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp)$/i.test(file.filename || "")
    );
  };

  // ==========================================
  // LOAD ALL FILES
  // ==========================================

  const fetchFiles = async () => {

    if (!authData?.token) return;

    try {
      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${authData.token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Files load nahi ho sakin.");
      }

      setFiles(data.files || []);
      setError("");
    } catch (err) {
      setError(err.message || "Backend check karo: http://localhost:5000");
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    localStorage.removeItem("filevaultAuth");
    setAuthData(null);
    setFiles([]);
    setFileUrls({});
    setSelectedFile(null);
    setMessage("");
    setError("");
    setCurrentPage("home");
  };

  // ==========================================
  // INITIAL LOAD AND DRAG PROTECTION
  // ==========================================

  useEffect(() => {
    const preventFileOpen = (event) => {
      if (event.dataTransfer?.types?.includes("Files")) {
        event.preventDefault();
      }
    };

    window.addEventListener("dragover", preventFileOpen);
    window.addEventListener("drop", preventFileOpen);

    return () => {
      window.removeEventListener("dragover", preventFileOpen);
      window.removeEventListener("drop", preventFileOpen);
    };
  }, []);

  useEffect(() => {
    if (authData?.token) {
      fetchFiles();
    }
  }, [authData?.token]);

  // ==========================================
  // AUTHENTICATED FILE PREVIEWS
  // ==========================================

  useEffect(() => {
    if (!authData?.token || files.length === 0) {
      setFileUrls({});
      return;
    }

    let cancelled = false;
    const createdUrls = [];

    const loadFileUrls = async () => {
      const entries = await Promise.all(
        files.map(async (file) => {
          try {
            const response = await fetch(`${API_URL}/${file.id}`, {
              headers: {
                Authorization: `Bearer ${authData.token}`,
              },
            });

            if (response.status === 401) {
              handleLogout();
              return [file.id, null];
            }

            if (!response.ok) {
              return [file.id, null];
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            createdUrls.push(objectUrl);

            return [file.id, objectUrl];
          } catch {
            return [file.id, null];
          }
        })
      );

      if (!cancelled) {
        setFileUrls(Object.fromEntries(entries));
      }
    };

    loadFileUrls();

    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files, authData?.token]);

  // ==========================================
  // OPEN OR DOWNLOAD FILE WITH AUTH TOKEN
  // ==========================================

  const openFile = async (file, download = false) => {
    if (!authData?.token) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/${file.id}`, {
        headers: {
          Authorization: `Bearer ${authData.token}`,
        },
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error("File open nahi ho saki.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      if (download) {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = file.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      }

      // Give the browser time to open or download the file.
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 60000);
    } catch (err) {
      setError(err.message || "File open nahi ho saki.");
    }
  };

  // ==========================================
  // VALIDATE FILE
  // ==========================================

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setSelectedFile(null);
      setError("Only JPG, PNG, WEBP and PDF files are allowed.");
      setMessage("");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setError("File size must not exceed 5 MB.");
      setMessage("");
      return false;
    }

    setSelectedFile(file);
    setMessage("");
    setError("");

    return true;
  };

  // ==========================================
  // DRAG AND DROP
  // ==========================================

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) validateFile(file);
  };

  // ==========================================
  // SELECT FILE
  // ==========================================

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];

    if (file) validateFile(file);
  };

  // ==========================================
  // UPLOAD FILE
  // ==========================================

  const handleUpload = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!selectedFile) {
      setError("Please select or drop a file first.");
      setMessage("");
      return;
    }

    if (!validateFile(selectedFile)) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authData.token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "File upload failed.");
      }

      setMessage("File uploaded successfully!");
      form.reset();
      setSelectedFile(null);

      await fetchFiles();
    } catch (err) {
      setError(err.message || "File upload nahi ho saki.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // DELETE FILE
  // ==========================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Do you want to delete this file?");

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authData.token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "File deletion failed.");
      }

      setMessage("File deleted successfully!");

      await fetchFiles();
    } catch (err) {
      setError(err.message || "File delete nahi ho saki.");
    }
  };

  // ==========================================
  // SEARCH AND FILTER
  // ==========================================

  const filteredFiles = files.filter((file) => {
    const filename = (file.filename || "").toLowerCase();

    const matchesSearch = filename.includes(
      searchTerm.trim().toLowerCase()
    );

    const matchesFilter =
      fileFilter === "all" ||
      (fileFilter === "images" && isImageFile(file)) ||
      (fileFilter === "pdf" &&
        (file.contentType === "application/pdf" ||
          /\.pdf$/i.test(file.filename || "")));

    return matchesSearch && matchesFilter;
  });

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================

  const totalFiles = files.length;

  const totalImages = files.filter(isImageFile).length;

  const totalPDFs = files.filter(
    (file) =>
      file.contentType === "application/pdf" ||
      /\.pdf$/i.test(file.filename || "")
  ).length;

  const totalStorage = files.reduce(
    (total, file) => total + (Number(file.size) || 0),
    0
  );

  const storageLimit = 100 * 1024 * 1024;

  const storagePercentage = Math.min(
    (totalStorage / storageLimit) * 100,
    100
  );

  const remainingStorage = Math.max(storageLimit - totalStorage, 0);

  // ==========================================
  // CHART DATA
  // ==========================================

  const chartData = {
    labels: ["Images", "PDF Files", "Other Files"],
    datasets: [
      {
        label: "Number of Files",
        data: [
          totalImages,
          totalPDFs,
          Math.max(totalFiles - totalImages - totalPDFs, 0),
        ],
        backgroundColor: ["#8b5cf6", "#14b8a6", "#f59e0b"],
        borderColor: ["#ffffff", "#ffffff", "#ffffff"],
        borderWidth: 3,
      },
    ],
  };

  const barChartData = {
    labels: ["Images", "PDF Files", "Other Files"],
    datasets: [
      {
        label: "Number of Files",
        data: [
          totalImages,
          totalPDFs,
          Math.max(totalFiles - totalImages - totalPDFs, 0),
        ],
        backgroundColor: ["#8b5cf6", "#14b8a6", "#f59e0b"],
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  };

  // ==========================================
  // NAVIGATION
  // ==========================================

  const navigateTo = (page) => {
    setCurrentPage(page);
    setMenuOpen(false);
    setMessage("");
    setError("");
  };
// ==========================================
// RESET PASSWORD PAGE
// ==========================================

if (window.location.pathname === "/reset-password") {
  return <ResetPassword />;
}
  // ==========================================
  // LOGIN SCREEN
  // ==========================================

  if (!authData?.token) {
    return (
      <Auth
        onLogin={(data) => {
          localStorage.setItem("filevaultAuth", JSON.stringify(data));
          setAuthData(data);
        }}
      />
    );
  }

  // ==========================================
  // USER INTERFACE
  // ==========================================

  return (
    <main className={`app ${darkMode ? "dark-mode" : ""}`}>
      <header className="topbar">
        <a
          className="brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            navigateTo("home");
          }}
        >
          <span className="brand-icon">F</span>
          FileVault
        </a>

        <div className="navbar-right">
          <span className="status">
            <span className="status-dot"></span>
            MERN File Storage
          </span>

          <button
            type="button"
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={darkMode ? "Light Mode" : "Dark Mode"}
          >
            {darkMode ? "☀️" : "🌙"}
            <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <button
            type="button"
            className="theme-toggle"
            onClick={handleLogout}
            title="Log out"
          >
            ↪ <span>Logout</span>
          </button>

          <div className="menu-container">
            <button
              type="button"
              className="hamburger-button"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

            {menuOpen && (
              <div className="dropdown-menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => navigateTo("dashboard")}
                >
                  <span>▦</span> Dashboard
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => navigateTo("home")}
                >
                  <span>⌂</span> Home
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {currentPage === "dashboard" ? (
        <section className="dashboard-page">
          <div className="dashboard-heading">
            <span className="eyebrow">FILEVAULT OVERVIEW</span>
            <h1>Dashboard</h1>
            <p>Manage your files and check your storage statistics.</p>
          </div>

          <div className="dashboard-stats">
            <article className="stat-card">
              <div className="stat-icon stat-icon-purple">▤</div>
              <p>Total Files</p>
              <h2>{totalFiles}</h2>
              <span>All uploaded files</span>
            </article>

            <article className="stat-card">
              <div className="stat-icon stat-icon-teal">▧</div>
              <p>Total Images</p>
              <h2>{totalImages}</h2>
              <span>JPG, PNG and WEBP</span>
            </article>

            <article className="stat-card">
              <div className="stat-icon stat-icon-orange">▧</div>
              <p>Total PDFs</p>
              <h2>{totalPDFs}</h2>
              <span>PDF documents</span>
            </article>

            <article className="stat-card">
              <div className="stat-icon stat-icon-blue">◫</div>
              <p>Storage Used</p>
              <h2>{formatSize(totalStorage)}</h2>
              <span>Total uploaded file size</span>
            </article>
          </div>

          <div className="storage-card">
            <div className="storage-heading">
              <div>
                <h2>Storage Usage</h2>
                <p>Track your FileVault storage.</p>
              </div>
              <span className="storage-percentage">
                {storagePercentage.toFixed(1)}%
              </span>
            </div>

            <div
              className="storage-progress-track"
              role="progressbar"
              aria-label="Storage used"
              aria-valuenow={Math.round(storagePercentage)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="storage-progress-fill"
                style={{ width: `${storagePercentage}%` }}
              />
            </div>

            <div className="storage-details">
              <span><strong>{formatSize(totalStorage)}</strong> used</span>
              <span>{formatSize(remainingStorage)} remaining</span>
            </div>

            <p className="storage-limit-text">Storage limit: 100 MB</p>
          </div>

          <div className="dashboard-charts">
            <div className="chart-card">
              <div className="chart-heading">
                <h2>File Distribution</h2>
                <p>Breakdown of your uploaded files.</p>
              </div>
              <div className="chart-container doughnut-chart">
                <Doughnut data={chartData} options={chartOptions} />
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-heading">
                <h2>Files Overview</h2>
                <p>Compare files by type.</p>
              </div>
              <div className="chart-container bar-chart">
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            </div>
          </div>

          <div className="dashboard-recent">
            <div className="files-heading">
              <div>
                <h2>Recent Files</h2>
                <p>Your latest uploaded files.</p>
              </div>
              <button
                type="button"
                className="upload-button dashboard-home-button"
                onClick={() => navigateTo("home")}
              >
                Go to Home
              </button>
            </div>

            {files.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">▤</div>
                <h3>No files yet</h3>
                <p>Upload your first file to see it here.</p>
              </div>
            ) : (
              <div className="recent-files-list">
                {files.slice(0, 5).map((file) => (
                  <div className="recent-file-item" key={file.id}>
                    <div className="recent-file-icon">
                      {isImageFile(file) && fileUrls[file.id] ? (
                        <img
                          src={fileUrls[file.id]}
                          alt={file.filename}
                          className="recent-file-thumbnail-img"
                        />
                      ) : (
                        "📄"
                      )}
                    </div>

                    <div className="recent-file-info">
                      <strong title={file.filename}>{file.filename}</strong>
                      <span>{formatSize(file.size)}</span>
                    </div>

                    <button
                      type="button"
                      className="file-open-button"
                      onClick={() => openFile(file)}
                    >
                      Open ↗
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="hero">
            <span className="eyebrow">YOUR PERSONAL FILE SPACE</span>
            <h1>Files made <span>simple.</span></h1>
            <p>
              Upload, manage and access your files in one clean,
              simple place.
            </p>
          </section>

          <section className="upload-card">
            <div className="section-heading">
              <div>
                <h2>Upload a file</h2>
                <p>Choose a file or drag and drop it below.</p>
              </div>
              <span className="upload-icon">↑</span>
            </div>

            <form onSubmit={handleUpload}>
              <label
                className={`dropzone ${isDragging ? "dragging" : ""}`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleFileSelect}
                />

                <span className="file-icon">↥</span>

                <strong>
                  {selectedFile
                    ? selectedFile.name
                    : "Click to choose or drop a file"}
                </strong>

                <span className="drop-help">
                  {selectedFile
                    ? formatSize(selectedFile.size)
                    : "JPG, PNG, WEBP or PDF · Maximum 5 MB"}
                </span>
              </label>

              <button className="upload-button" type="submit" disabled={loading}>
                {loading ? "Uploading..." : "↑  Upload file"}
              </button>
            </form>

            {message && <div className="notice success">{message}</div>}
            {error && <div className="notice error">{error}</div>}
          </section>

          <section className="files-section">
            <div className="file-controls">
              <input
                type="text"
                className="search-input"
                placeholder="Search files by name..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />

              <select
                className="filter-select"
                value={fileFilter}
                onChange={(event) => setFileFilter(event.target.value)}
              >
                <option value="all">All Files</option>
                <option value="images">Images</option>
                <option value="pdf">PDF Files</option>
              </select>
            </div>

            <div className="files-heading">
              <div>
                <h2>Your files</h2>
                <p>Files stored in your MongoDB GridFS database.</p>
              </div>
              <span className="file-count">
                {filteredFiles.length}{" "}
                {filteredFiles.length === 1 ? "file" : "files"}
              </span>
            </div>

            {filteredFiles.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">▤</div>
                <h3>
                  {files.length === 0 ? "No files yet" : "No matching files"}
                </h3>
                <p>
                  {files.length === 0
                    ? "Upload your first file to see it here."
                    : "Try another search or filter."}
                </p>
              </div>
            ) : (
              <div className="file-grid">
                {filteredFiles.map((file) => (
                  <article className="file-card" key={file.id}>
                    <button
                      type="button"
                      className="preview preview-button"
                      onClick={() => openFile(file)}
                      aria-label={`Open ${file.filename}`}
                    >
                      {isImageFile(file) && fileUrls[file.id] ? (
                        <img src={fileUrls[file.id]} alt={file.filename} />
                      ) : (
                        <div className="pdf-preview">
                          {getFileType(file)}
                        </div>
                      )}
                    </button>

                    <div className="file-info">
                      <strong title={file.filename}>{file.filename}</strong>

                      <div className="file-detail-row">
                        <span className="file-detail-label">Type</span>
                        <span className="file-detail-value">
                          {getFileType(file)}
                        </span>
                      </div>

                      <div className="file-detail-row">
                        <span className="file-detail-label">Size</span>
                        <span className="file-detail-value">
                          {formatSize(file.size)}
                        </span>
                      </div>

                      <div className="file-detail-row">
                        <span className="file-detail-label">Uploaded</span>
                        <span className="file-detail-value">
                          {formatUploadDate(file.uploadDate)}
                        </span>
                      </div>
                    </div>

                    <div className="file-actions">
                      <button
                        type="button"
                        className="file-open-button"
                        onClick={() => openFile(file)}
                      >
                        Open file ↗
                      </button>

                      <button
                        type="button"
                        className="download-button"
                        onClick={() => openFile(file, true)}
                      >
                        ↓ Download
                      </button>

                      <button
                        className="delete-button"
                        onClick={() => handleDelete(file.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {error && currentPage === "dashboard" && (
        <div className="notice error">{error}</div>
      )}

      {message && currentPage === "dashboard" && (
        <div className="notice success">{message}</div>
      )}

      <footer>
        FileVault · Built with React, Express & MongoDB GridFS
      </footer>
    </main>
  );
}

export default App;
