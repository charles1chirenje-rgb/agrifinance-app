const express = require('express');
const repo = require('../repo');
const { requireAuth } = require('../middleware/auth');
const { logEvent } = require('../utils/events');

const router = express.Router();

function scope(req) {
  if (req.user.role === 'admin' && req.query.all === 'true') return {};
  return { userId: req.user.id };
}

router.get('/', requireAuth, async (req, res) => {
  const items = await repo.list('loans', scope(req));
  res.json({ loans: items });
});

router.post('/', requireAuth, async (req, res) => {
  const { lender, principal, interestRate, dueDate, purpose } = req.body;
  if (!lender || principal === undefined || !dueDate) {
    return res.status(400).json({ error: 'lender, principal and dueDate are required' });
  }
  const record = await repo.create('loans', {
    userId: req.user.id,
    lender,
    principal: Number(principal),
    interestRate: Number(interestRate) || 0,
    amountRepaid: 0,
    dueDate,
    status: 'active',
    purpose: purpose || ''
  });
  await logEvent(req.user.id, 'loan', record._id, 'created', `Loan recorded: ${lender} - $${principal}`);
  res.status(201).json({ loan: record });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await repo.findById('loans', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Loan not found' });
  if (existing.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to edit this record' });
  }
  const patch = { ...req.body };
  // auto-mark repaid when amountRepaid reaches principal
  const repaid = patch.amountRepaid !== undefined ? Number(patch.amountRepaid) : existing.amountRepaid;
  const principal = existing.principal;
  if (repaid >= principal) patch.status = 'repaid';
  const updated = await repo.updateById('loans', req.params.id, patch);
  if (patch.amountRepaid !== undefined) {
    await logEvent(req.user.id, 'loan', req.params.id, 'repayment', `Repayment logged on ${existing.lender} loan`);
  }
  res.json({ loan: updated });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await repo.findById('loans', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Loan not found' });
  if (existing.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this record' });
  }
  await repo.removeById('loans', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
