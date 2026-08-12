const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    return res.status(200).json({
      month: new Date().getMonth() + 1,
      monthName: 'August',
      nextMonthName: 'September',
      plantNow: ['Wheat', 'Onions', 'Leafy Greens'],
      plantNextMonth: ['Maize', 'Soybeans', 'Groundnuts'],
      rainfall: { 
        tone: 'info', 
        text: 'Stable seasonal outlook. Ideal time for early land preparation and checking irrigation equipment.' 
      }
    });
  } catch (err) {
    console.error('Advisor route error:', err);
    return res.status(500).json({ error: 'Failed to load advisor' });
  }
});

module.exports = router;