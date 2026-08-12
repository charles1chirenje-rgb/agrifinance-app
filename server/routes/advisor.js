const express = require('express');
const { recommendationsForMonth, rainfallTip } = require('../utils/cropCalendar');

const router = express.Router();

const DEFAULT_LAT = -21.05;
const DEFAULT_LON = 31.67;

// GET /api/advisor - Public rule-based planting advisor
router.get('/', async (req, res) => {
  try {
    const month = new Date().getMonth() + 1;
    const rec = recommendationsForMonth(month);

    let weather = null;
    try {
      const lat = req.query.lat || DEFAULT_LAT;
      const lon = req.query.lon || DEFAULT_LON;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&daily=temperature_2m_max,precipitation_sum&forecast_days=4&timezone=Africa%2FHarare`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        weather = rainfallTip(data.daily);
      }
    } catch (err) {
      console.error('Advisor weather lookup failed:', err.message);
    }

    return res.json({
      month,
      monthName: rec.monthName,
      nextMonthName: rec.nextMonthName,
      plantNow: rec.now,
      plantNextMonth: rec.upcoming,
      rainfall: weather || { tone: 'info', text: 'Weather outlook unavailable right now.' }
    });
  } catch (err) {
    console.error('GET /api/advisor error:', err);
    return res.status(500).json({ error: 'Failed to load advisor data' });
  }
});

module.exports = router;