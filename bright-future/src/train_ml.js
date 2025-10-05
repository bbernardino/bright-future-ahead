// Lightweight logistic regression with SGD, no external deps.

function dot(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
}

function sigmoid(z) {
    return 1 / (1 + Math.exp(-z));
}

export function trainLogisticSGD(X, y, opts = {}) {
    const nSamples = X.length;
    const nFeatures = X[0].length;
    const epochs = opts.epochs ?? 2000;
    const lr = opts.lr ?? 0.01;
    const reg = opts.reg ?? 1e-4;

    // initialize weights and bias
    const w = Array(nFeatures).fill(0).map(() => (Math.random() - 0.5) * 0.01);
    let b = 0;

    for (let ep = 0; ep < epochs; ep++) {
        let loss = 0;
        // simple SGD: shuffle indices
        const idx = Array.from({ length: nSamples }, (_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [idx[i], idx[j]] = [idx[j], idx[i]];
        }

        for (const i of idx) {
            const xi = X[i];
            const yi = y[i];
            const z = dot(w, xi) + b;
            const p = sigmoid(z);
            const err = p - yi;

            // update weights
            for (let k = 0; k < nFeatures; k++) {
                w[k] -= lr * (err * xi[k] + reg * w[k]);
            }
            b -= lr * err;

            loss += - (yi * Math.log(p + 1e-12) + (1 - yi) * Math.log(1 - p + 1e-12));
        }

        if (ep % 200 === 0) {
            // console.log(`epoch ${ep} loss=${(loss / nSamples).toFixed(4)}`);
        }
    }

    return { w, b, predictProba: (x) => sigmoid(dot(w, x) + b) };
}

export function evaluateModel(model, X, y) {
    let tp = 0, tn = 0, fp = 0, fn = 0;
    for (let i = 0; i < X.length; i++) {
        const p = model.predictProba(X[i]);
        const pred = p >= 0.5 ? 1 : 0;
        const actual = y[i];
        if (pred === 1 && actual === 1) tp++;
        if (pred === 0 && actual === 0) tn++;
        if (pred === 1 && actual === 0) fp++;
        if (pred === 0 && actual === 1) fn++;
    }
    const acc = (tp + tn) / (tp + tn + fp + fn);
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : 2 * (precision * recall) / (precision + recall);
    return { tp, tn, fp, fn, acc, precision, recall, f1 };
}
