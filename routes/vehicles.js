const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const auth = require('../middlewares/authMiddleware');

// Add Vehicle
// backend/routes/vehicles.js (only the POST handler shown — replace the existing one)
router.post('/', auth, async (req, res) => {
  try {
    const { make, model, year, registrationNumber, color, fuelType } = req.body;

    if (!registrationNumber) {
      return res.status(400).json({ message: 'Registration number is required.' });
    }

    // normalize same way as model: trim + uppercase
    const regNorm = String(registrationNumber).trim().toUpperCase();

    // check existing (owned by anyone, since reg numbers are unique globally)
    const existing = await Vehicle.findOne({ registrationNumber: regNorm });
    if (existing) {
      return res.status(400).json({ message: 'A vehicle with this registration number already exists.' });
    }

    const vehicle = new Vehicle({
      owner: req.user.id,
      make,
      model,
      year,
      registrationNumber: regNorm,
      color,
      fuelType,
    });

    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (err) {
    // handle duplicate key race condition or other DB errors
    if (err.code === 11000 && err.keyPattern && err.keyPattern.registrationNumber) {
      return res.status(400).json({ message: 'A vehicle with this registration number already exists.' });
    }
    console.error('Create vehicle error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get all vehicles belonging to logged-in user
router.get('/', auth, async (req, res) => {
  const list = await Vehicle.find({ owner: req.user.id });
  res.json(list);
});

// ⭐ NEW — Get single vehicle by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Vehicle
router.delete("/:id", auth, async (req, res) => {
  try {
    await Vehicle.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id,
    });

    res.json({ message: "Vehicle deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
