const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  title: String,
  dueDate: Date,
  completed: { type: Boolean, default: false },
  cost: Number
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);
