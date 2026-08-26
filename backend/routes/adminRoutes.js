const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  getAdminStats,
  getAllUsers,
  suspendUser,
  unsuspendUser,
} = require("../controllers/adminController");

// All admin routes require login + admin permission
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard statistics
router.get("/stats", getAdminStats);

// Get all users
router.get("/users", getAllUsers);

// Suspend a user
router.patch("/users/:id/suspend", suspendUser);

// Unsuspend a user
router.patch("/users/:id/unsuspend", unsuspendUser);

module.exports = router;