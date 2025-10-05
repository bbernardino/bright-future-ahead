import { fetchData } from './scrape.js';
import { getPValueThreshold } from './spencer_threshold_1.js';

async function runExample() {
  const lon = -80.25; // sample (Guelph / Waterloo area)
  const lat = 43.55;
  console.log('Fetching data (this may take a few seconds)...');
  const { precip, years } = await fetchData(lon, lat);
  const month = 7; const day = 1; // example date July 1

  const thresholds = [0.001, 0.1, 1.0];
  for (const t of thresholds) {
    const res = await getPValueThreshold(precip, years, month, day, { threshold: t, window: 0 });
    console.log(`Threshold ${t} mm -> prob=${(res.prob*100).toFixed(2)}% (nValid=${res.nValid}, nRainy=${res.nRainy})`);
  }
}

if (import.meta.url === `file://${process.cwd()}/src/example_threshold_1.js`) {
  runExample().catch((e) => { console.error(e); process.exit(1); });
}

export { runExample };
