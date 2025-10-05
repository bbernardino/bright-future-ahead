import { useState } from 'react'
import Sunlight from './assets/Images/Sunlight.jpg'
import './App.css'

import { fetchData } from '../src/scrape.js';
import { getPValueThreshold } from '../src/spencer_threshold_1.js';
import { getPValueParametric } from '../src/spencer_param_1.js';
import { parseLocationInput, parseDateInput, geocodeCityCountry } from './geo_1.js'

function App() {
  const [loc, setLoc] = useState('Toronto, Canada');
  const [date, setDate] = useState('07/01');
  const [threshold, setThreshold] = useState('1.0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [coords, setCoords] = useState(null);
  const [empResult, setEmpResult] = useState(null);
  const [paramResult, setParamResult] = useState(null);

  async function compute() {
    setError(null);
    setEmpResult(null);
    setParamResult(null);
    setCoords(null);
    setLoading(true);
    try {
      const { city, country } = parseLocationInput(loc);
      const { month, day } = parseDateInput(date);
      const geo = await geocodeCityCountry(city, country);
      setCoords(geo);
      const { latitude, longitude } = geo;

      const { precip, years } = await fetchData(longitude, latitude);

      const t = Number(threshold);
      const emp = await getPValueThreshold(precip, years, month, day, { threshold: t, window: 0 });
      const param = await getPValueParametric(precip, years, month, day, { threshold: t, window: 0 });

      setEmpResult(emp);
      setParamResult(param);
    } catch (e) {
      setError(e && e.message ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <img src={Sunlight} alt="Sunlight" style={{ maxWidth: 200 }} />
      <h2>Threshold & Parametric comparison</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={loc} onChange={(e) => setLoc(e.target.value)} style={{ width: 300 }} />
        <input value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 120 }} />

        <select value={threshold} onChange={(e) => setThreshold(e.target.value)} style={{ width: 140 }}>
          <option value="0.001">Trace &gt; 0 mm (0.001 mm)</option>
          <option value="0.1">Light &gt; 0.1 mm</option>
          <option value="1.0">Measurable &gt; 1.0 mm</option>
          <option value="5.0">Moderate &gt; 5.0 mm</option>
        </select>

        <button onClick={compute} disabled={loading} style={{ padding: '8px 12px' }}>{loading ? 'Computing…' : 'Compute'}</button>
      </div>

      <p style={{ color: '#555', maxWidth: 680 }}>
        Threshold selection changes what counts as "rain". Very small amounts (trace/drizzle) often appear in the historical record
        — choosing a higher threshold (e.g. 1.0 mm) reports the probability of at least that amount falling on the given day.
      </p>

      {error && <div style={{ color: 'red' }}>Error: {error}</div>}

      {coords && (
        <div style={{ marginTop: 12 }}>
          <strong>Resolved coordinates:</strong> {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
        </div>
      )}

      {empResult && (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid #eee', borderRadius: 6, maxWidth: 760 }}>
          <h3>Empirical (counts)</h3>
          <p>Threshold: {empResult.threshold} mm</p>
          <p>Probability: {(empResult.prob * 100).toFixed(2)}% ({empResult.nRainy} / {empResult.nValid} years)</p>
        </div>
      )}

      {paramResult && (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid #eee', borderRadius: 6, maxWidth: 760 }}>
          <h3>Parametric (two-part)</h3>
          <p>Occurrence probability (p_occ): {(paramResult.p_occ * 100).toFixed(2)}% ({paramResult.nPosYears}/{paramResult.nValid} years)</p>
          <p>Conditional P(amount &gt; threshold | amount &gt; 0): {(paramResult.p_amount_gt_t * 100).toFixed(2)}%</p>
          <p>Combined probability: {(paramResult.prob * 100).toFixed(2)}%</p>
          <p>Positive samples used for fit: {paramResult.nPos}</p>
        </div>
      )}

    </div>
  )
}

export default App;
