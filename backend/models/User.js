const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    year: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    profileImage: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    age: {
      type: Number,
      default: null,
    },

    location: {
      type: String,
      default: "",
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male",
    },

    interestedIn: {
      type: String,
      enum: ["Male", "Female", "Everyone"],
      default: "Everyone",
    },

    verified: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isSuspended: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // ONLY CONNECTION TYPE
    // ==========================================

    purpose: {
      type: String,
      enum: ["Anonymous Chat"],
      default: "Anonymous Chat",
    },

    interests: [
      {
        type: String,
      },
    ],

    // ==========================================
    // STUDY PREFERENCES
    // Kept in database for future use
    // ==========================================

    studySubjects: [
      {
        type: String,
        trim: true,
      },
    ],

    studyAvailability: [
      {
        type: String,
        trim: true,
      },
    ],

    studyMode: {
      type: String,
      enum: ["Online", "In Person", "Both"],
      default: "Both",
    },

    studyStyle: {
      type: String,
      enum: ["Quiet", "Discussion", "Both"],
      default: "Both",
    },

    // ==========================================
    // FRIENDS
    // ==========================================

    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ==========================================
    // BADGES
    // ==========================================

    badges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Badge",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);