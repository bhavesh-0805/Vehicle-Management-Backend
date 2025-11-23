// backend/routes/maintenance.js
const express = require('express');
const router = express.Router();
const Maintenance = require('../models/Maintenance');
const Vehicle = require('../models/Vehicle');
const auth = require('../middlewares/authMiddleware');
const mongoose = require('mongoose');

/**
 * Helper: check ownership of a vehicle
 * @returns {Promise<boolean>}
 */
async function checkVehicleOwnership(vehicleId, userId) {
  if (!mongoose.Types.ObjectId.isValid(vehicleId)) return false;
  const v = await Vehicle.findOne({ _id: vehicleId, owner: userId }).lean();
  return !!v;
}

/**
 * Helper: verify maintenance record ownership by user (via populated vehicle)
 * returns { ok: boolean, record?: Maintenance, status?: number, message?: string }
 */
async function verifyRecordAndOwnership(recordId, userId) {
  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    return { ok: false, status: 400, message: 'Invalid maintenance id' };
  }
  const record = await Maintenance.findById(recordId).populate('vehicle');
  if (!record) return { ok: false, status: 404, message: 'Record not found' };

  if (!record.vehicle || String(record.vehicle.owner) !== String(userId)) {
    return { ok: false, status: 403, message: 'Not allowed' };
  }
  return { ok: true, record };
}

/* -------------------------
   POST /api/maintenance
   Add a maintenance record (owner-only)
   Body: { vehicleId, title, dueDate?, cost? }
   ------------------------ */
router.post('/', auth, async (req, res) => {
  try {
    const { vehicleId, title, dueDate, cost } = req.body;

    if (!vehicleId) return res.status(400).json({ message: 'vehicleId is required' });
    if (!mongoose.Types.ObjectId.isValid(vehicleId))
      return res.status(400).json({ message: 'Invalid vehicle ID' });

    // ownership check
    const ok = await checkVehicleOwnership(vehicleId, req.user.id);
    if (!ok) return res.status(403).json({ message: 'Not allowed for this vehicle' });

    const record = new Maintenance({
      vehicle: vehicleId,
      title: title || '',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      cost: cost !== undefined ? Number(cost) : undefined,
    });

    await record.save();
    res.status(201).json(record);
  } catch (error) {
    console.error('Error adding maintenance record:', error);
    res.status(500).json({ message: 'Server error while adding maintenance record' });
  }
});

/* -------------------------
   GET /api/maintenance/vehicle/:vehicleId
   Get all maintenance for a vehicle (owner-only)
   ------------------------ */
router.get('/vehicle/:vehicleId', auth, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ message: 'Invalid vehicle ID' });
    }

    const ok = await checkVehicleOwnership(vehicleId, req.user.id);
    if (!ok) return res.status(403).json({ message: 'Not allowed for this vehicle' });

    const records = await Maintenance.find({ vehicle: vehicleId }).sort({ dueDate: 1, createdAt: -1 });
    res.json(records);
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    res.status(500).json({ message: 'Server error while fetching maintenance records' });
  }
});

/* -------------------------
   PATCH /api/maintenance/:id
   Partial update: accepts { title?, dueDate?, cost?, completed? }
   Ownership enforced
   ------------------------ */
// PATCH - update maintenance (same as PUT)
router.patch('/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid id' });

    const record = await Maintenance.findById(id).populate('vehicle');
    if (!record) return res.status(404).json({ message: 'Record not found' });

    if (!record.vehicle || String(record.vehicle.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const { title, dueDate, cost, completed } = req.body;
    if (title !== undefined) record.title = title;
    if (dueDate !== undefined) record.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (cost !== undefined) record.cost = cost;
    if (completed !== undefined) record.completed = !!completed;

    await record.save();
    res.json(record);
  } catch (err) {
    console.error('PATCH update error:', err);
    res.status(500).json({ message: 'Server error while updating maintenance' });
  }
});


/* -------------------------
   PATCH /api/maintenance/:id/toggle
   Toggle completed flag quickly
   ------------------------ */
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const id = req.params.id;
    const verification = await verifyRecordAndOwnership(id, req.user.id);
    if (!verification.ok) return res.status(verification.status).json({ message: verification.message });

    const record = verification.record;
    record.completed = !record.completed;
    await record.save();

    res.json({ message: 'Toggled', completed: record.completed, record });
  } catch (err) {
    console.error('Error toggling maintenance completed:', err);
    res.status(500).json({ message: 'Server error while toggling maintenance' });
  }
});

/* -------------------------
   DELETE /api/maintenance/:id
   Delete a maintenance record (owner-only)
   ------------------------ */
router.delete('/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    const verification = await verifyRecordAndOwnership(id, req.user.id);
    if (!verification.ok) return res.status(verification.status).json({ message: verification.message });

    await Maintenance.findByIdAndDelete(id);
    res.json({ message: 'Maintenance record deleted' });
  } catch (err) {
    console.error('Error deleting maintenance:', err);
    res.status(500).json({ message: 'Server error while deleting maintenance' });
  }
});

/* -------------------------
   GET /api/maintenance/due/:days?
   Get upcoming due items across user's vehicles (default 30 days)
   ------------------------ */
router.get('/due/:days?', auth, async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.params.days || '30', 10));
    const from = new Date();
    const to = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // find vehicles owned by user, then maintenance due in range
    const userVehicles = await Vehicle.find({ owner: req.user.id }).select('_id').lean();
    const vehicleIds = userVehicles.map(v => v._id);

    const due = await Maintenance.find({
      vehicle: { $in: vehicleIds },
      dueDate: { $gte: from, $lte: to },
      completed: { $ne: true }
    })
      .sort({ dueDate: 1 })
      .populate('vehicle', 'make model registrationNumber');

    res.json(due);
  } catch (err) {
    console.error('Error getting due maintenance:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
