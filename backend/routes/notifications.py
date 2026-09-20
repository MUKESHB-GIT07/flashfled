from fastapi import APIRouter, Query, HTTPException, Body
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from services.sms_service import (
    SMSService,
    COUNTRY_CODES,
    DISASTER_TYPES_LIST,
    SEVERITY_LEVELS,
    SUPPORTED_LANGUAGES
)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

class PhoneRegisterRequest(BaseModel):
    country_code: str = "+91"
    phone_number: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = "en"
    location: Optional[str] = "Global"

class PhoneVerifyRequest(BaseModel):
    country_code: str = "+91"
    phone_number: Optional[str] = None
    phone: Optional[str] = None
    otp: str

class PreferencesUpdateRequest(BaseModel):
    country_code: str = "+91"
    phone_number: Optional[str] = None
    phone: Optional[str] = None
    disaster_types: Optional[List[str]] = None
    minimum_severity: Optional[str] = None
    language: Optional[str] = None
    sms_enabled: Optional[bool] = None
    alert_areas: Optional[List[str]] = None

class DemoSMSRequest(BaseModel):
    country_code: Optional[str] = "+91"
    phone_number: Optional[str] = "9876543210"
    phone: Optional[str] = None
    hazard_type: Optional[str] = "FLOOD"
    location: Optional[str] = "Chennai"
    severity: Optional[str] = "EXTREME"
    projected_next_region: Optional[str] = "Chennai Downstream Corridor (+3H)"

@router.get("/sms-status")
def get_sms_status():
    """Returns SMS provider connection status (CONNECTED, DEMO, NOT_CONFIGURED)."""
    return SMSService.get_provider_status()

@router.get("/country-codes")
def get_country_codes():
    """Returns available international country calling codes."""
    return {
        "country_codes": COUNTRY_CODES,
        "disaster_types": DISASTER_TYPES_LIST,
        "severity_levels": SEVERITY_LEVELS,
        "languages": SUPPORTED_LANGUAGES
    }

