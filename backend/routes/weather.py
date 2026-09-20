"""
routes/weather.py — Phase 2 Weather API Endpoints
===================================================
All endpoints use real Open-Meteo data.
Data status is always included so the frontend can
correctly label readings as LIVE / DELAYED / STALE / UNAVAILABLE.
"""

from fastapi import APIRouter, Query, HTTPException
from services.weather_service import get_current_weather, get_weather_forecast, get_rainfall_time_series

router = APIRouter(prefix="/api/weather", tags=["Weather — Phase 2"])


@router.get(
    "/current",
    summary="Get real-time current weather from Open-Meteo",
    description=(
        "Returns current observed weather for any lat/lng using Open-Meteo. "
        "Data status field indicates LIVE / DELAYED / STALE / UNAVAILABLE. "
        "Never returns Uttarakhand data for non-Uttarakhand coordinates."
    ),
)
def weather_current(
    lat: float = Query(..., description="Latitude of the location"),
    lng: float = Query(..., description="Longitude of the location"),
    name: str = Query("", description="Human-readable location name (for labelling only)"),
):
    data = get_current_weather(lat, lng, location_name=name)
    return data


@router.get(
    "/forecast",
    summary="Get 48-hour hourly + 7-day daily forecast from Open-Meteo",
)
def weather_forecast(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    hours: int = Query(168, description="Forecast hours horizon (default 168 = 7 days)"),
    name: str = Query("", description="Location name for labelling"),
):
    data = get_weather_forecast(lat, lng, location_name=name, hours=hours)
    return data


@router.get(
    "/alerts",
    summary="Weather alert summary for a location (DEMO — real CAP feed in Phase 7)",
)
def weather_alerts(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    name: str = Query("", description="Location name"),
):
    """
    Phase 2: Returns a DEMO placeholder.
    Real meteorological alert CAP feeds will be integrated in Phase 7.
    """
    return {
        "location": name,
        "latitude": lat,
        "longitude": lng,
        "alerts": [],
        "data_status": "DEMO",
        "data_type": "DEMO",
        "provider_status": "CONNECTED",
        "note": "Real CAP/WMO weather alert feeds will be integrated in Phase 7.",
        "source": "DEMO — NOT CONNECTED TO OFFICIAL ALERT FEED",
    }


@router.get(
    "/rainfall-timeseries",
    summary="Hourly precipitation time-series forecast from Open-Meteo",
)
def rainfall_timeseries(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    name: str = Query("", description="Location name"),
    period: str = Query("24h", description="Period: 1h | 3h | 6h | 12h | 24h | 3d | 7d"),
):
    if period not in ("1h", "3h", "6h", "12h", "24h", "3d", "7d"):
        raise HTTPException(status_code=400, detail="period must be one of: 1h 3h 6h 12h 24h 3d 7d")
    data = get_rainfall_time_series(name, lat, lng, period)
    return data
