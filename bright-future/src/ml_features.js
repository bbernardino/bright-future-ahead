import { fetchData } from './scrape.js';

// Build supervised dataset for a given location and target month/day.
// Features: sin(doy), cos(doy), precip lags (prevDays), temp on day, lon, lat
// Label: precip on day >= threshold (mm)
export async function buildDataset(longitude, latitude, month, day, opts = {}) {
    const lags = opts.lags ?? 3;
    const threshold = opts.threshold ?? 0.1;

    const { temp, precip, years } = await fetchData(longitude, latitude);

    if (!years || years.length === 0) {
        throw new Error('No years returned from fetchData');
    }

    const N_DAYS = 366;
    // compute day-of-year index for any year (use a non-leap year baseline)
    const doyOf = (y, m, d) => {
        const dt = new Date(Date.UTC(y, m - 1, d));
        const jan1 = new Date(Date.UTC(y, 0, 1));
        return Math.floor((dt - jan1) / 86400000);
    };

    const samplesX = [];
    const samplesY = [];
    const meta = { years: [], longitude, latitude, month, day, lags, threshold };

    for (let yi = 0; yi < years.length; yi++) {
        const y = years[yi];
        const doy = doyOf(y, month, day);
        if (doy < 0 || doy >= N_DAYS) continue;

        // need temp[doy][yi] and precip[doy][yi]
        const curTemp = temp?.[doy]?.[yi];
        const curPrecip = precip?.[doy]?.[yi];
        if (curTemp == null || curPrecip == null) continue;

        // gather lag precip values (previous calendar days within same year)
        const lagVals = [];
        let ok = true;
        for (let l = 1; l <= lags; l++) {
            const id = doy - l;
            if (id < 0) { ok = false; break; }
            const v = precip?.[id]?.[yi];
            if (v == null) { ok = false; break; }
            lagVals.push(v);
        }
        if (!ok) continue;

        // cyclical encoding for day of year (use a representative year length 365)
        const angle = (2 * Math.PI * (doy + 1)) / 365.0;
        const sinD = Math.sin(angle);
        const cosD = Math.cos(angle);

        const row = [];
        row.push(sinD, cosD);
        for (const v of lagVals) row.push(v);
        row.push(curTemp);
        row.push(longitude, latitude);

        const label = curPrecip >= threshold ? 1 : 0;

        samplesX.push(row);
        samplesY.push(label);
        meta.years.push(y);
    }

    return { X: samplesX, y: samplesY, meta };
}
