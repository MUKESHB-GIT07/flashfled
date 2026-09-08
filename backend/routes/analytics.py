from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional
from services.analytics_service import get_historical_weather, get_platform_statistics, generate_location_report, get_disaster_history

router = APIRouter(prefix="/api/analytics", tags=["Analytics & History"])

@router.get("/history", response_model=Dict[str, Any])
def get_history(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    days: int = Query(30, description="Time period in days (24h=1, 7, 30, 90, 365, 1825)")
):
    """Fetch historical weather and climate analytics for the given location."""
    # Enforce allowed days, but default to nearest
    if days <= 1:
        req_days = 1
    elif days <= 7:
        req_days = 7
    elif days <= 30:
        req_days = 30
    elif days <= 90:
        req_days = 90
    elif days <= 365:
        req_days = 365
    else:
        req_days = 1825
        
    return get_historical_weather(lat, lng, req_days)


@router.get("/hazards", response_model=Dict[str, Any])
def get_historical_hazards(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    location: str = Query("", description="Location name"),
):
    """Fetch historical disaster events for the given location."""
    return get_disaster_history(lat, lng, location)


@router.get("/stats", response_model=Dict[str, Any])
def get_stats():
    """Fetch global platform statistics."""
    return get_platform_statistics()


@router.get("/report", response_model=Dict[str, Any])
def get_report(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    location: str = Query(..., description="Location name")
):
    """Generate a comprehensive location safety report."""
    return generate_location_report(lat, lng, location)
