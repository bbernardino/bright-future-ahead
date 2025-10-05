"""Utilities to fetch NASA POWER data for points and date ranges."""
import requests
import pandas as pd
from tqdm import tqdm
from datetime import datetime, timedelta
import time
import os
import json
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# prepare a session with retries to avoid hanging on single requests
_session = requests.Session()
retries = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retries)
_session.mount('https://', adapter)

# Simple on-disk cache for POWER responses
CACHE_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)

BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

def fetch_power_point(lon, lat, start="19810101", end=None, parameters=None):
    if end is None:
        now = datetime.utcnow()
        end = now.strftime('%Y%m%d')
    if parameters is None:
        parameters = ["T2M", "PRECTOTCORR"]

    params = {
        'start': start,
        'end': end,
        'longitude': lon,
        'latitude': lat,
        'community': 'AG',
        'format': 'JSON',
        'time-standard': 'UTC',
        'parameters': ','.join(parameters),
    }

    # build cache key
    key = f"power_lon{lon}_lat{lat}_start{params['start']}_end{params['end']}_par{params['parameters'].replace(',', '-')}.json"
    cache_path = os.path.join(CACHE_DIR, key)
    if os.path.exists(cache_path):
        try:
            with open(cache_path, 'r', encoding='utf8') as fh:
                data = json.load(fh)
        except Exception:
            data = None
    else:
        try:
            r = _session.get(BASE_URL, params=params, timeout=15)
            r.raise_for_status()
            data = r.json()
            # save raw response to cache
            try:
                with open(cache_path, 'w', encoding='utf8') as fh:
                    json.dump(data, fh)
            except Exception:
                pass
        except Exception as e:
            # don't let a single failing point stall everything; return empty dataframe
            print(f"WARNING: fetch failed for lon={lon} lat={lat} params={params.get('start')}..{params.get('end')}: {e}")
            return pd.DataFrame(columns=['date','year','month','day','t2m','precip'])
    t2m = data.get('properties', {}).get('parameter', {}).get('T2M', {})
    pr = data.get('properties', {}).get('parameter', {}).get('PRECTOTCORR', {})

    records = []
    for date_str in t2m.keys() | pr.keys():
        y = int(date_str[0:4])
        m = int(date_str[4:6]) if len(date_str) == 8 else int(date_str[5:7])
        d = int(date_str[6:8]) if len(date_str) == 8 else int(date_str[8:10])
        records.append({
            'date': pd.to_datetime(f"{y:04d}-{m:02d}-{d:02d}"),
            'year': y,
            'month': m,
            'day': d,
            't2m': t2m.get(date_str, None),
            'precip': pr.get(date_str, None),
        })

    df = pd.DataFrame(records)
    df = df.sort_values('date').reset_index(drop=True)
    return df

def fetch_spatial_patch(center_lon, center_lat, radius_deg=0.1, nx=3, ny=3, **kwargs):
    # Create grid around center
    lons = [center_lon + (i - (nx//2)) * radius_deg for i in range(nx)]
    lats = [center_lat + (j - (ny//2)) * radius_deg for j in range(ny)]
    pts = []
    total = nx * ny
    i = 0
    for lon in lons:
        for lat in lats:
            i += 1
            print(f"Fetching point {i}/{total}: lon={lon} lat={lat}")
            df = fetch_power_point(lon, lat, **kwargs)
            if df is None or df.empty:
                print(f"  -> no data for lon={lon} lat={lat}, skipping")
                continue
            df['lon'] = lon
            df['lat'] = lat
            pts.append(df)
            # small polite pause
            time.sleep(0.1)
    if not pts:
        return pd.DataFrame(columns=['date','year','month','day','t2m','precip','lon','lat'])
    # return concatenated frame with lon/lat per row
    big = pd.concat(pts, ignore_index=True)
    return big
