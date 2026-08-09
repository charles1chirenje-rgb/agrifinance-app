const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  lender: { type: String, required: true },
  principal: { type: Number, required: true },
  interestRate: { type: Number, default: 0 },
  amountRepaid: { type: Number, default: 0 },
  dueDate: { type: String, required: true },
  status: { type: String, enum: ['active', 'repaid', 'overdue'], default: 'active' },
  purpose: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Loan || mongoose.model('Loan', LoanSchema);
