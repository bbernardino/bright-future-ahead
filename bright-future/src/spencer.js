import { getPValueThreshold } from './spencer_threshold_1.js';
import { getPValueParametric } from './spencer_param_1.js';

// Simple wrapper to compute precipitation probability (default: threshold method)
// precip: [366][nYears], years: array of years, month/day: numbers
export async function getPValue(precip, years, month, day, options = {}) {
    const method = options.method || 'threshold';
    const threshold = options.threshold !== undefined ? options.threshold : 1.0;
    const window = options.window || 0;
    if (method === 'parametric') {
        const res = await getPValueParametric(precip, years, month, day, { threshold, window });
        return res.prob;
    }
    const res = await getPValueThreshold(precip, years, month, day, { threshold, window });
    return res.prob;
}

// Temperature probability (empirical): fraction of valid years where temperature >= threshold
export function getTempProbability(temp, years, month, day, options = {}) {
    const threshold = options.threshold !== undefined ? options.threshold : 30; // default 30°C
    if (!Array.isArray(temp) || temp.length === 0) throw new Error('Invalid temp matrix');
    const N_DAYS = temp.length;
    const nYears = (temp[0] && temp[0].length) || 0;
    let valid = 0, count = 0;
    if (Array.isArray(years) && years.length === nYears) {
        for (let yi = 0; yi < nYears; yi++) {
            const y = Number(years[yi]);
            if (!Number.isInteger(y)) continue;
            const dt = new Date(Date.UTC(y, month - 1, day));
            if (isNaN(dt)) continue;
            const doy = Math.floor((dt - new Date(Date.UTC(y, 0, 1))) / 86400000);
            if (!Number.isFinite(doy) || doy < 0 || doy >= N_DAYS) continue;
            const v = temp[doy][yi];
            if (v !== null && v !== undefined && !Number.isNaN(v)) {
                valid += 1;
                if (Number(v) >= threshold) count += 1;
            }
        }
    } else {
        // fallback reference year mapping
        const REF = 2001;
        const refDoy = Math.floor((new Date(Date.UTC(REF, month - 1, day)) - new Date(Date.UTC(REF, 0, 1))) / 86400000);
        if (!Number.isFinite(refDoy) || refDoy < 0 || refDoy >= N_DAYS) throw new Error('Invalid date');
        for (let yi = 0; yi < nYears; yi++) {
            const idx = refDoy;
            const v = temp[idx][yi];
            if (v !== null && v !== undefined && !Number.isNaN(v)) {
                valid += 1;
                if (Number(v) >= threshold) count += 1;
            }
        }
    }
    return valid ? (count / valid) : 0;
}

// Wind probability (empirical): fraction of valid years where windspeed >= threshold
export function getWindProbability(wind, years, month, day, options = {}) {
    const threshold = options.threshold !== undefined ? options.threshold : 8; // default 8 m/s
    if (!Array.isArray(wind) || wind.length === 0) throw new Error('Invalid wind matrix');
    const N_DAYS = wind.length;
    const nYears = (wind[0] && wind[0].length) || 0;
    let valid = 0, count = 0;
    if (Array.isArray(years) && years.length === nYears) {
        for (let yi = 0; yi < nYears; yi++) {
            const y = Number(years[yi]);
            if (!Number.isInteger(y)) continue;
            const dt = new Date(Date.UTC(y, month - 1, day));
            if (isNaN(dt)) continue;
            const doy = Math.floor((dt - new Date(Date.UTC(y, 0, 1))) / 86400000);
            if (!Number.isFinite(doy) || doy < 0 || doy >= N_DAYS) continue;
            const v = wind[doy][yi];
            if (v !== null && v !== undefined && !Number.isNaN(v)) {
                valid += 1;
                if (Number(v) >= threshold) count += 1;
            }
        }
    } else {
        const REF = 2001;
        const refDoy = Math.floor((new Date(Date.UTC(REF, month - 1, day)) - new Date(Date.UTC(REF, 0, 1))) / 86400000);
        if (!Number.isFinite(refDoy) || refDoy < 0 || refDoy >= N_DAYS) throw new Error('Invalid date');
        for (let yi = 0; yi < nYears; yi++) {
            const v = wind[refDoy][yi];
            if (v !== null && v !== undefined && !Number.isNaN(v)) {
                valid += 1;
                if (Number(v) >= threshold) count += 1;
            }
        }
    }
    return valid ? (count / valid) : 0;
}

