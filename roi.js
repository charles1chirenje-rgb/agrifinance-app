const express = require('express');
const repo = require('../repo');
const { requireAuth } = require('../middleware/auth');
const { calculateROI, round2 } = require('../utils/analytics');

const router = express.Router();

// GET /api/roi - ROI per crop and livestock enterprise, plus farm-wide summary
router.get('/', requireAuth, async (req, res) => {
  const scope = req.user.role === 'admin' && req.query.all === 'true' ? {} : { userId: req.user.id };

  const [crops, livestock, transactions] = await Promise.all([
    repo.list('crops', scope),
    repo.list('livestock', scope),
    repo.list('transactions', scope)
  ]);

  const incomeByLink = {};
  const expenseByLink = {};
  transactions.forEach((t) => {
    if (!t.linkedId) return;
    const bucket = t.type === 'income' ? incomeByLink : expenseByLink;
    bucket[t.linkedId] = (bucket[t.linkedId] || 0) + Number(t.amount);
  });

  const cropROI = crops.map((c) => {
    const linkedIncome = incomeByLink[c._id] || 0;
    const linkedExpense = expenseByLink[c._id] || 0;
    const investment = Number(c.investment || 0) + linkedExpense;
    const returns = linkedIncome; // sale proceeds logged as linked income transactions
    const roi = calculateROI(investment, returns);
    return {
      id: c._id,
      name: c.name,
      type: 'crop',
      stage: c.stage,
      status: c.status,
      ...roi
    };
  }).filter((r) => r.investment !== undefined);

  const livestockROI = livestock.map((l) => {
    const linkedIncome = incomeByLink[l._id] || 0;
    const linkedExpense = expenseByLink[l._id] || 0;
    const investment = Number(l.acquisitionCost || 0) + linkedExpense;
    const returns = (Number(l.saleValue) || 0) + linkedIncome;
    const roi = calculateROI(investment, returns);
    return {
      id: l._id,
      name: `${l.species} (${l.tagId})`,
      type: 'livestock',
      healthStatus: l.healthStatus,
      ...roi
    };
  }).filter((r) => r.investment !== undefined);

  const all = [...cropROI, ...livestockROI].filter((r) => r.roiPercent !== null && r.roiPercent !== undefined);
  const totalInvestment = round2(all.reduce((s, r) => s + (r.investment || 0), 0));
  const totalReturns = round2(all.reduce((s, r) => s + (r.returns || 0), 0));
  const overallROI = totalInvestment > 0 ? round2(((totalReturns - totalInvestment) / totalInvestment) * 100) : null;

  const ranked = [...all].sort((a, b) => (b.roiPercent || -Infinity) - (a.roiPercent || -Infinity));

  res.json({
    crops: cropROI,
    livestock: livestockROI,
    summary: {
      totalInvestment,
      totalReturns,
      overallROI,
      bestPerformer: ranked[0] || null,
      worstPerformer: ranked[ranked.length - 1] || null
    }
  });
});

module.exports = router;
