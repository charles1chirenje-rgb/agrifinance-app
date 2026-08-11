const express = require('express');
const router = express.Router();
const repo = require('../repo'); // Uses repo layer[cite: 3]

// Internal audit helper (kept so other backend routes can still import and use it)
async function logEvent(userId, entity, entityId, action, message) {
  try {
    await repo.create('events', { userId, entity, entityId, action, message });[cite: 3]
  } catch (err) {
    console.error('Failed to log audit event:', err.message);
  }
}

// ---------------------------------------------------------
// HTTP REST ENDPOINTS FOR RISK LOG / EVENTS
// ---------------------------------------------------------

// GET /api/events - Retrieve all events for Risk Log and Activity Feeds
router.get('/', async (req, res) => {
  try {
    const events = await repo.list('events');[cite: 3]
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events - Save a new external risk/event from the modal
router.post('/', async (req, res) => {
  try {
    const { title, category, severity, dateOccurred, impact, area, description } = req.body;

    const newEvent = await repo.create('events', {[cite: 3]
      title: title || 'External Event',
      category: category || 'General',
      severity: severity || 'Medium',
      dateOccurred: dateOccurred || new Date().toISOString(),
      impact: impact ? Number(impact) : 0,
      area: area || '',
      description: description || '',
      status: 'Open',
      userId: req.user ? req.user.id : null
    });

    res.status(201).json({ success: true, event: newEvent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Attach helper function to router object so both require() patterns work
router.logEvent = logEvent;

module.exports = router;