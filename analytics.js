/**
 * AgriFinance analytics engine
 * - linearRegression(): simple least-squares fit used for cash-flow forecasting
 * - forecastCashflow(): buckets transactions by month, forecasts N months ahead
 * - roiForEnterprise(): ROI = (returns - investment) / investment * 100
 */

// y = a + b*x   (x = period index, y = net cash flow)
function linearRegression(points) {
  const n = points.length;
  if (n === 0) return { a: 0, b: 0 };
  if (n === 1) return { a: points[0].y, b: 0 };

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumXX - sumX * sumX;
  const b = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  return { a, b };
}

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * transactions: [{ type: 'income'|'expense', amount, date }]
 * monthsAhead: how many future months to project
 */
function forecastCashflow(transactions, monthsAhead = 3) {
  const byMonth = {};
  transactions.forEach((t) => {
    const key = monthKey(t.date);
    if (!byMonth[key]) byMonth[key] = { income: 0, expense: 0 };
    if (t.type === 'income') byMonth[key].income += Number(t.amount);
    else byMonth[key].expense += Number(t.amount);
  });

  const months = Object.keys(byMonth).sort();
  const history = months.map((m, i) => ({
    month: m,
    income: round2(byMonth[m].income),
    expense: round2(byMonth[m].expense),
    net: round2(byMonth[m].income - byMonth[m].expense)
  }));

  const points = history.map((h, i) => ({ x: i, y: h.net }));
  const { a, b } = linearRegression(points);

  const incomePoints = history.map((h, i) => ({ x: i, y: h.income }));
  const expensePoints = history.map((h, i) => ({ x: i, y: h.expense }));
  const incomeFit = linearRegression(incomePoints);
  const expenseFit = linearRegression(expensePoints);

  const forecast = [];
  const lastIndex = history.length - 1;
  for (let i = 1; i <= monthsAhead; i++) {
    const x = lastIndex + i;
    const [y, m2] = nextMonth(months[months.length - 1] || currentMonthKey(), i);
    forecast.push({
      month: m2,
      projectedIncome: round2(Math.max(0, incomeFit.a + incomeFit.b * x)),
      projectedExpense: round2(Math.max(0, expenseFit.a + expenseFit.b * x)),
      projectedNet: round2(a + b * x)
    });
  }

  // simple trend classification + alert (rule-based, matches thesis' AI Insight module)
  let trend = 'stable';
  if (b > 1) trend = 'improving';
  else if (b < -1) trend = 'declining';

  const alerts = [];
  if (trend === 'declining') {
    alerts.push('Net cash flow trend is declining - review expense categories and consider deferring non-essential input purchases.');
  }
  const latestNet = history.length ? history[history.length - 1].net : 0;
  if (latestNet < 0) {
    alerts.push('Most recent month closed with a net loss - cross-check outstanding loan repayments against current liquidity.');
  }
  if (forecast.length && forecast[0].projectedNet < 0) {
    alerts.push(`Cash flow is projected to go negative in ${forecast[0].month} - plan financing or reduce planned spend ahead of that period.`);
  }

  return { history, forecast, trend, slope: round2(b), alerts };
}

function nextMonth(baseKey, offset) {
  const [y, m] = baseKey.split('-').map(Number);
  const d = new Date(y, (m - 1) + offset, 1);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return [d, key];
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * ROI for a single crop or livestock enterprise.
 * investment: capital committed (planting costs / acquisition cost + linked expenses)
 * returns: revenue realised (sale value + linked income transactions)
 */
function calculateROI(investment, returns) {
  if (!investment || investment <= 0) return null;
  const profit = returns - investment;
  const roiPercent = (profit / investment) * 100;
  return { investment: round2(investment), returns: round2(returns), profit: round2(profit), roiPercent: round2(roiPercent) };
}

module.exports = { linearRegression, forecastCashflow, calculateROI, round2 };
