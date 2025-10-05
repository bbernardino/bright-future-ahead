import { useState } from 'react'
import Sunlight from './assets/Images/Sunlight.jpg'
import './App.css'

import { fetchData } from '../src/scrape.js';
import { getPValueThreshold } from '../src/spencer_threshold_1.js';
import { getPValueParametric } from '../src/spencer_param_1.js';
import { parseLocationInput, parseDateInput, geocodeCityCountry } from './geo_1.js'
import { buildDataset } from './ml_features.js'
import { trainLogisticSGD } from './train_ml.js'
import { standardizeTrainTest, transformWithScaler } from './ml_utils.js'

export default function AppThresholdML() {
  const [loc, setLoc] = useState('Toronto, Canada');
  const [date, setDate] = useState('07/01');
  const [threshold, setThreshold] = useState('1.0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [coords, setCoords] = useState(null);
  const [empResult, setEmpResult] = useState(null);
  const [paramResult, setParamResult] = useState(null);
  const [mlProb, setMlProb] = useState(null);

  async function computeAll() {
    setError(null);
    setEmpResult(null);
    setParamResult(null);
    setMlProb(null);
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

      // ML: build JS dataset and train logistic quickly
      const ds = await buildDataset(longitude, latitude, month, day, { lags: 3, threshold: t });
        if (ds.X.length >= 8) {
        const n = ds.X.length;
        const idx = Array.from({ length: n }, (_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        const cut = Math.floor(n * 0.7);
        const trainIdx = idx.slice(0, cut);
        const Xtrain = trainIdx.map(i => ds.X[i]);
        const ytrain = trainIdx.map(i => ds.y[i]);
        // standardize and train with moderate regularization
        const { XtrainScaled, XtestScaled, scaler } = standardizeTrainTest(Xtrain, ds.X.filter((_,i)=>!trainIdx.includes(i)));
        const model = trainLogisticSGD(XtrainScaled, ytrain, { epochs: 800, lr: 0.005, reg: 1e-2 });
        const lastScaled = transformWithScaler([ds.X[ds.X.length - 1]], scaler)[0];
        const prob = model.predictProba(lastScaled);
        setMlProb(prob);
      }

    } catch (e) {
      setError(e && e.message ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <img src={Sunlight} alt="Sunlight" style={{ maxWidth: 200 }} />
      <h2>Empirical / Parametric / ML comparison</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={loc} onChange={(e) => setLoc(e.target.value)} style={{ width: 300 }} />
        <input value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 120 }} />

        <select value={threshold} onChange={(e) => setThreshold(e.target.value)} style={{ width: 140 }}>
          <option value="0.001">Trace &gt; 0 mm (0.001 mm)</option>
          <option value="0.1">Light &gt; 0.1 mm</option>
          <option value="1.0">Measurable &gt; 1.0 mm</option>
          <option value="5.0">Moderate &gt; 5.0 mm</option>
        </select>

        <button onClick={computeAll} disabled={loading} style={{ padding: '8px 12px' }}>{loading ? 'Computing…' : 'Compute all'}</button>
      </div>

      <p style={{ color: '#555', maxWidth: 680 }}>
        This page computes empirical counts, a two-part parametric model, and trains a quick JS logistic model on the historical data. ML is trained locally and is a quick baseline.
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

      {mlProb != null && (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid #eee', borderRadius: 6, maxWidth: 760 }}>
          <h3>ML (JS logistic)</h3>
          <p>Predicted probability: {(mlProb * 100).toFixed(2)}%</p>
        </div>
      )}

    </div>
  )
}
