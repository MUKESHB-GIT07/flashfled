"""
routes/hazards.py — Phase 4 Real-Time Multi-Hazard Monitoring Endpoints
========================================================================
Endpoints for:
  - GET /api/hazards/earthquakes  (USGS Live feed)
  - GET /api/hazards/tsunamis     (NOAA / USGS tsunami advisories)
  - GET /api/hazards/volcanoes    (Smithsonian / USGS active volcanoes)
  - GET /api/hazards/wildfires    (NASA FIRMS thermal anomalies)
  - GET /api/hazards/cyclones     (Tropical Cyclones & storm tracks)
  - GET /api/hazards/all          (Combined multi-hazard feed for activeLocation)
"""

from fastapi import APIRouter, Query
from services.multi_hazard_service import (
    get_earthquakes,
    get_tsunami_warnings,
    get_volcanoes,
    get_wildfires,
    get_cyclones,
    get_all_hazards
)

router = APIRouter(prefix="/api/hazards", tags=["Multi-Hazard Feeds — Phase 4"])


@router.get("/earthquakes", summary="Get USGS Real-Time Earthquakes Feed")
def earthquakes_endpoint(
    lat: float = Query(0.0, description="Active Location Latitude"),
    lng: float = Query(0.0, description="Active Location Longitude"),
):
    return get_earthquakes(lat, lng)


@router.get("/tsunamis", summary="Get NOAA / USGS Tsunami Warnings")
def tsunamis_endpoint(
    lat: float = Query(0.0, description="Latitude"),
    lng: float = Query(0.0, description="Longitude"),
):
    return get_tsunami_warnings(lat, lng)


@router.get("/volcanoes", summary="Get Active Volcanoes Monitoring")
def volcanoes_endpoint(
    lat: float = Query(0.0, description="Latitude"),
    lng: float = Query(0.0, description="Longitude"),
):
    return get_volcanoes(lat, lng)


@router.get("/wildfires", summary="Get Satellite Wildfire Hotspots (NASA FIRMS)")
def wildfires_endpoint(
    lat: float = Query(0.0, description="Latitude"),
    lng: float = Query(0.0, description="Longitude"),
):
    return get_wildfires(lat, lng)


@router.get("/cyclones", summary="Get Active Tropical Cyclones & Storm Tracks")
def cyclones_endpoint(
    lat: float = Query(0.0, description="Latitude"),
    lng: float = Query(0.0, description="Longitude"),
):
    return get_cyclones(lat, lng)


@router.get("/all", summary="Get Combined Multi-Hazard Intelligence for Active Location")
def all_hazards_endpoint(
    lat: float = Query(0.0, description="Latitude"),
    lng: float = Query(0.0, description="Longitude"),
    name: str = Query("", description="Location Name"),
):
    return get_all_hazards(lat, lng, name)
