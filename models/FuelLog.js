const mongoose = require('mongoose');

const fuelLogSchema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  litres: Number,
  cost: Number,
  odometer: Number,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FuelLog', fuelLogSchema);
