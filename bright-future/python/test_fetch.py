from power_fetch import fetch_power_point

def main():
    lon = -80.25
    lat = 43.55
    print('Fetching small range 20150101-20160101 for test...')
    df = fetch_power_point(lon, lat, start='20150101', end='20160101')
    print('Rows returned:', len(df))
    print(df.head(5).to_dict(orient='records'))

if __name__ == '__main__':
    main()
