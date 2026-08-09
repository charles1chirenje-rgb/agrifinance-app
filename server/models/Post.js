const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  authorName: { type: String, required: true },
  farmName: { type: String, default: '' },
  tag: { type: String, enum: ['tip', 'question', 'alert', 'success'], default: 'tip' },
  title: { type: String, required: true },
  body: { type: String, required: true },
  likes: [{ type: String }],
  replies: [{
    userId: String,
    name: String,
    text: String,
    date: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Post || mongoose.model('Post', PostSchema);
