// models/Vehicle.js
const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  make: { type: String, default: '' },
  model: { type: String, default: '' },
  year: { type: Number },
  registrationNumber: { type: String, required: true, index: true, unique: false }, // uniqueness handled per-owner in route or via compound index
  mileage: { type: Number, default: 0 },

  // New fields
  color: { type: String, default: '' },
  fuelType: { type: String, default: '' },
  notes: { type: String, default: '' },
  image: { type: String, default: '' },

}, { timestamps: true });

// If you want to enforce unique registration number per user at DB-level, create a compound index:
// vehicleSchema.index({ owner: 1, registrationNumber: 1 }, { unique: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
