from fastapi import APIRouter
from typing import List
from models.schemas import (
    PredictionRequest,
    PredictionResponse,
    LocationSummary,
    DashboardStats
)
from services.risk_engine import compute_prototype_flood_risk
from services.data_service import get_all_locations, get_dashboard_stats

router = APIRouter(prefix="/api", tags=["Prediction & Analytics"])

@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Compute prototype flood risk score from environmental parameters"
)
def predict_flood_risk(request: PredictionRequest):
    """
    Predict prototype flash flood risk score based on multi-source environmental inputs.
    
    Returns risk score (0-100), risk level (LOW/MODERATE/HIGH/CRITICAL), confidence,
    contributing risk factors, and cautious advisory recommendations.
    """
    result = compute_prototype_flood_risk(
        rainfall=request.rainfall,
        water_level=request.water_level,
        soil_moisture=request.soil_moisture,
        slope=request.slope,
        elevation=request.elevation
    )
    return PredictionResponse(**result)

@router.get(
    "/locations",
    response_model=List[LocationSummary],
    summary="Get all monitored demo locations with computed risk levels"
)
def get_monitored_locations():
    """Retrieve list of all monitored Uttarakhand demo locations with risk status."""
    locations = get_all_locations()
    return [LocationSummary(**loc) for loc in locations]

@router.get(
    "/stats",
    response_model=DashboardStats,
    summary="Get dashboard statistics summary"
)
def get_dashboard_statistics():
    """Retrieve summary dashboard telemetry & risk stats."""
    stats = get_dashboard_stats()
    return DashboardStats(**stats)
