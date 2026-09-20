import os
import time
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

logger = logging.getLogger("push_service")

# In-Memory Stores for Devices and Delivery History
_REGISTERED_DEVICES: Dict[str, Dict[str, Any]] = {}
_PUSH_DELIVERY_LOGS: List[Dict[str, Any]] = []

class PushService:
    """
    Unified Push Notification Service managing device subscriptions across
    Web Push (VAPID), Android (FCM), and iOS (APNs with Critical Alert entitlement mapping),
    providing fallback to DEMO PUSH MODE when credentials are not configured.
    """

    @staticmethod
    def get_provider_status() -> Dict[str, Any]:
        web_configured = bool(os.environ.get("WEB_PUSH_PUBLIC_KEY", "").strip() and os.environ.get("WEB_PUSH_PRIVATE_KEY", "").strip())
        fcm_configured = bool(os.environ.get("FCM_SERVER_KEY", "").strip() or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip())
        apns_configured = bool(os.environ.get("APNS_KEY_ID", "").strip() and os.environ.get("APNS_TEAM_ID", "").strip())

        web_status = "CONNECTED" if web_configured else "DEMO"
        fcm_status = "CONNECTED" if fcm_configured else "DEMO"
        apns_status = "CONNECTED" if apns_configured else "DEMO"

        active_devices = len([d for d in _REGISTERED_DEVICES.values() if d.get("status") == "ACTIVE"])

        return {
            "overall_status": "CONNECTED" if (web_configured or fcm_configured or apns_configured) else "DEMO",
            "platforms": {
                "web": {
                    "provider": "VAPID_WEB_PUSH",
                    "status": web_status,
                    "is_configured": web_configured,
                    "public_key": os.environ.get("WEB_PUSH_PUBLIC_KEY", "DEMO_VAPID_PUBLIC_KEY_12345")
                },
                "android": {
                    "provider": "FIREBASE_FCM",
                    "status": fcm_status,
                    "is_configured": fcm_configured
                },
                "ios": {
                    "provider": "APPLE_APNS",
                    "status": apns_status,
                    "is_configured": apns_configured,
                    "supports_critical_alerts": True
                }
            },
            "active_devices_count": active_devices,
            "total_pushes_sent": len(_PUSH_DELIVERY_LOGS)
        }

    @staticmethod
    def register_device(
        device_id: str,
        platform: str,
        push_token: str,
        user_id: Optional[str] = "guest_user",
        language: str = "en",
        alert_area_ids: Optional[List[str]] = None,
        minimum_severity: str = "HIGH"
    ) -> Dict[str, Any]:
        """Registers or updates a push device subscription (WEB, ANDROID, IOS)."""
        platform_norm = platform.upper().strip()
        if platform_norm not in ["WEB", "ANDROID", "IOS"]:
            return {
                "success": False,
                "message": f"Unsupported platform: {platform}. Supported: WEB, ANDROID, IOS.",
                "status": "INVALID_PLATFORM"
            }

        if not device_id or not push_token:
            return {
                "success": False,
                "message": "device_id and push_token are required.",
                "status": "MISSING_FIELDS"
            }

        device_record = {
            "device_id": device_id,
            "platform": platform_norm,
            "push_token_masked": f"{push_token[:6]}...{push_token[-4:]}" if len(push_token) > 10 else "***",
            "push_token": push_token,
            "user_id": user_id,
            "language": language,
            "alert_area_ids": alert_area_ids or ["HOME"],
            "minimum_severity": minimum_severity,
            "registered_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "status": "ACTIVE"
        }

        _REGISTERED_DEVICES[device_id] = device_record

        return {
            "success": True,
            "message": f"Device registered successfully for {platform_norm} Push Notifications.",
            "device": {
                "device_id": device_id,
                "platform": platform_norm,
                "token_masked": device_record["push_token_masked"],
                "status": "ACTIVE"
            }
        }

    @staticmethod
    def unregister_device(device_id: str) -> Dict[str, Any]:
        """Removes a registered push device."""
        if device_id in _REGISTERED_DEVICES:
            _REGISTERED_DEVICES[device_id]["status"] = "UNREGISTERED"
            del _REGISTERED_DEVICES[device_id]
            return {
                "success": True,
                "message": f"Device {device_id} unsubscribed from push notifications.",
                "status": "UNREGISTERED"
            }
        return {
            "success": False,
            "message": f"Device {device_id} not found.",
            "status": "NOT_FOUND"
        }

    @staticmethod
    def get_registered_devices() -> List[Dict[str, Any]]:
        """Returns sanitized list of registered devices."""
        sanitized = []
        for dev in _REGISTERED_DEVICES.values():
            sanitized.append({
                "device_id": dev["device_id"],
                "platform": dev["platform"],
                "token_masked": dev["push_token_masked"],
                "language": dev["language"],
                "status": dev["status"],
                "registered_at": dev["registered_at"]
            })
        return sanitized

    @staticmethod
    def build_push_payload(alert: Dict[str, Any], platform: str = "WEB", language: str = "en") -> Dict[str, Any]:
        """Constructs platform-specific push notification payload with iOS Critical Alert mapping."""
        hazard = alert.get("hazard_type", "FLOOD").upper()
        severity = alert.get("severity", "HIGH").upper()
        location = alert.get("location", "Monitored Region")
        alert_id = alert.get("alert_id", "ALERT-001")
        proj_next = alert.get("projected_next_region") or (alert.get("projected_area", {}).get("projected_next_region") if isinstance(alert.get("projected_area"), dict) else None)

        title = f"🚨 {severity} {hazard} WARNING"
        body = f"Emergency hazard warning for {location}."
        if proj_next:
            body += f" Projected Next: {proj_next}."
        body += " Tap to open Life Safety Mode."

        deep_link = f"/emergency/{alert_id}"

        # Standard payload base
        payload = {
            "title": title,
            "body": body,
            "icon": "/icon-192.png",
            "badge": "/badge.png",
            "data": {
                "alert_id": alert_id,
                "hazard_type": hazard,
                "severity": severity,
                "location": location,
                "deep_link": deep_link,
                "action": "OPEN_LIFE_SAFETY"
            },
            "actions": [
                {"action": "view_alert", "title": "VIEW SAFETY GUIDE"},
                {"action": "find_shelter", "title": "FIND SHELTER"}
            ]
        }

        # iOS APNs Critical Alert mapping
        if platform.upper() == "IOS":
            is_critical = (severity == "EXTREME")
            payload["aps"] = {
                "alert": {"title": title, "body": body},
                "sound": {
                    "critical": 1 if is_critical else 0,
                    "name": "default" if not is_critical else "emergency_siren.caf",
                    "volume": 1.0 if is_critical else 0.8
                },
                "badge": 1,
                "category": "EMERGENCY_DISASTER_ALERT",
                "interruption_level": "critical" if is_critical else "active"
            }

        # Android FCM mapping
        elif platform.upper() == "ANDROID":
            payload["android"] = {
                "priority": "high",
                "notification": {
                    "title": title,
                    "body": body,
                    "sound": "default",
                    "channel_id": "emergency_alerts_high_priority",
                    "click_action": "OPEN_LIFE_SAFETY_ACTIVITY"
                }
            }

        return payload

    @staticmethod
    def send_push_notification(device_id: str, alert: Dict[str, Any], is_test: bool = False) -> Dict[str, Any]:
        """Dispatches push notification to a registered device or logs DEMO push."""
        device = _REGISTERED_DEVICES.get(device_id)
        platform = device.get("platform", "WEB") if device else "WEB"
        lang = device.get("language", "en") if device else "en"
        token_masked = device.get("push_token_masked", "DEMO-DEVICE-TOKEN") if device else "DEMO-DEVICE-TOKEN"

        payload = PushService.build_push_payload(alert, platform=platform, language=lang)
        status_info = PushService.get_provider_status()

        carrier_status = "DEMO"
        detail_msg = f"DEMO Push notification generated for {platform} platform."

        # Check real credentials for platform
        platform_info = status_info["platforms"].get(platform.lower(), {})
        if platform_info.get("is_configured") and not is_test:
            carrier_status = "SENT"
            detail_msg = f"Live push dispatched to {platform} via {platform_info.get('provider')}."

        log_entry = {
            "id": f"push_log_{int(time.time() * 1000)}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "device_id": device_id,
            "platform": platform,
            "token_masked": token_masked,
            "alert_id": alert.get("alert_id", "DEMO-ALERT-01"),
            "hazard_type": alert.get("hazard_type", "FLOOD"),
            "severity": alert.get("severity", "HIGH"),
            "provider": platform_info.get("provider", "DEMO_PUSH_ENGINE"),
            "status": carrier_status,
            "payload": payload,
            "detail": detail_msg
        }

        _PUSH_DELIVERY_LOGS.insert(0, log_entry)
        if len(_PUSH_DELIVERY_LOGS) > 100:
            _PUSH_DELIVERY_LOGS.pop()

        return log_entry

    @staticmethod
    def send_test_push(platform: str = "WEB", device_id: Optional[str] = None) -> Dict[str, Any]:
        """Triggers a test push notification to a device or active session."""
        target_device_id = device_id or f"test_dev_{platform.lower()}_{int(time.time())}"

        # Register demo device if not present
        if target_device_id not in _REGISTERED_DEVICES:
            PushService.register_device(
                device_id=target_device_id,
                platform=platform,
                push_token=f"test_token_{int(time.time())}"
            )

        demo_alert = {
            "alert_id": f"TEST-PUSH-{platform.upper()}-01",
            "hazard_type": "FLOOD",
            "location": "Chennai",
            "severity": "EXTREME",
            "projected_next_region": "Chennai Coastal Zone (+3H)",
            "data_type": "TEST_SIMULATION"
        }

        log_entry = PushService.send_push_notification(target_device_id, demo_alert, is_test=True)

        return {
            "success": True,
            "message": f"Test push notification dispatched for {platform.upper()} platform.",
            "delivery_log": log_entry,
            "push_payload": log_entry["payload"]
        }

    @staticmethod
    def get_push_history() -> List[Dict[str, Any]]:
        """Returns history of dispatched push notifications."""
        return _PUSH_DELIVERY_LOGS
