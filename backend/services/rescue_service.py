"""
rescue_service.py — Phase 11 Emergency Rescue Engine & Operations Center
==========================================================================
Provides comprehensive emergency rescue management:
  1. Rescue Request Lifecycle (REQUESTED -> RECEIVED -> ACKNOWLEDGED -> CONTACTING -> DISPATCHED -> EN_ROUTE -> ARRIVED -> ASSISTING -> RESCUED / CANCELLED / EXPIRED)
  2. Automatic & Manual Priority Assessment (CRITICAL, HIGH, MEDIUM, LOW)
  3. Live GPS Coordinate & Movement Tracking
  4. Responder Dispatch & Rescue Teams Registry
  5. Two-Way Messaging Channel with Delivery Status
  6. Emergency Contacts Management & Status Sharing
  7. Audit Logging & Security Rules
  8. Safe DEMO Rescue Simulation Trigger
"""

import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

# In-memory storage for Rescue Requests, Emergency Contacts, Teams, and Audit Logs
_RESCUE_STORE: Dict[str, Dict[str, Any]] = {}
_CONTACTS_STORE: Dict[str, List[Dict[str, Any]]] = {}
_AUDIT_LOGS: List[Dict[str, Any]] = []

# Authorized Rescue Teams Registry
_RESCUE_TEAMS: List[Dict[str, Any]] = [
    {
        "team_id": "NDRF_ALPHA_01",
        "name": "NDRF 8th Battalion Mountain Rescue Alpha",
        "base_location": "Kedarnath Ridge",
        "latitude": 30.7380,
        "longitude": 79.0685,
        "status": "AVAILABLE",
        "capabilities": ["MOUNTAIN_EVACUATION", "SLOPE_RESCUE", "MEDICAL_FIRST_RESPONSE"],
        "assigned_rescue_id": None,
        "contact_phone": "+91-11-24363260"
    },
    {
        "team_id": "SDRF_BRAVO_02",
        "name": "SDRF Coastal & Flood Rescue Bravo",
        "base_location": "Chennai Harbor Command",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "status": "AVAILABLE",
        "capabilities": ["FLOOD_BOAT_EVACUATION", "URBAN_WATER_RESCUE", "DIVING"],
        "assigned_rescue_id": None,
        "contact_phone": "+91-44-28592000"
    },
    {
        "team_id": "TOKYO_DISASTER_TEAM_03",
        "name": "Tokyo Fire Department Special Rescue",
        "base_location": "Shinjuku Fire Command",
        "latitude": 35.6762,
        "longitude": 139.6503,
        "status": "AVAILABLE",
        "capabilities": ["EARTHQUAKE_SEARCH", "HEAVY_DEBRIS_RESCUE"],
        "assigned_rescue_id": None,
        "contact_phone": "+81-3-3212-2111"
    }
]


