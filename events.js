const repo = require('../repo');

// Every create/update on crops, livestock, transactions and loans writes an
// Event record. The dashboard/live-tracking pages poll GET /api/events so
// the owner and admin can see farm activity as it happens.
async function logEvent(userId, entity, entityId, action, message) {
  try {
    await repo.create('events', { userId, entity, entityId, action, message });
  } catch (err) {
    console.error('Failed to log event', err.message);
  }
}

module.exports = { logEvent };
