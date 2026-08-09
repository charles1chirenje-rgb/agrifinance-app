const express = require('express');
const repo = require('../repo');
const { requireAuth } = require('../middleware/auth');
const { logEvent } = require('../utils/events');
const { computeLiveTracking } = require('../utils/growthModel');

const router = express.Router();

function scope(req) {
  if (req.user.role === 'admin' && req.query.all === 'true') return {};
  return { userId: req.user.id };
}

// GET /api/crops - every record is enriched with live, on-the-fly tracking data
// (auto-detected growth stage, days to harvest, progress %) computed from the
// planting date against a phenology timeline, so tracking stays current even
// if nobody manually updates the stage.
router.get('/', requireAuth, async (req, res) => {
  const items = await repo.list('crops', scope(req));
  const enriched = items.map((c) => ({ ...c, live: computeLiveTracking(c) }));
  res.json({ crops: enriched });
});

// POST /api/crops/:id/sync-stage - accept the auto-detected stage as the
// official recorded stage (one click instead of manually picking from a list)
router.post('/:id/sync-stage', requireAuth, async (req, res) => {
  const existing = await repo.findById('crops', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Crop not found' });
  if (existing.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to edit this record' });
  }
  const live = computeLiveTracking(existing);
  const updated = await repo.updateById('crops', req.params.id, { stage: live.autoStage });
  await logEvent(req.user.id, 'crop', req.params.id, 'stage_updated', `${existing.name} auto-synced to ${live.autoStage.replace('_', ' ')}`);
  res.json({ crop: { ...updated, live: computeLiveTracking(updated) } });
});

router.post('/', requireAuth, async (req, res) => {
  const { name, plotName, areaHectares, plantedDate, expectedHarvestDate, expectedYieldTonnes, investment } = req.body;
  if (!name || !plantedDate) return res.status(400).json({ error: 'name and plantedDate are required' });

  const record = await repo.create('crops', {
    userId: req.user.id,
    name,
    plotName: plotName || '',
    areaHectares: Number(areaHectares) || 0,
    stage: 'planted',
    plantedDate,
    expectedHarvestDate: expectedHarvestDate || '',
    expectedYieldTonnes: Number(expectedYieldTonnes) || 0,
    actualYieldTonnes: null,
    investment: Number(investment) || 0,
    status: 'active',
    notes: []
  });
  await logEvent(req.user.id, 'crop', record._id, 'created', `${name} planted on ${plotName || 'plot'} (${areaHectares || '?'} ha)`);
  res.status(201).json({ crop: record });
});

// PATCH /api/crops/:id - update stage / yield / status (this is the "live tracking" write path)
router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await repo.findById('crops', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Crop not found' });
  if (existing.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to edit this record' });
  }
  const patch = { ...req.body };
  if (patch.stage === 'harvested') patch.status = 'harvested';

  const updated = await repo.updateById('crops', req.params.id, patch);

  if (patch.stage && patch.stage !== existing.stage) {
    await logEvent(req.user.id, 'crop', req.params.id, 'stage_updated', `${existing.name} moved to ${patch.stage.replace('_', ' ')}`);
  }
  if (patch.actualYieldTonnes !== undefined) {
    await logEvent(req.user.id, 'crop', req.params.id, 'yield_recorded', `${existing.name} harvest yield recorded: ${patch.actualYieldTonnes}t`);
  }
  res.json({ crop: updated });
});

// POST /api/crops/:id/notes - append a field note (used by the live timeline view)
router.post('/:id/notes', requireAuth, async (req, res) => {
  const existing = await repo.findById('crops', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Crop not found' });
  if (existing.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to edit this record' });
  }
  const note = { text: req.body.text, date: new Date().toISOString() };
  const notes = [...(existing.notes || []), note];
  const updated = await repo.updateById('crops', req.params.id, { notes });
  await logEvent(req.user.id, 'crop', req.params.id, 'note_added', `Field note added for ${existing.name}: ${req.body.text}`);
  res.json({ crop: updated });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await repo.findById('crops', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Crop not found' });
  if (existing.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this record' });
  }
  await repo.removeById('crops', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
