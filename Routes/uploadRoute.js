const express = require("express");
const router = express.Router();
const upload = require("../Middleware/upload");

router.post("/upload", upload.single("image"), (req, res) => {
  console.log("FILE:", req.file);
  console.log("BODY:", req.body);

  if (!req.file) {
    return res.status(400).json({
      error: "❌ File not received",
    });
  }

  res.json({
    success: true,
    imageUrl: req.file.location,
  });
});

module.exports = router;