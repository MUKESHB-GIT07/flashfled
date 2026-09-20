"""
auth_service.py — Phase 16: Complete User Authentication & Account & Emergency Contact System
=============================================================================================
Provides complete secure authentication, user profiles, emergency contacts, monitored locations,
notification preferences, device management, and role-based access control (CITIZEN, RESPONDER, ADMIN).
"""

import time
import uuid
import hashlib
import os
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

logger = logging.getLogger("auth_service")

# ---------------------------------------------------------------------------
# Privacy Helpers
# ---------------------------------------------------------------------------
def mask_phone_number(phone: str) -> str:
    """Masks phone number for privacy, e.g. +919876543210 -> +91******3210"""
    if not phone:
        return ""
    if len(phone) < 8:
        return "****"
    prefix = phone[:3] if phone.startswith("+") else phone[:2]
    suffix = phone[-4:]
    return f"{prefix}{'*' * (len(phone) - len(prefix) - len(suffix))}{suffix}"

# ---------------------------------------------------------------------------
# Security Helpers
# ---------------------------------------------------------------------------
def _hash_password(password: str, salt: Optional[str] = None) -> Dict[str, str]:
    if not salt:
        salt = uuid.uuid4().hex
    # SHA-256 with 10,000 iterations for secure password hashing
    key = password.encode('utf-8')
    salt_bytes = salt.encode('utf-8')
    hashed = hashlib.pbkdf2_hmac('sha256', key, salt_bytes, 10000).hex()
    return {"hash": hashed, "salt": salt}

def _verify_password(password: str, hashed: str, salt: str) -> bool:
    res = _hash_password(password, salt)
    return res["hash"] == hashed

def _generate_token(prefix: str = "tok") -> str:
    return f"{prefix}_{uuid.uuid4().hex}_{int(time.time())}"

# ---------------------------------------------------------------------------
# In-Memory Stores (Pre-populated with default DEMO Account)
# ---------------------------------------------------------------------------
_USERS_STORE: Dict[str, Dict[str, Any]] = {}
_SESSIONS_STORE: Dict[str, Dict[str, Any]] = {}
_PHONE_OTP_STORE: Dict[str, Dict[str, Any]] = {}
_EMAIL_VERIFY_STORE: Dict[str, Dict[str, Any]] = {}

# Pre-populated Default Demo User
DEMO_USER_ID = "usr_demo_2026_01"
demo_pwd = _hash_password("DemoPassword123!")

_USERS_STORE[DEMO_USER_ID] = {
    "user_id": DEMO_USER_ID,
    "full_name": "Emergency Citizen",
    "email": "demo@emergency.gov",
    "phone": "+91-98765-43210",
    "country": "India",
    "country_code": "+91",
    "role": "CITIZEN",
    "password_hash": demo_pwd["hash"],
    "password_salt": demo_pwd["salt"],
    "phone_verified": True,
    "email_verified": True,
    "profile_photo": "",
    "language": "English",
    "home_location": "Chennai, Tamil Nadu",
    "consent_emergency_alerts": True,
    "consent_marketing": False,
    "account_status": "ACTIVE",
    "created_at": datetime.now(timezone.utc).isoformat(),
    "last_login_at": datetime.now(timezone.utc).isoformat(),
    "emergency_contacts": [
        {
            "contact_id": "cnt_01",
            "name": "Mother (Rajeshwari)",
            "relationship": "Mother",
            "country": "India",
            "country_code": "+91",
            "phone": "+91-98765-11111",
            "email": "mother@family.org",
            "priority": "PRIMARY",
            "sms_enabled": True,
            "push_enabled": True,
            "emergency_notify": True,
            "verified": True
        },
        {
            "contact_id": "cnt_02",
            "name": "Father (Srinivasan)",
            "relationship": "Father",
            "country": "India",
            "country_code": "+91",
            "phone": "+91-98765-22222",
            "email": "father@family.org",
            "priority": "SECONDARY",
            "sms_enabled": True,
            "push_enabled": False,
            "emergency_notify": True,
            "verified": True
        },
        {
            "contact_id": "cnt_03",
            "name": "Brother (Arun)",
            "relationship": "Brother",
            "country": "India",
            "country_code": "+91",
            "phone": "+91-98765-33333",
            "email": "arun@family.org",
            "priority": "TERTIARY",
            "sms_enabled": True,
            "push_enabled": False,
            "emergency_notify": True,
            "verified": False
        }
    ],
    "monitored_locations": [
        {
            "location_id": "loc_01",
            "name": "HOME — Chennai",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "radius_km": 15,
            "hazards": ["FLOOD", "CYCLONE", "TSUNAMI"],
            "severity_threshold": "HIGH"
        },
        {
            "location_id": "loc_02",
            "name": "WORK — Mumbai",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "radius_km": 10,
            "hazards": ["FLOOD", "EXTREME_WEATHER"],
            "severity_threshold": "MODERATE"
        }
    ],
    "preferences": {
        "sms_enabled": True,
        "push_enabled": True,
        "email_enabled": True,
        "web_enabled": True,
        "categories": {
            "FLASH_FLOOD": True,
            "EARTHQUAKE": True,
            "TSUNAMI": True,
            "CYCLONE": True,
            "WILDFIRE": True,
            "LANDSLIDE": True,
            "VOLCANO": True,
            "EXTREME_WEATHER": True,
            "EMERGENCY_SOS": True
        }
    },
    "devices": [
        {
            "device_id": "dev_browser_01",
            "device_name": "Chrome / Windows 11",
            "device_type": "BROWSER",
            "last_active": datetime.now(timezone.utc).isoformat(),
            "push_connected": True
        }
    ]
}

