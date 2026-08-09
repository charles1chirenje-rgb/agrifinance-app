const express = require('express');
const repo = require('../repo');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function csvEscape(val) {
  const s = String(val ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/export/ledger.csv - download income/expense transactions as CSV
// (for an accountant, a loan application, or the thesis appendix).
router.get('/ledger.csv', requireAuth, async (req, res) => {
  const scope = req.user.role === 'admin' && req.query.all === 'true' ? {} : { userId: req.user.id };
  const transactions = await repo.list('transactions', scope);

  const header = ['Date', 'Type', 'Category', 'Enterprise', 'Amount', 'Currency', 'Note'];
  const rows = transactions.map(t => [t.date, t.type, t.category, t.enterprise, t.amount, t.currency, t.note || '']);
  const csv = [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="agrifinance-ledger-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

module.exports = router;
