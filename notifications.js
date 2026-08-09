const express = require('express');
const repo = require('../repo');
const { requireAuth } = require('../middleware/auth');
const { computeLiveTracking } = require('../utils/growthModel');

const router = express.Router();

// GET /api/notifications - deterministic, always-available alerts (loans due
// soon, crop stage mismatches, sick livestock). Complements /api/assistant/insights,
// which needs an AI key configured; this endpoint never depends on that.
router.get('/', requireAuth, async (req, res) => {
  const scope = req.user.role === 'admin' && req.query.all === 'true' ? {} : { userId: req.user.id };
  const [loans, crops, livestock] = await Promise.all([
    repo.list('loans', scope),
    repo.list('crops', scope),
    repo.list('livestock', scope)
  ]);

  const notifications = [];
  const now = Date.now();

  loans.forEach((l) => {
    if (l.status === 'repaid') return;
    const due = new Date(l.dueDate).getTime();
    const daysLeft = Math.ceil((due - now) / 86400000);
    if (daysLeft < 0) {
      notifications.push({ tone: 'warning', text: `${l.lender} loan is overdue by ${Math.abs(daysLeft)} day(s).` });
    } else if (daysLeft <= 14) {
      notifications.push({ tone: 'warning', text: `${l.lender} loan of $${l.principal} is due in ${daysLeft} day(s).` });
    }
  });

  crops.forEach((c) => {
    if (c.status !== 'active') return;
    const live = computeLiveTracking(c);
    if (live.stageMismatch) {
      notifications.push({ tone: 'info', text: `${c.name} (${c.plotName || 'plot'}) looks ready to move to "${live.autoStage.replace('_', ' ')}" based on days since planting - the record still shows "${c.stage}".` });
    }
    if (live.daysToHarvest !== null && live.daysToHarvest <= 14 && live.daysToHarvest > 0) {
      notifications.push({ tone: 'positive', text: `${c.name} is approximately ${live.daysToHarvest} day(s) from expected harvest.` });
    }
  });

  livestock.forEach((l) => {
    if (l.healthStatus === 'sick' || l.healthStatus === 'under_treatment') {
      notifications.push({ tone: 'warning', text: `${l.species} ${l.tagId} is currently marked "${l.healthStatus.replace('_', ' ')}" - follow up if untreated.` });
    }
  });

  res.json({ notifications: notifications.slice(0, 20) });
});

module.exports = router;
