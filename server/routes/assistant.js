const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const repo = require('../repo');
const { requireAuth } = require('../middleware/auth');
const { forecastCashflow, calculateROI, round2 } = require('../utils/analytics');
const { computeLiveTracking } = require('../utils/growthModel');

const router = express.Router();

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Builds a compact, current snapshot of everything the assistant needs to
 * answer well - the ledger, loans, crops (with live auto-tracking data),
 * livestock, forecast and ROI - scoped to the requesting user (or the whole
 * farm, for an admin who has opted into whole-farm view). Kept as plain text
 * rather than raw JSON dumps so the model reasons over it more reliably.
 */
async function buildFarmContext(req) {
  const scope = req.user.role === 'admin' && req.query.all === 'true' ? {} : { userId: req.user.id };

  const [transactions, loans, crops, livestock] = await Promise.all([
    repo.list('transactions', scope),
    repo.list('loans', scope),
    repo.list('crops', scope),
    repo.list('livestock', scope)
  ]);

  const totalIncome = round2(transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0));
  const totalExpense = round2(transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0));
  const forecast = transactions.length ? forecastCashflow(transactions, 3) : null;

  const incomeByLink = {};
  transactions.forEach(t => { if (t.linkedId && t.type === 'income') incomeByLink[t.linkedId] = (incomeByLink[t.linkedId] || 0) + Number(t.amount); });
  const expenseByLink = {};
  transactions.forEach(t => { if (t.linkedId && t.type === 'expense') expenseByLink[t.linkedId] = (expenseByLink[t.linkedId] || 0) + Number(t.amount); });

  const cropLines = crops.map(c => {
    const live = computeLiveTracking(c);
    const roi = calculateROI(Number(c.investment || 0) + (expenseByLink[c._id] || 0), incomeByLink[c._id] || 0);
    return `- ${c.name} on ${c.plotName || 'unnamed plot'} (${c.areaHectares || 0} ha): recorded stage "${c.stage}", ` +
      `system-detected stage "${live.autoStage}"${live.stageMismatch ? ' (RECORD IS BEHIND - flag this to the farmer)' : ''}, ` +
      `${live.daysSincePlanted} days since planting, ${live.daysToHarvest !== null ? live.daysToHarvest + ' days to expected harvest' : ''}, ` +
      `status ${c.status}, expected yield ${c.expectedYieldTonnes}t${c.actualYieldTonnes !== null ? `, actual yield ${c.actualYieldTonnes}t` : ''}, ` +
      `ROI so far ${roi ? roi.roiPercent + '%' : 'not enough data'}.`;
  }).join('\n') || 'No crops recorded yet.';

  const livestockLines = livestock.map(l => {
    const roi = calculateROI(Number(l.acquisitionCost || 0) + (expenseByLink[l._id] || 0), (Number(l.saleValue) || 0) + (incomeByLink[l._id] || 0));
    return `- ${l.species} (tag ${l.tagId}), count ${l.count}, health "${l.healthStatus}", ` +
      `ROI ${roi ? roi.roiPercent + '%' : 'not enough data'}${l.saleValue ? `, sold for $${l.saleValue}` : ''}.`;
  }).join('\n') || 'No livestock recorded yet.';

  const loanLines = loans.map(l =>
    `- ${l.lender}: $${l.principal} principal at ${l.interestRate}% interest, $${l.amountRepaid} repaid, due ${l.dueDate}, status ${l.status}.`
  ).join('\n') || 'No loans recorded.';

  const forecastText = forecast
    ? `Cash flow trend: ${forecast.trend} (slope ${forecast.slope}/month). ` +
      `Next 3 months projected net: ${forecast.forecast.map(f => `${f.month}: $${f.projectedNet}`).join(', ')}. ` +
      (forecast.alerts.length ? `Alerts: ${forecast.alerts.join(' ')}` : 'No alerts.')
    : 'Not enough transaction history yet to forecast.';

  return `FARM: ${req.user.farmName || 'Farm 54'} (currency: ${req.user.currency || 'USD'})
Today's date: ${new Date().toISOString().slice(0, 10)}

FINANCES
Total income logged: $${totalIncome}. Total expense logged: $${totalExpense}. Net: $${round2(totalIncome - totalExpense)}.
${forecastText}

LOANS
${loanLines}

CROPS (live-tracked)
${cropLines}

LIVESTOCK (live-tracked)
${livestockLines}`;
}

const SYSTEM_PROMPT = `You are the AgriFinance Farm Assistant, built into a financial and farm-management app for small-to-medium-scale Zimbabwean farmers (case study: Farm 54, a sugarcane and livestock operation in Chiredzi).

You answer questions using ONLY the live farm data snapshot provided in each message - never invent figures. If the data doesn't cover something, say so plainly and suggest what the farmer should log to get an answer next time.

Be concise and practical: a working farmer wants a direct answer first, then brief supporting detail. Use the farm's actual currency and numbers. When relevant, proactively flag things worth the farmer's attention (a stage mismatch, a loan due soon, a declining cash-flow trend) even if not directly asked - that is the point of having live-tracked data. Keep responses under ~150 words unless the farmer asks for a detailed breakdown. Do not give binding financial, legal, agronomic or veterinary advice - frame anything beyond simple arithmetic on the data as a suggestion to confirm with an agronomist, vet, or accountant.`;

// POST /api/assistant/chat  { messages: [{role, content}, ...] }
router.post('/chat', requireAuth, async (req, res) => {
  const anthropic = getClient();
  if (!anthropic) {
    return res.status(503).json({ error: 'The AI assistant is not configured. Set ANTHROPIC_API_KEY on the server to enable it.' });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const context = await buildFarmContext(req);
    const trimmed = messages.slice(-12);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 500,
      system: `${SYSTEM_PROMPT}\n\nCURRENT FARM DATA SNAPSHOT:\n${context}`,
      messages: trimmed.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 2000) }))
    });

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    res.json({ reply: text });
  } catch (err) {
    console.error('Assistant error:', err.message);
    res.status(502).json({ error: 'The assistant could not respond right now. Please try again.' });
  }
});

// GET /api/assistant/insights - proactive, unprompted observations for the
// dashboard (no chat turn needed).
router.get('/insights', requireAuth, async (req, res) => {
  const anthropic = getClient();
  if (!anthropic) return res.json({ insights: [] });

  try {
    const context = await buildFarmContext(req);
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 300,
      system: `${SYSTEM_PROMPT}\n\nCURRENT FARM DATA SNAPSHOT:\n${context}\n\nRespond with a JSON array (max 3 items) of short, high-signal observations the farmer should see today, e.g. stage mismatches, loans due soon, ROI standouts, or cash-flow risk. Each item: {"tone": "warning"|"positive"|"info", "text": "..."}. Return ONLY the JSON array, no other text. If nothing notable, return [].`,
      messages: [{ role: 'user', content: "Give me today's farm insights." }]
    });
    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    let insights = [];
    try { insights = JSON.parse(text.trim()); } catch (e) { insights = []; }
    res.json({ insights: Array.isArray(insights) ? insights.slice(0, 3) : [] });
  } catch (err) {
    console.error('Insights error:', err.message);
    res.json({ insights: [] });
  }
});

module.exports = router;
