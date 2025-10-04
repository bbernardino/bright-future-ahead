
/**
 * Fetches climate data from NASA's POWER API for given coordinates and formats the data s.t. [day][year]
 * @param {Number} longitude 
 * @param {Number} latitude 
 * @returns { temp: Array<Array<Number|null>>, precip: Array<Array<Number|null>>, years: Array<Number> } Precip in mm/day, temp in °C
 */
export async function fetchData(longitude, latitude) {
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

    const url =
        "https://power.larc.nasa.gov/api/temporal/daily/point" +
        "?parameters=T2M,PRECTOTCORR" +
        "&community=AG" +
        `&longitude=${encodeURIComponent(longitude)}` +
        `&latitude=${encodeURIComponent(latitude)}` +
        `&start=${start}` +
        `&end=${end}` +
        "&time-standard=UTC" +
        "&format=JSON";


    const res = await fetch(url, {
        headers: {
            "Accept": "application/json",
        },
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POWER HTTP ${res.status}: ${text.slice(0, 800)}`);
    }

    const data = await res.json();

    const t2m = data?.properties?.parameter?.T2M ?? {};
    const pr = data?.properties?.parameter?.PRECTOTCORR ?? {};
    const dateKeys = Object.keys(t2m).length ? Object.keys(t2m) : Object.keys(pr);
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
    const temp = Array.from({ length: N_DAYS }, () => Array(nYears).fill(null));
    const precip = Array.from({ length: N_DAYS }, () => Array(nYears).fill(null));

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

        if (k in t2m) temp[doy][yi] = t2m[k];          // °C
        if (k in pr) precip[doy][yi] = pr[k];         // mm/day
    }

    return { temp, precip, years };
}