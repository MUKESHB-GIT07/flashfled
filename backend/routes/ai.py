"""
AI Safety Guide Route Module (Phase 9)
Provides endpoints for AI Safety Guide conversational queries, map command execution,
voice output formatting, and interactive tutorial steps.
"""

from fastapi import APIRouter, Query, HTTPException, Body
from typing import Dict, Any, Optional
from pydantic import BaseModel
from services.ai_service import ai_safety_service

router = APIRouter(prefix="/api/ai", tags=["AI Safety Guide"])


class AIQueryRequest(BaseModel):
    query: str
    location_name: Optional[str] = "Chennai"
    latitude: Optional[float] = 13.0827
    longitude: Optional[float] = 80.2707
    language: Optional[str] = "en"


@router.post("/query")
def process_ai_query(request: AIQueryRequest):
    """
    Process natural language queries for weather, alerts, risk scores,
    map controls, shelters, and emergency rescue assistance.
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty")
    
    result = ai_safety_service.process_query(
        query=request.query,
        location_name=request.location_name or "Chennai",
        latitude=request.latitude or 13.0827,
        longitude=request.longitude or 80.2707,
        language=request.language or "en"
    )
    return result


@router.get("/tutorial")
def get_website_tutorial():
    """
    Returns step-by-step interactive walkthrough steps for the platform.
    """
    return {
        "title": "HOW TO USE THIS WEBSITE",
        "subtitle": "Global Multi-Disaster Early Warning & Life Safety Platform",
        "steps": [
            {
                "step": 1,
                "title": "Search Monitored Location",
                "description": "Use the top search bar to look up any city or region globally (e.g. Chennai, Kedarnath, Tokyo).",
                "action": "FOCUS_SEARCH"
            },
            {
                "step": 2,
                "title": "Inspect Live Telemetry & Weather",
                "description": "Check real-time precipitation, temperature, wind speed, and river gauge height.",
                "action": "NAVIGATE_WEATHER"
            },
            {
                "step": 3,
                "title": "Explore GIS Map & Hazard Layers",
                "description": "Toggle Rainfall, Flood Inundation, Earthquakes, Tsunamis, Volcanoes, and Wildfires on the interactive map.",
                "action": "NAVIGATE_MAP"
            },
            {
                "step": 4,
                "title": "AI Multi-Hazard Risk Prediction",
                "description": "Review the computed risk score (0-100), primary risk drivers, and confidence metrics.",
                "action": "NAVIGATE_PREDICTION"
            },
            {
                "step": 5,
                "title": "Projected Impact & Cascade Zones",
                "description": "View projected downstream affected regions, propagation time windows, and severity progression.",
                "action": "NAVIGATE_IMPACT"
            },
            {
                "step": 6,
                "title": "Set Up Emergency Alerts (SMS & Push)",
                "description": "Register phone numbers and mobile push devices (Web, Android FCM, iOS APNs) for instant geo-targeted warnings.",
                "action": "NAVIGATE_ALERTS"
            },
            {
                "step": 7,
                "title": "Find Safe Shelters & Evacuation Routes",
                "description": "Locate verified high-ground relief centers and safe routes avoiding active disaster zones.",
                "action": "SHOW_SHELTERS"
            },
            {
                "step": 8,
                "title": "Request Emergency Rescue",
                "description": "In critical situations, tap 'I NEED RESCUE' or speak to the AI Safety Guide to signal authorized responders.",
                "action": "TRIGGER_RESCUE"
            }
        ]
    }
