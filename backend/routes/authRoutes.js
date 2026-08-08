const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ======================================================
// REGISTER USER
// ======================================================

const registerUser = async (req, res) => {
  try {
    const {
      fullName,
      username,
      department,
      year,
      password,
    } = req.body;

    // Check username
    const existingUser = await User.findOne({
      username,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    // Hash password
    const hashedPassword =
      await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      fullName,
      username,
      department,
      year,
      password: hashedPassword,
    });

    // Remove password before sending response
    const safeUser =
      await User.findById(user._id).select(
        "-password"
      );

    return res.status(201).json({
      message:
        "User Registered Successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error(
      "REGISTER ERROR:",
      error
    );

    return res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// LOGIN USER
// ======================================================

const loginUser = async (req, res) => {
  try {
    const {
      username,
      password,
    } = req.body;

    // Find user
    const user = await User.findOne({
      username,
    });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    // Compare password
    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid password",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Remove password
    const safeUser =
      await User.findById(user._id).select(
        "-password"
      );

    return res.status(200).json({
      message: "Login Successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
};