// Threshold-based probability calculator
// Exports getPValueThreshold(precip, years, month, day, options)
// precip: [366][nYears] matrix
// years: array of years (optional but used for Feb 29 handling)
// options: { threshold: number (mm), window: number (days to include each side), minCount: number }

function dayOfYearIdx(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(dt)) return NaN;
  const jan1 = new Date(Date.UTC(y, 0, 1));
  return Math.floor((dt - jan1) / 86400000);
}

export async function getPValueThreshold(precip, years, month, day, options = {}) {
  const { threshold = 1.0, window = 0, minCount = 1 } = options;

  if (!Array.isArray(precip) || precip.length === 0) {
    throw new Error('Invalid precip matrix');
  }
  const N_DAYS = precip.length;
  const nYears = (precip[0] && precip[0].length) || 0;

  const rainyYears = [];
  const validYears = [];

  if (Array.isArray(years) && years.length === nYears) {
    for (let yi = 0; yi < nYears; yi++) {
      const y = Number(years[yi]);
      if (!Number.isInteger(y)) continue;
      // consider window: collect any day within month/day +/- window
      let foundValid = false;
      let foundRain = false;
      for (let delta = -window; delta <= window; delta++) {
        const dt = new Date(Date.UTC(y, month - 1, day));
        if (isNaN(dt)) continue;
        dt.setUTCDate(dt.getUTCDate() + delta);
        const mm = dt.getUTCMonth() + 1;
        const dd = dt.getUTCDate();
        const doy = dayOfYearIdx(y, mm, dd);
        if (!Number.isFinite(doy) || doy < 0 || doy >= N_DAYS) continue;
        const v = precip[doy][yi];
        if (v !== null && v !== undefined && !Number.isNaN(v)) {
          foundValid = true;
          if (Number(v) > threshold) foundRain = true;
        }
      }
      if (foundValid) {
        validYears.push(years[yi]);
        if (foundRain) rainyYears.push(years[yi]);
      }
    }
  } else {
    // Fallback: use reference year mapping (non-leap)
    const REF_YEAR = 2001;
    const refDoy = dayOfYearIdx(REF_YEAR, month, day);
    if (!Number.isFinite(refDoy) || refDoy < 0 || refDoy >= N_DAYS) {
      throw new Error('Invalid date');
    }
    for (let yi = 0; yi < nYears; yi++) {
      let foundValid = false;
      let foundRain = false;
      for (let delta = -window; delta <= window; delta++) {
        const idx = refDoy + delta;
        if (idx < 0 || idx >= N_DAYS) continue;
        const v = precip[idx][yi];
        if (v !== null && v !== undefined && !Number.isNaN(v)) {
          foundValid = true;
          if (Number(v) > threshold) foundRain = true;
        }
      }
      if (foundValid) {
        validYears.push(yi);
        if (foundRain) rainyYears.push(yi);
      }
    }
  }

  const nValid = validYears.length;
  const nRainy = rainyYears.length;
  const prob = nValid >= minCount ? (nRainy / nValid) : 0;

  return { prob, nValid, nRainy, threshold, rainyYears, validYears };
}

export default getPValueThreshold;
