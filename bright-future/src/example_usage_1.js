import { fetchData } from './scrape.js';
import { getPValue } from './spencer_1.js';

async function demo() {
  // Example coordinates (Toronto)
  const lon = -79.3832;
  const lat = 43.6532;
  const { precip, years } = await fetchData(lon, lat);

  // Example: check July 1
  const month = 7;
  const day = 1;

  const p = await getPValue(precip, years, month, day);
  console.log(`Probability of measurable precipitation on ${month}/${day}:`, p);
}

// Run when executed directly
if (import.meta.url === `file://${process.cwd()}/src/example_usage_1.js`) {
  demo().catch((e) => { console.error(e); process.exit(1); });
}

export { demo };