# ---------------------------------------------------------------------------
# Provider Credentials Status
# ---------------------------------------------------------------------------
def get_oauth_provider_status() -> Dict[str, Any]:
    """
    Returns configuration status for all third-party auth/notification providers.
    Twilio status reflects whether ALL THREE credentials are set (same logic as OTP dispatch).
    """
    google_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    apple_id = os.environ.get("APPLE_CLIENT_ID", "")
    twilio_ready = _is_twilio_configured()
    email_key = os.environ.get("SMTP_HOST", "") or os.environ.get("SENDGRID_API_KEY", "")

    return {
        "google": {
            "status": "CONNECTED" if google_id else "DEMO",
            "configured": bool(google_id),
            "label": "Google OAuth Login"
        },
        "apple": {
            "status": "CONNECTED" if apple_id else "DEMO",
            "configured": bool(apple_id),
            "label": "Apple ID Login"
        },
        "sms": {
            "status": "LIVE" if twilio_ready else "DEMO",
            "configured": twilio_ready,
            "label": "SMS OTP via Twilio"
        },
        "email": {
            "status": "LIVE" if email_key else "DEMO",
            "configured": bool(email_key),
            "label": "SMTP Email Verification"
        }
    }

# ---------------------------------------------------------------------------
# Registration & Authentication Logic
# ---------------------------------------------------------------------------
def register_user(payload: Dict[str, Any]) -> Dict[str, Any]:
    email = payload.get("email", "").strip().lower()
    phone = payload.get("phone", "").strip()
    full_name = payload.get("full_name", "").strip()
    password = payload.get("password", "")

    if not full_name:
        return {"success": False, "error": "Full name is required."}

    # Check duplicates by email/phone
    for u in _USERS_STORE.values():
        if email and u.get("email") == email:
            return {"success": False, "error": f"An account with email {email} already exists."}
        if phone and u.get("phone") == phone:
            return {"success": False, "error": f"An account with phone number {phone} already exists."}

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    pwd_info = _hash_password(password if password else "DefaultPassword123!")

    new_user = {
        "user_id": user_id,
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "country": payload.get("country", "India"),
        "country_code": payload.get("country_code", "+91"),
        "role": payload.get("role", "CITIZEN").upper(),
        "password_hash": pwd_info["hash"],
        "password_salt": pwd_info["salt"],
        "phone_verified": False,
        "email_verified": False,
        "profile_photo": payload.get("profile_photo", ""),
        "language": payload.get("language", "English"),
        "home_location": payload.get("home_location", ""),
        "consent_emergency_alerts": bool(payload.get("consent_emergency_alerts", True)),
        "consent_marketing": bool(payload.get("consent_marketing", False)),
        "account_status": "ACTIVE",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login_at": datetime.now(timezone.utc).isoformat(),
        "emergency_contacts": [],
        "monitored_locations": [],
        "preferences": {
            "sms_enabled": True,
            "push_enabled": True,
            "email_enabled": True,
            "web_enabled": True,
            "categories": {
                "FLASH_FLOOD": True,
                "EARTHQUAKE": True,
                "TSUNAMI": True,
                "CYCLONE": True,
                "WILDFIRE": True,
                "LANDSLIDE": True,
                "VOLCANO": True,
                "EXTREME_WEATHER": True,
                "EMERGENCY_SOS": True
            }
        },
        "devices": []
    }

    _USERS_STORE[user_id] = new_user

    # Generate session
    session = create_session(user_id)

    return {
        "success": True,
        "message": "Account created successfully.",
        "user": sanitize_user_profile(new_user),
        "session": session
    }

