"""Train LightGBM classifier on POWER data for a center point and save model."""
import joblib
import lightgbm as lgb
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import roc_auc_score, accuracy_score, precision_score, recall_score, f1_score
from features import build_feature_table
from power_fetch import fetch_spatial_patch
import os


def collect_data(center_lon, center_lat, nx=3, ny=3, radius_deg=0.1, start='19810101', end=None):
    print('Fetching spatial patch...')
    big = fetch_spatial_patch(center_lon, center_lat, radius_deg=radius_deg, nx=nx, ny=ny, start=start, end=end)
    print('Fetched patch rows:', 0 if big is None else len(big))
    return big


def prepare(center_lon, center_lat, threshold=0.1, start='19810101', end=None):
    big = collect_data(center_lon, center_lat, start=start, end=end)
    print('Building features...')
    df = build_feature_table(big, threshold=threshold)
    # choose features
    feature_cols = ['sin_doy','cos_doy','precip_lag_1','precip_lag_2','precip_lag_3','t2m','precip_mean','precip_std','t2m_mean','t2m_std']
    X = df[feature_cols].values
    y = df['label'].values
    return X, y, df


def train_and_save(center_lon, center_lat, out_path='models/lightgbm_model.pkl', start='19810101', end=None):
    try:
        X, y, df = prepare(center_lon, center_lat, start=start, end=end)
    except Exception as e:
        print('ERROR during prepare():', e)
        raise
    if X.shape[0] < 20:
        raise RuntimeError('Not enough samples to train')

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, stratify=y)

    dtrain = lgb.Dataset(X_train, label=y_train)
    params = {
        'objective': 'binary',
        'metric': 'auc',
        'verbosity': -1,
    }

    print('Training LightGBM...')
    try:
        bst = lgb.train(params, dtrain, num_boost_round=200)
    except Exception as e:
        print('ERROR during LightGBM training:', e)
        raise

    # evaluate
    yprob = bst.predict(X_test)
    ypred = (yprob >= 0.5).astype(int)
    print('ROC AUC:', roc_auc_score(y_test, yprob))
    print('Accuracy:', accuracy_score(y_test, ypred))
    print('Precision:', precision_score(y_test, ypred, zero_division=0))
    print('Recall:', recall_score(y_test, ypred, zero_division=0))
    print('F1:', f1_score(y_test, ypred, zero_division=0))

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    joblib.dump(bst, out_path)
    print('Saved model to', out_path)
    return bst


if __name__ == '__main__':
    # example center point; use a reduced date range for quicker test runs
    center_lon = -80.25
    center_lat = 43.55
    # limit to 2010-2020 for faster verification; increase later when you're ready
    train_and_save(center_lon, center_lat, out_path='models/lightgbm_model_short.pkl', start='20100101', end='20201231')
