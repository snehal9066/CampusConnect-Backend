const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    gender: {
      type: String,
      required: true,
    },

    interestedIn: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Queue", queueSchema);