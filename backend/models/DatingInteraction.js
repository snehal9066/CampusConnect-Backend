const mongoose = require("mongoose");

const datingInteractionSchema = new mongoose.Schema(
  {
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      enum: ["like", "pass"],
      required: true,
    },

    isMutualMatch: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate interactions
datingInteractionSchema.index(
  {
    fromUser: 1,
    toUser: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "DatingInteraction",
  datingInteractionSchema
);