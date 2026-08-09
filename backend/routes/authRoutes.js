const express = require("express");

const router = express.Router();

const { registerUser, loginUser, verifyUser } = require("../controllers/authController");

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// Verify Email
router.post("/verify", verifyUser);

module.exports = router;