import { buildDataset } from './ml_features.js';
import { trainLogisticSGD, evaluateModel } from './train_ml.js';
import { standardizeTrainTest } from './ml_utils.js';

async function main() {
    // example location: lon, lat
    const lon = -80.25;
    const lat = 43.55;
    const month = 7;
    const day = 1;

    console.log('Building dataset...');
    const { X, y, meta } = await buildDataset(lon, lat, month, day, { lags: 3, threshold: 0.1 });
    console.log(`N samples=${X.length}`);
    if (X.length < 10) {
        console.log('Not enough samples to train. Need more historical data or reduce lags.');
        return;
    }

    // simple train/test split (70/30)
    const n = X.length;
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

    console.log('Standardizing features and training logistic regression (SGD)...');
    // scale features to zero-mean, unit-variance to avoid weight explosion
    const { XtrainScaled, XtestScaled } = standardizeTrainTest(Xtrain, Xtest);

    // stronger L2 regularization, fewer epochs to reduce overfitting
    const model = trainLogisticSGD(XtrainScaled, ytrain, { epochs: 800, lr: 0.005, reg: 1e-2 });

    console.log('Evaluating...');
    const trainEval = evaluateModel(model, XtrainScaled, ytrain);
    const testEval = evaluateModel(model, XtestScaled, ytest);

    console.log('Train:', trainEval);
    console.log('Test:', testEval);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('run_ml_train.js')) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
