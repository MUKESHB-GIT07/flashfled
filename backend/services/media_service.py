from datetime import datetime, timezone

_MEDIA_STORE = []

def generate_media_bulletin(alert_data):
    projected = alert_data.get("projected_area", "")
    bulletin_text = "A flash flood warning has been issued..."
    if projected:
        bulletin_text += f" PROJECTED IMPACT — NOT CONFIRMED for {projected}."
    
    bulletin = {
        "headline": alert_data.get("headline", "Flash Flood Warning"),
        "disaster": alert_data.get("disaster", "Flash Flood"),
        "location": alert_data.get("location", "Unknown Location"),
        "severity": alert_data.get("severity", "Extreme"),
        "time": datetime.now(timezone.utc).isoformat(),
        "affected_area": alert_data.get("affected_area", ""),
        "projected_area": projected,
        "current_conditions": alert_data.get("conditions", ""),
        "instructions": alert_data.get("instructions", "Evacuate immediately."),
        "source": "Flash Flood Prediction System",
        "alert_id": alert_data.get("alert_id", "A-000"),
        "expiration": alert_data.get("expiration", ""),
        "bulletin_text": bulletin_text
    }
    _MEDIA_STORE.append(bulletin)
    return bulletin

def generate_social_media_text(alert_data):
    return f"🚨 {alert_data.get('headline', 'Alert')} 🚨\n{alert_data.get('description', '')}\nFollow instructions from authorities. #Emergency #FlashFlood"

def generate_news_bulletin(alert_data):
    return f"BREAKING NEWS: {alert_data.get('headline', 'Alert')}. {alert_data.get('description', '')} Authorities urge caution."

def get_media_distribution_status():
    return {
        "TV": "Operational",
        "Radio": "Operational",
        "News Website": "Operational",
        "Government Channel": "Operational",
        "Social Channel": "Operational",
        "CAP": "Operational"
    }

def get_media_history():
    return {"history": _MEDIA_STORE}
