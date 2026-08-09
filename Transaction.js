const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, required: true },
  enterprise: { type: String, enum: ['crop', 'livestock', 'general'], default: 'general' },
  linkedId: { type: String, default: null },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['USD', 'ZiG'], default: 'USD' },
  date: { type: String, required: true },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
