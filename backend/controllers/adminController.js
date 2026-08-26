const User = require("../models/User");

// ==========================================
// GET ADMIN STATISTICS
// ==========================================

const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const suspendedUsers = await User.countDocuments({
      isSuspended: true,
    });

    const adminUsers = await User.countDocuments({
      role: "admin",
    });

    const activeUsers = totalUsers - suspendedUsers;

    res.status(200).json({
      totalUsers,
      activeUsers,
      suspendedUsers,
      adminUsers,
    });
  } catch (error) {
    console.error("Admin stats error:", error);

    res.status(500).json({
      message: "Failed to fetch admin statistics",
    });
  }
};

// ==========================================
// GET ALL USERS
// ==========================================

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      message: "Failed to fetch users",
    });
  }
};

// ==========================================
// SUSPEND USER
// ==========================================

const suspendUser = async (req, res) => {
  try {
    // Prevent admin from suspending themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        message: "You cannot suspend your own account",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Extra protection: do not allow suspending another admin
    if (user.role === "admin") {
      return res.status(403).json({
        message: "Admin accounts cannot be suspended",
      });
    }

    user.isSuspended = true;

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(200).json({
      message: "User suspended successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error("Suspend user error:", error);

    res.status(500).json({
      message: "Failed to suspend user",
    });
  }
};

// ==========================================
// UNSUSPEND USER
// ==========================================

const unsuspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.isSuspended = false;

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(200).json({
      message: "User unsuspended successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error("Unsuspend user error:", error);

    res.status(500).json({
      message: "Failed to unsuspend user",
    });
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  suspendUser,
  unsuspendUser,
};