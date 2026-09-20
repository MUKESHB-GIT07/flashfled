# Flash Flood Prediction System — FastAPI Backend

**Problem Statement ID**: SIH26192  
**Theme**: Disaster Management  
**Ministry**: Ministry of Home Affairs  
**Project**: Multi-Source Risk Intelligence for Hilly Regions  

---

## 📌 Overview

This FastAPI backend serves as the multi-source data processing and risk intelligence engine for the **Flash Flood Prediction System**. It computes prototype risk scores for vulnerable hilly catchments using environmental parameters (rainfall, river water levels, soil saturation percentage, slope gradient, and elevation).

---

## 📁 Directory Structure

```
backend/
├── main.py                          # FastAPI application entry point with CORS
├── requirements.txt                 # Python dependencies
├── README.md                        # Documentation & setup guide
├── data/
│   └── sample_environmental_data.csv# Prototype telemetry dataset for Uttarakhand
├── models/
│   └── schemas.py                   # Pydantic data schemas
├── routes/
│   ├── health.py                    # GET /api/health endpoint
│   ├── environmental.py             # GET /api/environmental/{location} endpoint
│   └── prediction.py                # POST /api/predict, GET /api/locations, GET /api/stats
└── services/
    ├── data_service.py              # Data loader and aggregator service
    └── risk_engine.py               # Documented prototype flood risk engine
```

---

## ⚙️ Installation

1. Navigate to the backend directory:
   ```bash
   cd flash-flood-prediction/backend
   ```

2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## 🚀 Running the API Server

Start the Uvicorn development server:

```bash
python main.py
```
Or directly with Uvicorn:
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`.

Open Interactive OpenAPI Docs at:
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

---

## 📡 API Endpoints

### 1. Health Check
- **Endpoint**: `GET /api/health`
- **Response**:
  ```json
  {
    "status": "online",
    "service": "Flash Flood Prediction API"
  }
  ```

---

### 2. Environmental Telemetry for Location
- **Endpoint**: `GET /api/environmental/{location}`
- **Sample Request**: `GET /api/environmental/Kedarnath`
- **Response**:
  ```json
  {
    "location": "Kedarnath",
    "rainfall": 82.0,
    "water_level": 3.8,
    "soil_moisture": 86.0,
    "slope": 28.5,
    "elevation": 3583.0,
    "timestamp": "2026-09-06T00:42:00Z"
  }
  ```

---

### 3. Predict Flood Risk
- **Endpoint**: `POST /api/predict`
- **Request Body**:
  ```json
  {
    "rainfall": 82.0,
    "water_level": 3.8,
    "soil_moisture": 86.0,
    "slope": 28.5,
    "elevation": 1420.0
  }
  ```
- **Response**:
  ```json
  {
    "risk_score": 78.0,
    "risk_level": "CRITICAL",
    "probability": 0.78,
    "confidence": 91.0,
    "risk_factors": [
      "Heavy rainfall (82.0 mm/hr — exceeding warning threshold)",
      "High water level (3.8 m — river stage elevated)",
      "High soil moisture (86.0% — ground near saturation)",
      "Steep terrain gradient (28.5° — accelerates surface runoff)"
    ],
    "recommendation": "Alert active. Follow official emergency guidance from local disaster management authorities (NDMA/SDMA) and move to designated safe locations if advised by authorities. This is a prototype demonstration."
  }
  ```

---

### 4. Monitored Locations List
- **Endpoint**: `GET /api/locations`
- **Response**:
  ```json
  [
    {
      "location": "Kedarnath",
      "latitude": 30.7346,
      "longitude": 79.0669,
      "risk_score": 73.1,
      "risk_level": "HIGH"
    },
    ...
  ]
  ```

---

### 5. Dashboard Statistics
- **Endpoint**: `GET /api/stats`
- **Response**:
  ```json
  {
    "monitored_locations": 6,
    "high_risk_locations": 2,
    "critical_locations": 3,
    "average_risk_score": 67.9
  }
  ```

---

## 🧮 Prototype Risk Engine Calculation

The risk engine applies a documented, weighted scoring algorithm scaled from `0` to `100`:

| Input Variable | Parameter | Normalization Scale | Weight |
| :--- | :--- | :--- | :--- |
| **Rainfall** | Precipitation intensity | 0 - 120 mm/hr | **40%** |
| **Water Level** | River gauge stage | 0 - 5.0 m | **25%** |
| **Soil Moisture** | Saturation % | 0 - 100% | **20%** |
| **Terrain Slope** | Elevation gradient | 0 - 45° | **15%** |

### Risk Level Categorization Thresholds:
- **0 – 25**: `LOW`
- **26 – 50**: `MODERATE`
- **51 – 75**: `HIGH`
- **76 – 100**: `CRITICAL`

---

## 🔗 Connecting with React Frontend

The CORS policy allows incoming fetch/axios requests from `http://localhost:5173`.

Example Frontend integration in React:
```javascript
// Fetch location data from API
const response = await fetch('http://127.0.0.1:8000/api/environmental/Kedarnath');
const data = await response.json();

// Calculate custom prediction
const predResponse = await fetch('http://127.0.0.1:8000/api/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rainfall: 82.0,
    water_level: 3.8,
    soil_moisture: 86.0,
    slope: 28.5,
    elevation: 1420.0
  })
});
const result = await predResponse.json();
```
