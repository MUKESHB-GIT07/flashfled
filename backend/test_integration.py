import urllib.request
import json
import sys

def check_url(url, description):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            print(f"[OK] {description} ({url}) -> Status {status}")
            return status, body
    except Exception as e:
        print(f"[FAIL] {description} ({url}) -> Error: {e}")
        return None, str(e)

def main():
    print("--- TESTING LIVE FASTAPI & REACT DEV SERVERS ---")
    
    # 1. FastAPI Docs
    status, body = check_url("http://127.0.0.1:8000/docs", "FastAPI Swagger Docs")
    assert status == 200, "FastAPI /docs is not accessible!"

    # 2. FastAPI Health
    status, body = check_url("http://127.0.0.1:8000/api/health", "FastAPI Health Endpoint")
    assert status == 200, "FastAPI /api/health failed!"
    data = json.loads(body)
    assert data["status"] == "online"

    # 3. FastAPI Locations
    status, body = check_url("http://127.0.0.1:8000/api/locations", "FastAPI Monitored Locations")
    assert status == 200, "FastAPI /api/locations failed!"
    locs = json.loads(body)
    assert len(locs) == 6

    # 4. FastAPI Stats
    status, body = check_url("http://127.0.0.1:8000/api/stats", "FastAPI Stats Endpoint")
    assert status == 200, "FastAPI /api/stats failed!"

    # 5. React Frontend Dev Server
    status, body = check_url("http://localhost:5173/", "React Frontend Dev Server")
    assert status == 200, "React frontend dev server is not accessible!"

    print("\nSUCCESS: All live servers are active, connected, and returning HTTP 200 OK!")

if __name__ == "__main__":
    main()
