/**
 * Zimbabwe smallholder/commercial crop calendar (Lowveld-leaning, matching
 * Farm 54's sugarcane belt but broadly applicable across regions). Months
 * are 1-12. This is intentionally a static reference table rather than an
 * AI call — it costs nothing, needs no API key, and never goes down, which
 * matters for a feature farmers may check every day during planting season.
 */
const CALENDAR = [
  { crop: 'Maize', plantMonths: [10, 11, 12], harvestMonths: [4, 5], note: 'Plant with the first effective rains; a Pfumvudza plot needs far less land to still make a difference.' },
  { crop: 'Sugarcane (new fields)', plantMonths: [9, 10, 11, 2, 3], harvestMonths: [], note: 'Spring or autumn planting window; avoid the coldest mid-winter months (June-July) for new setts.' },
  { crop: 'Groundnuts', plantMonths: [11, 12], harvestMonths: [4, 5], note: 'Sandy, well-drained soil; rotate with cereals to help restore soil nitrogen.' },
  { crop: 'Sorghum', plantMonths: [11, 12], harvestMonths: [4, 5], note: 'More drought-tolerant than maize — a good hedge in low-rainfall seasons.' },
  { crop: 'Cotton', plantMonths: [11, 12], harvestMonths: [5, 6], note: 'Needs a full warm season; late planting sharply cuts yield.' },
  { crop: 'Soybeans', plantMonths: [11, 12], harvestMonths: [4, 5], note: 'Inoculate seed for nitrogen fixation if the plot hasn\'t carried soya before.' },
  { crop: 'Dry beans', plantMonths: [11, 12, 1], harvestMonths: [3, 4], note: 'Short season crop — useful as a late gap-filler after a delayed start to the rains.' },
  { crop: 'Sunflower', plantMonths: [11, 12], harvestMonths: [4, 5], note: 'Tolerates poorer soils than maize; a reasonable option for marginal plots.' },
  { crop: 'Tobacco (seedbeds)', plantMonths: [5, 6, 7], harvestMonths: [], note: 'Seedbeds go in during the dry season for transplanting once rains start.' },
  { crop: 'Wheat (irrigated winter)', plantMonths: [4, 5], harvestMonths: [9, 10], note: 'Winter wheat needs reliable irrigation — not a dryland crop in Zimbabwe.' },
  { crop: 'Vegetables (tomato, rape, covo)', plantMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], harvestMonths: [], note: 'Can be staggered through most of the year with irrigation; great for cash flow between big harvests.' }
];

function monthName(m) {
  return ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m];
}

/**
 * recommendations for the current month, plus a preview of what opens up
 * next month, so the farmer can plan ahead rather than just react.
 */
function recommendationsForMonth(month) {
  const nextMonth = month === 12 ? 1 : month + 1;
  const now = CALENDAR.filter((c) => c.plantMonths.includes(month));
  const upcoming = CALENDAR.filter((c) => !c.plantMonths.includes(month) && c.plantMonths.includes(nextMonth));
  return { now, upcoming, monthName: monthName(month), nextMonthName: monthName(nextMonth) };
}

/**
 * Turns an Open-Meteo daily forecast block into a short, plain-language
 * planting-conditions note. Kept deliberately simple/robust so a missing
 * or malformed weather payload never breaks the advisor endpoint.
 */
function rainfallTip(daily) {
  try {
    const totalRain = (daily.precipitation_sum || []).reduce((s, v) => s + (Number(v) || 0), 0);
    const maxTemp = Math.max(...(daily.temperature_2m_max || [30]));
    if (totalRain >= 15) {
      return { tone: 'positive', text: `${totalRain.toFixed(0)}mm of rain expected over the next few days — good soil-moisture window for planting.` };
    }
    if (totalRain > 0 && totalRain < 15) {
      return { tone: 'info', text: `Light rain expected (${totalRain.toFixed(0)}mm total) — enough to help germination but keep monitoring soil moisture before committing seed.` };
    }
    if (maxTemp >= 34) {
      return { tone: 'warning', text: 'Hot, dry conditions ahead with no meaningful rain forecast — hold off on rain-fed planting or plan for irrigation.' };
    }
    return { tone: 'warning', text: 'No significant rain forecast in the next few days — a risky window for rain-fed planting.' };
  } catch (err) {
    return { tone: 'info', text: 'Weather outlook unavailable right now — use local rainfall knowledge for the planting decision.' };
  }
}

module.exports = { recommendationsForMonth, rainfallTip, CALENDAR };
