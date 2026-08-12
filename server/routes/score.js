const express = require('express');
const repo = require('../repo');
const { computeFarmScore } = require('../utils/farmScore');

const router = express.Router();

// GET /api/score - Public/accessible farm health score calculation
router.get('/', async (req, res) => {
  try {
    const scope = req.query.all === 'true' ? {} : {};
    const [transactions, loans, crops, livestock] = await Promise.all([
      repo.list('transactions', scope),
      repo.list('loans', scope),
      repo.list('crops', scope),
      repo.list('livestock', scope)
    ]);
    return res.json(computeFarmScore({ transactions, loans, crops, livestock }));
  } catch (err) {
    console.error('GET /api/score error:', err);
    return res.status(500).json({ error: 'Failed to compute score' });
  }
});

module.exports = router;