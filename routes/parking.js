// backend/routes/parking.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const GOOGLE_KEY = process.env.GOOGLE_PLACES_KEY; // keep key in .env

if (!GOOGLE_KEY) {
  console.warn('WARNING: GOOGLE_PLACES_KEY not set. /api/parking will fail until provided.');
}

// GET /api/parking?lat=12.34&lon=56.78&radius=2000
router.get('/', async (req, res) => {
  const { lat, lon, radius = 2000 } = req.query;
  if (!lat || !lon) return res.status(400).json({ message: 'lat and lon required' });

  try {
    // Google Places Nearby Search endpoint
    const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    const params = {
      key: GOOGLE_KEY,
      location: `${lat},${lon}`,
      radius,
      keyword: 'parking', // parking results
      type: 'parking',
    };

    const response = await axios.get(url, { params, timeout: 15000 });
    const data = response.data;

    // normalize what we send to frontend
    const results = (data.results || []).map(r => ({
      place_id: r.place_id,
      name: r.name,
      address: r.vicinity || r.formatted_address || '',
      lat: r.geometry?.location?.lat,
      lon: r.geometry?.location?.lng,
      rating: r.rating,
      user_ratings_total: r.user_ratings_total,
      types: r.types,
    }));

    res.json({ status: data.status, results });
  } catch (err) {
    console.error('Google Places error:', err?.response?.data || err.message);
    res.status(500).json({ message: 'Failed to fetch places from Google Places API' });
  }
});

module.exports = router;
