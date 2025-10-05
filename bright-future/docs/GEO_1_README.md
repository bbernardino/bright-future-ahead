Geocoding UI (non-destructive additions)

Files added:
- `src/geo_1.js` — input parsing and Nominatim geocoding helper (returns latitude/longitude).
- `src/App_2.jsx`, `src/main_2.jsx`, `index_2.html` — duplicate UI wired to `geo_1.js` and `spencer_1.js` for testing.

Usage:
1. Start the dev server: `npm run dev`.
2. Open the geocoding test page: `http://localhost:5173/index_2.html`.
3. Enter `City, Country` and `MM/DD`. Example: `Toronto, Canada` and `07/01`.

Notes:
- The geocoder uses Nominatim (OpenStreetMap). Respect rate limits and usage policy for heavy usage.
- All files are duplicates and the original project files were not modified.
