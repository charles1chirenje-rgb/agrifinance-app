const express = require('express');
const repo = require('../repo');
const { requireAuth } = require('../middleware/auth');
const { logEvent } = require('../utils/events');

const router = express.Router();

// GET /api/marketplace - the whole-deployment produce/inputs/equipment board.
// Unlike ledger/crops/livestock (private to each user), this is shared across
// every farmer using the app, since the point is to be seen by others.
router.get('/', requireAuth, async (req, res) => {
  const all = await repo.list('listings', {});
  const filtered = all.filter((l) => {
    if (req.query.category && l.category !== req.query.category) return false;
    if (req.query.dealType && l.dealType !== req.query.dealType) return false;
    if (req.query.mine === 'true' && l.userId !== req.user.id) return false;
    if (req.query.mine !== 'true' && l.status !== 'active') return false;
    return true;
  });
  res.json({ listings: filtered });
});

router.post('/', requireAuth, async (req, res) => {
  const { category, dealType, title, description, quantity, unit, price, currency, location } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const record = await repo.create('listings', {
    userId: req.user.id,
    sellerName: req.user.name,
    farmName: req.user.farmName || '',
    category: category || 'produce',
    dealType: dealType || 'sell',
    title,
    description: description || '',
    quantity: Number(quantity) || 0,
    unit: unit || '',
    price: Number(price) || 0,
    currency: currency || 'USD',
    location: location || '',
    status: 'active'
  });
  await logEvent(req.user.id, 'listing', record._id, 'created', `Listed "${title}" on the community marketplace`);
  res.status(201).json({ listing: record });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await repo.findById('listings', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Listing not found' });
  if (existing.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to edit this listing' });
  }
  const allowed = ['title', 'description', 'quantity', 'unit', 'price', 'currency', 'location', 'status', 'category', 'dealType'];
  const patch = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) patch[k] = req.body[k]; });
  const updated = await repo.updateById('listings', req.params.id, patch);
  if (patch.status === 'fulfilled') {
    await logEvent(req.user.id, 'listing', req.params.id, 'fulfilled', `"${existing.title}" marked as fulfilled`);
  }
  res.json({ listing: updated });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await repo.findById('listings', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Listing not found' });
  if (existing.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this listing' });
  }
  await repo.removeById('listings', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
