from typing import List, Dict, Any

def calculate_risk_level(score: float) -> str:
    """
    Map prototype risk score to risk level categories:
    0–25: LOW
    26–50: MODERATE
    51–75: HIGH
    76–100: CRITICAL
    """
    if score <= 25:
        return "LOW"
    elif score <= 50:
        return "MODERATE"
    elif score <= 75:
        return "HIGH"
    else:
        return "CRITICAL"

def compute_prototype_flood_risk(
    rainfall: float,
    water_level: float,
    soil_moisture: float,
    slope: float,
    elevation: float
) -> Dict[str, Any]:
    """
    Documented Prototype Risk Calculation Engine for SIH26192 demonstration.
    Weighted combination of environmental factors tailored for hilly catchments.
    
    Weights:
    - Rainfall (0-120 mm/hr): 40%
    - Water Level (0-5.0 m): 25%
    - Soil Moisture (0-100%): 20%
    - Terrain Slope (0-45 deg): 15%
    """
    # Normalize inputs to 0-100 scale
    rain_score = min(100.0, (rainfall / 120.0) * 100.0)
    water_score = min(100.0, (water_level / 5.0) * 100.0)
    soil_score = min(100.0, max(0.0, soil_moisture))
    slope_score = min(100.0, (slope / 45.0) * 100.0)

    # Weighted calculation
    raw_score = (0.40 * rain_score) + (0.25 * water_score) + (0.20 * soil_score) + (0.15 * slope_score)
    risk_score = round(max(0.0, min(100.0, raw_score)), 1)
    
    risk_level = calculate_risk_level(risk_score)
    probability = round(min(0.99, max(0.01, risk_score / 100.0)), 2)
    confidence = 91.0

    # Identify contributing risk factors
    risk_factors: List[str] = []
    if rainfall >= 60.0:
        risk_factors.append(f"Heavy rainfall ({rainfall} mm/hr - exceeding warning threshold)")
    if water_level >= 3.2:
        risk_factors.append(f"High water level ({water_level} m - river stage elevated)")
    if soil_moisture >= 75.0:
        risk_factors.append(f"High soil moisture ({soil_moisture}% - ground near saturation)")
    if slope >= 20.0:
        risk_factors.append(f"Steep terrain gradient ({slope} deg - accelerates surface runoff)")
    if elevation >= 2000.0:
        risk_factors.append(f"High altitude catchment ({elevation} m - vulnerable to intense mountain downpours)")

    if not risk_factors:
        risk_factors.append("No critical risk drivers identified; environmental parameters within safe thresholds.")

    # Generate cautious recommendation
    if risk_level in ["CRITICAL", "HIGH"]:
        recommendation = (
            "Alert active. Follow official emergency guidance from local disaster management authorities (NDMA/SDMA) "
            "and move to designated safe locations if advised by authorities. This is a prototype demonstration."
        )
    elif risk_level == "MODERATE":
        recommendation = (
            "Elevated parameters detected. Monitor official IMD/CWC weather advisories and avoid riverbanks or steep stream valleys."
        )
    else:
        recommendation = (
            "Environmental parameters remain within normal seasonal ranges. Continue routine telemetry monitoring."
        )

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "probability": probability,
        "confidence": confidence,
        "risk_factors": risk_factors,
        "recommendation": recommendation
    }
