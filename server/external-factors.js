const express = require('express');
const router = express.Router();
const repo = require('../repo');

// GET /api/external-factors
router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query;
    
    // Safely fetch events from repo
    let rawFactors = await repo.list('events');
    let factors = Array.isArray(rawFactors) ? rawFactors : [];

    // Apply optional frontend query filters
    if (category) {
      factors = factors.filter(f => f && f.category === category);
    }
    if (status) {
      factors = factors.filter(f => f && f.status === status);
    }

    return res.status(200).json({ factors });
  } catch (err) {
    console.error('GET /api/external-factors error:', err);
    // Return empty array on failure so frontend won't crash
    return res.status(200).json({ factors: [] });
  }
});

// POST /api/external-factors
router.post('/', async (req, res) => {
  try {
    const { title, category, severity, dateOccurred, estimatedImpact, affectedArea, description } = req.body;

    if (!title || !dateOccurred) {
      return res.status(400).json({ error: 'Title and Date Occurred are required.' });
    }

    const payload = {
      title,
      category: category || 'other',
      severity: severity || 'medium',
      dateOccurred,
      estimatedImpact: estimatedImpact ? Number(estimatedImpact) : 0,
      affectedArea: affectedArea || '',
      description: description || '',
      status: 'ongoing',
      createdAt: new Date().toISOString()
    };

    const newFactor = await repo.create('events', payload);

    return res.status(201).json({ success: true, factor: newFactor });
  } catch (err) {
    console.error('POST /api/external-factors error:', err);
    return res.status(500).json({ error: err.message || 'Failed to log event' });
  }
});

// PATCH /api/external-factors/:id (Mark Monitoring / Resolved)
router.patch('/:id', async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const updated = await repo.update('events', req.params.id, {
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
    await repo.delete('events', req.params.id);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('DELETE /api/external-factors error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete event' });
  }
});

module.exports = router;