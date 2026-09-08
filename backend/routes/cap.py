from fastapi import APIRouter, Body
from typing import Dict, Any, Optional
from services.cap_service import (
    generate_cap_xml, validate_cap, get_cap_feed, 
    get_cap_alert, generate_cap_from_alert
)

router = APIRouter(prefix="/api/cap", tags=["CAP"])

@router.get("/generate")
def api_generate_cap(alert_id: str):
    alert_data = {"alert_id": alert_id}
    xml = generate_cap_from_alert(alert_data)
    return {"xml": xml}

@router.get("/feed")
def api_cap_feed():
    feed = get_cap_feed()
    return {"count": len(feed), "feed": feed}

@router.get("/{alert_id}")
def api_get_cap_alert(alert_id: str):
    return get_cap_alert(alert_id)

@router.post("/validate")
def api_validate_cap(cap_xml: str = Body(..., media_type="text/plain")):
    return validate_cap(cap_xml)

@router.post("/from-alert")
def api_generate_cap_from_alert(alert_data: Dict[str, Any] = Body(...)):
    xml = generate_cap_from_alert(alert_data)
    return {"xml": xml}
