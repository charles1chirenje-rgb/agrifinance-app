const express = require('express');
const repo = require('../repo');
const { requireAuth } = require('../middleware/auth');
const { round2 } = require('../utils/analytics');

const router = express.Router();

// GET /api/dashboard - summary cards for the dashboard/admin overview
router.get('/', requireAuth, async (req, res) => {
  const scope = req.user.role === 'admin' && req.query.all === 'true' ? {} : { userId: req.user.id };

  const [transactions, loans, crops, livestock, users] = await Promise.all([
    repo.list('transactions', scope),
    repo.list('loans', scope),
    repo.list('crops', scope),
    repo.list('livestock', scope),
    req.user.role === 'admin' ? repo.list('users') : Promise.resolve([])
  ]);

  const totalIncome = round2(transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0));
  const totalExpense = round2(transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0));
  const balance = round2(totalIncome - totalExpense);

  const outstandingLoans = round2(
    loans.filter((l) => l.status !== 'repaid').reduce((s, l) => s + (Number(l.principal) - Number(l.amountRepaid || 0)), 0)
  );

  res.json({
    totalIncome,
    totalExpense,
    balance,
    outstandingLoans,
    activeCrops: crops.filter((c) => c.status === 'active').length,
    totalCrops: crops.length,
    livestockCount: livestock.reduce((s, l) => s + (l.healthStatus === 'sold' || l.healthStatus === 'deceased' ? 0 : Number(l.count || 1)), 0),
    livestockRecords: livestock.length,
    ...(req.user.role === 'admin' ? { totalUsers: users.length } : {})
  });
});

module.exports = router;
