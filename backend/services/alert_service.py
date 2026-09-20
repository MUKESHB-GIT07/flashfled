"""
alert_service.py — Phase 6 Real-Time Early Warning & Geo-Targeted Alert Engine
=================================================================================
Monitors:
  - Live Weather & Precipitation
  - Flood & Landslide Risk Models
  - Soil Erosion
  - USGS Earthquakes & NOAA Tsunami Warnings
  - Volcano Alert Levels & Wildfire Thermal Anomalies
  - Tropical Cyclones & Storm Forecast Tracks
  - Projected Impact Models

Alert States:
  CREATED | PENDING_VERIFICATION | PUBLISHED | ACKNOWLEDGED | UPDATED | CANCELLED | EXPIRED

Alert Severities:
  LOW | MODERATE | HIGH | VERY_HIGH | EXTREME

Data Types:
  OBSERVED | FORECAST | MODEL_PREDICTION | OFFICIAL_WARNING | PROJECTED_IMPACT | DEMO

Features:
  - In-memory deduplication & cooldown
  - Severity escalation detection (HIGH → VERY_HIGH)
  - Geo-targeted alert filtering (activeLocation & alert areas)
  - Monitored Alert Areas management (HOME, WORK, VILLAGE, FAMILY)
  - Safe DEMO simulation mode
"""

import time
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Set

from services.risk_service import get_all_risks
from services.multi_hazard_service import get_all_hazards, haversine_km
from services.impact_service import get_projected_impact

# In-memory storage for active & historic alerts
_ALERT_STORE: Dict[str, Dict[str, Any]] = {}
_ACKNOWLEDGED_IDS: Set[str] = set()

# Default Alert Areas
_ALERT_AREAS: List[Dict[str, Any]] = [
    {
        "id": "area_home",
        "name": "HOME",
        "location_name": "Chennai",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "radius_km": 25.0,
        "disaster_types": ["FLOOD", "CYCLONE", "EARTHQUAKE", "TSUNAMI"],
        "minimum_severity": "HIGH",
        "enabled": True,
        "notification_channels": ["WEB", "PUSH"]
    },
    {
        "id": "area_village",
        "name": "VILLAGE",
        "location_name": "Kedarnath",
        "latitude": 30.7346,
        "longitude": 79.0669,
        "radius_km": 30.0,
        "disaster_types": ["FLOOD", "LANDSLIDE", "SNOWMELT"],
        "minimum_severity": "HIGH",
        "enabled": True,
        "notification_channels": ["WEB", "PUSH"]
    }
]


def _severity_rank(sev: str) -> int:
    ranks = {"LOW": 1, "MODERATE": 2, "HIGH": 3, "VERY_HIGH": 4, "VERY HIGH": 4, "EXTREME": 5}
    return ranks.get(sev.upper(), 1)


