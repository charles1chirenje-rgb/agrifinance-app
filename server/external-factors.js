const express = require('express');
const router = express.Router();
const repo = require('../repo');

// GET /api/external-factors
router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query;
    let factors = await repo.list('events');

    // Apply optional frontend query filters
    if (category) {
      factors = factors.filter(f => f.category === category);
    }
    if (status) {
      factors = factors.filter(f => f.status === status);
    }

    res.json({ factors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/external-factors
router.post('/', async (req, res) => {
  try {
    const { title, category, severity, dateOccurred, estimatedImpact, affectedArea, description } = req.body;

    if (!title || !dateOccurred) {
      return res.status(400).json({ error: 'Title and Date Occurred are required.' });
    }

    const newFactor = await repo.create('events', {
      title,
      category: category || 'other',
      severity: severity || 'medium',
      dateOccurred,
      estimatedImpact: estimatedImpact ? Number(estimatedImpact) : 0,
      affectedArea: affectedArea || '',
      description: description || '',
      status: 'ongoing',
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ success: true, factor: newFactor });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.json({ success: true, factor: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/external-factors/:id
router.delete('/:id', async (req, res) => {
  try {
    await repo.delete('events', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;