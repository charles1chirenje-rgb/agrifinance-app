const express = require('express');
const repo = require('../repo');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - admin only: list every farm user/account
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const users = await repo.list('users');
  res.json({ users: users.map(({ password, ...u }) => u) });
});

// PATCH /api/users/:id/role - admin only: promote/demote a user
router.patch('/:id/role', requireAuth, requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'role must be admin or user' });
  const updated = await repo.updateById('users', req.params.id, { role });
  if (!updated) return res.status(404).json({ error: 'User not found' });
  const { password, ...rest } = updated;
  res.json({ user: rest });
});

// DELETE /api/users/:id - admin only
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: "You can't remove your own account" });
  await repo.removeById('users', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
