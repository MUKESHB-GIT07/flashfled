"""
routes/safety.py — Phase 10 Life Safety & Emergency Route API
===============================================================
Endpoints:
  GET /api/safety/areas   — Recommended lower-risk areas
  GET /api/safety/shelters— Verified designated shelters
  GET /api/safety/routes  — Safer available routes
  GET /api/safety/status  — Full emergency status summary
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional

from services.safety_service import (
    get_lower_risk_areas,
    get_verified_shelters,
    calculate_safer_route,
    get_emergency_safety_status,
    get_safety_rules
)

router = APIRouter(prefix="/api/safety", tags=["Safety — Phase 10 Life Safety Mode"])


@router.get("/areas", summary="Get recommended lower-risk areas")
def safety_areas(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    hazard_type: str = Query("FLOOD", description="Hazard type (FLOOD, LANDSLIDE, TSUNAMI, etc.)")
):
    areas = get_lower_risk_areas(lat, lng, hazard_type)
    return {
        "latitude": lat,
        "longitude": lng,
        "hazard_type": hazard_type,
        "count": len(areas),
        "lower_risk_areas": areas
    }


@router.get("/shelters", summary="Get verified designated shelters")
def safety_shelters(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    hazard_type: str = Query("FLOOD", description="Hazard type")
):
    return get_verified_shelters(lat, lng, hazard_type)


@router.get("/routes", summary="Get safer available route")
def safety_routes(
    fromLat: float = Query(..., description="User latitude"),
    fromLng: float = Query(..., description="User longitude"),
    toLat: float = Query(..., description="Destination latitude"),
    toLng: float = Query(..., description="Destination longitude"),
    hazard_type: str = Query("FLOOD", description="Hazard type")
):
    return calculate_safer_route(fromLat, fromLng, toLat, toLng, hazard_type)


@router.get("/status", summary="Get full emergency safety status summary")
def safety_status(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    hazard_type: str = Query("FLOOD", description="Hazard type"),
    location_name: Optional[str] = Query(None, description="Optional location name")
):
    return get_emergency_safety_status(lat, lng, hazard_type, location_name or "")


@router.get("/rules", summary="Get disaster-specific safety rules")
def safety_rules(
    hazard_type: str = Query("FLOOD", description="Hazard type")
):
    return get_safety_rules(hazard_type)
