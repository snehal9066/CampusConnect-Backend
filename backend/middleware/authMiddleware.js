const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check Authorization header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication token required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Authentication token required",
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get the latest user data from database
    const user = await User.findById(decoded.id).select(
      "_id username role isSuspended verified"
    );

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    // Block suspended users even if they have an old valid JWT
    if (user.isSuspended) {
      return res.status(403).json({
        message: "Your account has been suspended",
      });
    }

    // Store trusted current user information
    req.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role || "user",
      verified: user.verified,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Session expired. Please log in again.",
      });
    }

    return res.status(401).json({
      message: "Invalid authentication token",
    });
  }
};

module.exports = authMiddleware;