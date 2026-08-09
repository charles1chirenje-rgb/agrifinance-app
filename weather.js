const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Chiredzi, Zimbabwe (Lowveld sugarcane belt - Farm 54's region) as the default
// farm location. A future iteration could store per-user coordinates instead.
const DEFAULT_LAT = -21.05;
const DEFAULT_LON = 31.67;

// GET /api/weather - live conditions + 3-day outlook, used to give the crop
// live-tracking pages real environmental context (rainfall directly affects
// sugarcane growth stage timing).
router.get('/', requireAuth, async (req, res) => {
  try {
    const lat = req.query.lat || DEFAULT_LAT;
    const lon = req.query.lon || DEFAULT_LON;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
      `&forecast_days=4&timezone=Africa%2FHarare`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather service unavailable');
    const data = await response.json();

    res.json({
      location: { lat: Number(lat), lon: Number(lon), name: 'Chiredzi, Zimbabwe' },
      current: data.current,
      daily: data.daily
    });
  } catch (err) {
    console.error('Weather fetch failed:', err.message);
    res.status(502).json({ error: 'Could not reach the weather service. Try again shortly.' });
  }
});

module.exports = router;
