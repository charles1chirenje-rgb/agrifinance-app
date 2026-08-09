const express = require('express');
const repo = require('../repo');
const { requireAuth } = require('../middleware/auth');
const { forecastCashflow } = require('../utils/analytics');

const router = express.Router();

// GET /api/forecast?months=3
router.get('/', requireAuth, async (req, res) => {
  const monthsAhead = Math.min(12, Math.max(1, Number(req.query.months) || 3));
  const scope = req.user.role === 'admin' && req.query.all === 'true' ? {} : { userId: req.user.id };
  const transactions = await repo.list('transactions', scope);

  if (transactions.length === 0) {
    return res.json({
      history: [],
      forecast: [],
      trend: 'insufficient_data',
      alerts: ['Log at least one month of income and expenses to unlock forecasting.']
    });
  }

  const result = forecastCashflow(transactions, monthsAhead);
  res.json(result);
});

module.exports = router;
