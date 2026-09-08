import httpx
import time

locs = [
    ("Chennai",       13.0827,  80.2707),
    ("Tokyo",         35.6762, 139.6503),
    ("London",        51.5072,  -0.1276),
    ("San Francisco", 37.7749, -122.4194),
]

print("=" * 70)
print("WEATHER LIVE DATA VERIFICATION")
print("=" * 70)

for name, lat, lng in locs:
    url = f"http://127.0.0.1:8000/api/weather/current?lat={lat}&lng={lng}&name={name}"
    try:
        r = httpx.get(url, timeout=20).json()
        ds  = r.get("data_status")
        ps  = r.get("provider_status")
        age = r.get("data_age_seconds")
        tmp = r.get("temperature")
        recv = r.get("received_timestamp", "")[:19]
        src  = r.get("source_timestamp", "")
        print(f"{name:<16} | data_status={ds:<12} provider_status={ps:<12} age_s={age}  temp={tmp}C  recv={recv}  src_ts={src}")
    except Exception as e:
        print(f"{name:<16} | ERROR: {e}")

print("=" * 70)
