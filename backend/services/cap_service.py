from datetime import datetime, timezone
import uuid

_CAP_STORE = {}

def generate_cap_xml(alert_id, sender, event, category, urgency, severity, certainty, headline, description, instruction, area_desc, lat, lng, radius_km, effective, expires, status, msg_type, scope, language, projected_region):
    cap_id = alert_id if alert_id and alert_id != "UNKNOWN" else f"CAP-{uuid.uuid4().hex[:8]}"
    sent = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S%z")
    
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>{cap_id}</identifier>
  <sender>{sender}</sender>
  <sent>{sent}</sent>
  <status>{status}</status>
  <msgType>{msg_type}</msgType>
  <scope>{scope}</scope>
  <info>
    <language>{language}</language>
    <category>{category}</category>
    <event>{event}</event>
    <urgency>{urgency}</urgency>
    <severity>{severity}</severity>
    <certainty>{certainty}</certainty>
    <effective>{effective}</effective>
    <expires>{expires}</expires>
    <senderName>{sender}</senderName>
    <headline>{headline}</headline>
    <description>{description}</description>
    <instruction>{instruction}</instruction>
    <area>
      <areaDesc>{area_desc}</areaDesc>
      <circle>{lat},{lng} {radius_km}</circle>
    </area>
  </info>
</alert>"""
    
    alert_record = {
        "alert_id": alert_id,
        "cap_id": cap_id,
        "xml": xml,
        "generated_at": sent,
        "metadata": {
            "headline": headline,
            "severity": severity,
            "status": status,
            "projected_region": projected_region
        }
    }
    _CAP_STORE[alert_id] = alert_record
    _CAP_STORE[cap_id] = alert_record
    return xml

def validate_cap(cap_xml):
    errors = []
    warnings = []
    if not cap_xml or "<alert" not in cap_xml:
        errors.append("Missing <alert> root element")
    if "<identifier>" not in cap_xml or ("<identifier></identifier>" in cap_xml):
        errors.append("Missing required field: identifier")
    if "urn:oasis:names:tc:emergency:cap:1.2" not in cap_xml:
        warnings.append("Incorrect or missing CAP namespace")
    
    is_valid = len(errors) == 0
    return {
        "valid": is_valid,
        "status": "CAP VALID" if is_valid else "CAP INVALID",
        "errors": errors,
        "warnings": warnings
    }

def get_cap_feed():
    return list(_CAP_STORE.values())

def get_cap_alert(alert_id):
    for cap in _CAP_STORE.values():
        if cap["alert_id"] == alert_id or cap["cap_id"] == alert_id:
            return cap
    return None

def generate_cap_from_alert(alert_data):
    return generate_cap_xml(
        alert_id=alert_data.get("alert_id", "UNKNOWN"),
        sender="System",
        event=alert_data.get("event", "Flash Flood"),
        category="Met",
        urgency="Immediate",
        severity=alert_data.get("severity", "Severe"),
        certainty="Observed",
        headline=alert_data.get("headline", "Flash Flood Warning"),
        description=alert_data.get("description", "Flash flood observed."),
        instruction=alert_data.get("instruction", "Move to higher ground."),
        area_desc=alert_data.get("area_desc", "Local Area"),
        lat=alert_data.get("lat", 0.0),
        lng=alert_data.get("lng", 0.0),
        radius_km=alert_data.get("radius_km", 10),
        effective=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S%z"),
        expires=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S%z"),
        status=alert_data.get("status", "Actual"),
        msg_type="Alert",
        scope="Public",
        language="en-US",
        projected_region=alert_data.get("projected_region", False)
    )
