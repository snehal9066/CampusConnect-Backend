const mongoose = require("mongoose");

const datingSwipeSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  }
);

// A user should only have one swipe record for another user
datingSwipeSchema.index(
  { fromUser: 1, toUser: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "DatingSwipe",
  datingSwipeSchema
);