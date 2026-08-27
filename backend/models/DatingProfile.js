const mongoose = require("mongoose");

const datingPromptSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
  },
  { _id: false }
);

const datingProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    photos: [
      {
        type: String,
        trim: true,
      },
    ],

    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },

    interestedIn: [
      {
        type: String,
        enum: ["male", "female", "other"],
      },
    ],

    interests: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],

    prompts: {
      type: [datingPromptSchema],
      default: [],
    },

    isDatingEnabled: {
      type: Boolean,
      default: true,
    },

    mysteryModeEnabled: {
      type: Boolean,
      default: true,
    },

    lastSparkDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "DatingProfile",
  datingProfileSchema
);