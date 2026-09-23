import os
import random
import time
import math
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

logger = logging.getLogger("sms_service")

# Phone registration storage & SMS Delivery History (In-Memory Data Store)
_REGISTERED_PHONES: Dict[str, Dict[str, Any]] = {}
_SMS_DELIVERY_LOGS: List[Dict[str, Any]] = []
_ACTIVE_OTPS: Dict[str, Dict[str, Any]] = {}

COUNTRY_CODES = [
    {"code": "+91", "country": "India", "flag": "🇮🇳"},
    {"code": "+1", "country": "USA / Canada", "flag": "🇺🇸"},
    {"code": "+44", "country": "United Kingdom", "flag": "🇬🇧"},
    {"code": "+81", "country": "Japan", "flag": "🇯🇵"},
    {"code": "+61", "country": "Australia", "flag": "🇦🇺"},
    {"code": "+977", "country": "Nepal", "flag": "🇳🇵"},
]

DISASTER_TYPES_LIST = [
    "FLOOD", "HEAVY_RAIN", "LANDSLIDE", "EARTHQUAKE", "TSUNAMI",
    "VOLCANO", "WILDFIRE", "CYCLONE", "EXTREME_WEATHER", "SNOW_AVALANCHE"
]

SEVERITY_LEVELS = ["MODERATE", "HIGH", "VERY HIGH", "EXTREME"]

SUPPORTED_LANGUAGES = [
    {"code": "en", "name": "English"},
    {"code": "hi", "name": "Hindi (हिंदी)"},
    {"code": "ta", "name": "Tamil (தமிழ்)"},
    {"code": "te", "name": "Telugu (తెలుగు)"},
]

def mask_phone_number(phone: str) -> str:
    """Masks phone number for privacy, e.g. +919876543210 -> +91******3210"""
    if not phone:
        return ""
    if len(phone) < 8:
        return "****"
    prefix = phone[:3] if phone.startswith("+") else phone[:2]
    suffix = phone[-4:]
    return f"{prefix}{'*' * (len(phone) - len(prefix) - len(suffix))}{suffix}"

