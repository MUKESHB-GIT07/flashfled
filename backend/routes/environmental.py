from fastapi import APIRouter, Path
from models.schemas import EnvironmentalResponse
from services.data_service import get_environmental_data

router = APIRouter(prefix="/api", tags=["Environmental Telemetry"])

@router.get(
    "/environmental/{location}",
    response_model=EnvironmentalResponse,
    summary="Get environmental telemetry for any location"
)
def get_location_environmental(
    location: str = Path(..., description="Name of any global location (e.g. Chennai, Tokyo, London, Kedarnath, Delhi)")
):
    """Retrieve environmental telemetry parameters for a given location."""
    data = get_environmental_data(location)
    return EnvironmentalResponse(
        location=data["location"],
        rainfall=data["rainfall"],
        water_level=data["water_level"],
        soil_moisture=data["soil_moisture"],
        slope=data["slope"],
        elevation=data["elevation"],
        timestamp=data["timestamp"]
    )
