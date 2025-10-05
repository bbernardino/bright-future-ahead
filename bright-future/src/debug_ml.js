import { buildDataset } from './ml_features.js';
import { trainLogisticSGD } from './train_ml.js';
import { standardizeTrainTest } from './ml_utils.js';

function summarizeArray(arr) {
  if (arr.length === 0) return {};
  const n = arr.length;
  const sum = arr.reduce((a,b)=>a+b,0);
  const mean = sum / n;
  let min = arr[0], max = arr[0];
  for (const v of arr) { if (v < min) min = v; if (v > max) max = v; }
  return { n, mean, min, max };
}

async function main() {
  const lon = -80.25;
  const lat = 43.55;
  const month = 7;
  const day = 1;

  console.log('Building dataset...');
  const { X, y, meta } = await buildDataset(lon, lat, month, day, { lags: 3, threshold: 0.1 });
  console.log('Samples:', X.length);
  const counts = y.reduce((acc,v)=>{ acc[v]= (acc[v]||0)+1; return acc; }, {});
  console.log('Label counts:', counts);

  if (X.length === 0) return;

  // feature column-wise ranges
  const nFeat = X[0].length;
  const cols = Array.from({length: nFeat}, ()=>[]);
  for (const row of X) for (let i=0;i<nFeat;i++) cols[i].push(row[i]);
  const stats = cols.map((c,i)=> ({idx:i, ...summarizeArray(c)}));
  console.log('Feature stats (idx: n, mean, min, max):');
  for (const s of stats) console.log(s.idx, s.n, s.mean.toFixed(4), s.min.toFixed(4), s.max.toFixed(4));

  // train/test split
  const n = X.length;
  const idx = Array.from({length:n}, (_,i)=>i);
  for (let i = idx.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const cut = Math.floor(n*0.7);
  const trainIdx = idx.slice(0,cut);
  const testIdx = idx.slice(cut);
  const Xtrain = trainIdx.map(i=>X[i]);
  const ytrain = trainIdx.map(i=>y[i]);
  const Xtest = testIdx.map(i=>X[i]);
  const ytest = testIdx.map(i=>y[i]);

  console.log('Train samples:', Xtrain.length, 'Test samples:', Xtest.length);

  // train
  // standardize features
  const { XtrainScaled, XtestScaled } = standardizeTrainTest(Xtrain, Xtest);

  // train with moderate regularization and fewer epochs
  const model = trainLogisticSGD(XtrainScaled, ytrain, { epochs: 800, lr: 0.005, reg: 1e-2 });

  // get probs
  const probsTrain = XtrainScaled.map(x=>model.predictProba(x));
  const probsTest = XtestScaled.map(x=>model.predictProba(x));

  const avgTrainPos = probsTrain.reduce((a,b)=>a+b,0)/probsTrain.length;
  const avgTestPos = probsTest.reduce((a,b)=>a+b,0)/probsTest.length;
  console.log('Avg prob (train):', avgTrainPos.toFixed(4), 'Avg prob (test):', avgTestPos.toFixed(4));

  // show distribution of probs on test
  const sortedTest = probsTest.slice().sort((a,b)=>b-a);
  console.log('Top 5 test probs:', sortedTest.slice(0,5).map(p=>p.toFixed(6)));
  console.log('Bottom 5 test probs:', sortedTest.slice(-5).map(p=>p.toFixed(6)));

  // show specific last sample prob
  const lastProb = model.predictProba(XtestScaled[XtestScaled.length-1] || XtrainScaled[XtrainScaled.length-1]);
  console.log('Last sample prob:', lastProb);

  // identify if any feature has very large magnitude that could dominate
  const largeFeat = stats.filter(s=> Math.abs(s.mean) > 100 || Math.abs(s.max) > 100 || Math.abs(s.min) > 100);
  console.log('Large-magnitude features (mean or extreme >100):', largeFeat.map(f=>f.idx));

  console.log('Meta:', meta);
}

main().catch(err=>{ console.error(err); process.exit(1); });
