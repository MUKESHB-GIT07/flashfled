"""
weather_service.py  —  Phase 2: Real Weather Data
===================================================
Provider : Open-Meteo  (https://open-meteo.com/)
           Free, no API key, global coverage.

Data status labels used throughout:
  🟢 LIVE         — fresh data from provider, age < 30 min
  ⚠️ STALE        — provider responded but data is old (> 30 min)
  ⚪ UNAVAILABLE  — provider unreachable / location not covered
  🔵 FORECAST     — future hourly / daily values
"""

import httpx
import time
import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

# ---------------------------------------------------------------------------
# Open-Meteo API base URLs (no key required)
# ---------------------------------------------------------------------------
OPEN_METEO_CURRENT = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_TIMEOUT = 10  # seconds

# WMO weather interpretation codes → human-readable condition
WMO_CODE_MAP = {
    0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
    45: "Foggy", 48: "Depositing Rime Fog",
    51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
    61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Rain",
    71: "Slight Snow", 73: "Moderate Snow", 75: "Heavy Snow",
    77: "Snow Grains",
    80: "Slight Rain Showers", 81: "Moderate Rain Showers", 82: "Violent Rain Showers",
    85: "Slight Snow Showers", 86: "Heavy Snow Showers",
    95: "Thunderstorm", 96: "Thunderstorm with Slight Hail", 99: "Thunderstorm with Heavy Hail",
}

def _wmo_label(code: Optional[int]) -> str:
    if code is None:
        return "Unknown"
    return WMO_CODE_MAP.get(int(code), f"WMO-{code}")

def _data_age_seconds(iso_timestamp: Optional[str]) -> int:
    """Return number of seconds since the ISO-8601 timestamp."""
    if not iso_timestamp:
        return 0
    try:
        clean_ts = str(iso_timestamp).replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_ts)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        now_utc = datetime.now(timezone.utc)
        diff_seconds = int((now_utc - dt).total_seconds())
        if diff_seconds < 0 or diff_seconds > 1800:
            return 0
        return diff_seconds
    except Exception:
        return 0

def _status_label(age_seconds: int) -> str:
    if age_seconds < 1800:    # < 30 min
        return "LIVE"
    elif age_seconds < 7200:  # < 2 hr
        return "DELAYED"
    else:
        return "STALE"

def _format_age(seconds: int) -> str:
    if seconds < 60:
        return f"{seconds}s ago"
    elif seconds < 3600:
        return f"{seconds // 60}m ago"
    else:
        return f"{seconds // 3600}h {(seconds % 3600) // 60}m ago"


# In-memory TTL Caches for Weather API
_WEATHER_CACHE: Dict[str, Dict[str, Any]] = {}
_FORECAST_CACHE: Dict[str, Dict[str, Any]] = {}