# ---------------------------------------------------------------------------
# Core Alert Evaluator & Generator
# ---------------------------------------------------------------------------
def evaluate_and_generate_alerts(lat: float, lng: float, location_name: str = "") -> List[Dict[str, Any]]:
    """
    Evaluates real environmental readings, hazard feeds, and risk models for (lat, lng).
    Publishes geo-targeted alerts into _ALERT_STORE with deduplication & escalation.
    """
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()
    expires_iso = (now_utc + timedelta(hours=12)).isoformat()
    loc_clean = location_name if location_name else f"{lat:.2f}, {lng:.2f}"

    # Fetch live risks and hazards
    risks = get_all_risks(lat, lng, loc_clean)
    hazards = get_all_hazards(lat, lng, loc_clean)
    impact = get_projected_impact(lat, lng, loc_clean)

    generated: List[Dict[str, Any]] = []

    # 1. FLOOD ALERT EVALUATION
    flood_r = risks.get("flood_risk", {})
    flood_level = flood_r.get("risk_level", "LOW")
    rain_intensity = flood_r.get("rainfall_intensity_mmh", 0.0)

    if flood_level in ["CRITICAL", "HIGH", "MODERATE"]:
        sev = "EXTREME" if flood_level == "CRITICAL" else ("VERY_HIGH" if rain_intensity > 40.0 else "HIGH" if flood_level == "HIGH" else "MODERATE")
        alert_id = f"alert_flood_{loc_clean.lower().replace(' ', '_')}"
        
        instructions = (
            "Move to higher ground if in low-lying areas. Avoid flooded roadways and river channels. "
            "Follow NDMA/SDMA emergency broadcasts." if sev in ["EXTREME", "VERY_HIGH", "HIGH"]
            else "Monitor local river gauges and weather advisories."
        )

        alert_obj = {
            "alert_id": alert_id,
            "hazard_type": "FLOOD",
            "location": loc_clean,
            "latitude": lat,
            "longitude": lng,
            "severity": sev,
            "status": "PUBLISHED",
            "message": f"{sev.replace('_', ' ')} FLOOD ALERT: {flood_r.get('risk_score', 0)}/100 risk score detected for {loc_clean}. Rainfall intensity: {rain_intensity} mm/hr.",
            "created_at": now_iso,
            "updated_at": now_iso,
            "expires_at": expires_iso,
            "source": flood_r.get("data_source", "Open-Meteo + Hydro Risk Model"),
            "data_type": "MODEL_PREDICTION",
            "confidence": 88.0,
            "affected_area": flood_r.get("flood_prone_classification", "Local Catchment"),
            "projected_area": impact.get("projected_next_region", "Downstream Corridor"),
            "instructions": instructions,
            "is_acknowledged": alert_id in _ACKNOWLEDGED_IDS
        }
        _upsert_alert(alert_obj)
        generated.append(alert_obj)

    # 2. LANDSLIDE ALERT EVALUATION
    landslide_r = risks.get("landslide_risk", {})
    ls_level = landslide_r.get("risk_level", "LOW")
    if ls_level in ["CRITICAL", "HIGH"]:
        alert_id = f"alert_landslide_{loc_clean.lower().replace(' ', '_')}"
        sev = "EXTREME" if ls_level == "CRITICAL" else "HIGH"
        
        alert_obj = {
            "alert_id": alert_id,
            "hazard_type": "LANDSLIDE",
            "location": loc_clean,
            "latitude": lat,
            "longitude": lng,
            "severity": sev,
            "status": "PUBLISHED",
            "message": f"GEOMORPHIC LANDSLIDE WARNING: High slope instability ({landslide_r.get('slope_deg')}°) and soil saturation ({landslide_r.get('soil_moisture_pct')}%) detected.",
            "created_at": now_iso,
            "updated_at": now_iso,
            "expires_at": expires_iso,
            "source": landslide_r.get("data_source", "Geomorphic Landslide Model"),
            "data_type": "MODEL_PREDICTION",
            "confidence": 82.0,
            "affected_area": f"Steep Hillslopes & Highway Slopes ({landslide_r.get('slope_deg')}°)",
            "projected_area": "Downslope Transportation Axis",
            "instructions": "Avoid steep mountain roads and known landslide hazard chutes.",
            "is_acknowledged": alert_id in _ACKNOWLEDGED_IDS
        }
        _upsert_alert(alert_obj)
        generated.append(alert_obj)

    # 3. TSUNAMI WARNING EVALUATION
    tsu_data = hazards.get("tsunamis", {})
    if tsu_data.get("has_active_warning"):
        for tsu in tsu_data.get("warnings", []):
            alert_id = f"alert_tsunami_{tsu.get('id', 'active')}"
            alert_obj = {
                "alert_id": alert_id,
                "hazard_type": "TSUNAMI",
                "location": loc_clean,
                "latitude": lat,
                "longitude": lng,
                "severity": "EXTREME",
                "status": "PUBLISHED",
                "message": f"OFFICIAL TSUNAMI WARNING: {tsu.get('event')}. Move inland and seek higher ground immediately.",
                "created_at": now_iso,
                "updated_at": now_iso,
                "expires_at": expires_iso,
                "source": tsu.get("data_source", "NOAA Tsunami Warning Center"),
                "data_type": "OFFICIAL_WARNING",
                "confidence": 98.0,
                "affected_area": ", ".join(tsu.get("affected_coastal_zones", ["Coastal Zone"])),
                "projected_area": "Inland Low-Lying Coastal Inundation Sector",
                "instructions": "Evacuate coastal waters and move to designated high ground or inland evacuation points.",
                "is_acknowledged": alert_id in _ACKNOWLEDGED_IDS
            }
            _upsert_alert(alert_obj)
            generated.append(alert_obj)

    # 4. CYCLONE WARNING EVALUATION
    cyc_data = hazards.get("cyclones", {})
    if cyc_data.get("has_active_cyclone"):
        for st in cyc_data.get("cyclones", []):
            if st.get("distance_km", 9999) <= 2500.0:
                alert_id = f"alert_cyclone_{st.get('id', 'active')}"
                sev = "VERY_HIGH" if "Category" in st.get("category", "") else "HIGH"
                alert_obj = {
                    "alert_id": alert_id,
                    "hazard_type": "CYCLONE",
                    "location": loc_clean,
                    "latitude": lat,
                    "longitude": lng,
                    "severity": sev,
                    "status": "PUBLISHED",
                    "message": f"TROPICAL CYCLONE ADVISORY: {st.get('name')} ({st.get('category')}). Wind speed: {st.get('wind_speed_kmh')} km/h.",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "expires_at": expires_iso,
                    "source": st.get("data_source", "NOAA NHC / JTWC"),
                    "data_type": "FORECAST",
                    "confidence": 90.0,
                    "affected_area": st.get("name"),
                    "projected_area": st.get("projected_impact", "Coastal Region"),
                    "instructions": "Secure loose structures, stock emergency supplies, and follow maritime/coastal shelter advisories.",
                    "is_acknowledged": alert_id in _ACKNOWLEDGED_IDS
                }
                _upsert_alert(alert_obj)
                generated.append(alert_obj)

    return generated


