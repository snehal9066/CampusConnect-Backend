const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    purpose: {
      type: String,
      enum: ["Anonymous Chat"],
      default: "Anonymous Chat",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Queue", queueSchema);