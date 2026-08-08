const express = require("express");

const router = express.Router();

const {
  getDashboard,
} = require("../controllers/dashboardController");

const authMiddleware = require("../middleware/authMiddleware");

// ======================================================
// GET DASHBOARD DATA
// ======================================================

router.get(
  "/",
  authMiddleware,
  getDashboard
);

module.exports = router;