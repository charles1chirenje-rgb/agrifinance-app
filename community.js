const express = require('express');
const repo = require('../repo');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/community - farm-to-farm knowledge feed: tips, questions, alerts
// (e.g. pest sightings), success stories. Shared across every user.
router.get('/', requireAuth, async (req, res) => {
  const all = await repo.list('posts', {});
  const filtered = req.query.tag ? all.filter((p) => p.tag === req.query.tag) : all;
  res.json({ posts: filtered });
});

router.post('/', requireAuth, async (req, res) => {
  const { tag, title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });

  const record = await repo.create('posts', {
    userId: req.user.id,
    authorName: req.user.name,
    farmName: req.user.farmName || '',
    tag: tag || 'tip',
    title,
    body,
    likes: [],
    replies: []
  });
  res.status(201).json({ post: record });
});

router.post('/:id/like', requireAuth, async (req, res) => {
  const existing = await repo.findById('posts', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Post not found' });
  const likes = existing.likes || [];
  const already = likes.includes(req.user.id);
  const nextLikes = already ? likes.filter((id) => id !== req.user.id) : [...likes, req.user.id];
  const updated = await repo.updateById('posts', req.params.id, { likes: nextLikes });
  res.json({ post: updated });
});

router.post('/:id/replies', requireAuth, async (req, res) => {
  const existing = await repo.findById('posts', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Post not found' });
  if (!req.body.text) return res.status(400).json({ error: 'text is required' });
  const reply = { userId: req.user.id, name: req.user.name, text: req.body.text, date: new Date().toISOString() };
  const replies = [...(existing.replies || []), reply];
  const updated = await repo.updateById('posts', req.params.id, { replies });
  res.json({ post: updated });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await repo.findById('posts', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Post not found' });
  if (existing.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this post' });
  }
  await repo.removeById('posts', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
