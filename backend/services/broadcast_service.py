from datetime import datetime, timezone

_BROADCAST_LOG = []

def get_broadcast_status():
    return {
        "channels": {
            "radio": "CONNECTED",
            "tv": "NOT CONFIGURED",
            "cap": "CONNECTED",
            "siren": "DEMO",
            "sms": "CONNECTED",
            "push": "CONNECTED",
            "web": "CONNECTED"
        }
    }

def generate_radio_script(alert_data):
    headline = alert_data.get("headline", f"Emergency {alert_data.get('event', 'Alert').lower()} warning for {alert_data.get('location', 'your area')}")
    desc = alert_data.get("description", f"Severity is {alert_data.get('severity', 'UNKNOWN')}. Please stay safe.")
    instruction = alert_data.get("instruction") or alert_data.get("instructions", "Listen to authorities.")
    projected = "PROJECTED IMPACT — NOT CONFIRMED" if alert_data.get("projected", False) else ""
    return f"BEEP BEEP BEEP. {headline}. {desc} {instruction}. {projected}".strip()

def generate_tv_bulletin(alert_data):
    return {
        "headline": alert_data.get("headline", "Emergency Alert"),
        "body": alert_data.get("description", ""),
        "crawl": f"ALERT: {alert_data.get('headline', 'Emergency')}... Move to safety...",
        "graphic_text": "EMERGENCY WARNING"
    }

def initiate_broadcast(alert_id, channels):
    status = {}
    for ch in channels:
        status[ch] = "DELIVERED"
    
    log_entry = {
        "alert_id": alert_id,
        "action": "INITIATE",
        "channels": status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    _BROADCAST_LOG.append(log_entry)
    return status

def cancel_broadcast(alert_id):
    log_entry = {
        "alert_id": alert_id,
        "action": "CANCEL",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    _BROADCAST_LOG.append(log_entry)
    return {"status": "CANCELLED"}

def get_broadcast_audit_log():
    return _BROADCAST_LOG
