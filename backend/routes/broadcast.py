from fastapi import APIRouter, Body, Depends, HTTPException
from typing import Dict, Any, List, Optional
from services.broadcast_service import (
    get_broadcast_status, initiate_broadcast, cancel_broadcast,
    get_broadcast_audit_log, generate_radio_script, generate_tv_bulletin
)
from services.media_service import (
    generate_media_bulletin, generate_social_media_text,
    get_media_distribution_status, get_media_history
)
from services.siren_service import (
    test_siren, activate_siren, get_siren_status,
    get_siren_zones, get_siren_audit_log
)

router = APIRouter(prefix="/api/broadcast", tags=["Broadcast"])

@router.get("/status")
def api_broadcast_status():
    return get_broadcast_status()

@router.post("/initiate")
def api_initiate_broadcast(alert_id: str = Body(...), channels: List[str] = Body(...)):
    return initiate_broadcast(alert_id, channels)

@router.post("/cancel")
def api_cancel_broadcast(alert_id: str = Body(...)):
    return cancel_broadcast(alert_id)

@router.get("/audit")
def api_broadcast_audit():
    return get_broadcast_audit_log()

@router.post("/generate-radio-script")
def api_generate_radio_script(alert_data: Dict[str, Any] = Body(...)):
    return {"script": generate_radio_script(alert_data)}

@router.post("/generate-tv-bulletin")
def api_generate_tv_bulletin(alert_data: Dict[str, Any] = Body(...)):
    return generate_tv_bulletin(alert_data)

@router.post("/generate-media-bulletin")
def api_generate_media_bulletin(alert_data: Dict[str, Any] = Body(...)):
    return generate_media_bulletin(alert_data)

@router.post("/generate-social-text")
def api_generate_social_text(alert_data: Dict[str, Any] = Body(...)):
    return {"text": generate_social_media_text(alert_data)}

@router.get("/media-status")
def api_media_status():
    return get_media_distribution_status()

@router.get("/media-history")
def api_media_history():
    return get_media_history()

@router.post("/siren/test")
def api_siren_test(siren_id: str = Body(...), auth_token: str = Body(...)):
    res = test_siren(siren_id, auth_token)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.post("/siren/activate")
def api_siren_activate(
    siren_id: str = Body(...), alert_id: str = Body(...), 
    severity: str = Body(...), duration_seconds: int = Body(...), 
    auth_token: str = Body(...)
):
    res = activate_siren(siren_id, alert_id, severity, duration_seconds, auth_token)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.get("/siren/status")
def api_siren_status():
    return get_siren_status()

@router.get("/siren/zones")
def api_siren_zones():
    return get_siren_zones()

@router.get("/siren/audit")
def api_siren_audit():
    return get_siren_audit_log()

@router.post("/simulate-warning")
def api_simulate_warning(alert_data: Dict[str, Any] = Body(...)):
    return {"status": "Simulated DEMO warning successfully"}
