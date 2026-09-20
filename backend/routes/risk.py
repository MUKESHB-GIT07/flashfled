"""
routes/risk.py — Phase 3 Multi-Disaster Risk Endpoints
======================================================
Endpoints for:
  - GET /api/risk/flood
  - GET /api/risk/erosion
  - GET /api/risk/landslide
  - GET /api/risk/snow
  - GET /api/risk/all
"""

from fastapi import APIRouter, Query
from services.risk_service import (
    get_flood_risk,
    get_erosion_risk,
    get_landslide_risk,
    get_snow_risk,
    get_all_risks
)

router = APIRouter(prefix="/api/risk", tags=["Multi-Disaster Risk — Phase 3"])


@router.get("/flood", summary="Get Global Flood Risk (Flash Flood + River stage)")
def flood_risk_endpoint(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    name: str = Query("", description="Location name"),
):
    return get_flood_risk(lat, lng, name)


@router.get("/erosion", summary="Get Soil Erosion Risk")
def erosion_risk_endpoint(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    name: str = Query("", description="Location name"),
):
    return get_erosion_risk(lat, lng, name)


@router.get("/landslide", summary="Get Geomorphic Landslide Risk")
def landslide_risk_endpoint(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    name: str = Query("", description="Location name"),
):
    return get_landslide_risk(lat, lng, name)


@router.get("/snow", summary="Get Snow depth & Snowmelt Flood Risk")
def snow_risk_endpoint(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    name: str = Query("", description="Location name"),
):
    return get_snow_risk(lat, lng, name)


@router.get("/all", summary="Get combined Phase 3 risk assessment (Flood, Erosion, Landslide, Snow)")
def all_risks_endpoint(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    name: str = Query("", description="Location name"),
):
    return get_all_risks(lat, lng, name)
