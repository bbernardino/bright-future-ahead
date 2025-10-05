// Small feature-scaling utilities (fit on training set, apply to others)
export function fitScaler(X) {
    const n = X.length;
    const d = X[0].length;
    const mean = Array(d).fill(0);
    const std = Array(d).fill(0);

    for (let j = 0; j < d; j++) {
        let s = 0;
        for (let i = 0; i < n; i++) s += X[i][j];
        mean[j] = s / n;
    }
    for (let j = 0; j < d; j++) {
        let s2 = 0;
        for (let i = 0; i < n; i++) {
            const v = X[i][j] - mean[j];
            s2 += v * v;
        }
        std[j] = Math.sqrt(s2 / Math.max(1, n - 1));
        if (std[j] === 0) std[j] = 1; // avoid divide-by-zero for constant features
    }
    return { mean, std };
}

export function transformWithScaler(X, scaler) {
    const { mean, std } = scaler;
    return X.map(row => row.map((v, j) => (v - mean[j]) / std[j]));
}

export function standardizeTrainTest(Xtrain, Xtest) {
    const scaler = fitScaler(Xtrain);
    const Xt = transformWithScaler(Xtrain, scaler);
    const Xv = transformWithScaler(Xtest, scaler);
    return { XtrainScaled: Xt, XtestScaled: Xv, scaler };
}
