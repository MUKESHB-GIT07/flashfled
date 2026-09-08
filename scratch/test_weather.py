import httpx

cities = [
    ("Chennai", 13.0827, 80.2707),
    ("Tokyo", 35.6762, 139.6503),
    ("London", 51.5074, -0.1278),
    ("San Francisco", 37.7749, -122.4194)
]

for name, lat, lng in cities:
    r = httpx.get(f"http://127.0.0.1:8000/api/weather/current?lat={lat}&lng={lng}&name={name}")
    d = r.json()
    print(f"{name:15s} -> HTTP {r.status_code} | Temp: {d.get('temperature')}°C | Humidity: {d.get('humidity')}% | Condition: {d.get('weather_condition')} | Status: {d.get('provider_status')}")
