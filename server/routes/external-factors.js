const express = require('express');
const router = express.Router();
const repo = require('../repo');

// GET /api/external-factors
router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query;
    
    let rawFactors = [];
    try {
      rawFactors = await repo.list('events');
    } catch (dbErr) {
      console.error('Repo fetch error in external-factors:', dbErr.message);
      rawFactors = [];
    }

    let factors = Array.isArray(rawFactors) ? rawFactors : [];

    if (category) {
      factors = factors.filter(f => f && f.category === category);
    }
    if (status) {
      factors = factors.filter(f => f && f.status === status);
    }

    return res.status(200).json({ factors });
  } catch (err) {
    console.error('GET /api/external-factors fatal error:', err);
    return res.status(200).json({ factors: [] });
  }
});

// POST /api/external-factors
router.post('/', async (req, res) => {
  try {
    const { title, category, severity, dateOccurred, estimatedImpact, affectedArea, description } = req.body;

    // Ensure title is provided
    const eventTitle = title || description || 'External Event';

    const payload = {
      title: eventTitle,
      category: category || 'other',
      severity: severity || 'medium',
      dateOccurred: dateOccurred || new Date().toISOString(),
      estimatedImpact: estimatedImpact ? Number(estimatedImpact) : 0,
      affectedArea: affectedArea || '',
      description: description || '',
      status: 'ongoing',
      // Required fields for Mongoose Event model validation
      message: description || eventTitle,
      action: 'Monitor',
      entityId: 'risk-log',
      entity: category || 'Farm',
      userId: 'system-user',
      createdAt: new Date().toISOString()
    };

    const newFactor = await repo.create('events', payload);

    return res.status(201).json({ success: true, factor: newFactor });
  } catch (err) {
    console.error('POST /api/external-factors error:', err);
    return res.status(500).json({ error: err.message || 'Failed to log event' });
  }
});

// PATCH /api/external-factors/:id
router.patch('/:id', async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const updated = await repo.updateById('events', req.params.id, {
      ...(status && { status }),
      ...(resolutionNotes !== undefined && { resolutionNotes })
    });
    return res.status(200).json({ success: true, factor: updated });
  } catch (err) {
    console.error('PATCH /api/external-factors error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update event' });
  }
});

// DELETE /api/external-factors/:id
router.delete('/:id', async (req, res) => {
  try {
    await repo.removeById('events', req.params.id);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('DELETE /api/external-factors error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete event' });
  }
});

module.exports = router;