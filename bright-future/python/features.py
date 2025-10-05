"""Feature engineering: cyclical encoding, lags, rolling stats, patch aggregation."""
import pandas as pd
import numpy as np


def cyclical_doy(df, date_col='date'):
    doy = df[date_col].dt.dayofyear
    angle = 2 * np.pi * doy / 365.0
    df['sin_doy'] = np.sin(angle)
    df['cos_doy'] = np.cos(angle)
    return df


def add_lags(df, value_col='precip', lags=(1,2,3)):
    df = df.sort_values('date')
    for l in lags:
        df[f'precip_lag_{l}'] = df.groupby(['lon','lat'])[value_col].shift(l)
    return df


def add_rolling(df, value_col='precip'):
    df = df.sort_values('date')
    # use transform to produce a Series aligned to the original index
    df['precip_roll_3'] = df.groupby(['lon','lat'])[value_col].transform(lambda s: s.rolling(window=3, min_periods=1).mean())
    df['precip_roll_7'] = df.groupby(['lon','lat'])[value_col].transform(lambda s: s.rolling(window=7, min_periods=1).mean())
    return df


def aggregate_patch(df):
    # compute spatial patch stats per date
    agg = df.groupby('date').agg({
        'precip': ['mean','std','max'],
        't2m': ['mean','std']
    })
    # flatten columns
    agg.columns = ['_'.join(col).strip() for col in agg.columns.values]
    agg = agg.reset_index()
    return agg


def build_feature_table(big_df, threshold=0.1):
    # big_df has lon,lat,date,t2m,precip
    df = big_df.copy()
    df['date'] = pd.to_datetime(df['date'])
    df = cyclical_doy(df)
    df = add_lags(df)
    df = add_rolling(df)
    patch = aggregate_patch(df)
    merged = df.merge(patch, on='date', how='left')
    # label per row
    merged['label'] = (merged['precip'] >= threshold).astype(int)
    # drop rows with NaNs in key features
    cols_needed = ['sin_doy','cos_doy','precip_lag_1','precip_lag_2','precip_lag_3','t2m','precip_mean']
    merged = merged.dropna(subset=cols_needed)
    return merged
