const express = require('express');
const bcrypt = require('bcryptjs');
const repo = require('../repo');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, farmName, currency, adminInviteCode } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    const existing = await repo.findOne('users', { email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

    // Simple admin bootstrap: a farm owner registering with the correct
    // invite code (set via env var) becomes an admin; everyone else is 'user'.
    const role = adminInviteCode && adminInviteCode === (process.env.ADMIN_INVITE_CODE || 'FARM54-OWNER')
      ? 'admin'
      : 'user';

    const hash = await bcrypt.hash(password, 10);
    const user = await repo.create('users', {
      name,
      email: email.toLowerCase().trim(),
      password: hash,
      role,
      farmName: farmName || 'Farm 54',
      currency: currency || 'USD'
    });

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const user = await repo.findOne('users', { email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const user = await repo.findById('users', req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

function publicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

module.exports = router;
