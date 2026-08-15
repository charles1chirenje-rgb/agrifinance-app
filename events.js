const express = require('express');
const router = express.Router();
const repo = require('../repo');

// Helper function for system audit logging across other files
async function logEvent(userId, entity, entityId, action, message) {
  try {
    await repo.create('events', { 
      userId: userId || 'system-user', 
      entity: entity || 'System', 
      entityId: entityId || 'general', 
      action: action || 'Action', 
      message: message || 'Event logged' 
    });
  } catch (err) {
    console.error('Failed to log audit event:', err.message);
  }
}

// GET /api/events - Retrieve events
router.get('/', async (req, res) => {
  try {
    const events = await repo.list('events');
    res.json({ events: events || [] });
  } catch (err) {
    console.error('GET /api/events error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events - Create an event
router.post('/', async (req, res) => {
  try {
    const { title, category, severity, dateOccurred, estimatedImpact, affectedArea, description, userId, entity, entityId, action, message } = req.body;

    const newEvent = await repo.create('events', {
      title: title || 'External Event',
      category: category || 'other',
      severity: severity || 'medium',
      dateOccurred: dateOccurred || new Date().toISOString(),
      estimatedImpact: estimatedImpact ? Number(estimatedImpact) : 0,
      affectedArea: affectedArea || '',
      description: description || '',
      status: 'ongoing',
      // Explicitly satisfy Mongoose schema validation requirements for the 'events' model
      message: message || description || title || 'Event logged',
      action: action || 'Monitor',
      entityId: entityId || 'general',
      entity: entity || category || 'Farm',
      userId: userId || 'system-user',
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ success: true, event: newEvent });
  } catch (err) {
    console.error('POST /api/events error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Attach logEvent directly to the exported router instance safely
router.logEvent = logEvent;

module.exports = router;