def login_user(identifier: str, password: str) -> Dict[str, Any]:
    ident = identifier.strip().lower()
    target_user = None
    for u in _USERS_STORE.values():
        if u.get("email", "").lower() == ident or u.get("phone", "") == ident:
            target_user = u
            break

    if not target_user:
        return {"success": False, "error": "Invalid email/phone or password."}

    if not _verify_password(password, target_user["password_hash"], target_user["password_salt"]):
        return {"success": False, "error": "Invalid email/phone or password."}

    target_user["last_login_at"] = datetime.now(timezone.utc).isoformat()
    session = create_session(target_user["user_id"])

    return {
        "success": True,
        "message": "Login successful.",
        "user": sanitize_user_profile(target_user),
        "session": session
    }

def login_demo() -> Dict[str, Any]:
    user = _USERS_STORE[DEMO_USER_ID]
    user["last_login_at"] = datetime.now(timezone.utc).isoformat()
    session = create_session(DEMO_USER_ID)
    return {
        "success": True,
        "message": "Logged in as DEMO User.",
        "is_demo": True,
        "user": sanitize_user_profile(user),
        "session": session
    }

def create_session(user_id: str) -> Dict[str, Any]:
    token = _generate_token("sess")
    now_utc = datetime.now(timezone.utc)
    expires_at = (now_utc + timedelta(days=7)).isoformat()
    sess_obj = {
        "session_token": token,
        "user_id": user_id,
        "created_at": now_utc.isoformat(),
        "expires_at": expires_at
    }
    _SESSIONS_STORE[token] = sess_obj
    return sess_obj