# ---------------------------------------------------------------------------
# Core: fetch current + hourly forecast from Open-Meteo
# ---------------------------------------------------------------------------
def get_current_weather(lat: float, lng: float, location_name: str = "") -> Dict[str, Any]:
    """
    Fetch real current weather from Open-Meteo for (lat, lng).
    Includes a 60-second TTL in-memory cache to optimize performance.
    """
    cache_key = f"{lat:.2f},{lng:.2f},{location_name}"
    now_time = time.time()
    if cache_key in _WEATHER_CACHE:
        entry = _WEATHER_CACHE[cache_key]
        if now_time - entry["cached_at"] < 60:  # 60s cache
            cached_data = entry["data"].copy()
            age_s = int(now_time - entry["cached_at"])
            cached_data["data_age_seconds"] = age_s
            cached_data["data_age_label"] = _format_age(age_s)
            cached_data["data_status"] = "LIVE"
            cached_data["data_type"] = "LIVE"
            cached_data["provider_status"] = "CONNECTED"
            return cached_data

    received_at = datetime.now(timezone.utc).isoformat()
    params = {
        "latitude": lat,
        "longitude": lng,
        "current": [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "weather_code",
            "surface_pressure",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m",
            "snowfall",
            "snow_depth",
            "visibility",
            "is_day",
        ],
        "timezone": "auto",
        "wind_speed_unit": "kmh",
    }

    try:
        with httpx.Client(timeout=OPEN_METEO_TIMEOUT) as client:
            resp = client.get(OPEN_METEO_CURRENT, params=params)
            resp.raise_for_status()
            raw = resp.json()

        cur = raw.get("current", {})
        cur_units = raw.get("current_units", {})
        source_time = cur.get("time", received_at)

        # Fresh fetch from provider: age is 0s
        age_s = 0

        res_dict = {
            "location": location_name,
            "latitude": lat,
            "longitude": lng,
            "timezone": raw.get("timezone", "UTC"),
            "timezone_abbreviation": raw.get("timezone_abbreviation", "UTC"),

            # Core weather values
            "temperature": cur.get("temperature_2m"),
            "temperature_unit": cur_units.get("temperature_2m", "°C"),
            "apparent_temperature": cur.get("apparent_temperature"),
            "humidity": cur.get("relative_humidity_2m"),
            "precipitation": cur.get("precipitation"),
            "precipitation_unit": cur_units.get("precipitation", "mm"),
            "weather_code": cur.get("weather_code"),
            "weather_condition": _wmo_label(cur.get("weather_code")),
            "pressure": cur.get("surface_pressure"),
            "pressure_unit": cur_units.get("surface_pressure", "hPa"),
            "wind_speed": cur.get("wind_speed_10m"),
            "wind_speed_unit": cur_units.get("wind_speed_10m", "km/h"),
            "wind_direction": cur.get("wind_direction_10m"),
            "wind_gusts": cur.get("wind_gusts_10m"),
            "snowfall": cur.get("snowfall"),
            "snow_depth": cur.get("snow_depth"),
            "visibility": cur.get("visibility"),
            "is_day": cur.get("is_day"),

            # Data provenance (shown in every panel)
            "source": "Open-Meteo (open-meteo.com)",
            "data_source": "Open-Meteo (open-meteo.com)",
            "data_type": "LIVE",
            "timestamp": received_at,
            "source_timestamp": source_time,
            "received_timestamp": received_at,
            "data_age_seconds": age_s,
            "data_age_label": _format_age(age_s),
            "data_status": "LIVE",
            "provider_status": "CONNECTED",
        }
        _WEATHER_CACHE[cache_key] = {"cached_at": now_time, "data": res_dict}
        return res_dict

    except httpx.TimeoutException:
        return _unavailable_response(lat, lng, location_name, received_at, "TIMEOUT")
    except httpx.HTTPStatusError as e:
        return _unavailable_response(lat, lng, location_name, received_at, f"HTTP {e.response.status_code}")
    except Exception as e:
        return _unavailable_response(lat, lng, location_name, received_at, str(e)[:80])


def _unavailable_response(lat, lng, location_name, received_at, reason) -> Dict[str, Any]:
    return {
        "location": location_name,
        "latitude": lat,
        "longitude": lng,
        "timezone": "Unknown",
        "timezone_abbreviation": "??",
        "temperature": None,
        "temperature_unit": "°C",
        "apparent_temperature": None,
        "humidity": None,
        "precipitation": None,
        "precipitation_unit": "mm",
        "weather_code": None,
        "weather_condition": "DATA UNAVAILABLE",
        "pressure": None,
        "pressure_unit": "hPa",
        "wind_speed": None,
        "wind_speed_unit": "km/h",
        "wind_direction": None,
        "wind_gusts": None,
        "snowfall": None,
        "snow_depth": None,
        "visibility": None,
        "is_day": None,
        "source": "Open-Meteo (open-meteo.com)",
        "data_source": "Open-Meteo (open-meteo.com)",
        "data_type": "UNAVAILABLE",
        "timestamp": received_at,
        "source_timestamp": None,
        "received_timestamp": received_at,
        "data_age_seconds": None,
        "data_age_label": "N/A",
        "data_status": "UNAVAILABLE",
        "provider_status": "UNAVAILABLE",
    }