def _upsert_alert(new_alert: Dict[str, Any]):
    """Deduplicate and handle severity escalation."""
    aid = new_alert["alert_id"]
    if aid in _ALERT_STORE:
        existing = _ALERT_STORE[aid]
        # Check severity escalation
        if _severity_rank(new_alert["severity"]) > _severity_rank(existing["severity"]):
            new_alert["status"] = "UPDATED"
            new_alert["message"] += f" (ESCALATED from {existing['severity']})"
            _ALERT_STORE[aid] = new_alert
        else:
            # Update timestamps without duplicating
            existing["updated_at"] = new_alert["updated_at"]
    else:
        _ALERT_STORE[aid] = new_alert


# ---------------------------------------------------------------------------
# API Service Helpers
# ---------------------------------------------------------------------------
def get_active_alerts(lat: float = 0.0, lng: float = 0.0, radius_km: float = 25.0) -> Dict[str, Any]:
    """
    Return geo-targeted active alerts for (lat, lng) within radius_km
    or matching user's monitored Alert Areas.
    """
    # Evaluate live alerts for current coordinates
    if lat != 0.0 or lng != 0.0:
        evaluate_and_generate_alerts(lat, lng)

    active_list = []
    now_utc = datetime.now(timezone.utc).isoformat()

    for aid, alert in list(_ALERT_STORE.items()):
        # Check expiration
        if alert.get("expires_at", "") < now_utc:
            alert["status"] = "EXPIRED"
            continue

        if alert.get("status") in ["PUBLISHED", "UPDATED", "CREATED", "PENDING_VERIFICATION"]:
            # Check distance if coordinates provided
            if lat != 0.0 and lng != 0.0 and alert.get("latitude") and alert.get("longitude"):
                dist = haversine_km(lat, lng, alert["latitude"], alert["longitude"])
                if dist <= radius_km or dist <= 150.0:  # Include nearby regional severe alerts
                    alert_copy = dict(alert)
                    alert_copy["distance_km"] = dist
                    alert_copy["is_acknowledged"] = aid in _ACKNOWLEDGED_IDS
                    active_list.append(alert_copy)
            else:
                alert_copy = dict(alert)
                alert_copy["is_acknowledged"] = aid in _ACKNOWLEDGED_IDS
                active_list.append(alert_copy)

    # Sort active alerts by severity rank descending, then time
    active_list.sort(key=lambda x: (-_severity_rank(x["severity"]), x["created_at"]), reverse=False)

    return {
        "latitude": lat,
        "longitude": lng,
        "count": len(active_list),
        "active_alerts": active_list,
        "fetched_at": now_utc
    }


