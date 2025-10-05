import { fetchData } from './scrape.js';
import { getPValueParametric } from './spencer_param_1.js';

async function run() {
  const lon = -80.25; const lat = 43.55;
  console.log('Fetching data...');
  const { precip, years } = await fetchData(lon, lat);
  const month = 7; const day = 1;
  const thresholds = [0.001, 0.1, 1.0];
  for (const t of thresholds) {
    const res = await getPValueParametric(precip, years, month, day, { threshold: t, window: 0 });
    console.log(`Threshold ${t} -> param prob=${(res.prob*100).toFixed(2)}% p_occ=${(res.p_occ*100).toFixed(2)}% p_amount_gt_t=${(res.p_amount_gt_t*100).toFixed(2)}% nPos=${res.nPos}`);
  }
}

if (import.meta.url === `file://${process.cwd()}/src/run_parametric_1.js`) {
  run().catch(e=>{ console.error(e); process.exit(1); });
}

export { run };
