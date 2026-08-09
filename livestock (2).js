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
  const items = await repo.list('livestock', scope(req));
  res.json({ livestock: items });
});

router.post('/', requireAuth, async (req, res) => {
  const { species, tagId, count, acquiredDate, acquisitionCost } = req.body;
  if (!species || !tagId || !acquiredDate) {
    return res.status(400).json({ error: 'species, tagId and acquiredDate are required' });
  }
  const record = await repo.create('livestock', {
    userId: req.user.id,
    species,
    tagId,
    count: Number(count) || 1,
    healthStatus: 'healthy',
    acquiredDate,
    acquisitionCost: Number(acquisitionCost) || 0,
    saleValue: null,
    saleDate: null,
    notes: []
  });
  await logEvent(req.user.id, 'livestock', record._id, 'created', `${species} (${tagId}) added to herd/flock`);
  res.status(201).json({ livestock: record });
});

// PATCH /api/livestock/:id - health status / sale updates (live tracking write path)
router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await repo.findById('livestock', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Livestock record not found' });
  if (existing.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to edit this record' });
  }
  const patch = { ...req.body };
  const updated = await repo.updateById('livestock', req.params.id, patch);

  if (patch.healthStatus && patch.healthStatus !== existing.healthStatus) {
    await logEvent(req.user.id, 'livestock', req.params.id, 'health_updated', `${existing.tagId} health status: ${patch.healthStatus.replace('_', ' ')}`);
  }
  if (patch.saleValue !== undefined && patch.saleValue !== null) {
    await logEvent(req.user.id, 'livestock', req.params.id, 'sold', `${existing.tagId} sold for $${patch.saleValue}`);
  }
  res.json({ livestock: updated });
});

router.post('/:id/notes', requireAuth, async (req, res) => {
  const existing = await repo.findById('livestock', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Livestock record not found' });
  if (existing.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to edit this record' });
  }
  const note = { text: req.body.text, date: new Date().toISOString() };
  const notes = [...(existing.notes || []), note];
  const updated = await repo.updateById('livestock', req.params.id, { notes });
  await logEvent(req.user.id, 'livestock', req.params.id, 'note_added', `Note added for ${existing.tagId}: ${req.body.text}`);
  res.json({ livestock: updated });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await repo.findById('livestock', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Livestock record not found' });
  if (existing.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this record' });
  }
  await repo.removeById('livestock', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
