// Improved probability calculator for precipitation on a given month/day
// Accepts either:
//  - getPValue(precipMatrix, yearsArray, month, day)
//  - getPValue(precipMatrix, month, day)  // fallback (best-effort)
// Where precipMatrix is [366][nYears] (rows = day-of-year index 0..365, cols = years)
// The function returns a number between 0 and 1 (fraction of past years with measurable precipitation).

function dayOfYearIdx(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(dt)) return NaN;
  const jan1 = new Date(Date.UTC(y, 0, 1));
  return Math.floor((dt - jan1) / 86400000);
}

export async function getPValue(precip, monthOrYears, dayMaybe) {
  // Backwards-compatible signature handling
  // If second arg is an array, treat it as years
  let years = null;
  let month, day;

  if (Array.isArray(monthOrYears)) {
    years = monthOrYears;
    month = Number(dayMaybe?.month ?? dayMaybe) || Number(arguments[3]);
    day = Number(arguments[3]) || Number(dayMaybe?.day) || Number(dayMaybe);
    // If the caller passed (precip, years, month, day) then dayMaybe is month and arguments[3] is day.
    // We'll handle usual cases below.
  } else {
    month = Number(monthOrYears);
    day = Number(dayMaybe);
  }

  // Basic validation
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Expected integer 1..12.`);
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error(`Invalid day: ${day}. Expected integer 1..31.`);
  }

  if (!Array.isArray(precip) || precip.length === 0) {
    throw new Error('Invalid precip matrix: expected non-empty 2D array [366][nYears].');
  }

  const N_DAYS = precip.length; // expected 366
  const nYears = (precip[0] && precip[0].length) || 0;
  if (nYears === 0) {
    // No year columns
    return 0;
  }

  // If years array provided, use accurate per-year day-of-year mapping (handles leap-year offsets)
  const values = [];

  if (Array.isArray(years) && years.length === nYears) {
    for (let yi = 0; yi < nYears; yi++) {
      const y = Number(years[yi]);
      if (!Number.isInteger(y)) {
        // skip invalid year entry
        continue;
      }
      const doy = dayOfYearIdx(y, month, day);
      if (!Number.isFinite(doy) || doy < 0 || doy >= N_DAYS) {
        // date doesn't exist in this year (e.g., Feb 29 in non-leap) => treat as missing
        continue;
      }
      const v = precip[doy] ? precip[doy][yi] : null;
      if (v !== null && v !== undefined && !Number.isNaN(v)) values.push(Number(v));
    }
  } else {
    // Fallback: no years array available or length mismatch. Use a calendar-based row index
    // computed against a reference non-leap year so row mapping is stable across years.
    // This is a best-effort fallback; for correct results pass the `years` array.
    const REF_YEAR = 2001; // non-leap reference
    const refDoy = dayOfYearIdx(REF_YEAR, month, day);
    if (!Number.isFinite(refDoy) || refDoy < 0 || refDoy >= N_DAYS) {
      throw new Error(`Invalid date (month=${month}, day=${day}) for the calendar.`);
    }
    for (let yi = 0; yi < nYears; yi++) {
      const v = precip[refDoy] ? precip[refDoy][yi] : null;
      if (v !== null && v !== undefined && !Number.isNaN(v)) values.push(Number(v));
    }
  }

  // Now compute probability: fraction of valid years with measurable precipitation
  const valid = values.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  if (valid.length === 0) {
    // No usable historic data for this date
    return 0;
  }

  // Consider precipitation > 0 as rain. Use small epsilon to avoid floating noise.
  const RAIN_EPS = 1e-6;
  const rainy = valid.filter((v) => v > RAIN_EPS);
  const prob = rainy.length / valid.length;

  return prob;
}

export default getPValue;
