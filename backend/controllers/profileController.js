const User = require("../models/User");

// Update User Profile
const updateProfile = async (req, res) => {
  try {
    const {
      username,
      bio,
      age,
      gender,
      interestedIn,
      purpose,
      location,
      interests,
    } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.bio = bio;
    user.age = age;
    user.gender = gender;
    user.interestedIn = interestedIn;
    user.purpose = purpose; // Added
    user.location = location;
    user.interests = interests;

    await user.save();

    res.status(200).json({
      message: "Profile Updated Successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Upload Profile Picture
const uploadProfilePicture = async (req, res) => {
  try {
    const { username } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    user.profilePicture = req.file.path;

    await user.save();

    res.status(200).json({
      message: "Profile Picture Uploaded Successfully",
      image: req.file.path,
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get User Profile
const getProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username }).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  updateProfile,
  uploadProfilePicture,
  getProfile,
};