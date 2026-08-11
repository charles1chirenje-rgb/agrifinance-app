const express = require('express');
const router = express.Router();

// 1. Chat endpoint fallback
router.post('/chat', async (req, res) => {
  res.json({
    reply: "Offline mode active. Your queries are handled by the local client assistant."
  });
});

// 2. Dashboard Insights endpoint fallback
router.get('/insights', async (req, res) => {
  res.json({
    insights: [
      "Offline Assistant Active: Your financial and crop data are operating fully locally.",
      "Check your Crop timelines and Loan due dates in their respective tabs."
    ]
  });
});

module.exports = router;