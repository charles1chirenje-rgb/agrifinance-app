const express = require('express');
const router = express.Router();
const repo = require('../repo');

// 1. Chat endpoint fallback & offline handling
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const query = (message || '').toLowerCase();

    let reply = "Offline mode active. Your queries are handled by the local client assistant.";

    if (query.includes('crop') || query.includes('plant')) {
      reply = "Make sure to check your Planting Advisor tab on the dashboard for seasonal crop timelines suited for local conditions.";
    } else if (query.includes('loan') || query.includes('credit')) {
      reply = "Review your active loans and upcoming due dates under the Loans section to maintain optimal cash flow.";
    } else if (query.includes('risk') || query.includes('external')) {
      reply = "You can log and monitor potential external factors or environmental risks in the Risk Log section.";
    }

    return res.json({ success: true, reply });
  } catch (err) {
    console.error('POST /api/assistant/chat error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 2. Dashboard Insights endpoint fallback
router.get('/insights', async (req, res) => {
  try {
    const insights = [
      { tone: 'info', text: "Offline Assistant Active: Your financial and crop data are operating fully locally." },
      { tone: 'warning', text: "Check your Crop timelines and Loan due dates in their respective tabs." }
    ];
    return res.json({ success: true, insights });
  } catch (err) {
    console.error('GET /api/assistant/insights error:', err);
    return res.status(500).json({ insights: [] });
  }
});

module.exports = router;