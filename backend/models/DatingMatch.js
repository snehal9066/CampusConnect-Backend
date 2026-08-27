const mongoose = require("mongoose");

const datingMatchSchema = new mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    matchedAt: {
      type: Date,
      default: Date.now,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Used later for Vibe Check
    vibeCheckCompleted: {
      type: Boolean,
      default: false,
    },

    // Used later for conversation starters
    conversationStarted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate matches between the same two users
datingMatchSchema.index(
  { users: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "DatingMatch",
  datingMatchSchema
);