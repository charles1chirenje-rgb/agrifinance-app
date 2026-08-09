const express = require('express');
const repo = require('../repo');
const { requireAuth } = require('../middleware/auth');
const { logEvent } = require('../utils/events');

const router = express.Router();

function scope(req) {
  // Admins can request ?all=true to see the whole farm's transactions;
  // regular users always see only their own records.
  if (req.user.role === 'admin' && req.query.all === 'true') return {};
  return { userId: req.user.id };
}

// GET /api/transactions
router.get('/', requireAuth, async (req, res) => {
  const items = await repo.list('transactions', scope(req));
  res.json({ transactions: items });
});

// POST /api/transactions
router.post('/', requireAuth, async (req, res) => {
  const { type, category, amount, currency, date, note, enterprise, linkedId } = req.body;
  if (!type || !category || amount === undefined || !date) {
    return res.status(400).json({ error: 'type, category, amount and date are required' });
  }
  if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'type must be income or expense' });

  const record = await repo.create('transactions', {
    userId: req.user.id,
    type,
    category,
    amount: Number(amount),
    currency: currency || req.user.currency || 'USD',
    date,
    note: note || '',
    enterprise: enterprise || 'general',
    linkedId: linkedId || null
  });

  await logEvent(req.user.id, 'transaction', record._id, 'created',
    `${type === 'income' ? 'Income' : 'Expense'} logged: ${category} - ${currency || 'USD'} ${amount}`);

  res.status(201).json({ transaction: record });
});

// PATCH /api/transactions/:id
router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await repo.findById('transactions', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });
  if (existing.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to edit this record' });
  }
  const updated = await repo.updateById('transactions', req.params.id, req.body);
  res.json({ transaction: updated });
});

// DELETE /api/transactions/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await repo.findById('transactions', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });
  if (existing.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this record' });
  }
  await repo.removeById('transactions', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