@router.post("/register-phone")
@router.post("/request-phone-otp", include_in_schema=False)
def register_phone(req: PhoneRegisterRequest):
    """Registers phone number and sends a 6-digit verification OTP."""
    target_phone = req.phone_number or req.phone
    if not target_phone:
        raise HTTPException(status_code=400, detail="Phone number is required.")
    result = SMSService.register_phone(
        country_code=req.country_code,
        phone_number=target_phone,
        language=req.language or "en",
        location=req.location or "Global"
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

@router.post("/verify-phone")
@router.post("/verify-phone-otp", include_in_schema=False)
def verify_phone(req: PhoneVerifyRequest):
    """Verifies OTP code for registered phone number."""
    target_phone = req.phone_number or req.phone
    if not target_phone:
        raise HTTPException(status_code=400, detail="Phone number is required.")
    result = SMSService.verify_otp(
        country_code=req.country_code,
        phone_number=target_phone,
        otp=req.otp
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

@router.post("/subscribe-sms")
def subscribe_sms(req: PreferencesUpdateRequest):
    """Updates disaster alert preferences for a verified phone number."""
    result = SMSService.update_preferences(
        country_code=req.country_code,
        phone_number=req.phone_number,
        preferences={
            "disaster_types": req.disaster_types,
            "minimum_severity": req.minimum_severity,
            "language": req.language,
            "sms_enabled": req.sms_enabled,
            "alert_areas": req.alert_areas
        }
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

@router.delete("/subscribe-sms")
def unsubscribe_sms(country_code: str = Query("+91"), phone_number: str = Query(...)):
    """Disables SMS alerts for a phone number."""
    result = SMSService.unsubscribe_sms(country_code=country_code, phone_number=phone_number)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

@router.get("/preferences")
def get_preferences(country_code: str = Query("+91"), phone_number: str = Query(...)):
    """Fetches user preferences for a verified phone number."""
    result = SMSService.get_preferences(country_code=country_code, phone_number=phone_number)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("message"))
    return result

@router.post("/send-demo-sms")
def send_demo_sms(req: DemoSMSRequest):
    """Simulates sending an emergency SMS alert (DEMO MODE)."""
    alert_payload = {
        "alert_id": f"DEMO-SMS-{req.hazard_type.upper()}-01",
        "hazard_type": req.hazard_type.upper(),
        "location": req.location,
        "severity": req.severity.upper(),
        "projected_next_region": req.projected_next_region,
        "data_type": "DEMO"
    }
    return SMSService.send_demo_sms(
        alert_payload=alert_payload,
        country_code=req.country_code or "+91",
        phone_number=req.phone_number or "9876543210"
    )

@router.get("/delivery-history")
def get_delivery_history():
    """Returns SMS delivery history log."""
    logs = SMSService.get_delivery_history()
    return {
        "count": len(logs),
        "history": logs
    }

from services.push_service import PushService


class DeviceRegisterRequest(BaseModel):
    device_id: str
    platform: str = "WEB"  # WEB, ANDROID, IOS
    push_token: str
    user_id: Optional[str] = "guest_user"
    language: Optional[str] = "en"
    alert_area_ids: Optional[List[str]] = None
    minimum_severity: Optional[str] = "HIGH"

class DeviceUnregisterRequest(BaseModel):
    device_id: str

class TestPushRequest(BaseModel):
    platform: Optional[str] = "WEB"
    device_id: Optional[str] = None

# ============================================================
# PHASE 8 — Mobile Push (Web VAPID, Android FCM, iOS APNs)
# ============================================================

@router.get("/push-status")
def get_push_status():
    """Returns Multi-Platform Push Provider status (WEB, ANDROID, IOS)."""
    return PushService.get_provider_status()

@router.post("/register-device")
def register_device(req: DeviceRegisterRequest):
    """Registers or updates a device push token."""
    result = PushService.register_device(
        device_id=req.device_id,
        platform=req.platform,
        push_token=req.push_token,
        user_id=req.user_id or "guest_user",
        language=req.language or "en",
        alert_area_ids=req.alert_area_ids,
        minimum_severity=req.minimum_severity or "HIGH"
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

@router.post("/unregister-device")
def unregister_device(req: DeviceUnregisterRequest):
    """Unregisters a push device token."""
    result = PushService.unregister_device(device_id=req.device_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("message"))
    return result

@router.get("/devices")
def get_registered_devices():
    """Returns sanitized list of active push devices."""
    devices = PushService.get_registered_devices()
    return {
        "count": len(devices),
        "devices": devices
    }

@router.post("/test-push")
def send_test_push(req: TestPushRequest):
    """Simulates/dispatches a test emergency push notification."""
    return PushService.send_test_push(
        platform=req.platform or "WEB",
        device_id=req.device_id
    )

@router.get("/push-history")
def get_push_history():
    """Returns push notification delivery history log."""
    history = PushService.get_push_history()
    return {
        "count": len(history),
        "history": history
    }

# ============================================================
# PHASE 12 — Village Siren Gateway
# ============================================================

from services.siren_service import test_siren, activate_siren, get_siren_status

class SirenTestRequest(BaseModel):
    siren_id: str
    auth_token: Optional[str] = "AUTH-ADMIN-KEY-99"

class SirenActivateRequest(BaseModel):
    siren_id: str
    alert_id: str = "ALT-DEMO-01"
    severity: str = "EXTREME"
    duration_seconds: int = 60
    auth_token: Optional[str] = "AUTH-ADMIN-KEY-99"

@router.post("/siren/test")
def api_notification_siren_test(req: SirenTestRequest):
    res = test_siren(req.siren_id, req.auth_token or "AUTH-ADMIN-KEY-99")
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.post("/siren/activate")
def api_notification_siren_activate(req: SirenActivateRequest):
    res = activate_siren(req.siren_id, req.alert_id, req.severity, req.duration_seconds, req.auth_token or "AUTH-ADMIN-KEY-99")
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.get("/siren/status")
def api_notification_siren_status():
    return get_siren_status()


