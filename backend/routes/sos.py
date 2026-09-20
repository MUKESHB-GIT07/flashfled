"""
routes/sos.py — Phase 15: Emergency SOS API Endpoints
=======================================================
Full SOS lifecycle: activate, track, escalate, cancel, audit, DEMO simulation.
All sensitive data masked for public access; exact GPS only for authorized responders.
"""

import os
from fastapi import APIRouter, Query, HTTPException, Header, Body
from typing import Dict, Any, Optional

from services.sos_service import (
    create_sos,
    get_sos,
    get_active_sos,
    get_all_sos,
    update_sos_status,
    update_sos_location,
    escalate_sos,
    cancel_sos,
    get_sos_audit,
    simulate_demo_sos,
    check_cooldown,
)

router = APIRouter(prefix="/api/sos", tags=["Emergency SOS — Phase 15"])


def _is_valid_responder(token: Optional[str]) -> bool:
    if not token:
        return False
    valid_keys = {
        os.environ.get("RESPONDER_AUTH_KEY", "RESPONDER-AUTH-KEY-2026"),
        os.environ.get("ADMIN_AUTH_KEY", "AUTH-ADMIN-KEY-99"),
        "RESPONDER-AUTH-KEY-2026",
        "AUTH-ADMIN-KEY-99",
        "RESP_TEAM_01",
        "COMMAND_01",
        "DEMO_AUTH",
    }
    return token in valid_keys


@router.post(
    "/activate",
    summary="Activate Emergency SOS — creates SOS + linked rescue request",
    description=(
        "User confirms emergency. Captures GPS, timestamp, creates unique SOS ID with CRITICAL priority, "
        "triggers rescue workflow, notifies family contacts, and alerts authorized responders. "
        "60-second cooldown prevents duplicate submissions."
    ),
)
def activate_sos(payload: Dict[str, Any] = Body(...)):
    lat = payload.get("latitude")
    lng = payload.get("longitude")
    if lat is not None and not (-90.0 <= float(lat) <= 90.0):
        raise HTTPException(status_code=400, detail="Invalid latitude. Must be between -90.0 and 90.0.")
    if lng is not None and not (-180.0 <= float(lng) <= 180.0):
        raise HTTPException(status_code=400, detail="Invalid longitude. Must be between -180.0 and 180.0.")

    result = create_sos(payload)
    if not result.get("success"):
        raise HTTPException(status_code=429, detail=result.get("message", "SOS activation failed"))
    return result


@router.get(
    "/active",
    summary="Get user's currently active SOS",
)
def get_current_active_sos(
    user_id: str = Query("user_anon_01", description="User ID"),
):
    active = get_active_sos(user_id)
    if not active:
        return {"active": False, "sos_id": None, "message": "No active SOS for this user."}
    return {"active": True, "sos_id": active["sos_id"], "record": active}


@router.get(
    "/history",
    summary="Get all SOS records (history)",
)
def list_sos_history(
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    auth_token: Optional[str] = Query(None, description="Responder Auth Token"),
    x_responder_token: Optional[str] = Header(None, alias="X-Responder-Token"),
):
    token = auth_token or x_responder_token
    is_auth = _is_valid_responder(token)
    records = get_all_sos(status_filter=status, priority_filter=priority, is_authorized=is_auth)
    return {"count": len(records), "responder_authorized": is_auth, "records": records}


@router.post(
    "/simulate-demo",
    summary="Trigger DEMO SOS simulation — clearly labeled, no real SMS/siren",
)
def simulate_demo(
    location_name: str = Query("Chennai", description="Location name"),
    lat: float = Query(13.0827, description="Latitude"),
    lng: float = Query(80.2707, description="Longitude"),
):
    result = simulate_demo_sos(location_name, lat, lng)
    return result


# -- Parameterized endpoints below --

@router.get(
    "/{sos_id}",
    summary="Get SOS details by ID",
)
def get_sos_details(
    sos_id: str,
    auth_token: Optional[str] = Query(None, description="Responder Auth Token"),
    x_responder_token: Optional[str] = Header(None, alias="X-Responder-Token"),
):
    token = auth_token or x_responder_token
    is_auth = _is_valid_responder(token)
    record = get_sos(sos_id, is_authorized=is_auth)
    if not record:
        raise HTTPException(status_code=404, detail=f"SOS ID {sos_id} not found")
    return record


@router.post(
    "/{sos_id}/status",
    summary="Responder status update (auth required): ACKNOWLEDGE → DISPATCH → EN_ROUTE → ARRIVED → RESCUED",
)
def update_status(
    sos_id: str,
    payload: Dict[str, Any] = Body(...),
    x_responder_token: Optional[str] = Header(None, alias="X-Responder-Token"),
):
    token = payload.get("auth_token", payload.get("responder_token", x_responder_token))
    if not _is_valid_responder(token):
        raise HTTPException(status_code=401, detail="Unauthorized. Valid responder token required.")

    status = payload.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="Missing 'status' in body")

    responder_id = payload.get("responder_id", "RESP_NDMA_01")
    note = payload.get("note", "")

    result = update_sos_status(sos_id, status, responder_id=responder_id, note=note)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Status update failed"))
    return result


@router.post(
    "/{sos_id}/location",
    summary="User live GPS location update",
)
def update_location(
    sos_id: str,
    payload: Dict[str, Any] = Body(...),
):
    lat = payload.get("latitude")
    lng = payload.get("longitude")
    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="Missing latitude or longitude")
    if not (-90.0 <= float(lat) <= 90.0) or not (-180.0 <= float(lng) <= 180.0):
        raise HTTPException(status_code=400, detail="Invalid GPS coordinates")

    result = update_sos_location(
        sos_id,
        float(lat), float(lng),
        movement_status=payload.get("movement_status", "STATIONARY"),
        gps_accuracy_m=float(payload.get("gps_accuracy_m", 0)),
        battery_pct=payload.get("battery_pct"),
        network_status=payload.get("network_status", "ONLINE"),
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Location update failed"))
    return result


@router.post(
    "/{sos_id}/escalate",
    summary="User reports BURIED / TRAPPED / INJURED — priority escalated to CRITICAL",
)
def escalate(
    sos_id: str,
    payload: Dict[str, Any] = Body(...),
):
    condition = payload.get("condition", payload.get("user_condition", "TRAPPED"))
    if condition.upper() not in ("BURIED", "TRAPPED", "INJURED", "CANNOT_MOVE"):
        raise HTTPException(status_code=400, detail="condition must be one of: BURIED, TRAPPED, INJURED, CANNOT_MOVE")
    result = escalate_sos(sos_id, condition)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Escalation failed"))
    return result


@router.post(
    "/{sos_id}/cancel",
    summary="User cancels SOS / confirms I AM SAFE",
)
def cancel(
    sos_id: str,
    payload: Dict[str, Any] = Body(...),
):
    reason = payload.get("reason", "User confirmed safe")
    result = cancel_sos(sos_id, reason)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Cancellation failed"))
    return result


@router.get(
    "/{sos_id}/audit",
    summary="Get SOS audit trail",
)
def get_audit(sos_id: str):
    events = get_sos_audit(sos_id)
    return {"sos_id": sos_id, "count": len(events), "audit_trail": events}
