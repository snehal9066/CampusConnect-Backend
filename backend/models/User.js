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
      default: "Female",
    },

    verified: { type: Boolean, default: false },
      purpose: {
      type: String,
      enum: [
        "Friendship",
        "Dating",
        "Study Buddy",
        "Coffee Chat",
      ],
      default: "Friendship",
    },

    interests: [
      {
        type: String,
      },
    ],

    // ==========================================
    // STUDY BUDDY PREFERENCES
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);