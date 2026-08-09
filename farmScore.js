/**
 * Farm Health Score engine.
 *
 * A single 0-100 gamified score computed live from the farm's own records —
 * no separate tracking table, no manual data entry. It blends four weighted
 * pillars so a farmer gets one number (and a level/badge) that reflects the
 * whole operation at a glance, plus a breakdown showing exactly why.
 *
 *   Cash flow health   35%  - balance sign, income/expense ratio
 *   Loan health         25%  - overdue vs on-time repayment
 *   Crop tracking       20%  - live-tracking mismatches vs active crops
 *   Livestock health    20%  - % healthy vs sick/under treatment
 *
 * Pillars with no data simply don't count against the farmer (weight is
 * redistributed), so a brand-new account doesn't start at zero.
 */
const { computeLiveTracking } = require('./growthModel');

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function scoreCashflow(transactions) {
  if (!transactions.length) return null;
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;
  if (income === 0 && expense === 0) return null;
  // ratio of balance to income, mapped onto a 0-100 curve; a farm breaking
  // even scores ~60, healthy margin scores toward 100, losses drag it down.
  const ratio = income > 0 ? balance / income : -1;
  const score = clamp(60 + ratio * 80, 0, 100);
  return {
    score: Math.round(score),
    note: balance >= 0
      ? `Running a positive balance of $${balance.toFixed(2)}.`
      : `Running a deficit of $${Math.abs(balance).toFixed(2)} — expenses currently outpace income.`
  };
}

function scoreLoans(loans) {
  if (!loans.length) return null;
  const now = Date.now();
  let overdue = 0;
  let dueSoon = 0;
  loans.forEach((l) => {
    if (l.status === 'repaid') return;
    const daysLeft = Math.ceil((new Date(l.dueDate).getTime() - now) / 86400000);
    if (daysLeft < 0) overdue += 1;
    else if (daysLeft <= 14) dueSoon += 1;
  });
  const active = loans.filter((l) => l.status !== 'repaid').length || 1;
  const score = clamp(100 - (overdue / active) * 100 - (dueSoon / active) * 25, 0, 100);
  return {
    score: Math.round(score),
    note: overdue > 0
      ? `${overdue} loan(s) currently overdue.`
      : dueSoon > 0
        ? `${dueSoon} loan(s) due within two weeks.`
        : 'No loans overdue or due imminently.'
  };
}

function scoreCrops(crops) {
  const active = crops.filter((c) => c.status === 'active');
  if (!active.length) return null;
  const mismatches = active.filter((c) => computeLiveTracking(c).stageMismatch).length;
  const score = clamp(100 - (mismatches / active.length) * 100, 0, 100);
  return {
    score: Math.round(score),
    note: mismatches > 0
      ? `${mismatches} of ${active.length} active crop(s) have a stage record that's fallen behind.`
      : `All ${active.length} active crop(s) are tracked and up to date.`
  };
}

function scoreLivestock(livestock) {
  const live = livestock.filter((l) => l.healthStatus !== 'sold' && l.healthStatus !== 'deceased');
  if (!live.length) return null;
  const unwell = live.filter((l) => l.healthStatus === 'sick' || l.healthStatus === 'under_treatment').length;
  const score = clamp(100 - (unwell / live.length) * 100, 0, 100);
  return {
    score: Math.round(score),
    note: unwell > 0
      ? `${unwell} of ${live.length} animal record(s) currently sick or under treatment.`
      : `All ${live.length} animal record(s) are healthy.`
  };
}

function levelFor(score) {
  if (score >= 91) return { level: 'Flourishing Farm', tone: 'positive' };
  if (score >= 71) return { level: 'Thriving Farm', tone: 'positive' };
  if (score >= 41) return { level: 'Growing Steady', tone: 'info' };
  return { level: 'Needs Attention', tone: 'warning' };
}

function computeFarmScore({ transactions, loans, crops, livestock }) {
  const pillars = [
    { key: 'cashflow', label: 'Cash flow', weight: 0.35, result: scoreCashflow(transactions) },
    { key: 'loans', label: 'Loan health', weight: 0.25, result: scoreLoans(loans) },
    { key: 'crops', label: 'Crop tracking', weight: 0.20, result: scoreCrops(crops) },
    { key: 'livestock', label: 'Livestock health', weight: 0.20, result: scoreLivestock(livestock) }
  ].filter((p) => p.result !== null);

  if (!pillars.length) {
    return {
      score: null,
      level: 'Getting Started',
      tone: 'info',
      breakdown: [],
      message: 'Log a few transactions, crops, loans or livestock records to unlock your Farm Health Score.'
    };
  }

  const totalWeight = pillars.reduce((s, p) => s + p.weight, 0);
  const score = Math.round(pillars.reduce((s, p) => s + (p.result.score * p.weight), 0) / totalWeight);
  const { level, tone } = levelFor(score);

  return {
    score,
    level,
    tone,
    breakdown: pillars.map((p) => ({ label: p.label, score: p.result.score, note: p.result.note })),
    message: null
  };
}

module.exports = { computeFarmScore };