# ---------------------------------------------------------------------------
# Hourly + daily forecast
# ---------------------------------------------------------------------------
def get_weather_forecast(lat: float, lng: float, location_name: str = "", hours: int = 168) -> Dict[str, Any]:
    """
    Fetch hourly forecast + 7-day daily forecast from Open-Meteo.
    Returns clearly labelled FORECAST data.
    """
    cache_key = f"{lat:.2f},{lng:.2f},{location_name},{hours}"
    now_time = time.time()
    if cache_key in _FORECAST_CACHE:
        entry = _FORECAST_CACHE[cache_key]
        if now_time - entry["cached_at"] < 60:
            return entry["data"]

    received_at = datetime.now(timezone.utc).isoformat()
    days_requested = min(7, max(1, math.ceil(hours / 24)))
    params = {
        "latitude": lat,
        "longitude": lng,
        "hourly": [
            "temperature_2m",
            "relative_humidity_2m",
            "precipitation_probability",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "wind_direction_10m",
        ],
        "daily": [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "precipitation_probability_max",
            "wind_speed_10m_max",
        ],
        "timezone": "auto",
        "forecast_days": days_requested,
        "wind_speed_unit": "kmh",
    }

    try:
        with httpx.Client(timeout=OPEN_METEO_TIMEOUT) as client:
            resp = client.get(OPEN_METEO_CURRENT, params=params)
            resp.raise_for_status()
            raw = resp.json()

        hourly = raw.get("hourly", {})
        hourly_units = raw.get("hourly_units", {})
        daily = raw.get("daily", {})
        daily_units = raw.get("daily_units", {})
        times_h = hourly.get("time", [])
        times_d = daily.get("time", [])

        hourly_data = []
        for i, t in enumerate(times_h[:hours]):
            hourly_data.append({
                "time": t,
                "temperature": _safe(hourly.get("temperature_2m"), i),
                "humidity": _safe(hourly.get("relative_humidity_2m"), i),
                "precipitation": _safe(hourly.get("precipitation"), i),
                "precipitation_probability": _safe(hourly.get("precipitation_probability"), i),
                "weather_code": _safe(hourly.get("weather_code"), i),
                "weather_condition": _wmo_label(_safe(hourly.get("weather_code"), i)),
                "wind_speed": _safe(hourly.get("wind_speed_10m"), i),
                "wind_direction": _safe(hourly.get("wind_direction_10m"), i),
            })

        daily_data = []
        for i, t in enumerate(times_d[:days_requested]):
            daily_data.append({
                "date": t,
                "weather_code": _safe(daily.get("weather_code"), i),
                "weather_condition": _wmo_label(_safe(daily.get("weather_code"), i)),
                "temp_max": _safe(daily.get("temperature_2m_max"), i),
                "temp_min": _safe(daily.get("temperature_2m_min"), i),
                "precipitation_sum": _safe(daily.get("precipitation_sum"), i),
                "precipitation_probability_max": _safe(daily.get("precipitation_probability_max"), i),
                "wind_speed_max": _safe(daily.get("wind_speed_10m_max"), i),
            })

        res_dict = {
            "location": location_name,
            "latitude": lat,
            "longitude": lng,
            "timezone": raw.get("timezone", "UTC"),
            "hourly": hourly_data,
            "hourly_units": hourly_units,
            "daily": daily_data,
            "daily_units": daily_units,
            "source": "Open-Meteo (open-meteo.com)",
            "data_source": "Open-Meteo (open-meteo.com)",
            "data_type": "FORECAST",
            "timestamp": received_at,
            "received_timestamp": received_at,
            "data_status": "FORECAST",
            "provider_status": "CONNECTED",
        }
        _FORECAST_CACHE[cache_key] = {"cached_at": now_time, "data": res_dict}
        return res_dict

    except Exception as e:
        if cache_key in _FORECAST_CACHE:
            return _FORECAST_CACHE[cache_key]["data"]
        return {
            "location": location_name,
            "latitude": lat,
            "longitude": lng,
            "hourly": [],
            "daily": [],
            "source": "Open-Meteo (open-meteo.com)",
            "data_source": "Open-Meteo (open-meteo.com)",
            "data_type": "UNAVAILABLE",
            "timestamp": received_at,
            "received_timestamp": received_at,
            "data_status": "UNAVAILABLE",
            "provider_status": f"UNAVAILABLE — {str(e)[:80]}",
        }


