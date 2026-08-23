const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  icon: { type: String }, // URL or emoji string
});

module.exports = mongoose.model('Badge', badgeSchema);
