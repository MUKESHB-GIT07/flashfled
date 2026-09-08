"""
routes/impact.py — Phase 5 Projected Impact & Disaster Cascade Endpoints
========================================================================
Endpoints for:
  - GET /api/impact/projected (Dynamic model-based impact predictions)
  - GET /api/impact/cascade   (Step-by-step domino chain cascade analysis)
"""

from fastapi import APIRouter, Query
from services.impact_service import get_projected_impact, get_disaster_cascade

router = APIRouter(prefix="/api/impact", tags=["Projected Impact — Phase 5"])


@router.get("/projected", summary="Get Projected Impact & Next Affected Regions")
def projected_impact_endpoint(
    lat: float = Query(0.0, description="Active Latitude"),
    lng: float = Query(0.0, description="Active Longitude"),
    name: str = Query("", description="Location Name"),
    hazard_type: str = Query("AUTO", description="Hazard Type: AUTO | FLOOD | CYCLONE | WILDFIRE"),
    hours: int = Query(3, description="Forecast Window: 1 | 3 | 6 | 12 | 24"),
):
    return get_projected_impact(lat, lng, name, hazard_type, hours)


@router.get("/cascade", summary="Get Step-by-Step Disaster Cascade Chain")
def disaster_cascade_endpoint(
    lat: float = Query(0.0, description="Active Latitude"),
    lng: float = Query(0.0, description="Active Longitude"),
    name: str = Query("", description="Location Name"),
):
    return get_disaster_cascade(lat, lng, name)