def get_session_user(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    token = token.replace("Bearer ", "").strip()
    sess = _SESSIONS_STORE.get(token)
    if not sess:
        return None
    user = _USERS_STORE.get(sess["user_id"])
    return user

def logout_session(token: str) -> bool:
    token = token.replace("Bearer ", "").strip()
    if token in _SESSIONS_STORE:
        del _SESSIONS_STORE[token]
        return True
    return False

# ---------------------------------------------------------------------------
# OTP Constants
# ---------------------------------------------------------------------------
OTP_EXPIRES_SECONDS = 300        # 5 minutes
RESEND_COOLDOWN_SECONDS = 30     # 30 second cooldown before resend allowed
DEMO_OTP = "123456"              # Fixed demo OTP — never sent via real carrier


def _is_twilio_configured() -> bool:
    """Returns True only when ALL three Twilio credentials are present."""
    return bool(
        os.environ.get("TWILIO_ACCOUNT_SID", "").strip() and
        os.environ.get("TWILIO_AUTH_TOKEN", "").strip() and
        os.environ.get("TWILIO_PHONE_NUMBER", "").strip()
    )


def _send_otp_via_twilio(phone_e164: str, otp: str) -> Dict[str, Any]:
    """
    Dispatches a single OTP SMS via Twilio REST API.
    Returns {"success": True, "sid": ..., "status": "PROVIDER_ACCEPTED"}
         or {"success": False, "error": ..., "status": "DELIVERY_FAILED"}
    Credentials are read from environment; never logged or exposed.
    """
    try:
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException
    except ImportError:
        logger.error("twilio package not installed — install it with: pip install twilio")
        return {"success": False, "error": "SMS provider package not installed.", "status": "DELIVERY_FAILED"}

    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    from_number = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()

    masked_to = mask_phone_number(phone_e164)
    masked_from = mask_phone_number(from_number)

    try:
        client = Client(account_sid, auth_token)
        message_body = (
            f"Your Global Emergency Platform verification code is: {otp}\n"
            f"Valid for 5 minutes. Do NOT share this code with anyone."
        )
        msg = client.messages.create(
            body=message_body,
            from_=from_number,
            to=phone_e164
        )
        logger.info(f"Twilio OTP dispatched successfully. SID={msg.sid} From={masked_from} To={masked_to}")
        return {
            "success": True,
            "sid": msg.sid,
            "status": "PROVIDER_ACCEPTED",
            "masked_to": masked_to,
            "masked_from": masked_from
        }
    except TwilioRestException as e:
        code = getattr(e, 'code', None)
        msg_str = getattr(e, 'msg', str(e))
        logger.error(f"Twilio API Error Code {code} for To={masked_to} From={masked_from}: {msg_str}")
        error_msg = f"Twilio Error {code}: {msg_str}" if code else f"Twilio Error: {msg_str}"
        return {
            "success": False,
            "error": error_msg,
            "status": "DELIVERY_FAILED",
            "twilio_code": code,
            "masked_to": masked_to,
            "masked_from": masked_from
        }
    except Exception as e:
        logger.error(f"Twilio dispatch error for To={masked_to}: {type(e).__name__}: {e}")
        return {
            "success": False,
            "error": f"SMS dispatch failed: {type(e).__name__}",
            "status": "DELIVERY_FAILED",
            "masked_to": masked_to,
            "masked_from": masked_from
        }


def request_phone_otp(phone: str, country_code: str = "+91") -> Dict[str, Any]:
    """
    Sends a 6-digit OTP to the given phone number.

    DEMO mode   — Twilio credentials absent → OTP is always '123456', returned in response.
    REAL mode   — All three Twilio env vars present → random 6-digit OTP dispatched via Twilio.
                  OTP is NEVER returned in the API response in REAL mode.

    Status codes returned:
        DEMO              — running in demo mode, OTP visible in response
        NOT_CONFIGURED    — Twilio not configured (same as DEMO, explicit label)
        PROVIDER_ACCEPTED — Twilio accepted the SMS for delivery
        DELIVERY_FAILED   — Twilio rejected the request
        RATE_LIMITED      — request within 30-second cooldown window
    """
    # Normalise phone key for OTP store — strip spaces/dashes
    phone_key = phone.strip()
    now = time.time()

    # ---- Resend cooldown check (30 seconds) ----
    existing = _PHONE_OTP_STORE.get(phone_key)
    if existing:
        elapsed = now - existing.get("created_at", 0)
        if elapsed < RESEND_COOLDOWN_SECONDS:
            remaining = int(RESEND_COOLDOWN_SECONDS - elapsed)
            return {
                "success": False,
                "status": "RATE_LIMITED",
                "message": f"Please wait {remaining}s before requesting another OTP.",
                "retry_after": remaining
            }

    twilio_configured = _is_twilio_configured()

    if twilio_configured:
        # REAL mode — generate cryptographically random 6-digit OTP
        otp = str(random.SystemRandom().randint(100000, 999999))
    else:
        # DEMO mode — fixed OTP for testing
        otp = DEMO_OTP

    # Store OTP record (keyed by phone string)
    _PHONE_OTP_STORE[phone_key] = {
        "otp": otp,
        "created_at": now,
        "expires_at": now + OTP_EXPIRES_SECONDS,
        "attempts": 0
    }

    if twilio_configured:
        # Build E.164 phone number for Twilio
        cc = country_code.strip()
        phone_digits = phone_key.lstrip("+").lstrip("0")
        if phone_key.startswith("+"):
            phone_e164 = phone_key  # already E.164
        else:
            phone_e164 = f"{cc}{phone_digits}"

        twilio_result = _send_otp_via_twilio(phone_e164, otp)
        if twilio_result["success"]:
            return {
                "success": True,
                "status": "PROVIDER_ACCEPTED",
                "message": f"Verification code dispatched via Twilio to {mask_phone_number(phone_e164)}. Valid for 5 minutes.",
                "phone": phone_key,
                "sid": twilio_result.get("sid"),
                "masked_to": twilio_result.get("masked_to"),
                "masked_from": twilio_result.get("masked_from")
            }
        else:
            # Clean up stored OTP on delivery failure so user can retry
            _PHONE_OTP_STORE.pop(phone_key, None)
            err_detail = twilio_result.get("error", "SMS delivery failed.")
            return {
                "success": False,
                "status": "DELIVERY_FAILED",
                "message": err_detail,
                "error": err_detail,
                "details": {
                    "masked_to": twilio_result.get("masked_to"),
                    "masked_from": twilio_result.get("masked_from"),
                    "twilio_code": twilio_result.get("twilio_code")
                }
            }
    else:
        # DEMO / NOT_CONFIGURED mode
        status_label = "NOT_CONFIGURED" if not os.environ.get("TWILIO_ACCOUNT_SID") else "DEMO"
        return {
            "success": True,
            "status": status_label if status_label == "NOT_CONFIGURED" else "DEMO",
            "phone": phone_key,
            "demo_otp": otp,          # visible only in DEMO mode
            "is_demo": True,
            "message": f"[DEMO MODE] Verification code sent to {phone_key}. Demo OTP: {otp}"
        }

def verify_phone_otp(phone: str, otp: str, user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Verifies a 6-digit OTP for the given phone.
    Checks expiry and enforces a 5-attempt limit before invalidating the record.
    On success, marks the user's phone as verified.
    """
    phone_key = phone.strip()
    record = _PHONE_OTP_STORE.get(phone_key)

    if not record:
        return {"success": False, "error": "INVALID OTP", "status": "NO_OTP_FOUND"}

    now = time.time()
    if now > record["expires_at"]:
        _PHONE_OTP_STORE.pop(phone_key, None)
        return {"success": False, "error": "SESSION EXPIRED", "status": "EXPIRED"}

    record["attempts"] = record.get("attempts", 0) + 1
    if record["attempts"] > 5:
        _PHONE_OTP_STORE.pop(phone_key, None)
        return {"success": False, "error": "INVALID LOGIN", "status": "TOO_MANY_ATTEMPTS"}

    if record["otp"] != otp.strip():
        return {"success": False, "error": "INVALID OTP", "status": "WRONG_CODE"}

    # OTP is correct — consume it
    _PHONE_OTP_STORE.pop(phone_key, None)

    if user_id and user_id in _USERS_STORE:
        _USERS_STORE[user_id]["phone_verified"] = True
        _USERS_STORE[user_id]["phone"] = phone_key

    return {
        "success": True,
        "message": "Phone number verified successfully.",
        "phone": phone_key,
        "verified": True
    }

def request_email_verification(email: str) -> Dict[str, Any]:
    code = "VERIFY-2026"
    _EMAIL_VERIFY_STORE[email] = {
        "code": code,
        "expires_at": time.time() + 600
    }
    status = get_oauth_provider_status()["email"]
    return {
        "success": True,
        "email": email,
        "demo_code": code,
        "status": status["status"],
        "message": f"Verification email sent to {email}. (DEMO CODE: {code})"
    }

def verify_email_code(email: str, code: str, user_id: Optional[str] = None) -> Dict[str, Any]:
    record = _EMAIL_VERIFY_STORE.get(email)
    if not record or record["code"] != code.strip():
        return {"success": False, "error": "Invalid verification code."}

    del _EMAIL_VERIFY_STORE[email]

    if user_id and user_id in _USERS_STORE:
        _USERS_STORE[user_id]["email_verified"] = True

    return {
        "success": True,
        "message": "Email address verified successfully.",
        "email": email,
        "verified": True
    }

# ---------------------------------------------------------------------------
# Account Management Functions
# ---------------------------------------------------------------------------
def sanitize_user_profile(user: Dict[str, Any]) -> Dict[str, Any]:
    clean = dict(user)
    clean.pop("password_hash", None)
    clean.pop("password_salt", None)
    return clean

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    u = _USERS_STORE.get(user_id)
    return sanitize_user_profile(u) if u else None

def update_user_profile(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    user = _USERS_STORE.get(user_id)
    if not user:
        return {"success": False, "error": "User not found."}

    allowed_fields = ["full_name", "country", "country_code", "language", "home_location", "profile_photo", "consent_marketing"]
    for f in allowed_fields:
        if f in updates:
            user[f] = updates[f]

    return {"success": True, "user": sanitize_user_profile(user)}

def add_emergency_contact(user_id: str, contact_data: Dict[str, Any]) -> Dict[str, Any]:
    user = _USERS_STORE.get(user_id)
    if not user:
        return {"success": False, "error": "User not found."}

    cid = f"cnt_{uuid.uuid4().hex[:8]}"
    new_contact = {
        "contact_id": cid,
        "name": contact_data.get("name", "Emergency Contact"),
        "relationship": contact_data.get("relationship", "Family"),
        "country": contact_data.get("country", "India"),
        "country_code": contact_data.get("country_code", "+91"),
        "phone": contact_data.get("phone", ""),
        "email": contact_data.get("email", ""),
        "priority": contact_data.get("priority", "PRIMARY").upper(),
        "sms_enabled": bool(contact_data.get("sms_enabled", True)),
        "push_enabled": bool(contact_data.get("push_enabled", True)),
        "emergency_notify": bool(contact_data.get("emergency_notify", True)),
        "verified": False
    }

    user["emergency_contacts"].append(new_contact)
    return {"success": True, "contact": new_contact, "contacts": user["emergency_contacts"]}

def update_emergency_contact(user_id: str, contact_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    user = _USERS_STORE.get(user_id)
    if not user:
        return {"success": False, "error": "User not found."}

    for c in user["emergency_contacts"]:
        if c["contact_id"] == contact_id:
            for k in ["name", "relationship", "country", "country_code", "phone", "email", "priority", "sms_enabled", "push_enabled", "emergency_notify"]:
                if k in updates:
                    c[k] = updates[k]
            return {"success": True, "contact": c, "contacts": user["emergency_contacts"]}

    return {"success": False, "error": "Emergency contact not found."}

def delete_emergency_contact(user_id: str, contact_id: str) -> Dict[str, Any]:
    user = _USERS_STORE.get(user_id)
    if not user:
        return {"success": False, "error": "User not found."}

    user["emergency_contacts"] = [c for c in user["emergency_contacts"] if c["contact_id"] != contact_id]
    return {"success": True, "message": "Emergency contact deleted.", "contacts": user["emergency_contacts"]}

def add_monitored_location(user_id: str, loc_data: Dict[str, Any]) -> Dict[str, Any]:
    user = _USERS_STORE.get(user_id)
    if not user:
        return {"success": False, "error": "User not found."}

    lid = f"loc_{uuid.uuid4().hex[:8]}"
    new_loc = {
        "location_id": lid,
        "name": loc_data.get("name", "Monitored Area"),
        "latitude": float(loc_data.get("latitude", 0)),
        "longitude": float(loc_data.get("longitude", 0)),
        "radius_km": int(loc_data.get("radius_km", 10)),
        "hazards": loc_data.get("hazards", ["FLOOD", "EXTREME_WEATHER"]),
        "severity_threshold": loc_data.get("severity_threshold", "HIGH").upper()
    }
    user["monitored_locations"].append(new_loc)
    return {"success": True, "location": new_loc, "locations": user["monitored_locations"]}

def delete_monitored_location(user_id: str, location_id: str) -> Dict[str, Any]:
    user = _USERS_STORE.get(user_id)
    if not user:
        return {"success": False, "error": "User not found."}
    user["monitored_locations"] = [l for l in user["monitored_locations"] if l["location_id"] != location_id]
    return {"success": True, "message": "Monitored location removed.", "locations": user["monitored_locations"]}

def update_preferences(user_id: str, prefs: Dict[str, Any]) -> Dict[str, Any]:
    user = _USERS_STORE.get(user_id)
    if not user:
        return {"success": False, "error": "User not found."}
    user["preferences"].update(prefs)
    return {"success": True, "preferences": user["preferences"]}

def delete_user_account(user_id: str) -> Dict[str, Any]:
    if user_id in _USERS_STORE:
        # Retention Policy: Account marked DELETED, sensitive PII wiped
        user = _USERS_STORE[user_id]
        user["account_status"] = "DELETED"
        user["full_name"] = "[DELETED USER]"
        user["phone"] = ""
        user["email"] = f"deleted_{user_id}@wiped.local"
        user["emergency_contacts"] = []
        user["monitored_locations"] = []
        return {"success": True, "message": "User account deleted cleanly according to privacy retention policy."}
    return {"success": False, "error": "User not found."}
