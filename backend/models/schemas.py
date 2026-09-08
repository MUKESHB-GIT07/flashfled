from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class HealthResponse(BaseModel):
    status: str = Field(..., example="online")
    service: str = Field(..., example="Flash Flood Prediction API")

class EnvironmentalResponse(BaseModel):
    location: str = Field(..., example="Kedarnath")
    rainfall: float = Field(..., example=82.0, description="Rainfall intensity in mm/hr")
    water_level: float = Field(..., example=3.8, description="Water level in meters")
    soil_moisture: float = Field(..., example=86.0, description="Soil moisture percentage")
    slope: float = Field(..., example=28.5, description="Terrain slope in degrees")
    elevation: float = Field(..., example=3583.0, description="Elevation in meters")
    timestamp: str = Field(..., example="2026-09-06T00:42:00Z")

class PredictionRequest(BaseModel):
    rainfall: float = Field(..., ge=0, example=82.0, description="Rainfall in mm/hr")
    water_level: float = Field(..., ge=0, example=3.8, description="Water level in meters")
    soil_moisture: float = Field(..., ge=0, le=100, example=86.0, description="Soil moisture %")
    slope: float = Field(..., ge=0, example=28.5, description="Slope gradient in degrees")
    elevation: float = Field(..., ge=0, example=1420.0, description="Elevation in meters")

class PredictionResponse(BaseModel):
    risk_score: float = Field(..., example=78.0, description="Computed risk score (0-100)")
    risk_level: str = Field(..., example="HIGH", description="Risk level category: LOW | MODERATE | HIGH | CRITICAL")
    probability: float = Field(..., example=0.78, description="Estimated flood probability (0.0 - 1.0)")
    confidence: float = Field(..., example=91.0, description="Model confidence score percentage")
    risk_factors: List[str] = Field(..., description="List of primary contributing risk factors")
    recommendation: str = Field(..., description="Cautious advisory recommendation")

class LocationSummary(BaseModel):
    location: str = Field(..., example="Kedarnath Valley")
    latitude: float = Field(..., example=30.7346)
    longitude: float = Field(..., example=79.0669)
    risk_score: float = Field(..., example=78.0)
    risk_level: str = Field(..., example="HIGH")

class DashboardStats(BaseModel):
    monitored_locations: int = Field(..., example=6)
    high_risk_locations: int = Field(..., example=2)
    critical_locations: int = Field(..., example=2)
    average_risk_score: float = Field(..., example=68.8)

# ----------------- GLOBAL MULTI-DISASTER SCHEMAS -----------------

class GeocodeResult(BaseModel):
    name: str = Field(..., example="Kedarnath")
    display_name: str = Field(..., example="Kedarnath, Rudraprayag, Uttarakhand, India")
    latitude: float = Field(..., example=30.7346)
    longitude: float = Field(..., example=79.0669)
    country: Optional[str] = Field("India")
    state: Optional[str] = Field("Uttarakhand")
    type: Optional[str] = Field("village")

class GlobalWeatherResponse(BaseModel):
    location: str
    latitude: float
    longitude: float
    temperature: float = Field(..., description="Temperature in Celsius")
    humidity: float = Field(..., description="Humidity percentage")
    rainfall: float = Field(..., description="Rainfall intensity mm/hr")
    wind_speed: float = Field(..., description="Wind speed km/h")
    wind_direction: str = Field("NE", description="Wind direction cardinal")
    water_level: float = Field(..., description="River level meters")
    soil_moisture: float = Field(..., description="Soil moisture percentage")
    elevation: float = Field(..., description="Elevation meters")
    slope: float = Field(..., description="Slope degrees")
    snow_depth: float = Field(0.0, description="Snow depth cm")
    snowfall: float = Field(0.0, description="Snowfall cm/hr")
    snowmelt_risk: str = Field("LOW", description="Snowmelt risk: LOW/MODERATE/HIGH")
    solar_irradiance: float = Field(450.0, description="Solar irradiance W/m²")
    visibility: float = Field(10.0, description="Visibility km")
    timestamp: str
    data_source: str = Field("GLOBAL_OBSERVATION_ADAPTER", description="Observed / Model source tag")

