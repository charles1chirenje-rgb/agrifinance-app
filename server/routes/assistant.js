const express = require('express');
const router = express.Router();

// 1. Chat endpoint with intelligent response generation
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const query = (message || '').toLowerCase();

    let reply = "AgriFinance AI: I am tracking your farm operations. Keep recording your data across transactions, crops, and loans to keep everything optimized!";

    if (query.includes('crop') || query.includes('plant') || query.includes('maize') || query.includes('soy') || query.includes('season')) {
      reply = "Agronomy Guidance: Check your Planting Advisor tab on the dashboard for seasonal crop timelines and rainfall recommendations suited for local farming conditions.";
    } else if (query.includes('loan') || query.includes('credit') || query.includes('debt') || query.includes('borrow')) {
      reply = "Financial Management: Review your active loans and upcoming due dates under the Loans section to maintain optimal cash flow.";
    } else if (query.includes('risk') || query.includes('event') || query.includes('factor') || query.includes('weather')) {
      reply = "Risk Monitoring: You can log and track external factors or environmental risks directly in the Risk Log section.";
    } else if (query.includes('balance') || query.includes('money') || query.includes('income') || query.includes('expense') || query.includes('profit')) {
      reply = "Cash Position: Your total income, operating expenses, and net balances are summarized directly on your main dashboard cards and cash chart.";
    } else if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
      reply = "Hello! I'm your AgriFinance assistant. How can I help you manage your farm today?";
    }

    return res.json({ success: true, reply });
  } catch (err) {
    console.error('POST /api/assistant/chat error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 2. Dashboard Insights endpoint
router.get('/insights', async (req, res) => {
  try {
    const insights = [
      { tone: 'info', text: "Farm System Active: Your financial and crop data are tracking successfully." },
      { tone: 'warning', text: "Check your seasonal crop timelines and loan due dates in their respective tabs." }
    ];
    return res.json({ success: true, insights });
  } catch (err) {
    console.error('GET /api/assistant/insights error:', err);
    return res.status(500).json({ insights: [] });
  }
});

module.exports = router;