def _log_audit_event(rescue_id: str, action: str, performed_by: str, details: str):
    _AUDIT_LOGS.append({
        "event_id": f"evt_{uuid.uuid4().hex[:8]}",
        "rescue_id": rescue_id,
        "action": action,
        "performed_by": performed_by,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


def _calculate_priority(medical_status: str, disaster_type: str) -> str:
    """Derives rescue priority cleanly without fraudulent assumption."""
    ms = medical_status.upper()
    if "INJURED" in ms or "UNCONSCIOUS" in ms or "IMMEDIATE" in ms or "BURIED" in ms:
        return "CRITICAL"
    elif "TRAPPED" in ms or "CUT OFF" in ms:
        return "HIGH"
    elif "EVACUATION" in ms or "ASSISTANCE" in ms:
        return "MEDIUM"
    return "LOW"


# ---------------------------------------------------------------------------
# 1. Rescue Request Engine
# ---------------------------------------------------------------------------
def create_rescue_request(payload: Dict[str, Any], is_demo: bool = False) -> Dict[str, Any]:
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()
    
    if is_demo:
        rescue_id = f"RES-DEMO-{int(time.time() * 1000) % 100000:05d}"
    else:
        rescue_id = f"RES-2026-{int(time.time() * 1000) % 100000:05d}"

    med_status = payload.get("user_condition", payload.get("medical_status", "TRAPPED / UNINJURED"))
    disaster = payload.get("disaster_type", "FLOOD").upper()
    priority = _calculate_priority(med_status, disaster)

    req_obj = {
        "rescue_id": rescue_id,
        "user_id": payload.get("user_id", "user_anon_01"),
        "user_name": payload.get("user_name", "Resident Citizen"),
        "phone": payload.get("verified_phone", payload.get("phone", "+91-98765-43210")),
        "email": payload.get("verified_email", payload.get("email", "resident@disaster.gov.in")),
        "latitude": float(payload.get("latitude", 30.7346)),
        "longitude": float(payload.get("longitude", 79.0669)),
        "gps_accuracy_m": float(payload.get("gps_accuracy_m", 4.2)),
        "gps_status": "GPS_VERIFIED" if payload.get("latitude") else "LAST_KNOWN_LOCATION",
        "movement_status": payload.get("movement_status", payload.get("movement_state", "STATIONARY")),
        "location_name": payload.get("last_known_location", payload.get("location_name", "Kedarnath Valley")),
        "disaster_type": disaster,
        "alert_id": payload.get("alert_id", "ALERT-GLOBAL-2026"),
        "medical_status": med_status,
        "user_condition": med_status,
        "message": payload.get("user_message", payload.get("message", "Emergency rescue request from Life Safety Mode")),
        "voice_note_url": payload.get("voice_note_url", None),
        "battery_pct": payload.get("battery_level_pct", payload.get("battery_pct", 84)),
        "network_status": payload.get("network_status", "ONLINE"),
        "priority": priority,
        "status": "REQUESTED",
        "created_at": now_iso,
        "updated_at": now_iso,
        "expires_at": (now_utc + timedelta(hours=24)).isoformat(),
        "assigned_team": None,
        "timeline": [
            {"status": "REQUESTED", "timestamp": now_iso, "note": "Rescue signal transmitted by user."}
        ],
        "messages": [
            {
                "msg_id": f"msg_{uuid.uuid4().hex[:6]}",
                "sender": "SYSTEM",
                "text": f"Your rescue request (ID: {rescue_id}) has been received. Remain in a safe, elevated location if possible.",
                "timestamp": now_iso,
                "delivery_status": "DELIVERED"
            }
        ],
        "help_guarantee_disclaimer": "Your request has been registered. This system cannot guarantee response times. Follow local emergency instructions."
    }
    
    if is_demo:
        req_obj["data_type"] = "DEMO"

    _RESCUE_STORE[rescue_id] = req_obj
    _log_audit_event(rescue_id, "CREATE_REQUEST", req_obj["user_name"], f"Priority: {priority}, Disaster: {disaster}")
    return req_obj


def mask_rescue_pii(req: Dict[str, Any]) -> Dict[str, Any]:
    """Return a privacy-masked copy of a rescue request for public endpoints."""
    masked = dict(req)
    # Mask phone: +1 (555) 019-2834 -> +1 *** *** 2834
    phone = str(masked.get("phone", ""))
    if len(phone) > 4:
        masked["phone"] = phone[:3] + " *** *** " + phone[-4:]
    if "verified_phone" in masked and len(str(masked["verified_phone"])) > 4:
        vphone = str(masked["verified_phone"])
        masked["verified_phone"] = vphone[:3] + " *** *** " + vphone[-4:]
        
    # Mask email: resident@disaster.gov.in -> r***@disaster.gov.in
    email = str(masked.get("email", ""))
    if "@" in email:
        parts = email.split("@")
        masked["email"] = parts[0][0] + "***@" + parts[1]
    if "verified_email" in masked and "@" in str(masked["verified_email"]):
        parts = str(masked["verified_email"]).split("@")
        masked["verified_email"] = parts[0][0] + "***@" + parts[1]
        
    # Mask user_name: Alexander Knight -> A. K.
    user_name = str(masked.get("user_name", ""))
    names = user_name.split()
    if names:
        masked["user_name"] = " ".join([n[0].upper() + "." for n in names if n])
        
    # Round exact coordinates to 2 decimal places for public map privacy (~1.1 km precision)
    if "latitude" in masked and masked["latitude"] is not None:
        masked["latitude"] = round(float(masked["latitude"]), 2)
    if "longitude" in masked and masked["longitude"] is not None:
        masked["longitude"] = round(float(masked["longitude"]), 2)
        
    return masked


def get_rescue_request(rescue_id: str, is_authorized: bool = False) -> Optional[Dict[str, Any]]:
    req = _RESCUE_STORE.get(rescue_id)
    if req and not is_authorized:
        return mask_rescue_pii(req)
    return req


def get_all_rescue_requests(
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    disaster_filter: Optional[str] = None,
    is_authorized: bool = False
) -> List[Dict[str, Any]]:
    reqs = list(_RESCUE_STORE.values())

    if status_filter:
        reqs = [r for r in reqs if r.get("status") == status_filter.upper()]
    if priority_filter:
        reqs = [r for r in reqs if r.get("priority") == priority_filter.upper()]
    if disaster_filter:
        reqs = [r for r in reqs if r.get("disaster_type") == disaster_filter.upper()]

    # Sort priority: CRITICAL > HIGH > MEDIUM > LOW
    prio_rank = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
    reqs.sort(key=lambda x: (-prio_rank.get(x.get("priority", "LOW"), 1), x.get("created_at", "")), reverse=False)

    if not is_authorized:
        return [mask_rescue_pii(r) for r in reqs]
    return reqs


# ---------------------------------------------------------------------------
# 2. Responder Action & Status Updates
# ---------------------------------------------------------------------------
def update_rescue_status(
    rescue_id: str,
    new_status: str,
    responder_id: str = "RESP_NDMA_01",
    note: str = "",
    assign_team_id: Optional[str] = None
) -> Dict[str, Any]:
    if rescue_id not in _RESCUE_STORE:
        return {"success": False, "error": f"Rescue ID {rescue_id} not found"}

    req = _RESCUE_STORE[rescue_id]
    old_status = req["status"]
    new_st_upper = new_status.upper()
    now_iso = datetime.now(timezone.utc).isoformat()

    req["status"] = new_st_upper
    req["updated_at"] = now_iso

    # Assign Team if specified
    if assign_team_id:
        req["assigned_team"] = assign_team_id
        for t in _RESCUE_TEAMS:
            if t["team_id"] == assign_team_id:
                t["status"] = "ASSIGNED"
                t["assigned_rescue_id"] = rescue_id

    note_text = note if note else f"Status transitioned from {old_status} to {new_st_upper} by {responder_id}."
    req["timeline"].append({
        "status": new_st_upper,
        "timestamp": now_iso,
        "note": note_text
    })

    # Auto-add notification message to two-way chat
    auto_msg = f"STATUS UPDATE: Your rescue request is now [{new_st_upper}]. {note_text}"
    req["messages"].append({
        "msg_id": f"msg_{uuid.uuid4().hex[:6]}",
        "sender": responder_id,
        "text": auto_msg,
        "timestamp": now_iso,
        "delivery_status": "DELIVERED"
    })

    _log_audit_event(rescue_id, "UPDATE_STATUS", responder_id, f"Transition: {old_status} -> {new_st_upper}")

    return {
        "success": True,
        "status": new_st_upper,
        "rescue_id": rescue_id,
        "old_status": old_status,
        "updated_at": now_iso,
        "request": req
    }


def update_rescue_location(rescue_id: str, lat: float, lng: float, movement_status: str = "STATIONARY", gps_accuracy_m: float = 4.2) -> Dict[str, Any]:
    if rescue_id not in _RESCUE_STORE:
        return {"success": False, "error": f"Rescue ID {rescue_id} not found"}

    req = _RESCUE_STORE[rescue_id]
    now_iso = datetime.now(timezone.utc).isoformat()
    req["latitude"] = float(lat)
    req["longitude"] = float(lng)
    req["movement_status"] = movement_status
    req["gps_accuracy_m"] = float(gps_accuracy_m)
    req["updated_at"] = now_iso
    req["gps_status"] = "GPS_UPDATED_LIVE"

    req["timeline"].append({
        "status": req["status"],
        "timestamp": now_iso,
        "note": f"Live GPS coordinates updated to ({lat:.4f}, {lng:.4f}). Movement: {movement_status}."
    })

    _log_audit_event(rescue_id, "UPDATE_LOCATION", req["user_name"], f"Lat: {lat}, Lng: {lng}")
    return {
        "success": True, 
        "movement_status": movement_status,
        "rescue_id": rescue_id, 
        "updated_at": now_iso, 
        "location": {"latitude": lat, "longitude": lng}
    }


def add_rescue_message(rescue_id: str, sender_type: str, sender_id: str, message_text: str, channel: str = "IN_APP") -> Dict[str, Any]:
    if rescue_id not in _RESCUE_STORE:
        return {"success": False, "error": f"Rescue ID {rescue_id} not found"}

    req = _RESCUE_STORE[rescue_id]
    now_iso = datetime.now(timezone.utc).isoformat()
    msg_obj = {
        "msg_id": f"msg_{uuid.uuid4().hex[:6]}",
        "sender_type": sender_type,
        "sender_id": sender_id,
        "text": message_text,
        "channel": channel,
        "timestamp": now_iso,
        "delivery_status": "SENT"
    }
    req["messages"].append(msg_obj)
    _log_audit_event(rescue_id, "SEND_MESSAGE", sender_id, message_text[:50])

    return {
        "success": True, 
        "delivery_status": "SENT",
        "rescue_id": rescue_id, 
        "message": msg_obj
    }


def cancel_rescue_request(rescue_id: str, reason: str = "User confirmed safe") -> Dict[str, Any]:
    res = update_rescue_status(rescue_id, "CANCELLED", responder_id="USER", note=f"Cancelled: {reason}")
    if res.get("success"):
        res["status"] = "CANCELLED"
    return res


# ---------------------------------------------------------------------------
# 3. Emergency Contacts Management
# ---------------------------------------------------------------------------
def get_user_emergency_contacts(user_phone: str = "+91-98765-43210") -> List[Dict[str, Any]]:
    if user_phone not in _CONTACTS_STORE:
        _CONTACTS_STORE[user_phone] = [
            {
                "contact_id": "cnt_01",
                "name": "Aarav Sharma",
                "relationship": "Spouse / Family",
                "phone": "+91-98765-00001",
                "email": "aarav.sharma@example.com",
                "verified": True,
                "notify_on_rescue": True
            },
            {
                "contact_id": "cnt_02",
                "name": "Priya Verma",
                "relationship": "Sibling",
                "phone": "+91-98765-00002",
                "email": "priya.v@example.com",
                "verified": True,
                "notify_on_rescue": True
            }
        ]
    return _CONTACTS_STORE[user_phone]


def add_emergency_contact(user_phone: str, contact_data: Dict[str, Any]) -> Dict[str, Any]:
    contacts = get_user_emergency_contacts(user_phone)
    cnt_id = f"cnt_{len(contacts) + 1}_{int(time.time())}"
    new_c = {
        "contact_id": cnt_id,
        "name": contact_data.get("name", "Emergency Contact"),
        "relationship": contact_data.get("relationship", "Family"),
        "phone": contact_data.get("phone", ""),
        "email": contact_data.get("email", ""),
        "verified": True,
        "notify_on_rescue": bool(contact_data.get("notify_on_rescue", True))
    }
    contacts.append(new_c)
    _CONTACTS_STORE[user_phone] = contacts
    return new_c


def notify_emergency_contacts(rescue_id: str, user_phone: str = "+91-98765-43210") -> Dict[str, Any]:
    req = get_rescue_request(rescue_id)
    if not req:
        return {"success": False, "error": f"Rescue ID {rescue_id} not found"}
        
    contacts = get_user_emergency_contacts(user_phone)
    now_iso = datetime.now(timezone.utc).isoformat()

    notified = []
    for c in contacts:
        if c.get("notify_on_rescue"):
            notified.append({
                "contact_name": c["name"],
                "phone": c["phone"],
                "channel": "SMS_ALERT",
                "status": "SENT",
                "timestamp": now_iso,
                "message": f"🚨 EMERGENCY NOTICE: {req.get('user_name', 'Your relative')} has requested emergency rescue in {req.get('location_name', 'Disaster Sector')}. Rescue ID: {rescue_id}. Location: ({req.get('latitude')}, {req.get('longitude')})."
            })

    return {
        "success": True,
        "rescue_id": rescue_id,
        "notified_count": len(notified),
        "notifications": notified
    }


# ---------------------------------------------------------------------------
# 4. Safe DEMO Rescue Simulation Trigger
# ---------------------------------------------------------------------------
def simulate_demo_rescue(hazard_type: str = "LANDSLIDE", location_name: str = "Kedarnath Valley") -> Dict[str, Any]:
    req = create_rescue_request({
        "user_name": "[DEMO] Citizen Trapped in Landslide",
        "phone": "+91-98765-43210",
        "latitude": 30.7346,
        "longitude": 79.0669,
        "disaster_type": hazard_type,
        "medical_status": "TRAPPED / UNINJURED",
        "message": "[DEMO SIMULATION] Trapped near debris slope; need mountain rescue team.",
        "location_name": location_name
    }, is_demo=True)

    rid = req["rescue_id"]
    update_rescue_status(rid, "ACKNOWLEDGED", responder_id="NDMA_DISPATCH_CENTER", note="[DEMO] Signal acknowledged by dispatch operator.")
    update_rescue_status(rid, "CONTACTING", responder_id="NDRF_ALPHA_01", note="[DEMO] Responder initiating direct satellite call.")
    update_rescue_status(rid, "DISPATCHED", responder_id="NDRF_ALPHA_01", note="[DEMO] NDRF 8th Battalion team dispatched from Kedarnath Ridge.", assign_team_id="NDRF_ALPHA_01")
    update_rescue_status(rid, "EN_ROUTE", responder_id="NDRF_ALPHA_01", note="[DEMO] Team en route via high-ground ridge route.")

    return get_rescue_request(rid)