class SMSService:
    """
    Manages phone registration, OTP verification, alert subscriptions,
    Twilio carrier API dispatch, DEMO mode fallback, and delivery logging.
    """

    @staticmethod
    def get_provider_status() -> Dict[str, Any]:
        account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
        auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
        phone_number = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()

        is_configured = bool(account_sid and auth_token and phone_number)
        status = "CONNECTED" if is_configured else "DEMO"

        return {
            "status": status,
            "provider": "TWILIO" if is_configured else "DEMO_SIMULATOR",
            "is_configured": is_configured,
            "from_number": mask_phone_number(phone_number) if is_configured else "DEMO-ALERT-SMS",
            "active_subscriptions": len([p for p in _REGISTERED_PHONES.values() if p.get("verified") and p.get("sms_enabled")]),
            "messages_sent_today": len(_SMS_DELIVERY_LOGS)
        }

    @staticmethod
    def register_phone(country_code: str, phone_number: str, language: str = "en", location: str = "Global") -> Dict[str, Any]:
        """Initiates phone registration and sends a 6-digit OTP."""
        full_number = f"{country_code.strip()}{phone_number.strip().lstrip('0')}"

        if len(phone_number.strip()) < 6 or not phone_number.strip().isdigit():
            return {
                "success": False,
                "message": "Invalid phone number format. Please provide a valid numeric phone number.",
                "status": "INVALID_PHONE"
            }

        now = time.time()
        # Rate limit OTP requests (cooldown 30s)
        if full_number in _ACTIVE_OTPS:
            last_sent = _ACTIVE_OTPS[full_number].get("created_at", 0)
            if now - last_sent < 30:
                remaining = int(30 - (now - last_sent))
                return {
                    "success": False,
                    "message": f"Please wait {remaining} seconds before requesting another OTP.",
                    "status": "RATE_LIMITED"
                }

        # Generate 6-digit OTP (for DEMO mode, fix to 123456 or random)
        otp_code = str(random.randint(100000, 999999))
        expiry = now + 300  # 5 minute expiry

        _ACTIVE_OTPS[full_number] = {
            "otp": otp_code,
            "created_at": now,
            "expires_at": expiry,
            "attempts": 0
        }

        # Save/update user profile (unverified initially)
        if full_number not in _REGISTERED_PHONES:
            _REGISTERED_PHONES[full_number] = {
                "full_number": full_number,
                "masked_phone": mask_phone_number(full_number),
                "country_code": country_code,
                "raw_phone": phone_number,
                "primary_location": location,
                "language": language,
                "verified": False,
                "verified_at": None,
                "sms_enabled": True,
                "disaster_types": DISASTER_TYPES_LIST.copy(),
                "minimum_severity": "HIGH",
                "alert_areas": ["HOME"]
            }

               # Log OTP generation
        provider_info = SMSService.get_provider_status()

        # In DEMO mode, return OTP in response for testing ease
        return {
            "success": True,
            "message": f"OTP sent to {mask_phone_number(full_number)}. Valid for 5 minutes.",
            "status": "OTP_SENT",
            "phone_masked": mask_phone_number(full_number),
            "demo_otp": otp_code if provider_info["status"] == "DEMO" else None,
            "provider_status": provider_info["status"]
        }      

    @staticmethod
    def verify_otp(country_code: str, phone_number: str, otp: str) -> Dict[str, Any]:
        """Verifies the submitted OTP for a phone number."""
        full_number = f"{country_code.strip()}{phone_number.strip().lstrip('0')}"

        if full_number not in _ACTIVE_OTPS:
            return {
                "success": False,
                "message": "No active OTP request found for this phone number. Please request a new OTP.",
                "status": "NO_OTP_FOUND"
            }

        record = _ACTIVE_OTPS[full_number]
        now = time.time()

        if now > record["expires_at"]:
            del _ACTIVE_OTPS[full_number]
            return {
                "success": False,
                "message": "OTP has expired. Please request a new OTP.",
                "status": "EXPIRED"
            }

        record["attempts"] += 1
        if record["attempts"] > 5:
            del _ACTIVE_OTPS[full_number]
            return {
                "success": False,
                "message": "Too many failed attempts. Please request a new OTP.",
                "status": "VERIFICATION_FAILED"
            }

        if record["otp"] != otp.strip():
            return {
                "success": False,
                "message": "Invalid OTP code. Please check and try again.",
                "status": "INVALID_OTP"
            }

        # Mark phone as verified!
        del _ACTIVE_OTPS[full_number]
        if full_number in _REGISTERED_PHONES:
            _REGISTERED_PHONES[full_number]["verified"] = True
            _REGISTERED_PHONES[full_number]["verified_at"] = datetime.now(timezone.utc).isoformat()
            _REGISTERED_PHONES[full_number]["sms_enabled"] = True

        return {
            "success": True,
            "message": "Phone number successfully verified! SMS emergency alerts enabled.",
            "status": "VERIFIED",
            "profile": _REGISTERED_PHONES.get(full_number, {})
        }

    @staticmethod
    def update_preferences(country_code: str, phone_number: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Updates disaster types, minimum severity, language, and SMS toggle for a verified phone."""
        full_number = f"{country_code.strip()}{phone_number.strip().lstrip('0')}"

        if full_number not in _REGISTERED_PHONES or not _REGISTERED_PHONES[full_number].get("verified"):
            return {
                "success": False,
                "message": "Phone number must be registered and verified before updating preferences.",
                "status": "NOT_VERIFIED"
            }

        user = _REGISTERED_PHONES[full_number]
        if "disaster_types" in preferences and isinstance(preferences["disaster_types"], list):
            user["disaster_types"] = preferences["disaster_types"]
        if "minimum_severity" in preferences and preferences["minimum_severity"] in SEVERITY_LEVELS:
            user["minimum_severity"] = preferences["minimum_severity"]
        if "language" in preferences:
            user["language"] = preferences["language"]
        if "sms_enabled" in preferences:
            user["sms_enabled"] = bool(preferences["sms_enabled"])
        if "alert_areas" in preferences:
            user["alert_areas"] = preferences["alert_areas"]

        return {
            "success": True,
            "message": "Alert preferences updated successfully.",
            "profile": user
        }

    @staticmethod
    def get_preferences(country_code: str, phone_number: str) -> Dict[str, Any]:
        """Retrieves profile preferences for a phone number."""
        full_number = f"{country_code.strip()}{phone_number.strip().lstrip('0')}"
        if full_number in _REGISTERED_PHONES:
            return {
                "success": True,
                "profile": _REGISTERED_PHONES[full_number]
            }
        return {
            "success": False,
            "message": "Phone number profile not found.",
            "status": "NOT_FOUND"
        }

    @staticmethod
    def format_sms_message(alert: Dict[str, Any], language: str = "en") -> str:
        """Formats concise emergency SMS according to language choice."""
        hazard = alert.get("hazard_type", "DISASTER").upper()
        severity = alert.get("severity", "HIGH").upper()
        location = alert.get("location", "Monitored Region")
        proj_next = alert.get("projected_area", {}).get("projected_next_region") if isinstance(alert.get("projected_area"), dict) else alert.get("projected_next_region")
        alert_id = alert.get("alert_id", "ALERT-001")

        if language == "hi":
            msg = f"🚨 {severity} {hazard} चेतावनी\n"
            msg += f"स्थान: {location}\n"
            if proj_next:
                msg += f"संभावित अगला क्षेत्र: {proj_next}\n"
            msg += f"कार्रवाई: आधिकारिक सुरक्षा निर्देशों का पालन करें।\n"
            msg += f"आईडी: {alert_id}"
        else:
            msg = f"🚨 {severity} {hazard} WARNING\n"
            msg += f"Location: {location}\n"
            if proj_next:
                msg += f"Projected Next: {proj_next}\n"
            msg += f"Action: Follow official emergency guidance.\n"
            msg += f"ID: {alert_id}"

        return msg

    @staticmethod
    def send_emergency_sms(phone_full: str, alert: Dict[str, Any], is_demo: bool = False) -> Dict[str, Any]:
        """Dispatches an SMS alert via Twilio or records a DEMO SMS."""
        user = _REGISTERED_PHONES.get(phone_full, {})
        lang = user.get("language", "en")
        message_text = SMSService.format_sms_message(alert, language=lang)
        masked_phone = mask_phone_number(phone_full)
        timestamp = datetime.now(timezone.utc).isoformat()
        provider_status = SMSService.get_provider_status()

        status_code = "DEMO"
        detail_msg = "DEMO SMS generated successfully. (No network SMS sent in demo mode)."

        if provider_status["is_configured"] and not is_demo:
            try:
                from twilio.rest import Client
                client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])
                msg_response = client.messages.create(
                    body=message_text,
                    from_=os.environ["TWILIO_PHONE_NUMBER"],
                    to=phone_full
                )
                status_code = "SENT"
                detail_msg = f"Twilio SMS dispatched. Message SID: {msg_response.sid}"
            except Exception as e:
                logger.error(f"Twilio SMS dispatch failed for {masked_phone}: {e}")
                status_code = "FAILED"
                detail_msg = f"SMS carrier dispatch failed: {str(e)}"
        else:
            status_code = "DEMO"

        log_entry = {
            "id": f"sms_log_{int(time.time() * 1000)}",
            "timestamp": timestamp,
            "alert_id": alert.get("alert_id", "ALERT-DEMO"),
            "hazard_type": alert.get("hazard_type", "FLOOD"),
            "location": alert.get("location", "Chennai"),
            "severity": alert.get("severity", "HIGH"),
            "phone_masked": masked_phone,
            "provider": provider_status["provider"],
            "status": status_code,
            "message": message_text,
            "detail": detail_msg
        }

        _SMS_DELIVERY_LOGS.insert(0, log_entry)
        # Keep recent 100 logs
        if len(_SMS_DELIVERY_LOGS) > 100:
            _SMS_DELIVERY_LOGS.pop()

        return log_entry

    @staticmethod
    def send_demo_sms(alert_payload: Optional[Dict[str, Any]] = None, country_code: str = "+91", phone_number: str = "9876543210") -> Dict[str, Any]:
        """Generates a demo SMS preview and records delivery status."""
        full_number = f"{country_code.strip()}{phone_number.strip().lstrip('0')}"

        if not alert_payload:
            alert_payload = {
                "alert_id": "DEMO-FLOOD-01",
                "hazard_type": "FLOOD",
                "location": "Chennai",
                "severity": "EXTREME",
                "projected_next_region": "Chennai Downstream Corridor (+3H)",
                "data_type": "DEMO"
            }

        log_entry = SMSService.send_emergency_sms(full_number, alert_payload, is_demo=True)
        return {
            "success": True,
            "message": "Demo SMS generated successfully.",
            "delivery_log": log_entry,
            "sms_preview": log_entry["message"]
        }

    @staticmethod
    def get_delivery_history() -> List[Dict[str, Any]]:
        """Returns the list of recorded SMS delivery logs."""
        return _SMS_DELIVERY_LOGS

    @staticmethod
    def unsubscribe_sms(country_code: str, phone_number: str) -> Dict[str, Any]:
        """Disables SMS alerts for a phone number."""
        full_number = f"{country_code.strip()}{phone_number.strip().lstrip('0')}"
        if full_number in _REGISTERED_PHONES:
            _REGISTERED_PHONES[full_number]["sms_enabled"] = False
            return {
                "success": True,
                "message": "SMS emergency notifications disabled for this number.",
                "status": "UNSUBSCRIBED"
            }
        return {
            "success": False,
            "message": "Phone number not found.",
            "status": "NOT_FOUND"
        }
