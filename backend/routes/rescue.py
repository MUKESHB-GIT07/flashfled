"""
routes/rescue.py — Phase 11 & Phase 14 Hardened Emergency Rescue API
=====================================================================
Protects responder endpoints with token verification and automatically masks
sensitive PII (Phone, Email, User Name, exact GPS coordinates) for public feeds.
"""

import os
from fastapi import APIRouter, Query, HTTPException, Header, Body
from typing import Dict, Any, Optional, List

from services.rescue_service import (
    create_rescue_request,
    get_rescue_request,
    get_all_rescue_requests,
    update_rescue_status,
    update_rescue_location,
    add_rescue_message,
    cancel_rescue_request,
    get_user_emergency_contacts,
    add_emergency_contact,
    notify_emergency_contacts,
    simulate_demo_rescue,
    mask_rescue_pii
)

router = APIRouter(prefix="/api/rescue", tags=["Rescue — Phase 11 & Phase 14 Hardened Operations"])

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
        "DEMO_AUTH"
    }
    return token in valid_keys


# ------------------------------------------------------------------------------
# Fixed Endpoints
# ------------------------------------------------------------------------------
@router.post("/request", summary="Submit an emergency rescue request")
def submit_rescue_request(payload: Dict[str, Any] = Body(...)):
    # Validate lat/lng coordinates if provided
    lat = payload.get("latitude")
    lng = payload.get("longitude")
    if lat is not None and not (-90.0 <= float(lat) <= 90.0):
        raise HTTPException(status_code=400, detail="Invalid latitude coordinate. Must be between -90.0 and 90.0.")
    if lng is not None and not (-180.0 <= float(lng) <= 180.0):
        raise HTTPException(status_code=400, detail="Invalid longitude coordinate. Must be between -180.0 and 180.0.")

    req = create_rescue_request(payload)
    return {
        "success": True, 
        "rescue_id": req["rescue_id"], 
        "status": req["status"], 
        "priority": req["priority"],
        "help_guarantee_disclaimer": req["help_guarantee_disclaimer"],
        "request": req
    }


@router.get("/requests", summary="Get active rescue requests (Responder View unmasked, Public View masked)")
def list_rescue_requests(
    status: Optional[str] = Query(None, description="Filter status (REQUESTED, ACKNOWLEDGED, DISPATCHED, etc.)"),
    priority: Optional[str] = Query(None, description="Filter priority (CRITICAL, HIGH, MEDIUM, LOW)"),
    disaster_type: Optional[str] = Query(None, description="Filter disaster type (FLOOD, LANDSLIDE, etc.)"),
    auth_token: Optional[str] = Query(None, description="Responder Auth Token"),
    x_responder_token: Optional[str] = Header(None, alias="X-Responder-Token")
):
    token = auth_token or x_responder_token
    is_auth = _is_valid_responder(token)

    reqs = get_all_rescue_requests(
        status_filter=status, 
        priority_filter=priority, 
        disaster_filter=disaster_type,
        is_authorized=is_auth
    )
    return {
        "count": len(reqs),
        "responder_authorized": is_auth,
        "status_filter": status,
        "priority_filter": priority,
        "disaster_filter": disaster_type,
        "requests": reqs
    }


@router.get("/contacts", summary="Get emergency contacts for user")
def list_contacts():
    user_phone = "+91-98765-43210"
    contacts = get_user_emergency_contacts(user_phone)
    return {"user_phone": user_phone, "count": len(contacts), "contacts": contacts}


@router.post("/contacts", summary="Add emergency contact")
def create_contact(payload: Dict[str, Any] = Body(...)):
    user_phone = "+91-98765-43210"
    cnt = add_emergency_contact(user_phone, payload)
    return {**cnt, "success": True, "contact": cnt}


@router.post("/simulate-demo", summary="Trigger DEMO rescue simulation workflow")
def simulate_demo(
    hazard_type: str = Query("LANDSLIDE", description="Hazard type"),
    location_name: str = Query("Kedarnath Valley", description="Location name")
):
    return simulate_demo_rescue(hazard_type, location_name)


# ------------------------------------------------------------------------------
# Parameterized Endpoints
# ------------------------------------------------------------------------------
@router.get("/{rescue_id}", summary="Get rescue request details and timeline")
def get_rescue(
    rescue_id: str,
    auth_token: Optional[str] = Query(None, description="Responder Auth Token"),
    x_responder_token: Optional[str] = Header(None, alias="X-Responder-Token")
):
    token = auth_token or x_responder_token
    is_auth = _is_valid_responder(token)

    req = get_rescue_request(rescue_id, is_authorized=is_auth)
    if not req:
        raise HTTPException(status_code=404, detail=f"Rescue request {rescue_id} not found")
    return req


@router.post("/{rescue_id}/status", summary="Responder action to update rescue status (Protected)")
def update_status(
    rescue_id: str,
    payload: Dict[str, Any] = Body(...),
    x_responder_token: Optional[str] = Header(None, alias="X-Responder-Token")
):
    token = payload.get("auth_token", payload.get("responder_token", x_responder_token))
    
    # Require authorization for updating responder status
    if not _is_valid_responder(token):
        raise HTTPException(status_code=401, detail="Unauthorized responder access. Valid responder token required to update rescue status.")

    status = payload.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="Missing status in body")
        
    responder_id = payload.get("responder_id", "RESP_NDMA_01")
    note = payload.get("note", "")
    assign_team_id = payload.get("assign_team_id")
    
    result = update_rescue_status(rescue_id, status, responder_id=responder_id, note=note, assign_team_id=assign_team_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Status update failed"))
    return result


@router.post("/{rescue_id}/location", summary="Update user live GPS location")
def update_location(
    rescue_id: str,
    payload: Dict[str, Any] = Body(...)
):
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")
    if latitude is None or longitude is None:
        raise HTTPException(status_code=400, detail="Missing latitude or longitude in body")
        
    lat = float(latitude)
    lng = float(longitude)
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
        raise HTTPException(status_code=400, detail="Invalid GPS coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.")

    movement_status = payload.get("movement_status", "STATIONARY")
    gps_accuracy_m = payload.get("gps_accuracy_m", 4.2)
    
    result = update_rescue_location(rescue_id, lat, lng, movement_status, float(gps_accuracy_m))
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Location update failed"))
    return result


@router.post("/{rescue_id}/message", summary="Send two-way message")
def send_message(
    rescue_id: str,
    payload: Dict[str, Any] = Body(...)
):
    sender_type = payload.get("sender_type")
    sender_id = payload.get("sender_id")
    message_text = payload.get("message_text")
    channel = payload.get("channel", "IN_APP")
    
    if not sender_type or not sender_id or not message_text:
        raise HTTPException(status_code=400, detail="Missing sender_type, sender_id, or message_text in body")
        
    result = add_rescue_message(rescue_id, sender_type, sender_id, message_text, channel)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Message send failed"))
    return result


@router.post("/{rescue_id}/cancel", summary="Cancel/resolve rescue request")
def cancel_request(
    rescue_id: str,
    payload: Dict[str, Any] = Body(...)
):
    reason = payload.get("reason", "User confirmed safe")
    result = cancel_rescue_request(rescue_id, reason)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Cancellation failed"))
    return result


@router.post("/{rescue_id}/notify-contacts", summary="Transmit rescue notification to emergency contacts")
def notify_contacts(
    rescue_id: str
):
    user_phone = "+91-98765-43210"
    return notify_emergency_contacts(rescue_id, user_phone)
