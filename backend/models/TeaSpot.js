const mongoose = require('mongoose');
const { Schema } = mongoose;

const TeaSpotSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String },
  images: [{ type: String }], // optional carousel images
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  pinnedMessage: { type: String },
  rating: [{ type: Number, min: 1, max: 5 }], // each rating value
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  checkInCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('TeaSpot', TeaSpotSchema);
