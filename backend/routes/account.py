"""
account.py — Phase 16: User Account & Emergency Contacts Router
================================================================
Handles profile updates, emergency contact management (primary/secondary/tertiary),
monitored locations, notification settings, devices, and account deletion.
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Dict, Any, Optional

from services.auth_service import (
    get_session_user,
    sanitize_user_profile,
    update_user_profile,
    add_emergency_contact,
    update_emergency_contact,
    delete_emergency_contact,
    add_monitored_location,
    delete_monitored_location,
    update_preferences,
    delete_user_account
)

router = APIRouter(prefix="/api/account", tags=["Account Management"])

def _require_auth_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = authorization.replace("Bearer ", "").strip()
    user = get_session_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return user

# ---------------------------------------------------------------------------
# 1. Profile Management
# ---------------------------------------------------------------------------
@router.get("/profile")
def api_get_profile(authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    return {
        "success": True,
        "profile": sanitize_user_profile(user)
    }

@router.put("/profile")
def api_update_profile(payload: Dict[str, Any], authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    res = update_user_profile(user["user_id"], payload)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res

@router.delete("/profile")
def api_delete_account(authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    res = delete_user_account(user["user_id"])
    return res

# ---------------------------------------------------------------------------
# 2. Emergency Contacts
# ---------------------------------------------------------------------------
@router.get("/emergency-contacts")
def api_get_emergency_contacts(authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    return {
        "success": True,
        "contacts": user.get("emergency_contacts", [])
    }

@router.post("/emergency-contacts")
def api_add_emergency_contact(payload: Dict[str, Any], authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    res = add_emergency_contact(user["user_id"], payload)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res

@router.put("/emergency-contacts/{contact_id}")
def api_update_emergency_contact(contact_id: str, payload: Dict[str, Any], authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    res = update_emergency_contact(user["user_id"], contact_id, payload)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res

@router.delete("/emergency-contacts/{contact_id}")
def api_delete_emergency_contact(contact_id: str, authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    res = delete_emergency_contact(user["user_id"], contact_id)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res

@router.post("/emergency-contacts/{contact_id}/test")
def api_test_emergency_contact(contact_id: str, authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    contacts = user.get("emergency_contacts", [])
    target = next((c for c in contacts if c["contact_id"] == contact_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Contact not found.")

    return {
        "success": True,
        "contact_id": contact_id,
        "contact_name": target["name"],
        "channel": "SMS & Push Test",
        "status": "DEMO",
        "message": f"TEST EMERGENCY ALERT dispatched to {target['name']} ({target['phone']}). Mode: DEMO ACCOUNT."
    }

# ---------------------------------------------------------------------------
# 3. Monitored Locations
# ---------------------------------------------------------------------------
@router.get("/locations")
def api_get_monitored_locations(authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    return {
        "success": True,
        "locations": user.get("monitored_locations", [])
    }

@router.post("/locations")
def api_add_monitored_location(payload: Dict[str, Any], authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    res = add_monitored_location(user["user_id"], payload)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res

@router.delete("/locations/{location_id}")
def api_delete_monitored_location(location_id: str, authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    res = delete_monitored_location(user["user_id"], location_id)
    return res

# ---------------------------------------------------------------------------
# 4. Preferences & Devices
# ---------------------------------------------------------------------------
@router.get("/preferences")
def api_get_preferences(authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    return {
        "success": True,
        "preferences": user.get("preferences", {})
    }

@router.put("/preferences")
def api_update_preferences(payload: Dict[str, Any], authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    res = update_preferences(user["user_id"], payload)
    return res

@router.get("/devices")
def api_get_devices(authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    return {
        "success": True,
        "devices": user.get("devices", [])
    }

@router.delete("/devices/{device_id}")
def api_delete_device(device_id: str, authorization: Optional[str] = Header(None)):
    user = _require_auth_user(authorization)
    user["devices"] = [d for d in user.get("devices", []) if d["device_id"] != device_id]
    return {
        "success": True,
        "message": "Device revoked successfully.",
        "devices": user["devices"]
    }