class EarthquakeItem(BaseModel):
    id: str
    title: str
    magnitude: float
    depth: float
    latitude: float
    longitude: float
    time: str
    distance_km: Optional[float] = None
    tsunami_potential: bool = False
    data_source: str = "USGS Earthquake Feed (Authoritative)"

class VolcanoItem(BaseModel):
    id: str
    name: str
    country: str
    latitude: float
    longitude: float
    alert_level: str  # GREEN, YELLOW, ORANGE, RED
    status: str       # UNREST, ERUPTION, NORMAL
    distance_km: Optional[float] = None
    data_source: str = "Global Volcanism Program"

class WildfireItem(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    fire_risk: str    # LOW, MODERATE, HIGH, EXTREME
    wind_direction: str
    potential_spread_direction: str
    nearby_regions: List[str]
    data_source: str = "NASA FIRMS Active Fire System"

class TsunamiAlert(BaseModel):
    id: str
    event: str
    status: str       # ADVISORY, WATCH, WARNING, NONE
    affected_coastal_zones: List[str]
    warning_time: str
    data_source: str = "NOAA Pacific Tsunami Warning Center"

class LandslideHazard(BaseModel):
    location: str
    hazard_score: float
    risk_level: str   # LOW, MODERATE, HIGH, EXTREME
    factors: List[str]

class ProjectedImpactResponse(BaseModel):
    disaster_type: str
    disaster_origin: str
    current_affected_region: str
    projected_next_region: str
    projected_following_region: str
    direction: str
    expected_impact_window: str
    confidence: float
    disclaimer: str = "PROJECTED IMPACT — NOT CONFIRMED"
    data_source: str = "Model Projection"

class DisasterCascadeStep(BaseModel):
    step_number: int
    trigger: str
    impact: str
    status: str

class AlertItem(BaseModel):
    alert_id: str
    disaster: str
    location: str
    severity: str    # EXTREME, VERY HIGH, HIGH, MODERATE, LOW
    status: str      # VERIFIED WARNING, MODEL PREDICTION, OBSERVED, DEMO
    start_time: str
    expiry_time: str
    current_affected_area: str
    projected_affected_regions: List[str]
    recommended_action: str
    source: str
    confidence: float

# Notification & Emergency Channel Models
class SmsSubscriptionRequest(BaseModel):
    phone_number: str
    country: str = "India"
    language: str = "English"
    home_location: str
    saved_locations: List[str] = []
    disaster_types: List[str] = ["FLOOD", "LANDSLIDE", "STORM"]
    min_severity: str = "HIGH"

class NotificationResponse(BaseModel):
    status: str
    message: str
    alert_id: Optional[str] = None
    demo_mode: bool = True

class PushRegisterRequest(BaseModel):
    device_token: str
    platform: str = "web" # web, ios, android
    saved_locations: List[str] = []

class SirenTriggerRequest(BaseModel):
    village_zone: str
    severity: str = "EXTREME"
    duration_seconds: int = 60
    admin_passcode: str

class SirenResponse(BaseModel):
    status: str
    village_zone: str
    severity: str
    simulated: bool = True
    message: str

class CapGenerateRequest(BaseModel):
    event: str
    severity: str
    urgency: str = "Immediate"
    certainty: str = "Observed"
    area_desc: str
    instructions: str

class CapResponse(BaseModel):
    alert_id: str
    cap_xml: str
    sender: str
    status: str = "CAP GENERATED — READY FOR BROADCAST"

class MediaBulletinResponse(BaseModel):
    bulletin_id: str
    tv_script: str
    radio_script: str
    news_bulletin: str
    sms_bulletin: str
    cap_json: Dict[str, Any]
    status: str = "READY FOR MEDIA DISTRIBUTION"

class SimulationRequest(BaseModel):
    disaster_type: str = "FLOOD"  # FLOOD, HEAVY_RAINFALL, LANDSLIDE, EARTHQUAKE, TSUNAMI, VOLCANO, WILDFIRE, CYCLONE, SNOWMELT
    origin_location: str = "Kedarnath Valley"
    severity: str = "EXTREME"

class SimulationResponse(BaseModel):
    simulation_id: str
    disaster_type: str
    origin_location: str
    severity: str
    affected_sequence: List[str]
    generated_alert: AlertItem
    cap_summary: str
    demo_sms_content: str
    siren_status: str
    media_script_summary: str
    disclaimer: str = "DEMO / SIMULATION MODE ONLY"
