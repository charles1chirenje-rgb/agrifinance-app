const express = require('express');
const repo = require('../repo');
const { requireAuth } = require('../middleware/auth');
const { computeFarmScore } = require('../utils/farmScore');

const router = express.Router();

// GET /api/score - the gamified Farm Health Score, computed live from the
// farm's own records (no separate table to keep in sync).
router.get('/', requireAuth, async (req, res) => {
  const scope = req.user.role === 'admin' && req.query.all === 'true' ? {} : { userId: req.user.id };
  const [transactions, loans, crops, livestock] = await Promise.all([
    repo.list('transactions', scope),
    repo.list('loans', scope),
    repo.list('crops', scope),
    repo.list('livestock', scope)
  ]);
  res.json(computeFarmScore({ transactions, loans, crops, livestock }));
});

module.exports = router;
