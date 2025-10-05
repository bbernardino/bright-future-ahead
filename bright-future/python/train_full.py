"""Train with cross-validation and randomized hyperparameter search."""
import numpy as np
import joblib
import lightgbm as lgb
from sklearn.model_selection import StratifiedKFold, RandomizedSearchCV
from sklearn.metrics import make_scorer, roc_auc_score
from sklearn.base import BaseEstimator, ClassifierMixin
from train_lightgbm import prepare
import os


class LGBWrapper(BaseEstimator, ClassifierMixin):
    def __init__(self, **kwargs):
        self.kwargs = kwargs

    def fit(self, X, y):
        dtrain = lgb.Dataset(X, label=y)
        self.model = lgb.train(self.kwargs, dtrain, num_boost_round=self.kwargs.get('num_boost_round', 100))
        return self

    def predict_proba(self, X):
        p = self.model.predict(X)
        return np.vstack([1-p, p]).T


def run_cv(center_lon, center_lat, start='19810101', end=None):
    X, y, df = prepare(center_lon, center_lat, start=start, end=end)
    if X.shape[0] < 30:
        raise RuntimeError('Not enough samples for CV')
    param_dist = {
        'objective': ['binary'],
        'metric': ['auc'],
        'learning_rate': [0.01, 0.05, 0.1],
        'num_leaves': [15, 31, 63],
        'min_data_in_leaf': [1, 5, 10]
    }
    clf = LGBWrapper(num_boost_round=200)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
    scorer = make_scorer(roc_auc_score, needs_proba=True)

    rs = RandomizedSearchCV(clf, param_distributions=param_dist, n_iter=6, scoring=scorer, cv=cv, random_state=0)
    rs.fit(X, y)
    print('Best params:', rs.best_params_)
    out = 'models/lightgbm_model_full.pkl'
    os.makedirs(os.path.dirname(out), exist_ok=True)
    joblib.dump(rs.best_estimator_.model, out)
    print('Saved best model to', out)
    return rs


if __name__ == '__main__':
    run_cv(-80.25, 43.55, start='19810101', end=None)