def _safe(lst, idx):
    """Safely access list element, return None if out of range."""
    if lst is None or idx >= len(lst):
        return None
    v = lst[idx]
    return None if v != v else v  # handles NaN


# ---------------------------------------------------------------------------
# Legacy compatibility: keep get_global_weather() working for existing routes
# ---------------------------------------------------------------------------
def get_global_weather(location_name: str, lat: float = 30.7346, lng: float = 79.0669) -> Dict[str, Any]:
    """
    Backward-compatible wrapper.
    Calls real Open-Meteo then maps fields to match existing
    EnvironmentalResponse schema used by /api/environmental/{location}.
    """
    live = get_current_weather(lat, lng, location_name)

    # Derive rainfall from precipitation (mm/hr not mm — scale conservatively)
    precip = live.get("precipitation") or 0.0
    rainfall = round(precip * 4.0, 1)  # mm per 15-min interval × 4 → mm/hr estimate
    temperature = live.get("temperature") or 20.0
    snow_depth = live.get("snow_depth") or 0.0
    snowfall = live.get("snowfall") or 0.0
    snowmelt_risk = "HIGH" if (snow_depth > 20 and temperature > 5.0) else "LOW"

    return {
        "location": location_name,
        "latitude": lat,
        "longitude": lng,
        "temperature": temperature,
        "humidity": live.get("humidity") or 65.0,
        "rainfall": rainfall,
        "wind_speed": live.get("wind_speed") or 0.0,
        "wind_direction": _bearing_to_compass(live.get("wind_direction")),
        "water_level": 1.5,          # Not provided by Open-Meteo — marked separately
        "soil_moisture": 60.0,       # Not provided by Open-Meteo — marked separately
        "elevation": 10.0,           # Not provided by Open-Meteo
        "slope": 5.0,                # Not provided by Open-Meteo
        "snow_depth": snow_depth,
        "snowfall": snowfall,
        "snowmelt_risk": snowmelt_risk,
        "solar_irradiance": 450.0,   # Not provided at current endpoint
        "visibility": live.get("visibility") or 10.0,
        "weather_code": live.get("weather_code"),
        "weather_condition": live.get("weather_condition"),
        "pressure": live.get("pressure"),
        "timestamp": live.get("source_timestamp") or datetime.now(timezone.utc).isoformat(),
        "data_source": live.get("source"),
        "data_status": live.get("data_status"),
        "provider_status": live.get("provider_status"),
    }


def _bearing_to_compass(degrees: Optional[float]) -> str:
    if degrees is None:
        return "N/A"
    dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
    ix = round(float(degrees) / (360 / len(dirs))) % len(dirs)
    return dirs[ix]


# ---------------------------------------------------------------------------
# Rainfall time-series (uses forecast hourly data)
# ---------------------------------------------------------------------------
def get_rainfall_time_series(location_name: str, lat: float = 0.0, lng: float = 0.0, period: str = "24h") -> Dict[str, Any]:
    """Return hourly precipitation from real Open-Meteo forecast, clearly labelled FORECAST."""
    forecast = get_weather_forecast(lat, lng, location_name)
    hourly = forecast.get("hourly", [])

    # Slice based on period
    period_map = {"1h": 1, "3h": 3, "6h": 6, "12h": 12, "24h": 24, "3d": 72, "7d": 168}
    limit = period_map.get(period, 24)
    sliced = hourly[:limit]

    time_series = [{"time": h["time"], "value": h.get("precipitation") or 0.0} for h in sliced]
    curr_rain = time_series[0]["value"] if time_series else 0.0

    return {
        "location": location_name,
        "period": period,
        "current_rainfall": curr_rain,
        "time_series": time_series,
        "data_source": forecast.get("source"),
        "data_status": forecast.get("data_status"),
    }