export default { getPValue, getTempProbability };

// Predict temperature: return predicted mean, std, and empirical probability within tolerance
export function getTempPrediction(temp, years, month, day, options = {}) {
    const tol = options.tolerance !== undefined ? options.tolerance : 2.0; // degrees C
    if (!Array.isArray(temp) || temp.length === 0) throw new Error('Invalid temp matrix');
    const N_DAYS = temp.length;
    const nYears = (temp[0] && temp[0].length) || 0;
    const vals = [];
    if (Array.isArray(years) && years.length === nYears) {
        for (let yi = 0; yi < nYears; yi++) {
            const y = Number(years[yi]);
            if (!Number.isInteger(y)) continue;
            const dt = new Date(Date.UTC(y, month - 1, day));
            if (isNaN(dt)) continue;
            const doy = Math.floor((dt - new Date(Date.UTC(y, 0, 1))) / 86400000);
            if (!Number.isFinite(doy) || doy < 0 || doy >= N_DAYS) continue;
            const v = temp[doy][yi];
            if (v !== null && v !== undefined && !Number.isNaN(v)) vals.push(Number(v));
        }
    } else {
        const REF = 2001;
        const refDoy = Math.floor((new Date(Date.UTC(REF, month - 1, day)) - new Date(Date.UTC(REF, 0, 1))) / 86400000);
        if (!Number.isFinite(refDoy) || refDoy < 0 || refDoy >= N_DAYS) throw new Error('Invalid date');
        for (let yi = 0; yi < nYears; yi++) {
            const v = temp[refDoy][yi];
            if (v !== null && v !== undefined && !Number.isNaN(v)) vals.push(Number(v));
        }
    }
    const n = vals.length;
    if (n === 0) return { predicted: null, std: null, within_tol_prob: null, n };
    const mean = vals.reduce((s,v)=>s+v,0)/n;
    const s2 = vals.reduce((s,v)=>s+(v-mean)*(v-mean),0)/Math.max(1,n-1);
    const std = Math.sqrt(s2);
    const within = vals.filter(v => Math.abs(v - mean) <= tol).length;
    const within_prob = within / n;
    return { predicted: mean, std, within_tol_prob: within_prob, n, samples: vals };
}

export function getWindPrediction(wind, years, month, day, options = {}) {
    const tol = options.tolerance !== undefined ? options.tolerance : 1.0; // m/s
    if (!Array.isArray(wind) || wind.length === 0) throw new Error('Invalid wind matrix');
    const N_DAYS = wind.length;
    const nYears = (wind[0] && wind[0].length) || 0;
    const vals = [];
    if (Array.isArray(years) && years.length === nYears) {
        for (let yi = 0; yi < nYears; yi++) {
            const y = Number(years[yi]);
            if (!Number.isInteger(y)) continue;
            const dt = new Date(Date.UTC(y, month - 1, day));
            if (isNaN(dt)) continue;
            const doy = Math.floor((dt - new Date(Date.UTC(y, 0, 1))) / 86400000);
            if (!Number.isFinite(doy) || doy < 0 || doy >= N_DAYS) continue;
            const v = wind[doy][yi];
            if (v !== null && v !== undefined && !Number.isNaN(v)) vals.push(Number(v));
        }
    } else {
        const REF = 2001;
        const refDoy = Math.floor((new Date(Date.UTC(REF, month - 1, day)) - new Date(Date.UTC(REF, 0, 1))) / 86400000);
        if (!Number.isFinite(refDoy) || refDoy < 0 || refDoy >= N_DAYS) throw new Error('Invalid date');
        for (let yi = 0; yi < nYears; yi++) {
            const v = wind[refDoy][yi];
            if (v !== null && v !== undefined && !Number.isNaN(v)) vals.push(Number(v));
        }
    }
    const n = vals.length;
    if (n === 0) return { predicted: null, std: null, within_tol_prob: null, n };
    const mean = vals.reduce((s,v)=>s+v,0)/n;
    const s2 = vals.reduce((s,v)=>s+(v-mean)*(v-mean),0)/Math.max(1,n-1);
    const std = Math.sqrt(s2);
    const within = vals.filter(v => Math.abs(v - mean) <= tol).length;
    const within_prob = within / n;
    return { predicted: mean, std, within_tol_prob: within_prob, n, samples: vals };
}

