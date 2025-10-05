import { useState } from 'react'
import Sunlight from './assets/Images/Sunlight.jpg'
import './App.css'

import { parseLocationInput, parseDateInput, geocodeCityCountry } from './geo_1.js'
import { buildDataset } from './ml_features.js'
import { trainLogisticSGD, evaluateModel } from './train_ml.js'
import { standardizeTrainTest, transformWithScaler } from './ml_utils.js'

export default function AppML() {
  const [loc, setLoc] = useState('Toronto, Canada');
  const [date, setDate] = useState('07/01');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [coords, setCoords] = useState(null);
  const [mlResult, setMlResult] = useState(null);

  async function computeML() {
    setError(null);
    setMlResult(null);
    setCoords(null);
    setLoading(true);
    try {
      const { city, country } = parseLocationInput(loc);
      const { month, day } = parseDateInput(date);
      const geo = await geocodeCityCountry(city, country);
      setCoords(geo);
      const { latitude, longitude } = geo;

      // build dataset using existing JS feature builder
      const ds = await buildDataset(longitude, latitude, month, day, { lags: 3, threshold: 0.1 });
      const X = ds.X;
      const y = ds.y;
      const n = X.length;
      if (n < 10) throw new Error('Not enough historical samples to train ML model (need >=10)');

      // simple train/test split (70/30)
      const idx = Array.from({ length: n }, (_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      const cut = Math.floor(n * 0.7);
      const trainIdx = idx.slice(0, cut);
      const testIdx = idx.slice(cut);
      const Xtrain = trainIdx.map(i => X[i]);
      const ytrain = trainIdx.map(i => y[i]);
      const Xtest = testIdx.map(i => X[i]);
      const ytest = testIdx.map(i => y[i]);

  // standardize features (fit on training set) and train with moderate regularization
  const { XtrainScaled, XtestScaled, scaler } = standardizeTrainTest(Xtrain, Xtest);
  const model = trainLogisticSGD(XtrainScaled, ytrain, { epochs: 800, lr: 0.005, reg: 1e-2 });

  const trainEval = evaluateModel(model, XtrainScaled, ytrain);
  const testEval = evaluateModel(model, XtestScaled, ytest);

  // predict for the target date using the last row in dataset (most recent sample), scaled with same scaler
  const lastRow = X[X.length - 1];
  const lastScaled = transformWithScaler([lastRow], scaler)[0];
  const predProba = model.predictProba(lastScaled);

      setMlResult({ n, trainEval, testEval, predProba, meta: ds.meta });
    } catch (e) {
      setError(e && e.message ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <img src={Sunlight} alt="Sunlight" style={{ maxWidth: 200 }} />
      <h2>ML demo — JS Logistic (in-browser)</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={loc} onChange={(e) => setLoc(e.target.value)} style={{ width: 300 }} />
        <input value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 120 }} />
        <button onClick={computeML} disabled={loading} style={{ padding: '8px 12px' }}>{loading ? 'Working…' : 'Run ML'}</button>
      </div>

      <p style={{ color: '#555', maxWidth: 680 }}>
        This demo trains a small logistic regression on historical samples for the chosen date and location, entirely in the browser using the project's JS trainer. It is a quick demo and not the final high-accuracy model.
      </p>

      {error && <div style={{ color: 'red' }}>Error: {error}</div>}

      {coords && (
        <div style={{ marginTop: 12 }}>
          <strong>Resolved coordinates:</strong> {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
        </div>
      )}

      {mlResult && (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid #eee', borderRadius: 6, maxWidth: 760 }}>
          <h3>ML Logistic results</h3>
          <p>Training samples: {mlResult.n}</p>
          <h4>Train metrics</h4>
          <pre>{JSON.stringify(mlResult.trainEval, null, 2)}</pre>
          <h4>Test metrics</h4>
          <pre>{JSON.stringify(mlResult.testEval, null, 2)}</pre>
          <h4>Predicted probability for chosen date</h4>
          <p>{(mlResult.predProba * 100).toFixed(2)}%</p>
        </div>
      )}

    </div>
  )
}
