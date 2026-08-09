const express = require('express');
const repo = require('../repo');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/events - recent activity feed, polled by the frontend for "live" updates
router.get('/', requireAuth, async (req, res) => {
  const scope = req.user.role === 'admin' && req.query.all === 'true' ? {} : { userId: req.user.id };
  const items = await repo.list('events', scope);
  res.json({ events: items.slice(0, 50) });
});

module.exports = router;