// Compute simple linear trend (least-squares) for values on a given month/day across years
export function getTrendForDay(matrix, years, month, day) {
    if (!Array.isArray(matrix) || matrix.length === 0) throw new Error('Invalid matrix');
    const N_DAYS = matrix.length;
    const nYears = (matrix[0] && matrix[0].length) || 0;
    const samples = [];
    if (Array.isArray(years) && years.length === nYears) {
        for (let yi = 0; yi < nYears; yi++) {
            const y = Number(years[yi]);
            if (!Number.isFinite(y)) continue;
            const dt = new Date(Date.UTC(y, month - 1, day));
            if (isNaN(dt)) continue;
            const doy = Math.floor((dt - new Date(Date.UTC(y, 0, 1))) / 86400000);
            if (!Number.isFinite(doy) || doy < 0 || doy >= N_DAYS) continue;
            const v = matrix[doy][yi];
            if (v !== null && v !== undefined && !Number.isNaN(v)) samples.push({ year: y, value: Number(v) });
        }
    } else {
        const REF = 2001;
        const refDoy = Math.floor((new Date(Date.UTC(REF, month - 1, day)) - new Date(Date.UTC(REF, 0, 1))) / 86400000);
        if (!Number.isFinite(refDoy) || refDoy < 0 || refDoy >= N_DAYS) throw new Error('Invalid date');
        for (let yi = 0; yi < nYears; yi++) {
            const v = matrix[refDoy][yi];
            const y = yi; // fallback index
            if (v !== null && v !== undefined && !Number.isNaN(v)) samples.push({ year: y, value: Number(v) });
        }
    }

    const n = samples.length;
    if (n < 3) return null;
    const xs = samples.map(s => s.year);
    const ys = samples.map(s => s.value);
    const xmean = xs.reduce((a,b)=>a+b,0)/n;
    const ymean = ys.reduce((a,b)=>a+b,0)/n;
    let Sxx = 0, Sxy = 0, SSE = 0;
    for (let i=0;i<n;i++) { const dx = xs[i]-xmean; const dy = ys[i]-ymean; Sxx += dx*dx; Sxy += dx*dy; }
    const slope = Sxy / Sxx;
    const intercept = ymean - slope * xmean;
    for (let i=0;i<n;i++) { const pred = intercept + slope * xs[i]; const e = ys[i]-pred; SSE += e*e; }
    const sigma2 = SSE / Math.max(1, n-2);
    const se_slope = Math.sqrt(sigma2 / Sxx);
    const t_stat = slope / (se_slope || 1e-12);
    // approximate p-value using normal approx
    const phi = (x) => 0.5*(1+Math.erf(x/Math.SQRT2));
    const p_value = 2*(1 - phi(Math.abs(t_stat)));
    // R^2
    const SST = ys.reduce((s,y)=>s+(y-ymean)*(y-ymean),0);
    const r2 = SST === 0 ? 0 : 1 - (SSE / SST);

    return { n, slope_per_year: slope, slope_per_decade: slope * 10, intercept, r2, p_value };
}