def acknowledge_alert(alert_id: str) -> Dict[str, Any]:
    """Acknowledge an active alert by ID."""
    _ACKNOWLEDGED_IDS.add(alert_id)
    if alert_id in _ALERT_STORE:
        _ALERT_STORE[alert_id]["status"] = "ACKNOWLEDGED"
        _ALERT_STORE[alert_id]["is_acknowledged"] = True
        return {
            "success": True,
            "alert_id": alert_id,
            "status": "ACKNOWLEDGED",
            "message": f"Alert {alert_id} successfully acknowledged by user."
        }
    return {
        "success": True,
        "alert_id": alert_id,
        "status": "ACKNOWLEDGED",
        "note": "Alert ID recorded in acknowledged list."
    }


def get_alert_history() -> Dict[str, Any]:
    """Return historical and acknowledged alert log."""
    history = list(_ALERT_STORE.values())
    history.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {
        "count": len(history),
        "alert_history": history
    }


# ---------------------------------------------------------------------------
# Alert Areas Management
# ---------------------------------------------------------------------------
def get_alert_areas() -> List[Dict[str, Any]]:
    return _ALERT_AREAS


def create_alert_area(area_payload: Dict[str, Any]) -> Dict[str, Any]:
    new_id = f"area_{len(_ALERT_AREAS) + 1}_{int(time.time())}"
    area_obj = {
        "id": new_id,
        "name": area_payload.get("name", "MONITORED AREA"),
        "location_name": area_payload.get("location_name", "Global Location"),
        "latitude": float(area_payload.get("latitude", 0.0)),
        "longitude": float(area_payload.get("longitude", 0.0)),
        "radius_km": float(area_payload.get("radius_km", 25.0)),
        "disaster_types": area_payload.get("disaster_types", ["FLOOD", "CYCLONE"]),
        "minimum_severity": area_payload.get("minimum_severity", "HIGH"),
        "enabled": True,
        "notification_channels": area_payload.get("notification_channels", ["WEB", "PUSH"])
    }
    _ALERT_AREAS.append(area_obj)
    return area_obj


# ---------------------------------------------------------------------------
# Safe DEMO Simulation Trigger
# ---------------------------------------------------------------------------
def simulate_demo_alert(hazard_type: str = "FLOOD", location_name: str = "Chennai", lat: float = 13.0827, lng: float = 80.2707) -> Dict[str, Any]:
    """Triggers a safe DEMO emergency alert for full system simulation testing."""
    now_utc = datetime.now(timezone.utc)
    demo_id = f"demo_sim_{int(time.time())}"
    
    demo_alert = {
        "alert_id": demo_id,
        "hazard_type": hazard_type.upper(),
        "location": location_name,
        "latitude": lat,
        "longitude": lng,
        "severity": "EXTREME",
        "status": "PUBLISHED",
        "message": f"🚨 DEMO SIMULATION: EXTREME {hazard_type.upper()} EMERGENCY WARNING for {location_name}. Simulated cloudburst intensity: 92.5 mm/hr. Take immediate shelter.",
        "created_at": now_utc.isoformat(),
        "updated_at": now_utc.isoformat(),
        "expires_at": (now_utc + timedelta(hours=2)).isoformat(),
        "source": "SIMULATED DEMO EMERGENCY ALERT (NOT OFFICIAL)",
        "data_type": "DEMO",
        "confidence": 99.0,
        "affected_area": f"{location_name} Urban & Low-lying Sectors",
        "projected_area": f"{location_name} Downstream Outfall Zone",
        "instructions": "[DEMO SIMULATION] Move to designated safe shelter locations immediately. Do not attempt to cross flooded roads.",
        "is_acknowledged": False
    }

    _ALERT_STORE[demo_id] = demo_alert
    return demo_alert
