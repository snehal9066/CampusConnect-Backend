const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  getAdminStats,
  getAllUsers,
  suspendUser,
  unsuspendUser,
  getAuditLogs,
} = require("../controllers/adminController");

// ==========================================
// ALL ADMIN ROUTES REQUIRE:
// 1. Valid login token
// 2. Admin role
// ==========================================

router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard statistics
router.get("/stats", getAdminStats);

// Get all users
router.get("/users", getAllUsers);

// Get admin audit logs
router.get("/audit-logs", getAuditLogs);

// Suspend a user
router.patch("/users/:id/suspend", suspendUser);

// Unsuspend a user
router.patch("/users/:id/unsuspend", unsuspendUser);

module.exports = router;