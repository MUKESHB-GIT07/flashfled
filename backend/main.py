import sys
import os
import time
import logging
from collections import defaultdict
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Add backend root directory to sys.path so modules can import correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def _load_dotenv():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(backend_dir)
    for env_path in [os.path.join(root_dir, ".env"), os.path.join(backend_dir, ".env"), ".env"]:
        if os.path.isfile(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'\"")
                            if k and k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass

_load_dotenv()

from routes import (
    health, environmental, prediction, geocoding, rescue, weather,
    risk, hazards, impact, alerts, notifications, ai, safety, cap,
    broadcast, analytics, sos, auth, account
)

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("platform.security")

app = FastAPI(
    title="Global Multi-Disaster Early Warning Platform API",
    description="Phase 16: User Login + Account + Emergency Contact System. SIH26192 — Ministry of Home Affairs.",
    version="16.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ------------------------------------------------------------------------------
# 1. CORS Configuration (Environment-Controlled Allowed Origins)
# ------------------------------------------------------------------------------
raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
if raw_origins:
    allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://172.16.29.252:5173",
        "http://172.16.29.252:5174",
        "http://172.16.29.252:5175",
        "http://10.175.130.129:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

# Always allow private LAN IPs (10.x.x.x, 192.168.x.x, 172.16-31.x.x) on dev ports (5170-5185, 3000)
allow_origin_regex = r"http://(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):(517[0-9]|518[0-9]|3000)"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# 2. Security Headers & Rate Limiting Middleware
# ------------------------------------------------------------------------------
# In-memory IP Rate Limiter store: client_ip -> list of timestamps
_RATE_LIMIT_STORE = defaultdict(list)
# Sensitive endpoints with strict rate limits (max 30 requests per minute per IP)
STRICT_RATE_LIMITED_PATHS = {
    "/api/notifications/register-phone",
    "/api/notifications/verify-phone",
    "/api/notifications/send-demo-sms",
    "/api/broadcast/siren/activate",
    "/api/broadcast/siren/test",
    "/api/rescue/request",
    "/api/sos/activate",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/request-phone-otp",
    "/api/auth/verify-phone-otp"
}

@app.middleware("http")
async def in_memory_security_and_rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"
    path = request.url.path

    # Check Rate Limit for strict paths
    if path in STRICT_RATE_LIMITED_PATHS:
        now = time.time()
        window_start = now - 60  # 1 minute window
        timestamps = [t for t in _RATE_LIMIT_STORE[client_ip] if t > window_start]
        _RATE_LIMIT_STORE[client_ip] = timestamps

        if len(timestamps) >= 30:  # Max 30 requests per minute
            logger.warning(f"Rate limit exceeded for IP {client_ip} on path {path}")
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Rate limit exceeded. Please wait a minute before retrying."}
            )
        _RATE_LIMIT_STORE[client_ip].append(now)

    response: Response = await call_next(request)

    # Security Headers Injection
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), microphone=(self)"
    
    return response

# ------------------------------------------------------------------------------
# 3. Global Exception Handler (No Leakage of Stack Traces / File Paths)
# ------------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Internal details logged securely."}
    )

# ------------------------------------------------------------------------------
# 4. Include API Route Modules
# ------------------------------------------------------------------------------
app.include_router(health.router)
app.include_router(environmental.router)
app.include_router(prediction.router)
app.include_router(geocoding.router)
app.include_router(rescue.router)
app.include_router(weather.router)         # Phase 2: Real Open-Meteo weather
app.include_router(risk.router)            # Phase 3: Multi-hazard risk evaluation
app.include_router(hazards.router)         # Phase 4: Multi-hazard real-time feeds
app.include_router(impact.router)          # Phase 5: Projected impact & next regions
app.include_router(alerts.router)          # Phase 6: Early Warning Center & alert dispatch
app.include_router(notifications.router)   # Phase 7 & 8: Notifications, SMS & Mobile Push
app.include_router(ai.router)              # Phase 9: AI Safety Guide & Voice Assistant
app.include_router(safety.router)          # Phase 10: Life Safety Mode, Shelters & Routes
app.include_router(cap.router)             # Phase 12: Common Alerting Protocol (CAP)
app.include_router(broadcast.router)       # Phase 12: Radio, TV, Media & Siren Gateway
app.include_router(analytics.router)       # Phase 13: Historical Analytics & Reports
app.include_router(sos.router)             # Phase 15: Emergency SOS Alarm + Family + Responder Alert System
app.include_router(auth.router)            # Phase 16: User Authentication & Login
app.include_router(account.router)         # Phase 16: Profile, Emergency Contacts & Preferences


@app.get("/", tags=["Root"])
def root():
    return {
        "title": "Flash Flood Prediction System API",
        "problem_statement_id": "SIH26192",
        "theme": "Disaster Management",
        "ministry": "Ministry of Home Affairs",
        "status": "online",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host=host, port=port, reload=True)
