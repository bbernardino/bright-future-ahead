"""Load saved LightGBM model and run predictions for single inputs."""
import joblib
import pandas as pd
from features import build_feature_table


def load_model(path='models/lightgbm_model_short.pkl'):
    return joblib.load(path)


def predict_for_point(model, lon, lat, date_str, threshold=0.1):
    # build minimal dataframe for the date
    y, m, d = map(int, date_str.split('-'))
    df = build_feature_table(pd.DataFrame([{ 'date': pd.to_datetime(date_str), 'year': y, 'month': m, 'day': d,'t2m': None,'precip': None,'lon': lon,'lat': lat }]), threshold=threshold)
    if df.empty:
        raise RuntimeError('No features available for this point/date')
    feature_cols = ['sin_doy','cos_doy','precip_lag_1','precip_lag_2','precip_lag_3','t2m','precip_mean','precip_std','t2m_mean','t2m_std']
    X = df[feature_cols].values
    p = model.predict(X)
    return p[0]


if __name__ == '__main__':
    m = load_model()
    print('Model loaded. Example prediction attempt will likely fail without nearby history.')
