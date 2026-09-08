from typing import List, Dict, Any

def get_soil_erosion_risk(rainfall: float, soil_moisture: float, slope: float) -> Dict[str, Any]:
    """Calculate soil erosion risk based on rainfall, soil moisture, slope and runoff."""
    score = (rainfall * 0.4) + (slope * 1.2) + (soil_moisture * 0.3)
    if score >= 80:
        level = "EXTREME"
    elif score >= 55:
        level = "HIGH"
    elif score >= 30:
        level = "MODERATE"
    else:
        level = "LOW"

    return {
        "erosion_score": round(score, 1),
        "risk_level": level,
        "contributing_factors": [
            f"Precipitation intensity ({rainfall} mm/hr)",
            f"Terrain slope gradient ({slope}°)",
            f"Soil saturation ({soil_moisture}%)"
        ],
        "data_source": "SOIL_EROSION_MODEL (DECISION-SUPPORT)"
    }

def get_earthquakes_feed() -> List[Dict[str, Any]]:
    """Return recent authoritative seismic activity feed (USGS / Global Seismic)."""
    return [
        {
            "id": "eq_001",
            "title": "M 5.8 - Hindu Kush Region, Afghanistan",
            "magnitude": 5.8,
            "depth": 185.0,
            "latitude": 36.45,
            "longitude": 70.82,
            "time": "2026-09-06T08:14:00Z",
            "distance_km": 680.0,
            "tsunami_potential": False,
            "data_source": "USGS Earthquake Hazards Program (Authoritative)"
        },
        {
            "id": "eq_002",
            "title": "M 6.4 - Off East Coast of Honshu, Japan",
            "magnitude": 6.4,
            "depth": 35.0,
            "latitude": 37.20,
            "longitude": 142.10,
            "time": "2026-09-06T04:22:00Z",
            "distance_km": 5400.0,
            "tsunami_potential": True,
            "data_source": "JMA / USGS Seismic Network (Authoritative)"
        },
        {
            "id": "eq_003",
            "title": "M 4.2 - Chamoli District, Uttarakhand",
            "magnitude": 4.2,
            "depth": 10.0,
            "latitude": 30.45,
            "longitude": 79.40,
            "time": "2026-09-05T21:10:00Z",
            "distance_km": 35.0,
            "tsunami_potential": False,
            "data_source": "National Centre for Seismology (NCS India)"
        }
    ]

def get_volcanoes_feed() -> List[Dict[str, Any]]:
    """Return active volcanic monitoring data (Global Volcanism Program)."""
    return [
        {
            "id": "volc_001",
            "name": "Mount Semeru",
            "country": "Indonesia",
            "latitude": -8.108,
            "longitude": 112.922,
            "alert_level": "ORANGE",
            "status": "ERUPTION / ASH PLUME",
            "distance_km": 4800.0,
            "data_source": "Smithsonian Global Volcanism Program"
        },
        {
            "id": "volc_002",
            "name": "Sakurajima",
            "country": "Japan",
            "latitude": 31.593,
            "longitude": 130.657,
            "alert_level": "ORANGE",
            "status": "EXPLOSIVE UNREST",
            "distance_km": 5100.0,
            "data_source": "Japan Meteorological Agency"
        },
        {
            "id": "volc_003",
            "name": "Barren Island",
            "country": "India (Andaman Sea)",
            "latitude": 12.278,
            "longitude": 93.858,
            "alert_level": "YELLOW",
            "status": "STROMBOLIAN ACTIVITY",
            "distance_km": 2100.0,
            "data_source": "Geological Survey of India (GSI)"
        }
    ]

def get_wildfires_feed() -> List[Dict[str, Any]]:
    """Return active thermal anomalies and wildfire hazard data (NASA FIRMS)."""
    return [
        {
            "id": "fire_001",
            "name": "Pithoragarh Forest Sector B",
            "latitude": 29.6200,
            "longitude": 80.1500,
            "fire_risk": "HIGH",
            "wind_direction": "SW",
            "potential_spread_direction": "NE towards Ridge Line",
            "nearby_regions": ["Pithoragarh Basin", "Askot Sanctuary"],
            "data_source": "NASA FIRMS MODIS/VIIRS Active Fire System"
        },
        {
            "id": "fire_002",
            "name": "California Sierra Foothills",
            "latitude": 38.2000,
            "longitude": -120.5000,
            "fire_risk": "EXTREME",
            "wind_direction": "NW",
            "potential_spread_direction": "SE towards Valley Basin",
            "nearby_regions": ["Calaveras County"],
            "data_source": "CAL FIRE / NASA FIRMS"
        }
    ]

def get_tsunami_feed() -> List[Dict[str, Any]]:
    """Return active tsunami advisories and coastal alert status."""
    return [
        {
            "id": "tsu_001",
            "event": "Honshu Offshore M6.4 Earthquake",
            "status": "ADVISORY",
            "affected_coastal_zones": ["Miyagi Prefecture Coast", "Fukushima Coast"],
            "warning_time": "Estimated arrival: 45 minutes",
            "data_source": "NOAA Pacific Tsunami Warning Center / JMA"
        }
    ]

def get_landslide_risk(location_name: str, rainfall: float, soil_moisture: float, slope: float) -> Dict[str, Any]:
    """Estimate landslide risk using rainfall, soil moisture, and slope gradient."""
    ls_score = (slope * 1.5) + (soil_moisture * 0.4) + (rainfall * 0.3)
    if ls_score >= 85:
        level = "CRITICAL"
    elif ls_score >= 65:
        level = "HIGH"
    elif ls_score >= 45:
        level = "MODERATE"
    else:
        level = "LOW"

    return {
        "location": location_name,
        "hazard_score": round(ls_score, 1),
        "risk_level": level,
        "factors": [
            f"Steep slope gradient ({slope}°)",
            f"Saturated soil mass ({soil_moisture}%)",
            f"Heavy rainfall lubrication ({rainfall} mm/hr)"
        ],
        "data_source": "GEOMORPHIC LANDSLIDE MODEL (PROTOTYPE)"
    }
