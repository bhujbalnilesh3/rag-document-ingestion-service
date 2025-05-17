const multer = require("multer");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Multer Configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      const error = new Error("Only PDF files are allowed");
      error.statusCode = 415; // Unsupported Media Type
      cb(error);
    }
  },
});

/**
 * Middleware for handling single file upload
 * Handles file type and size validation
 */
const uploadMiddleware = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)} MB limit` });
        }
        return res.status(400).json({ error: err.message });
      } else if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }

      console.error("Unexpected error in upload middleware:", err.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    next();
  });
};

module.exports = uploadMiddleware;
