import urllib.request
import urllib.parse
import json
from typing import List, Dict, Any, Optional

# Fallback catalog of global cities and Uttarakhand mountain regions
FALLBACK_CATALOG = [
    {"name": "Kedarnath", "display_name": "Kedarnath, Rudraprayag, Uttarakhand, India", "latitude": 30.7346, "longitude": 79.0669, "country": "India", "state": "Uttarakhand", "type": "village"},
    {"name": "Chamoli", "display_name": "Chamoli Township, Chamoli, Uttarakhand, India", "latitude": 30.4100, "longitude": 79.3300, "country": "India", "state": "Uttarakhand", "type": "town"},
    {"name": "Rudraprayag", "display_name": "Rudraprayag Confluence, Rudraprayag, Uttarakhand, India", "latitude": 30.2840, "longitude": 78.9800, "country": "India", "state": "Uttarakhand", "type": "city"},
    {"name": "Uttarkashi", "display_name": "Uttarkashi Valley, Uttarkashi, Uttarakhand, India", "latitude": 30.7268, "longitude": 78.4354, "country": "India", "state": "Uttarakhand", "type": "city"},
    {"name": "Pithoragarh", "display_name": "Pithoragarh Basin, Pithoragarh, Uttarakhand, India", "latitude": 29.5829, "longitude": 80.2182, "country": "India", "state": "Uttarakhand", "type": "city"},
    {"name": "Joshimath", "display_name": "Joshimath Slopes, Chamoli, Uttarakhand, India", "latitude": 30.5550, "longitude": 79.5650, "country": "India", "state": "Uttarakhand", "type": "town"},
    {"name": "New Delhi", "display_name": "New Delhi, Delhi, India", "latitude": 28.6139, "longitude": 77.2090, "country": "India", "state": "Delhi", "type": "capital"},
    {"name": "Tokyo", "display_name": "Tokyo, Kanto, Japan", "latitude": 35.6762, "longitude": 139.6503, "country": "Japan", "state": "Tokyo", "type": "metropolis"},
    {"name": "London", "display_name": "London, Greater London, United Kingdom", "latitude": 51.5074, "longitude": -0.1278, "country": "United Kingdom", "state": "England", "type": "city"},
    {"name": "San Francisco", "display_name": "San Francisco, California, United States", "latitude": 37.7749, "longitude": -122.4194, "country": "United States", "state": "California", "type": "city"},
    {"name": "Kathmandu", "display_name": "Kathmandu, Bagmati Province, Nepal", "latitude": 27.7172, "longitude": 85.3240, "country": "Nepal", "state": "Bagmati", "type": "capital"}
]

def search_location(query: str) -> List[Dict[str, Any]]:
    """
    Search for a location using OpenStreetMap Nominatim Geocoding API with robust fallback.
    Supports country, state, district, city, town, village, postal code, lat/lng.
    """
    query = query.strip()
    if not query:
        return FALLBACK_CATALOG[:5]

    # Check for direct latitude, longitude pair (e.g., "30.7346, 79.0669")
    if "," in query:
        parts = query.split(",")
        if len(parts) == 2:
            try:
                lat = float(parts[0].strip())
                lng = float(parts[1].strip())
                return [{
                    "name": f"Coordinates ({lat:.4f}, {lng:.4f})",
                    "display_name": f"Latitude {lat:.4f}, Longitude {lng:.4f}",
                    "latitude": lat,
                    "longitude": lng,
                    "country": "Custom Coordinates",
                    "state": "N/A",
                    "type": "coordinates"
                }]
            except ValueError:
                pass

    # Try OpenStreetMap Nominatim API
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&format=json&limit=5&addressdetails=1"
        req = urllib.request.Request(url, headers={'User-Agent': 'FlashFloodPredictionSystem/1.0'})
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                if data:
                    results = []
                    for item in data:
                        addr = item.get('address', {})
                        results.append({
                            "name": item.get('name') or addr.get('city') or addr.get('town') or addr.get('village') or query,
                            "display_name": item.get('display_name'),
                            "latitude": float(item.get('lat')),
                            "longitude": float(item.get('lon')),
                            "country": addr.get('country', 'Global'),
                            "state": addr.get('state', ''),
                            "type": item.get('type', 'location')
                        })
                    return results
    except Exception as e:
        print(f"Nominatim geocode request failed, switching to local catalog: {e}")

    # Local search matching
    q_lower = query.lower()
    matches = [loc for loc in FALLBACK_CATALOG if q_lower in loc["name"].lower() or q_lower in loc["display_name"].lower()]
    if matches:
        return matches

    # Default fallback
    return [{
        "name": query.capitalize(),
        "display_name": f"{query.capitalize()} (Simulated Global Location)",
        "latitude": 30.5000,
        "longitude": 79.2000,
        "country": "Global",
        "state": "Region",
        "type": "custom"
    }]
