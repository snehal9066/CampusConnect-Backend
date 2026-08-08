const User = require("../models/User");

// ================= UPDATE PROFILE =================
const updateProfile = async (req, res) => {
  try {
    console.log("========== UPDATE PROFILE ==========");
    console.log(req.body);

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

    if (bio !== undefined) user.bio = bio;
    if (age !== undefined) user.age = age;
    if (gender !== undefined) user.gender = gender;
    if (interestedIn !== undefined) user.interestedIn = interestedIn;
    if (purpose !== undefined) user.purpose = purpose;
    if (location !== undefined) user.location = location;
    if (interests !== undefined) user.interests = interests;

    await user.save();

    // Read again from MongoDB to verify what was actually saved
    const updatedUser = await User.findOne({ username }).select("-password");

    console.log("========== AFTER SAVE ==========");
    console.log(updatedUser);
    console.log("================================");

    return res.status(200).json({
      message: "Profile Updated Successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.log("PROFILE UPDATE ERROR:");
    console.log(error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

// ================= UPLOAD PROFILE PICTURE =================
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

    user.profileImage = req.file.path;

    await user.save();

    return res.status(200).json({
      message: "Profile Picture Uploaded Successfully",
      image: req.file.path,
      user,
    });
  } catch (error) {
    console.log("UPLOAD IMAGE ERROR:");
    console.log(error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

// ================= GET PROFILE =================
const getProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username }).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.log("GET PROFILE ERROR:");
    console.log(error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  updateProfile,
  uploadProfilePicture,
  getProfile,
};