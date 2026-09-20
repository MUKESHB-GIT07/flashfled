"""
routes/alerts.py — Phase 6 Early Warning & Alert Management Endpoints
======================================================================
Endpoints for:
  - GET /api/alerts/active
  - POST /api/alerts/acknowledge/{alert_id}
  - GET /api/alerts/history
  - GET /api/alerts/areas
  - POST /api/alerts/areas
  - POST /api/alerts/simulate-demo
"""

from fastapi import APIRouter, Query, Body, Path
from typing import Dict, Any, Optional
from services.alert_service import (
    get_active_alerts,
    acknowledge_alert,
    get_alert_history,
    get_alert_areas,
    create_alert_area,
    simulate_demo_alert
)

router = APIRouter(prefix="/api/alerts", tags=["Early Warning Center — Phase 6"])


@router.get("/active", summary="Get Geo-Targeted Active Alerts for Location & Monitored Areas")
def active_alerts_endpoint(
    lat: float = Query(0.0, description="Active Latitude"),
    lng: float = Query(0.0, description="Active Longitude"),
    radius_km: float = Query(25.0, description="Geo-target radius in km"),
):
    return get_active_alerts(lat, lng, radius_km)


@router.post("/acknowledge/{alert_id}", summary="Acknowledge an active alert by ID")
def acknowledge_alert_endpoint(
    alert_id: str = Path(..., description="Alert ID to acknowledge"),
):
    return acknowledge_alert(alert_id)


@router.get("/history", summary="Get Historical Alert Log")
def alert_history_endpoint():
    return get_alert_history()


@router.get("/areas", summary="Get Monitored Alert Areas")
def get_alert_areas_endpoint():
    return {"count": len(get_alert_areas()), "alert_areas": get_alert_areas()}


@router.post("/areas", summary="Create a new Monitored Alert Area (HOME, WORK, VILLAGE, FAMILY)")
def create_alert_area_endpoint(payload: Dict[str, Any] = Body(...)):
    return create_alert_area(payload)


@router.post("/simulate-demo", summary="Trigger Safe DEMO Emergency Alert Simulation")
def simulate_demo_endpoint(
    hazard_type: str = Query("FLOOD", description="Hazard Type"),
    location_name: str = Query("Chennai", description="Location Name"),
    lat: float = Query(13.0827, description="Latitude"),
    lng: float = Query(80.2707, description="Longitude"),
):
    return simulate_demo_alert(hazard_type, location_name, lat, lng)
