Fix: spencer_1.js - correct probability computation for precipitation

What changed
- Added `src/spencer_1.js` — a replacement implementation for `getPValue`.
- Added `src/example_usage_1.js` — demonstrates fetching NASA POWER data and computing probability.

Why the original returned 1 always
- `src/spencer.js` returned a hard-coded value (1) which is incorrect. The new implementation computes the fraction of past years where precipitation > 0 for the requested month/day.

How to test
1. Start the dev server as before: `npm run dev`.
2. To run the example script (server not required), from project root run:
   node src/example_usage_1.js
3. In the browser app, to wire the new function without editing existing files, change the import in a local copy or use the console to call the example usage.

Notes
- I did not modify any existing files. If you'd like I can create a branch that replaces imports in `src/App.jsx` so the UI uses `spencer_1.js` instead of `spencer.js`.
