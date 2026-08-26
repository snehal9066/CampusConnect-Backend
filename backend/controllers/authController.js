const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ==========================================
// REGISTER USER
// ==========================================

const registerUser = async (req, res) => {
  try {
    const { fullName, username, department, year, password } = req.body;

    // Basic validation
    if (!fullName || !username || !department || !year || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Normalize username
    const normalizedUsername = username.trim().toLowerCase();

    // Check if username already exists
    const existingUser = await User.findOne({
      username: normalizedUsername,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      fullName: fullName.trim(),
      username: normalizedUsername,
      department: department.trim(),
      year,
      password: hashedPassword,
    });

    // Never send password back
    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).json({
      message: "User registered successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Registration failed",
    });
  }
};

// ==========================================
// LOGIN USER
// ==========================================

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    // Normalize username
    const normalizedUsername = username.trim().toLowerCase();

    // Check if user exists
    const user = await User.findOne({
      username: normalizedUsername,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    // BLOCK SUSPENDED USERS
    if (user.isSuspended) {
      return res.status(403).json({
        message:
          "Your account has been suspended. Please contact the administrator.",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: user._id.toString(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Never send password back
    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(200).json({
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed. Please try again.",
    });
  }
};

// ==========================================
// VERIFY USER
// ==========================================

const verifyUser = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        message: "Verification token is required",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.verified = true;

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(200).json({
      message: "User verified successfully",
      user: safeUser,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Invalid or expired verification token",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyUser,
};