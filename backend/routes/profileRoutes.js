const express = require("express");
const router = express.Router();

const {
  updateProfile,
  uploadProfilePicture,
  getProfile,
} = require("../controllers/profileController");

const upload = require("../config/multer");

// Get Profile
router.get("/:username", getProfile);

// Update Profile
router.put("/update", updateProfile);

// Upload Profile Picture
router.post(
  "/upload-profile-picture",
  upload.single("image"),
  uploadProfilePicture
);

module.exports = router;