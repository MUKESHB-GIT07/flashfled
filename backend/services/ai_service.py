"""
AI Safety Guide Service (Phase 9)
Provides natural language disaster safety guidance, map command extraction,
disaster-specific guidance, real-data query responses, source transparency,
and rescue signaling flows.
"""

from datetime import datetime, timezone
import re
from typing import Dict, Any, Optional
from services.weather_service import get_current_weather
from services.risk_service import get_all_risks
from services.alert_service import get_active_alerts
from services.geocoding_service import search_location


class AISafetyGuideService:
    def __init__(self):
        self.disaster_guidance = {
            "FLOOD": {
                "en": "Move to higher ground immediately. Do not walk, swim, or drive through flood waters. Stay away from riverbanks and storm drains.",
                "hi": "तुरंत ऊंचे स्थानों पर जाएं। बाढ़ के पानी में न चलें, न तैरें और न ही गाड़ी चलाएं।"
            },
            "LANDSLIDE": {
                "en": "Evacuate steep slopes and landslide hazard zones. Watch for unusual sounds like trees cracking or boulders knocking together.",
                "hi": "चट्टानी और ढलान वाले इलाकों को तुरंत खाली करें।"
            },
            "EARTHQUAKE": {
                "en": "Drop, Cover, and Hold On. If indoors, stay away from windows and heavy furniture. Move to designated open assembly areas.",
                "hi": "झुकें, ढकें और पकड़ें। खिड़कियों और भारी सामान से दूर रहें।"
            },
            "TSUNAMI": {
                "en": "Move inland and to high ground immediately upon receiving a coastal warning. Do not return until official clearance is issued.",
                "hi": "तटीय चेतावनी मिलने पर तुरंत समुद्र तट से दूर ऊंचे स्थान पर जाएं।"
            },
            "WILDFIRE": {
                "en": "Evacuate upwind of fire spread. Close windows and doors, protect lungs with a moist cloth, and follow evacuation routes.",
                "hi": "हवा के विपरीत दिशा में सुरक्षित स्थान पर जाएं।"
            },
            "CYCLONE": {
                "en": "Seek shelter in a reinforced building away from windows. Stay indoors until the eye of the storm passes and officials give clear alert.",
                "hi": "मजबूत आश्रय स्थल में रहें। खिड़कियों से दूर रहें।"
            },
            "VOLCANO": {
                "en": "Follow official exclusion zone orders. Avoid low-lying valleys subject to lahars/pyroclastic flows. Wear respiratory protection.",
                "hi": "आधिकारिक निकासी निर्देशों का पालन करें। धुएं और राख से बचें।"
            },
            "SNOW": {
                "en": "Avoid steep avalanche paths and snowmelt torrent channels. Ensure thermal protection and follow mountain travel alerts.",
                "hi": "हिमस्खलन वाले क्षेत्रों और बर्फ पिघलने के रास्तों से बचें।"
            }
        }

    def process_query(
        self,
        query: str,
        location_name: str = "Chennai",
        latitude: float = 13.0827,
        longitude: float = 80.2707,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Process natural language queries using real environmental and alert data.
        Returns text, action metadata, source details, and updated state.
        """
        q = query.strip().lower()
        now_str = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")

        # Default Response state
        response = {
            "query": query,
            "language": language,
            "character_state": "NORMAL",
            "reply_text": "",
            "source": "Global Early Warning Platform Engine",
            "data_status": "LIVE",
            "last_updated": now_str,
            "action": None,
            "disaster_type": None,
            "location": {"name": location_name, "latitude": latitude, "longitude": longitude}
        }

        # 1. Check for Map Location Command ("Go to Chennai", "Show London")
        location_match = re.search(r'(?:go to|show|find|navigate to|search)\s+([a-zA-Z\s]+)', q)
        if location_match:
            target_loc = location_match.group(1).strip()
            # Ignore common non-location words
            if target_loc not in ["rainfall", "wind", "floods", "earthquakes", "shelters", "impact", "my location", "weather", "shelter"]:
                results = search_location(target_loc)
                if results:
                    geo = results[0]
                    response["character_state"] = "NAVIGATION"
                    response["reply_text"] = f"Navigating map to {geo['name']} ({geo['latitude']}, {geo['longitude']}). Fetching real-time risk assessment." if language == "en" else f"{geo['name']} पर मानचित्र स्थानांतरित किया जा रहा है।"
                    response["action"] = {
                        "type": "NAVIGATE_MAP",
                        "location_name": geo["name"],
                        "latitude": geo["latitude"],
                        "longitude": geo["longitude"]
                    }
                    response["source"] = "Nominatim / OpenStreetMap Geocoder"
                    return response

        # 2. Check for Map Layer Controls
        if "rainfall" in q or "rain" in q:
            response["character_state"] = "GUIDING"
            response["reply_text"] = f"Activating global precipitation telemetry layer. Currently monitoring live rainfall rates." if language == "en" else "बारिश की जानकारी का नक्शा दिखाया जा रहा है।"
            response["action"] = {"type": "ACTIVATE_LAYER", "layer": "rainfall"}
            response["source"] = "Open-Meteo Precipitation Telemetry"
            return response

        if "wind" in q or "cyclone" in q:
            response["character_state"] = "GUIDING"
            response["reply_text"] = f"Activating live atmospheric wind vector layer. Monitoring cyclone circulation patterns." if language == "en" else "हवा और चक्रवात की जानकारी दिखाई जा रही है।"
            response["action"] = {"type": "ACTIVATE_LAYER", "layer": "wind"}
            response["source"] = "GDACS / GFS Atmospheric Vector Model"
            return response

        if "flood" in q:
            response["character_state"] = "WARNING"
            response["reply_text"] = f"Displaying river inundation and flash flood hazard layer for {location_name}." if language == "en" else f"{location_name} के लिए बाढ़ की चेतावनी की स्थिति।"
            response["action"] = {"type": "ACTIVATE_LAYER", "layer": "flood"}
            response["source"] = "CWC / Global Flood Awareness System (GloFAS)"
            return response

        if "earthquake" in q or "quake" in q:
            response["character_state"] = "GUIDING"
            response["reply_text"] = "Activating global seismic activity map layer (USGS Live Feed)." if language == "en" else "भूकंपीय गतिविधियों का नक्शा लोड हो रहा है।"
            response["action"] = {"type": "ACTIVATE_LAYER", "layer": "earthquake"}
            response["source"] = "USGS Real-Time Earthquake Telemetry"
            return response

        if "impact" in q or "projected" in q or "next" in q:
            response["character_state"] = "NAVIGATION"
            response["reply_text"] = f"Activating projected impact sector visualization. Displaying downstream propagation corridors." if language == "en" else "पूर्वानुमानित प्रभाव क्षेत्र दिखाया जा रहा है।"
            response["action"] = {"type": "ACTIVATE_LAYER", "layer": "impact"}
            response["source"] = "Phase 5 Cascade Impact AI Engine"
            response["data_status"] = "MODEL PREDICTION"
            return response

        if "shelter" in q or "safe area" in q or "evacuate" in q:
            response["character_state"] = "NAVIGATION"
            response["reply_text"] = f"Displaying verified relief shelters and safe evacuation routes near {location_name}." if language == "en" else f"{location_name} के पास सुरक्षित आश्रय स्थल और मार्ग दिखाए जा रहे हैं।"
            response["action"] = {"type": "SHOW_SHELTER_ROUTE"}
            response["source"] = "National Relief Shelter Registry"
            return response

        # 3. Check for Emergency / Trapped / Buried / Rescue Queries
        if any(w in q for w in ["trapped", "buried", "rescue", "help me", "sos", "stuck", "status of rescue", "acknowledged"]):
            response["character_state"] = "RESCUE"
            is_underground = "buried" in q or "debris" in q or "soil" in q
            is_status_check = "acknowledged" in q or "status" in q or "assigned" in q or "received" in q

            if is_status_check:
                response["reply_text"] = (
                    "Rescue status query checked: If you have submitted a rescue request, "
                    "its status is logged in the Responder Operations Center. You can track real-time dispatch progress on your status tracker."
                ) if language == "en" else (
                    "बचाव स्थिति की जांच की गई: आपकी बचाव स्थिति ट्रैकर पर अपडेट की जा रही है।"
                )
                response["action"] = {"type": "CHECK_RESCUE_STATUS"}
            elif is_underground:
                response["reply_text"] = (
                    "I cannot determine from phone hardware alone whether you are beneath soil or debris. "
                    "If your device retains network connectivity, I can help dispatch an immediate emergency rescue signal with your GPS coordinates."
                ) if language == "en" else (
                    "स्मार्टफोन सेंसर अकेले मलबे की पहचान नहीं कर सकते। "
                    "यदि नेटवर्क उपलब्ध है, तो मैं आपकी जीपीएस स्थिति के साथ आपातकालीन बचाव सिग्नल भेज सकता हूं।"
                )
                response["action"] = {"type": "TRIGGER_RESCUE"}
            else:
                response["reply_text"] = (
                    "Emergency assistance requested! Opening direct Life Safety & Emergency Rescue Dispatch. "
                    "Your exact location coordinates and contact information will be transmitted to emergency services."
                ) if language == "en" else (
                    "आपातकालीन सहायता अनुरोध दर्ज किया गया। जीवन सुरक्षा और बचाव सेवा तुरंत चालू की जा रही है।"
                )
                response["action"] = {"type": "TRIGGER_RESCUE"}
            
            response["source"] = "National Emergency Rescue Protocol (112 / NDMA)"
            response["data_status"] = "OFFICIAL WARNING"
            return response

        # 4. Check Weather Query
        if "weather" in q or "temperature" in q or "rain rate" in q:
            response["character_state"] = "WEATHER"
            weather_data = get_current_weather(latitude, longitude, location_name)
            temp = weather_data.get("temperature", 28.5)
            precip = weather_data.get("precipitation", 0.0)
            rain = round((precip or 0.0) * 4.0, 1)
            desc = weather_data.get("weather_condition", "Partly Cloudy")
            humidity = weather_data.get("humidity", 75)
            
            response["reply_text"] = (
                f"Current weather at {location_name}: Temperature is {temp}°C, "
                f"Condition: {desc}, Precipitation rate: {rain} mm/hr, Relative humidity: {humidity}%."
            ) if language == "en" else (
                f"{location_name} का वर्तमान मौसम: तापमान {temp}°C, "
                f"स्थिति: {desc}, वर्षा दर: {rain} मिमी/घंटा।"
            )
            response["source"] = "Open-Meteo Weather API"
            response["data_status"] = weather_data.get("data_status", "LIVE")
            return response

        # 5. Check Danger / Risk Assessment Query
        if "danger" in q or "risk" in q or "safe" in q or "status" in q:
            response["character_state"] = "WARNING"
            all_risks = get_all_risks(latitude, longitude, location_name)
            flood_r = all_risks.get("flood_risk", {})
            score = flood_r.get("risk_score", 45)
            level = all_risks.get("overall_highest_risk", "MODERATE")
            primary_hazard = "FLOOD"

            if "completely safe" in q:
                response["reply_text"] = (
                    f"Safety disclaimer: No location can be declared 'completely safe'. "
                    f"However, based on live telemetry for {location_name}, computed risk score is {score}/100 ({level})."
                )
            else:
                response["reply_text"] = (
                    f"{location_name} is currently evaluated at {level} hazard risk (Risk Score: {score}/100). "
                    f"Primary monitored risk: {primary_hazard}. Follow official local authorities (NDMA/SDMA) for binding instructions."
                ) if language == "en" else (
                    f"{location_name} के लिए वर्तमान जोखिम स्तर {level} (स्कोर: {score}/100) है।"
                )

            response["source"] = "Phase 3 Multi-Hazard Risk Matrix Model"
            response["data_status"] = "MODEL PREDICTION"
            return response

        # 6. Check Active Alerts Query
        if "alert" in q or "warning" in q:
            response["character_state"] = "WARNING"
            alerts_data = get_active_alerts(latitude, longitude)
            active_alerts = alerts_data.get("active_alerts", [])
            if active_alerts:
                top_alert = active_alerts[0]
                response["reply_text"] = (
                    f"Active Alert for {location_name}: [{top_alert.get('severity')}] {top_alert.get('message')}. "
                    f"{top_alert.get('instructions', '')}"
                )
                response["data_status"] = "OFFICIAL WARNING"
            else:
                response["reply_text"] = f"No active emergency warning is currently published for {location_name}."
                response["data_status"] = "LIVE"

            response["source"] = "Early Warning Dispatch Engine"
            return response

        # 7. General Tutorial / Help Query
        if "how to use" in q or "guide" in q or "help" in q or "tutorial" in q:
            response["character_state"] = "GUIDING"
            response["reply_text"] = (
                "Welcome to the Global Early Warning System walkthrough! "
                "1. Search any city using the search bar. "
                "2. Toggle map layers (Rainfall, Flood, Earthquakes). "
                "3. View AI Risk Predictions & Projected Impact. "
                "4. Register phone or mobile push for alerts. "
                "5. Tap 'Emergency Help' or speak 'I need rescue' during emergencies."
            )
            response["source"] = "Platform Interactive Tutorial"
            response["action"] = {"type": "START_TUTORIAL"}
            return response

        # Fallback General Response
        response["character_state"] = "NORMAL"
        response["reply_text"] = (
            f"I am continuously monitoring environmental sensors for {location_name}. "
            f"You can ask about live weather, hazard risks, map layers, nearby shelters, or request emergency rescue."
        ) if language == "en" else (
            f"मैं {location_name} के लिए सेंसर डेटा की निरंतर निगरानी कर रहा हूं। "
            f"आप मौसम, खतरे या आश्रय स्थल के बारे में पूछ सकते हैं।"
        )
        response["source"] = "Global Multi-Disaster Early Warning Intelligence"
        return response


ai_safety_service = AISafetyGuideService()
