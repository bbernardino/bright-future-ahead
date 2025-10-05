import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import Sunlight from './assets/Images/Sunlight.jpg'
import viteLogo from '/vite.svg'
import './App.css'

import { fetchData } from '../src/scrape.js';
import { getPValue, getTempProbability, getWindProbability, getTempPrediction, getWindPrediction } from '../src/spencer.js';
import { parseLocationInput, geocodeCityCountry, reverseGeocode, suggestLocations } from './geo_1.js';
import ChartTS from './ChartTS.jsx';
import MapPicker from './MapPicker.jsx';

function App() {
  const [count, setCount] = useState(0)

  const [countryAndCity, setCountryAndCity] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [variable, setVariable] = useState('precip');
  const [threshold, setThreshold] = useState('moderate');
  const [method, setMethod] = useState('threshold');
  const [probResult, setProbResult] = useState(null);
  const [histValues, setHistValues] = useState(null);
  const [trendResult, setTrendResult] = useState(null);
  const [useMap, setUseMap] = useState(false);
  const [pickedPos, setPickedPos] = useState(null);
  const [pickedPlace, setPickedPlace] = useState(null);
  const [histYears, setHistYears] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // when user picks a position on the map, reverse geocode to get nearest place
  useEffect(() => {
    (async () => {
      if (useMap && pickedPos) {
        try {
          const info = await reverseGeocode(pickedPos.lat, pickedPos.lon).catch(() => null);
          if (info) setPickedPlace(info);
        } catch (e) { setPickedPlace(null); }
      }
    })();
  }, [useMap, pickedPos]);

  // small helper: compute mean and std
  function stats(arr) {
    const vals = arr.filter(v => v != null && Number.isFinite(v));
    if (vals.length === 0) return { n: 0, mean: null, std: null };
    const n = vals.length;
    const mean = vals.reduce((s, v) => s + v, 0) / n;
    const s2 = vals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / Math.max(1, n - 1);
    return { n, mean, std: Math.sqrt(s2) };
  }

  function Histogram({ values = [], bins = 20, width = 600, height = 120 }) {
    const vals = values.filter(v => v != null && Number.isFinite(v));
    if (!vals.length) return <div style={{ color: '#666' }}>No data to show</div>;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const counts = new Array(bins).fill(0);
    for (const v of vals) {
      let b = Math.floor(((v - min) / range) * bins);
      if (b < 0) b = 0;
      if (b >= bins) b = bins - 1;
      counts[b]++;
    }
    const maxCount = Math.max(...counts);
    const barWidth = width / bins;
    return (
      <svg width={width} height={height} style={{ background: '#fff' }}>
        {counts.map((c, i) => {
          const h = (c / maxCount) * (height - 20);
          const x = i * barWidth;
          const y = height - h - 10;
          return (
            <rect key={i} x={x} y={y} width={barWidth - 2} height={h} fill="#4f46e5" opacity={0.85} />
          );
        })}
        {/* x-axis labels: min and max */}
        <text x={4} y={height - 1} fontSize={10} fill="#333">{min.toFixed(2)}</text>
        <text x={width - 48} y={height - 1} fontSize={10} fill="#333">{max.toFixed(2)}</text>
      </svg>
    );
  }

  // helper to classify precip bucket
  function classifyPrecip(mm) {
    if (mm == null || !Number.isFinite(mm)) return 'No data';
    if (mm > 7.6) return 'High (>7.6 mm)';
    if (mm > 2.6) return 'Moderate (2.6–7.6 mm)';
    if (mm >= 0.2) return 'Low (0.2–2.6 mm)';
    if (mm >= 0) return 'Negligible (0–0.2 mm)';
    return 'No data';
  }

  return (
    
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <img src={Sunlight} alt="Sunlight"/>
      {/* Title with subtext */}
      <h1 style={{ marginBottom: "5px" }}>Bright Future</h1>
      <p style={{ marginTop: 0, color: "gray", fontSize: "14px" }}>
        Helping you plan your outdoor activities with confidence using NASA's weather data to predict the best times for clear skies
      </p>

      {/* First textbox */}
      <input
        type="text"
        value={countryAndCity}
        onChange={(e) => setCountryAndCity(e.target.value)}
        placeholder="Location (City, Country)"
        onKeyUp={async (e) => {
          const q = e.currentTarget.value;
          if (!q || q.length < 2) { setSuggestions([]); return; }
          try { const s = await suggestLocations(q, { limit: 6 }); setSuggestions(s); } catch(e){ setSuggestions([]); }
        }}
        style={{
          padding: "8px",
          marginRight: "10px",
          marginBottom: "10px",
          fontSize: "16px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      />

      {suggestions.length > 0 && (
        <div style={{ position: 'relative', maxWidth: 520, background: '#fff', border: '1px solid #ddd' }}>
          {suggestions.map((s, i) => (
            <div key={i} onClick={() => { setCountryAndCity(`${s.city || ''}, ${s.country || ''}`); setSuggestions([]); setPickedPos({ lat: s.latitude, lon: s.longitude }); setPickedPlace(s); }} style={{ padding: 6, cursor: 'pointer' }}>{s.display_name}</div>
          ))}
        </div>
      )}

      {/* Second textbox */}
      <input
        type="text"
        value={currentDate}
        onChange={(e) => setCurrentDate(e.target.value)}
        placeholder="Date (MM/DD)"
        style={{
          padding: "8px",
          fontSize: "16px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      />

      {/* Second button instead of textbox */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={useMap} onChange={(e)=>setUseMap(e.target.checked)} /> Use map
        </label>
        {useMap && (
          <div style={{ width: 760 }}>
            <MapPicker position={pickedPos} setPosition={(p)=>setPickedPos(p)} defaultPosition={{ lat: 43.55, lon: -80.25 }} />
            <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Click on the map to choose a location (marker)</div>
          </div>
        )}
        <select value={variable} onChange={(e) => setVariable(e.target.value)} style={{ padding: 8 }}>
          <option value="precip">Precipitation (mm)</option>
          <option value="temp">Temperature (°C)</option>
          <option value="wind">Windspeed (m/s)</option>
          <option value="T2M_MAX">Temperature max (°C)</option>
          <option value="T2M_MIN">Temperature min (°C)</option>
          <option value="RH2M">Relative humidity (%)</option>
          <option value="ALLSKY_SFC_SW_DWN">Surface solar (W/m2)</option>
          <option value="AOD550">Aerosol optical depth (AOD550)</option>
        </select>
        <select value={method} onChange={(e)=>setMethod(e.target.value)} style={{ padding: 8 }}>
          <option value="threshold">Empirical counts</option>
          <option value="parametric">Parametric (two-part)</option>
        </select>
        {/* threshold selector: show labeled dropdown for precipitation categories */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: 12, color: '#333', marginBottom: 4 }}>Threshold</label>
          {variable === 'precip' ? (
            <select value={threshold} onChange={(e)=>setThreshold(e.target.value)} style={{ width: 260, padding: 8 }}>
              <option value="moderate">Moderate (above 2.6 mm and below 7.6 mm per day)</option>
              <option value="high">High (above 7.6 mm)</option>
              <option value="low">Low (0.2 - 2.6 mm)</option>
              <option value="negligible">Negligible rain (0 - 0.2 mm)</option>
              <option value="all">All Thresholds (show percentages for all categories)</option>
            </select>
          ) : (
            <select value={threshold} onChange={(e)=>setThreshold(e.target.value)} style={{ width: 260, padding: 8, opacity: 0.5 }} disabled>
              <option>{String(threshold)}</option>
            </select>
          )}
        </div>
        <button onClick={async () => {
          try {
            let longitude, latitude;
            if (useMap && pickedPos) {
              longitude = pickedPos.lon; latitude = pickedPos.lat;
            } else {
              const { city, country } = parseLocationInput(countryAndCity);
              const geo = await geocodeCityCountry(city, country);
              longitude = geo.longitude; latitude = geo.latitude;
            }
            const part = currentDate.split("/");
            const month = Number(part[0]);
            const day = Number(part[1]);
            const { temp, precip, wind, years, T2M_MAX, T2M_MIN, RH2M, ALLSKY_SFC_SW_DWN, AOD550 } = await fetchData(longitude, latitude, { parameters: undefined });

            if (variable === 'precip') {
              // compute category percentages
              const N_DAYS = precip.length;
              const nYears = (precip[0] && precip[0].length) || 0;
              let counts = { high: 0, moderate: 0, low: 0, negligible: 0, valid: 0 };
              for (let yi = 0; yi < nYears; yi++) {
                const y = years[yi];
                const dt = new Date(Date.UTC(y, month - 1, day));
                const doy = Math.floor((dt - new Date(Date.UTC(y, 0, 1))) / 86400000);
                if (!Number.isFinite(doy) || doy < 0 || doy >= N_DAYS) continue;
                const v = precip[doy] && precip[doy][yi];
                if (v === null || v === undefined || Number.isNaN(v)) continue;
                counts.valid += 1;
                const mm = Number(v);
                if (mm > 7.6) counts.high += 1;
                else if (mm > 2.6) counts.moderate += 1;
                else if (mm >= 0.2) counts.low += 1;
                else if (mm >= 0) counts.negligible += 1;
              }
              const pct = (x) => (counts.valid ? (counts[x] / counts.valid) : null);
              if (threshold === 'all') {
                setProbResult({ variable, threshold, breakdown: { high: pct('high'), moderate: pct('moderate'), low: pct('low'), negligible: pct('negligible') }, counts });
              } else {
                const map = { moderate: 'moderate', high: 'high', low: 'low', negligible: 'negligible' };
                const key = map[threshold] || 'moderate';
                setProbResult({ variable, threshold, prob: pct(key), counts });
              }
              // collect historical values for this day across years
              const vals = [];
              for (let yi = 0; yi < years.length; yi++) {
                const y = years[yi];
                const dt = new Date(Date.UTC(y, month - 1, day));
                const doy = Math.floor((dt - new Date(Date.UTC(y, 0, 1))) / 86400000);
                vals.push(precip[doy] && precip[doy][yi] != null ? precip[doy][yi] : null);
              }
              setHistValues(vals);
              setHistYears(years);
              try { const tr = getTrendForDay(precip, years, month, day); setTrendResult(tr); } catch(e){ setTrendResult(null); }
            } else if (variable === 'temp') {
              const pred = getTempPrediction(temp, years, month, day, { tolerance: 2.0 });
              setProbResult({ variable, threshold: Number(threshold), prob: pred.within_tol_prob, predicted: pred.predicted, std: pred.std, samples: pred.samples });
              const vals = [];
              for (let yi = 0; yi < years.length; yi++) {
                const y = years[yi];
                const dt = new Date(Date.UTC(y, month - 1, day));
                const doy = Math.floor((dt - new Date(Date.UTC(y, 0, 1))) / 86400000);
                vals.push(temp[doy] && temp[doy][yi] != null ? temp[doy][yi] : null);
              }
              setHistValues(vals);
              setHistYears(years);
              try { const tr = getTrendForDay(temp, years, month, day); setTrendResult(tr); } catch(e){ setTrendResult(null); }
            } else if (variable === 'wind') {
              const pred = getWindPrediction(wind, years, month, day, { tolerance: 1.0 });
              setProbResult({ variable, threshold: Number(threshold), prob: pred.within_tol_prob, predicted: pred.predicted, std: pred.std, samples: pred.samples });
              const vals = [];
              for (let yi = 0; yi < years.length; yi++) {
                const y = years[yi];
                const dt = new Date(Date.UTC(y, month - 1, day));
                const doy = Math.floor((dt - new Date(Date.UTC(y, 0, 1))) / 86400000);
                vals.push(wind[doy] && wind[doy][yi] != null ? wind[doy][yi] : null);
              }
              setHistValues(vals);
              setHistYears(years);
              try { const tr = getTrendForDay(wind, years, month, day); setTrendResult(tr); } catch(e){ setTrendResult(null); }
            } else {
              setProbResult({ variable, threshold: Number(threshold), prob: null });
              setHistValues(null);
              setTrendResult(null);
            }
          } catch (err) {
            alert(String(err));
          }
        }} style={{ padding: 8, backgroundColor: '#5047cfff', color: 'white' }}>Compute</button>

        {/* Download buttons removed for general users */}
      </div>

      <p>
        The NASA weather data base will be searched for: <b>{countryAndCity} {currentDate}</b>
      </p>

      {probResult && (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid #eee', borderRadius: 6, maxWidth: 760 }}>
          <h3>Result</h3>
          <p><b>Variable:</b> {probResult.variable}</p>
          {/* when using map show coordinates and nearest place */}
          {useMap && pickedPos && (
            <div style={{ fontSize: 13, color: '#333' }}>
              <div>Coordinates: {pickedPos.lat.toFixed(4)}, {pickedPos.lon.toFixed(4)}</div>
              {pickedPlace ? (
                <div>Nearest place: {pickedPlace.display_name}</div>
              ) : (
                <div style={{ color: '#666' }}>Resolving nearest place...</div>
              )}
            </div>
          )}

          {/* Precipitation detailed buckets */}
          {probResult.variable === 'precip' && (
            <div>
              <p><b>Threshold used:</b> {probResult.threshold}</p>
              {probResult.breakdown ? (
                <div>
                  <p><b>Category breakdown (historical):</b></p>
                  <ul>
                    <li>High (&gt;7.6 mm): {(probResult.breakdown.high != null ? (probResult.breakdown.high*100).toFixed(1) + '%' : 'N/A')}</li>
                    <li>Moderate (2.6–7.6 mm): {(probResult.breakdown.moderate != null ? (probResult.breakdown.moderate*100).toFixed(1) + '%' : 'N/A')}</li>
                    <li>Low (0.2–2.6 mm): {(probResult.breakdown.low != null ? (probResult.breakdown.low*100).toFixed(1) + '%' : 'N/A')}</li>
                    <li>Negligible (0–0.2 mm): {(probResult.breakdown.negligible != null ? (probResult.breakdown.negligible*100).toFixed(1) + '%' : 'N/A')}</li>
                  </ul>
                </div>
              ) : (
                <p><b>Estimated probability:</b> {(probResult.prob !== null ? (probResult.prob*100).toFixed(2) + '%' : 'N/A')}</p>
              )}
              {histValues && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ marginTop: 8 }}>
                    <h4>Time series</h4>
                    <ChartTS values={histValues} years={histYears || []} title={'Precipitation (mm)'} yLabel={'Precipitation (mm)'} />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <small style={{ color: '#666' }}>{JSON.stringify(stats(histValues))}</small>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Temperature: show predicted temp and chance distributions */}
          {probResult.variable === 'temp' && (
            <div>
              <p><b>Predicted temperature:</b> {(probResult.predicted != null ? `${probResult.predicted.toFixed(2)} °C` : 'N/A')}</p>
              <p><b>Estimated confidence (±2°C):</b> {(probResult.prob !== null ? (probResult.prob*100).toFixed(2) + '%' : 'N/A')}</p>
              {probResult.std != null && <p><small>Sample std: {probResult.std.toFixed(2)} °C (n={probResult.samples ? probResult.samples.length : 'n/a'})</small></p>}
              {histValues && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ marginTop: 8 }}>
                    <h4>Time series</h4>
                    <ChartTS values={histValues} years={histYears || []} title={'Temperature (°C)'} yLabel={'Temperature (°C)'} />
                  </div>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <small style={{ color: '#666' }}>{JSON.stringify(stats(histValues))}</small>
              </div>
              <div style={{ marginTop: 8 }}>
                <small style={{ color: '#444' }}>Click the Temperature option to view Tmax/Tmin.</small>
              </div>
            </div>
          )}

          {/* Wind: show percent chance distribution */}
          {probResult.variable === 'wind' && (
            <div>
              <p><b>Predicted windspeed:</b> {(probResult.predicted != null ? `${probResult.predicted.toFixed(2)} m/s` : 'N/A')}</p>
              <p><b>Estimated confidence (±1 m/s):</b> {(probResult.prob !== null ? (probResult.prob*100).toFixed(2) + '%' : 'N/A')}</p>
              {probResult.std != null && <p><small>Sample std: {probResult.std.toFixed(2)} m/s (n={probResult.samples ? probResult.samples.length : 'n/a'})</small></p>}
              {histValues && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ marginTop: 8 }}>
                    <h4>Time series</h4>
                    <ChartTS values={histValues} years={histYears || []} title={'Windspeed (m/s)'} yLabel={'Windspeed (m/s)'} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tmax/Tmin: display when selected */}
          {probResult.variable === 'T2M_MAX' && (
            <div>
              <p>Displayed Tmax values are available when you select Temperature max.</p>
              {histValues && (<ChartTS values={histValues} years={histYears || []} title={'Tmax (°C)'} yLabel={'Temperature (°C)'} />)}
            </div>
          )}
          {probResult.variable === 'T2M_MIN' && (
            <div>
              <p>Displayed Tmin values are available when you select Temperature min.</p>
              {histValues && (<ChartTS values={histValues} years={histYears || []} title={'Tmin (°C)'} yLabel={'Temperature (°C)'} />)}
            </div>
          )}

          {/* Humidity note */}
          {probResult.variable === 'RH2M' && (
            <div>
              <p>Relative humidity historical values are shown, but humidity is not currently modeled as a daily predictive probability.</p>
              {histValues && (<ChartTS values={histValues} years={histYears || []} title={'Relative humidity (%)'} yLabel={'Relative humidity (%)'} />)}
            </div>
          )}

          {/* Surface solar / AOD explanation */}
          {(probResult.variable === 'ALLSKY_SFC_SW_DWN' || probResult.variable === 'AOD550') && (
            <div>
              <p>These variables are observational atmospheric quantities: surface solar irradiance (W/m²) and aerosol optical depth (unitless). They are shown for context and historical comparison, not as a single-day probability forecast.</p>
              {histValues && (<ChartTS values={histValues} years={histYears || []} title={probResult.variable} yLabel={probResult.variable} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );  
}



export default App;
