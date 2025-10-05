// geo_1.js
// Helpers for validating user input and geocoding "City, Country" -> { latitude, longitude }

export function parseLocationInput(input) {
  if (typeof input !== 'string') throw new Error('Location must be a string');
  const parts = input.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) throw new Error('Please enter location as "City, Country"');

  const city = parts[0];
  // country may include region (e.g. "United States") -> join remaining parts
  const country = parts.slice(1).join(', ');

  // Basic regex: allow letters, spaces, hyphens, periods, and apostrophes
  const validName = /^[-.\p{L}0-9' ]+$/u;
  if (!validName.test(city)) throw new Error('Invalid city name');
  if (!validName.test(country)) throw new Error('Invalid country/region name');

  return { city, country };
}

export function parseDateInput(input) {
  if (typeof input !== 'string') throw new Error('Date must be a string');
  const parts = input.split('/').map(p => p.trim()).filter(Boolean);
  if (parts.length !== 2) throw new Error('Date must be in MM/DD format');
  const month = Number(parts[0]);
  const day = Number(parts[1]);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('Month must be an integer 1..12');
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('Day must be an integer 1..31');

  // Validate day against month (allow Feb 29 as valid)
  const daysInMonth = [31,29,31,30,31,30,31,31,30,31,30,31];
  if (day > daysInMonth[month - 1]) throw new Error(`Invalid day ${day} for month ${month}`);

  return { month, day };
}

export async function geocodeCityCountry(city, country, opts = {}) {
  // Query Nominatim OpenStreetMap. Respect usage policy: add a descriptive User-Agent.
  const base = 'https://nominatim.openstreetmap.org/search';
  const q = `${city}, ${country}`;
  const params = new URLSearchParams({ q, format: 'json', limit: '1', addressdetails: '0' });
  const url = `${base}?${params.toString()}`;

  const controller = new AbortController();
  const timeout = opts.timeout || 8000;
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'bright-future-app/1.0 (contact: none)'
      },
      signal: controller.signal
    });
    clearTimeout(id);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Geocode HTTP ${res.status}: ${text.slice(0,200)}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Location not found');
    const pick = data[0];
    const lat = Number(pick.lat);
    const lon = Number(pick.lon);
    if (!isFinite(lat) || !isFinite(lon)) throw new Error('Invalid coordinates returned from geocoder');
    return { latitude: lat, longitude: lon, raw: pick };
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Geocoding request timed out');
    throw err;
  }
}

export async function reverseGeocode(lat, lon, opts = {}) {
  const base = 'https://nominatim.openstreetmap.org/reverse';
  const params = new URLSearchParams({ format: 'json', lat: String(lat), lon: String(lon), zoom: '10', addressdetails: '1' });
  const url = `${base}?${params.toString()}`;
  const controller = new AbortController();
  const timeout = opts.timeout || 8000;
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'bright-future-app/1.0' }, signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Reverse geocode HTTP ${res.status}: ${text.slice(0,200)}`);
    }
    const data = await res.json();
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.hamlet || addr.county || null;
    const country = addr.country || null;
    return { display_name: data.display_name || null, city, country, latitude: Number(data.lat), longitude: Number(data.lon), raw: data };
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Reverse geocoding timed out');
    throw err;
  }
}

export async function suggestLocations(q, opts = {}) {
  if (!q || q.length < 2) return [];
  const base = 'https://nominatim.openstreetmap.org/search';
  const params = new URLSearchParams({ q, format: 'json', limit: String(opts.limit || 6), addressdetails: '1' });
  const url = `${base}?${params.toString()}`;
  const controller = new AbortController();
  const timeout = opts.timeout || 6000;
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'bright-future-app/1.0' }, signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map(d => {
      const addr = d.address || {};
      const city = addr.city || addr.town || addr.village || addr.hamlet || addr.county || null;
      const country = addr.country || null;
      return { display_name: d.display_name, city, country, latitude: Number(d.lat), longitude: Number(d.lon), raw: d };
    });
  } catch (err) {
    return [];
  }
}

export default { parseLocationInput, parseDateInput, geocodeCityCountry };
