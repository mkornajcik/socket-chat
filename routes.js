const express = require("express");
const path = require("path");
const multer = require("multer");

const router = express.Router();
const upload = multer({ dest: "uploads/", limits: { fieldSize: 1024 * 1024 * 5 } }); // Max size 5Mb

// Default route
router.get("/", (req, res) => {
  const filePath = path.resolve(__dirname, "public", "index.html");
  res.sendFile(filePath);
});

// For uploading files
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("Choose a file before sending (Max 5Mb).");
  }
  res.status(200).send({ filename: req.file.filename, originalname: req.file.originalname });
});

module.exports = router;
