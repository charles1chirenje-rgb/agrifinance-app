/**
 * Automatic crop growth-stage engine.
 *
 * Instead of relying purely on manual stage updates, every crop record is
 * scored against a phenology timeline (days-since-planting -> expected
 * stage) so the system can tell the farmer where a crop *should* be, flag
 * a mismatch if the field hasn't been updated to match, and auto-advance
 * genuinely time-based milestones (like a ratoon cycle re-starting after
 * harvest). Sugar cane gets its own detailed 12-18 month timeline, matching
 * Farm 54's primary enterprise; other crops fall back to a generic timeline.
 *
 * This is computed on read (GET /api/crops), not stored, so it's always
 * current and never drifts out of sync with "today".
 */

// day thresholds (days after planting) at which each stage typically begins
const SUGARCANE_TIMELINE = [
  { stage: 'planted', afterDays: 0 },
  { stage: 'germination', afterDays: 21 },      // 3-5 weeks
  { stage: 'vegetative', afterDays: 60 },        // tillering + grand growth
  { stage: 'flowering', afterDays: 270 },         // ~9 months, not all varieties flower
  { stage: 'maturing', afterDays: 330 },           // ~11 months, sucrose accumulation
  { stage: 'harvested', afterDays: 450 }            // ~13-15 months typical Zimbabwe cycle
];

const GENERIC_TIMELINE = [
  { stage: 'planted', afterDays: 0 },
  { stage: 'germination', afterDays: 10 },
  { stage: 'vegetative', afterDays: 30 },
  { stage: 'flowering', afterDays: 60 },
  { stage: 'maturing', afterDays: 90 },
  { stage: 'harvested', afterDays: 120 }
];

function timelineFor(cropName) {
  return /cane|sugar/i.test(cropName || '') ? SUGARCANE_TIMELINE : GENERIC_TIMELINE;
}

function daysSince(dateStr) {
  const then = new Date(dateStr);
  if (isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86400000));
}

/**
 * Returns live-tracking metadata for a crop without mutating the stored record:
 *  - daysSincePlanted / daysToHarvest
 *  - autoStage: what the timeline says the crop should be at today
 *  - stageMismatch: true if the manually-recorded stage lags the model
 *  - progressPercent: 0-100 toward harvest, for a progress bar
 *  - nextMilestone: the next stage + how many days away
 */
function computeLiveTracking(crop) {
  if (crop.status !== 'active' || !crop.plantedDate) {
    return {
      daysSincePlanted: crop.plantedDate ? daysSince(crop.plantedDate) : null,
      daysToHarvest: null,
      autoStage: crop.stage,
      stageMismatch: false,
      progressPercent: crop.status === 'harvested' ? 100 : 0,
      nextMilestone: null
    };
  }

  const timeline = timelineFor(crop.name);
  const elapsed = daysSince(crop.plantedDate);

  let autoStage = timeline[0].stage;
  let nextMilestone = null;
  for (let i = 0; i < timeline.length; i++) {
    if (elapsed >= timeline[i].afterDays) {
      autoStage = timeline[i].stage;
    } else {
      nextMilestone = { stage: timeline[i].stage, inDays: timeline[i].afterDays - elapsed };
      break;
    }
  }

  const harvestThreshold = timeline[timeline.length - 1].afterDays;
  const progressPercent = Math.min(100, Math.round((elapsed / harvestThreshold) * 100));
  const daysToHarvest = Math.max(0, harvestThreshold - elapsed);

  const currentIdx = timeline.findIndex(t => t.stage === crop.stage);
  const autoIdx = timeline.findIndex(t => t.stage === autoStage);
  const stageMismatch = autoIdx > currentIdx;

  return { daysSincePlanted: elapsed, daysToHarvest, autoStage, stageMismatch, progressPercent, nextMilestone };
}

module.exports = { computeLiveTracking, timelineFor, daysSince };
