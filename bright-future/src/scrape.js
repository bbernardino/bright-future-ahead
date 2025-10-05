
/**
 * Fetches climate data from NASA's POWER API for given coordinates and formats the data s.t. [day][year]
 * @param {Number} longitude 
 * @param {Number} latitude 
 * @returns { Promise<{temp: Array<Array<Number|null>>, precip: Array<Array<Number|null>>, years: Array<Number> }> Precip in mm/day, temp in °C. 2D array where first dimension is days, second dimension is time series in years for the date historical.
 */
export async function fetchData(longitude, latitude, opts = {}) {
    // POWER Daily coverage & time-standard (UTC/LST) per docs.
    // We'll request full span in UTC to keep day alignment stable.
    // Docs: coverage & time-standard flags, error codes. :contentReference[oaicite:0]{index=0}
    const start = "19810101";
    const now = new Date();
    const end = [
        now.getUTCFullYear(),
        String(now.getUTCMonth() + 1).padStart(2, "0"),
        String(now.getUTCDate()).padStart(2, "0"),
    ].join("");

    const paramsList = opts.parameters ?? ['T2M','PRECTOTCORR','WS2M','T2M_MAX','T2M_MIN','RH2M','ALLSKY_SFC_SW_DWN','AOD550'];
    const useCache = opts.useCache !== undefined ? Boolean(opts.useCache) : true;
    const cacheTTLdays = Number.isFinite(opts.cacheTTL) ? opts.cacheTTL : (opts.cacheTTLDays ?? 30);

    // build cache key
    const ck = `power:${longitude.toFixed(6)}:${latitude.toFixed(6)}:${start}:${end}:${paramsList.join('|')}`;

    // helper: read/write cache depending on environment
    const readCache = () => {
        try {
            if (!useCache) return null;
            if (typeof window !== 'undefined' && window.localStorage) {
                const v = window.localStorage.getItem(ck);
                if (!v) return null;
                const parsed = JSON.parse(v);
                if (!parsed || !parsed.ts || !parsed.data) return null;
                const ageDays = (Date.now() - parsed.ts) / (1000*60*60*24);
                if (ageDays > cacheTTLdays) {
                    // stale
                    try { window.localStorage.removeItem(ck); } catch(e){}
                    return null;
                }
                return parsed.data;
            } else {
                // Node or non-window environment: use process-global in-memory cache
                const g = globalThis.__POWER_CACHE__ = globalThis.__POWER_CACHE__ || {};
                const entry = g[ck];
                if (!entry) return null;
                const ageDays = (Date.now() - entry.ts) / (1000*60*60*24);
                if (ageDays > cacheTTLdays) { delete g[ck]; return null; }
                return entry.data;
            }
        } catch (e) {
            return null;
        }
    };

    const writeCache = (data) => {
        try {
            if (!useCache) return;
            const payload = { ts: Date.now(), data };
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(ck, JSON.stringify(payload));
            } else {
                const g = globalThis.__POWER_CACHE__ = globalThis.__POWER_CACHE__ || {};
                g[ck] = payload;
            }
        } catch (e) {
            // ignore cache write failures
        }
    };

    // return cached if available
    try {
        const cached = readCache();
        if (cached) return cached;
    } catch (e) {
        // ignore
    }
    const url =
        "https://power.larc.nasa.gov/api/temporal/daily/point" +
        `?parameters=${encodeURIComponent(paramsList.join(','))}` +
        "&community=AG" +
        `&longitude=${encodeURIComponent(longitude)}` +
        `&latitude=${encodeURIComponent(latitude)}` +
        `&start=${start}` +
        `&end=${end}` +
        "&time-standard=UTC" +
        "&format=JSON";


    // Try fetching, but be resilient: POWER may reject unknown params with 422
    let attempts = 0;
    let data = null;
    let currentParams = paramsList.slice();
    while (attempts < 5) {
        attempts++;
        const u =
            "https://power.larc.nasa.gov/api/temporal/daily/point" +
            `?parameters=${encodeURIComponent(currentParams.join(','))}` +
            "&community=AG" +
            `&longitude=${encodeURIComponent(longitude)}` +
            `&latitude=${encodeURIComponent(latitude)}` +
            `&start=${start}` +
            `&end=${end}` +
            "&time-standard=UTC" +
            "&format=JSON";

        const res = await fetch(u, { headers: { "Accept": "application/json" } });
        const text = await res.text().catch(() => '');
        if (!res.ok) {
            // try to detect invalid parameter message in POWER 422 response
            if (res.status === 422 && text.includes('One of your parameters is incorrect')) {
                const m = text.match(/incorrect: ([A-Z0-9_,]+)/i);
                if (m && m[1]) {
                    const bad = m[1].split(/[ ,]+/).map(s=>s.trim()).filter(Boolean);
                    // remove bad params and retry
                    currentParams = currentParams.filter(p => !bad.includes(p));
                    if (currentParams.length === 0) break; // nothing left to request
                    continue;
                }
            }
            throw new Error(`POWER HTTP ${res.status}: ${text.slice(0, 800)}`);
        }
        try { data = JSON.parse(text); } catch(e) { data = null; }
        if (data) break;
    }
    if (!data) throw new Error('Failed to fetch POWER data after retries');

    //what is going on here???
    const params = data?.properties?.parameter ?? {};
    const dateKeys = Object.keys(params).length ? Object.keys(params[Object.keys(params)[0]] || {}) : [];
    if (dateKeys.length === 0) {
        // Nothing returned (unusual for valid inputs)
        return { temp: [], precip: [], years: [] };
    }

    // [min, max]
    let minYear = Infinity, maxYear = -Infinity;
    for (const k of dateKeys) {
        const s = String(k);
        const y = Number(s.slice(0, 4));
        if (y < minYear) minYear = y;
        if (y > maxYear) maxYear = y;
    }
    const years = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);

    // Allocate [day][year] with nulls (366 rows to include Feb 29)
    const N_DAYS = 366;
    const nYears = years.length;
    // prepare matrices for requested params
    const matrices = {};
    for (const p of paramsList) matrices[p] = Array.from({ length: N_DAYS }, () => Array(nYears).fill(null));

    const dayOfYearIdx = (y, m, d) => {
        const dt = new Date(Date.UTC(y, m - 1, d));
        const jan1 = new Date(Date.UTC(y, 0, 1));
        return Math.floor((dt - jan1) / 86400000);
    };

    for (const k of dateKeys) {
        const s = String(k);
        const y = Number(s.slice(0, 4));
        const m = Number(s.length === 8 ? s.slice(4, 6) : s.slice(5, 7));
        const d = Number(s.length === 8 ? s.slice(6, 8) : s.slice(8, 10));
        const yi = y - minYear;
        if (yi < 0 || yi >= nYears) continue;
        const doy = dayOfYearIdx(y, m, d);
        if (doy < 0 || doy >= N_DAYS) continue;
        // for each requested parameter, fill matrix if available
        for (const p of paramsList) {
            const obj = params[p] ?? {};
            if (k in obj) matrices[p][doy][yi] = obj[k];
        }
    }

    // map well-known names to return shape for backwards compatibility
    const out = { years };
    if (matrices['T2M']) out.temp = matrices['T2M'];
    if (matrices['PRECTOTCORR']) out.precip = matrices['PRECTOTCORR'];
    if (matrices['WS2M']) out.wind = matrices['WS2M'];
    // include other matrices under their param names
    for (const p of paramsList) if (!['T2M','PRECTOTCORR','WS2M'].includes(p)) out[p] = matrices[p];

    // write to cache for future calls
    try { writeCache(out); } catch (e) { }

    return out;
}