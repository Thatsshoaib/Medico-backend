const express = require("express");
const { registerUser, loginUser, getCurrentMr } = require("../Controller/authController");

const router = express.Router();

// ✅ Correctly Define Routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/current-mr", getCurrentMr); // Ensure `getCurrentMr` is a function

// ✅ Correctly Export the Router
module.exports = router;
