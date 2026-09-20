from fastapi import APIRouter, Query
from typing import List, Dict, Any
from services.geocoding_service import search_location

router = APIRouter(prefix="/api", tags=["Global Geocoding & Map Layers"])

MAP_LAYERS_CATALOG = [
    {"id": "flood", "name": "Flood Risk", "icon": "🌊", "active": True, "category": "hydrological", "description": "Flash & river flood risk mapping"},
    {"id": "rainfall", "name": "Rainfall Intensity", "icon": "🌧️", "active": True, "category": "meteorological", "description": "Real-time precip accumulation"},
    {"id": "river", "name": "River Level", "icon": "💧", "active": True, "category": "hydrological", "description": "CWC & sensor river gauging"},
    {"id": "soil_moisture", "name": "Soil Moisture", "icon": "🌱", "active": True, "category": "geological", "description": "Satellite & ground soil saturation"},
    {"id": "landslide", "name": "Landslide Hazard", "icon": "🌍", "active": True, "category": "geological", "description": "Slope stability & mudslide risk"},
    {"id": "earthquake", "name": "Earthquake Activity", "icon": "🌎", "active": False, "category": "seismic", "description": "USGS seismic epicenter stream"},
    {"id": "volcano", "name": "Volcanic Eruption", "icon": "🌋", "active": False, "category": "geological", "description": "Active volcano monitoring"},
    {"id": "wildfire", "name": "Wildfire / Hotspots", "icon": "🔥", "active": False, "category": "thermal", "description": "Thermal anomaly & fire spread"},
    {"id": "snow", "name": "Snow & Snowmelt", "icon": "❄️", "active": False, "category": "meteorological", "description": "Snow pack & rapid melt runoff"},
    {"id": "temperature", "name": "Temperature Anomaly", "icon": "🌡️", "active": False, "category": "meteorological", "description": "Extreme heat / cold alerts"},
    {"id": "wind", "name": "Wind & Gusts", "icon": "💨", "active": False, "category": "meteorological", "description": "Wind speed & direction vector"},
    {"id": "tsunami", "name": "Tsunami Warning", "icon": "🌊", "active": False, "category": "coastal", "description": "Offshore seismic tsunami zones"},
    {"id": "cyclone", "name": "Cyclone Track", "icon": "🌪️", "active": False, "category": "meteorological", "description": "Tropical cyclone trajectories"}
]

@router.get(
    "/geocode",
    response_model=List[Dict[str, Any]],
    summary="Global Location Search & Geocoding"
)
def geocode_search(q: str = Query("", description="Query string, location name, or lat,lng coordinates")):
    """
    Geocode global search queries using OSM Nominatim with intelligent local fallbacks.
    Returns latitude, longitude, display name, country, and region details.
    """
    return search_location(q)

@router.get(
    "/map/layers",
    response_model=List[Dict[str, Any]],
    summary="Get Global Map Layers Configuration"
)
def get_map_layers():
    """Retrieve list of available global multi-disaster map layers."""
    return MAP_LAYERS_CATALOG
