import httpx

tests = [
    ("127.0.0.1 - Chennai",       "http://127.0.0.1:8000/api/weather/current?lat=13.0827&lng=80.2707&name=Chennai"),
    ("10.175.130.129 - Chennai",  "http://10.175.130.129:8000/api/weather/current?lat=13.0827&lng=80.2707&name=Chennai"),
]

for label, url in tests:
    try:
        r = httpx.get(url, timeout=10).json()
        print(f"[{label}] data_status={r.get('data_status')} provider_status={r.get('provider_status')} age_s={r.get('data_age_seconds')} temp={r.get('temperature')}C")
    except Exception as e:
        print(f"[{label}] ERROR: {e}")
