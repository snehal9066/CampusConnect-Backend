const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    purpose: {
      type: String,
      enum: ["Friendship", "Dating", "Study Buddy", "Coffee Chat"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "matched", "ended"],
      default: "pending",
    },

    // Existing field
    revealed: {
      type: Boolean,
      default: false,
    },

    // NEW: Track each user's decision
    revealUser1: {
      type: Boolean,
      default: false,
    },

    revealUser2: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Match", matchSchema);