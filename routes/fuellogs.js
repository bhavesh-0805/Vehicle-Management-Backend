const express = require('express');
const router = express.Router();
const FuelLog = require('../models/FuelLog');
const auth = require('../middlewares/authMiddleware');
const mongoose = require('mongoose');

// ✅ Add a new fuel log
router.post('/', auth, async (req, res) => {
  try {
    const { vehicleId, litres, cost, odometer } = req.body;

    // Validate vehicleId
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ message: 'Invalid vehicle ID' });
    }

    // Validate litres and cost as numbers
    if (isNaN(litres) || isNaN(cost)) {
      return res.status(400).json({ message: 'Litres and cost must be numeric values' });
    }

    const log = new FuelLog({
      vehicle: vehicleId,
      litres: Number(litres),
      cost: Number(cost),
      odometer,
    });

    await log.save();
    res.status(201).json(log);
  } catch (error) {
    console.error('Error adding fuel log:', error.message);
    res.status(500).json({ message: 'Server error while adding fuel log' });
  }
});

// ✅ Get all fuel logs for a specific vehicle
router.get('/vehicle/:vehicleId', auth, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // Validate vehicleId
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ message: 'Invalid vehicle ID' });
    }

    const logs = await FuelLog.find({ vehicle: vehicleId }).sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching fuel logs:', error.message);
    res.status(500).json({ message: 'Server error while fetching fuel logs' });
  }
});

// ✅ Optional: Get all fuel logs across all vehicles (useful after login refresh)
router.get('/', auth, async (req, res) => {
  try {
    const logs = await FuelLog.find().populate('vehicle').sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching all fuel logs:', error.message);
    res.status(500).json({ message: 'Server error while fetching all fuel logs' });
  }
});

module.exports = router;
