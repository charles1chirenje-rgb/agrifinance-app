const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { recommendationsForMonth, rainfallTip } = require('../utils/cropCalendar');

const router = express.Router();

const DEFAULT_LAT = -21.05;
const DEFAULT_LON = 31.67;

// GET /api/advisor - rule-based planting advisor: what to plant this month
// and what's coming up next, cross-referenced against a live rainfall
// outlook. Pure computation + one weather fetch, so it works with zero AI
// configuration and never costs anything to run.
router.get('/', requireAuth, async (req, res) => {
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

  res.json({
    month,
    monthName: rec.monthName,
    nextMonthName: rec.nextMonthName,
    plantNow: rec.now,
    plantNextMonth: rec.upcoming,
    rainfall: weather || { tone: 'info', text: 'Weather outlook unavailable right now.' }
  });
});

module.exports = router;
