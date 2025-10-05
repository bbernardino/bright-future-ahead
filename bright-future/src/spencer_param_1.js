// Two-part parametric model: occurrence + log-normal for positive amounts
// Exports getPValueParametric(precip, years, month, day, options)
// options: { threshold = 1.0, window = 0, minPos = 5 }

function dayOfYearIdx(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(dt)) return NaN;
  const jan1 = new Date(Date.UTC(y, 0, 1));
  return Math.floor((dt - jan1) / 86400000);
}

function mean(arr) { return arr.reduce((s,v)=>s+v,0)/arr.length; }
function std(arr, mu) { mu = mu ?? mean(arr); return Math.sqrt(arr.reduce((s,v)=>s+(v-mu)*(v-mu),0)/(arr.length-1 || 1)); }

// standard normal CDF (Abramowitz & Stegun approximation)
function phi(x) {
  // constants
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absx = Math.abs(x)/Math.SQRT2;
  const t = 1/(1 + p*absx);
  const y = 1 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-absx*absx);
  return 0.5*(1 + sign*y);
}

export async function getPValueParametric(precip, years, month, day, options = {}) {
  const { threshold = 1.0, window = 0, minPos = 5 } = options;
  if (!Array.isArray(precip) || precip.length === 0) throw new Error('Invalid precip matrix');
  const N_DAYS = precip.length;
  const nYears = (precip[0] && precip[0].length) || 0;

  const positives = [];
  let nValid = 0;
  let nPosYears = 0;

  if (Array.isArray(years) && years.length === nYears) {
    for (let yi = 0; yi < nYears; yi++) {
      const y = Number(years[yi]);
      if (!Number.isInteger(y)) continue;
      let foundValid = false;
      let foundPos = false;
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
          if (Number(v) > 0) { foundPos = true; positives.push(Number(v)); }
        }
      }
      if (foundValid) nValid++;
      if (foundPos) nPosYears++;
    }
  } else {
    // fallback reference mapping
    const REF = 2001;
    const refDoy = dayOfYearIdx(REF, month, day);
    if (!Number.isFinite(refDoy) || refDoy < 0 || refDoy >= N_DAYS) throw new Error('Invalid date');
    for (let yi = 0; yi < nYears; yi++) {
      let foundValid = false;
      let foundPos = false;
      for (let delta = -window; delta <= window; delta++) {
        const idx = refDoy + delta;
        if (idx < 0 || idx >= N_DAYS) continue;
        const v = precip[idx][yi];
        if (v !== null && v !== undefined && !Number.isNaN(v)) {
          foundValid = true;
          if (Number(v) > 0) { foundPos = true; positives.push(Number(v)); }
        }
      }
      if (foundValid) nValid++;
      if (foundPos) nPosYears++;
    }
  }

  const p_occ = nValid ? (nPosYears / nValid) : 0;

  // Fit log-normal for positive amounts
  const nPos = positives.length;
  let mu_log = null, sigma_log = null;
  if (nPos >= Math.max(minPos, 2)) {
    const logs = positives.map(v => Math.log(v));
    mu_log = mean(logs);
    sigma_log = std(logs, mu_log);
    if (sigma_log === 0) sigma_log = 1e-6;
  }

  // Compute probability of amount > threshold
  let p_amount_gt_t = 0;
  if (threshold <= 0) {
    p_amount_gt_t = 1; // given positive
  } else if (mu_log !== null) {
    const z = (Math.log(threshold) - mu_log) / sigma_log;
    p_amount_gt_t = 1 - phi(z);
  } else {
    // fallback to empirical proportion of positives exceeding threshold
    const cnt = positives.filter(v => v > threshold).length;
    p_amount_gt_t = nPos ? (cnt / nPos) : 0;
  }

  const prob = p_occ * p_amount_gt_t;

  return { prob, p_occ, p_amount_gt_t, mu_log, sigma_log, nValid, nPosYears, nPos };
}

export default getPValueParametric;
