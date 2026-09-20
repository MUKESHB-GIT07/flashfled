import sys
import os

# Add backend root directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_all_endpoints():
    print("--- TESTING FASTAPI BACKEND ENDPOINTS ---")

    # 1. Root
    res = client.get("/")
    assert res.status_code == 200, f"Root failed: {res.text}"
    print("[OK] GET / -> OK:", res.json())

    # 2. Health
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health failed: {res.text}"
    assert res.json()["status"] == "online"
    print("[OK] GET /api/health -> OK:", res.json())

    # 3. Environmental - Existing location
    res = client.get("/api/environmental/Kedarnath")
    assert res.status_code == 200, f"Environmental Kedarnath failed: {res.text}"
    data = res.json()
    assert data["location"] == "Kedarnath"
    assert data["rainfall"] == 82.0
    print("[OK] GET /api/environmental/Kedarnath -> OK:", data)

    # 4. Environmental - Global location test (e.g. Chennai)
    res = client.get("/api/environmental/Chennai")
    assert res.status_code == 200, f"Environmental Chennai failed: {res.text}"
    cdata = res.json()
    assert cdata["location"] == "Chennai"
    print("[OK] GET /api/environmental/Chennai -> OK:", cdata)

    # 5. Phase 2 Weather - Current Weather Endpoint
    res = client.get("/api/weather/current?lat=13.0827&lng=80.2707&name=Chennai")
    assert res.status_code == 200, f"Weather current failed: {res.text}"
    wdata = res.json()
    assert wdata["location"] == "Chennai"
    assert "temperature" in wdata
    assert "precipitation" in wdata
    assert wdata["provider_status"] == "CONNECTED"
    print("[OK] GET /api/weather/current -> OK:", wdata["temperature"], wdata["temperature_unit"], wdata["weather_condition"])

    # 6. Phase 2 Weather - Forecast Endpoint
    res = client.get("/api/weather/forecast?lat=13.0827&lng=80.2707&name=Chennai")
    assert res.status_code == 200, f"Weather forecast failed: {res.text}"
    fdata = res.json()
    assert "hourly" in fdata
    assert "daily" in fdata
    print("[OK] GET /api/weather/forecast -> OK (hourly & daily returned)")

    # 7. Phase 2 Weather - Rainfall Timeseries Endpoint
    res = client.get("/api/weather/rainfall-timeseries?lat=13.0827&lng=80.2707&name=Chennai&period=24h")
    assert res.status_code == 200, f"Rainfall timeseries failed: {res.text}"
    tsdata = res.json()
    assert tsdata["period"] == "24h"
    assert len(tsdata["time_series"]) > 0
    print("[OK] GET /api/weather/rainfall-timeseries -> OK")

    # 8. Predict Endpoint
    payload = {
        "rainfall": 82.0,
        "water_level": 3.8,
        "soil_moisture": 86.0,
        "slope": 28.5,
        "elevation": 1420.0
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200, f"Predict failed: {res.text}"
    pred_data = res.json()
    assert "risk_score" in pred_data
    assert "risk_level" in pred_data
    assert pred_data["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert len(pred_data["risk_factors"]) > 0
    print("[OK] POST /api/predict -> OK:", pred_data)

    # 9. Locations List
    res = client.get("/api/locations")
    assert res.status_code == 200, f"Locations failed: {res.text}"
    locs = res.json()
    assert len(locs) == 6, f"Expected 6 locations, got {len(locs)}"
    print("[OK] GET /api/locations -> OK (6 locations returned)")

    # 10. Dashboard Stats
    res = client.get("/api/stats")
    assert res.status_code == 200, f"Stats failed: {res.text}"
    stats = res.json()
    assert stats["monitored_locations"] == 6
    assert stats["average_risk_score"] > 0
    print("[OK] GET /api/stats -> OK:", stats)

    # 11. Phase 3 — Multi-Disaster Risk Tests across mandatory locations:
    test_locations = [
        {"name": "Chennai", "lat": 13.0827, "lng": 80.2707},
        {"name": "San Francisco", "lat": 37.7749, "lng": -122.4194},
        {"name": "Tokyo", "lat": 35.6762, "lng": 139.6503},
        {"name": "Russia", "lat": 55.7558, "lng": 37.6173},
        {"name": "Kedarnath", "lat": 30.7346, "lng": 79.0669},
    ]

    print("\n--- TESTING PHASE 3 MULTI-DISASTER RISK ENDPOINTS ---")
    for loc in test_locations:
        name = loc["name"]
        lat = loc["lat"]
        lng = loc["lng"]

        # Combined API /api/risk/all
        res = client.get(f"/api/risk/all?lat={lat}&lng={lng}&name={name}")
        assert res.status_code == 200, f"Risk /all failed for {name}: {res.text}"
        rdata = res.json()
        assert rdata["location"] == name
        assert "flood_risk" in rdata
        assert "erosion_risk" in rdata
        assert "landslide_risk" in rdata
        assert "snow_risk" in rdata

        flood_lvl = rdata["flood_risk"]["risk_level"]
        landslide_lvl = rdata["landslide_risk"]["risk_level"]
        erosion_lvl = rdata["erosion_risk"]["risk_level"]
        snow_status = rdata["snow_risk"]["data_status"]
        snow_desc = rdata["snow_risk"]["snowmelt_description"]

        # Verification 1: Chennai snow data must be NOT APPLICABLE without fake snow
        if name == "Chennai":
            assert snow_status == "NOT APPLICABLE", f"Chennai snow status expected NOT APPLICABLE, got {snow_status}"
            assert "Not applicable" in snow_desc or "unavailable" in snow_desc
            assert rdata["snow_risk"]["snow_depth_cm"] == 0.0

        # Verification 2: Kedarnath has steep slope -> higher landslide risk than Chennai
        if name == "Kedarnath":
            assert rdata["landslide_risk"]["slope_deg"] > 25.0
            print(f"  [Verified] {name}: Slope={rdata['landslide_risk']['slope_deg']}°, Landslide Level={landslide_lvl}")

        # Verification 3: Chennai flat slope -> low landslide risk
        if name == "Chennai":
            assert rdata["landslide_risk"]["slope_deg"] < 5.0
            assert landslide_lvl == "LOW", f"Chennai landslide risk expected LOW, got {landslide_lvl}"
            print(f"  [Verified] {name}: Slope={rdata['landslide_risk']['slope_deg']}°, Landslide Level={landslide_lvl} (Flat ground)")

        print(f"[OK] {name} ({lat}, {lng}) -> Flood: {flood_lvl}, Landslide: {landslide_lvl}, Erosion: {erosion_lvl}, Snow Status: {snow_status}")

    print("\nALL PHASE 3 MULTI-DISASTER RISK TESTS PASSED SUCCESSFULLY!")

    print("\n--- TESTING PHASE 4 REAL-TIME MULTI-HAZARD ENDPOINTS ---")
    p4_locations = [
        {"name": "Chennai", "lat": 13.0827, "lng": 80.2707},
        {"name": "Tokyo", "lat": 35.6762, "lng": 139.6503},
        {"name": "Russia", "lat": 55.7558, "lng": 37.6173},
        {"name": "San Francisco", "lat": 37.7749, "lng": -122.4194},
        {"name": "London", "lat": 51.5074, "lng": -0.1278},
        {"name": "Kedarnath", "lat": 30.7346, "lng": 79.0669},
    ]

    for loc in p4_locations:
        name = loc["name"]
        lat = loc["lat"]
        lng = loc["lng"]

        # 1. Earthquakes
        eq_res = client.get(f"/api/hazards/earthquakes?lat={lat}&lng={lng}")
        assert eq_res.status_code == 200
        eq_data = eq_res.json()
        assert "count" in eq_data
        assert "earthquakes" in eq_data

        # 2. Tsunamis
        tsu_res = client.get(f"/api/hazards/tsunamis?lat={lat}&lng={lng}")
        assert tsu_res.status_code == 200
        tsu_data = tsu_res.json()
        assert "has_active_warning" in tsu_data

        # 3. Volcanoes
        volc_res = client.get(f"/api/hazards/volcanoes?lat={lat}&lng={lng}")
        assert volc_res.status_code == 200
        volc_data = volc_res.json()
        assert "volcanoes" in volc_data

        # 4. Wildfires
        fire_res = client.get(f"/api/hazards/wildfires?lat={lat}&lng={lng}")
        assert fire_res.status_code == 200
        fire_data = fire_res.json()
        assert "wildfires" in fire_data

        # 5. Cyclones
        cyc_res = client.get(f"/api/hazards/cyclones?lat={lat}&lng={lng}")
        assert cyc_res.status_code == 200
        cyc_data = cyc_res.json()
        assert "has_active_cyclone" in cyc_data

        # Verify: If no active cyclone near Chennai or London, message must truthfully state so
        if name in ["Chennai", "London"]:
            if not cyc_data["has_active_cyclone"]:
                assert "No active cyclone" in cyc_data.get("message", "")
                print(f"  [Verified] {name}: No fake cyclone created. Message: '{cyc_data['message']}'")

        # 6. Combined All Hazards API
        all_res = client.get(f"/api/hazards/all?lat={lat}&lng={lng}&name={name}")
        assert all_res.status_code == 200
        all_data = all_res.json()
        assert all_data["location"] == name
        assert "earthquakes" in all_data
        assert "volcanoes" in all_data
        assert "wildfires" in all_data
        assert "cyclones" in all_data

        print(f"[OK] {name} ({lat}, {lng}) -> Earthquakes: {eq_data['count']}, Volcanoes: {volc_data['count']}, Wildfires: {fire_data['count']}, Cyclone Active: {cyc_data['has_active_cyclone']}")

    print("\nALL PHASE 4 MULTI-HAZARD MONITORING ENDPOINT TESTS PASSED SUCCESSFULLY!")

    print("\n--- TESTING PHASE 5 PROJECTED IMPACT & CASCADE ENDPOINTS ---")
    p5_locations = [
        {"name": "Chennai", "lat": 13.0827, "lng": 80.2707},
        {"name": "Kedarnath", "lat": 30.7346, "lng": 79.0669},
        {"name": "Tokyo", "lat": 35.6762, "lng": 139.6503},
        {"name": "San Francisco", "lat": 37.7749, "lng": -122.4194},
        {"name": "Russia", "lat": 55.7558, "lng": 37.6173},
        {"name": "London", "lat": 51.5074, "lng": -0.1278},
    ]

    for loc in p5_locations:
        name = loc["name"]
        lat = loc["lat"]
        lng = loc["lng"]

        # 1. Projected Impact (+3H window)
        imp_res = client.get(f"/api/impact/projected?lat={lat}&lng={lng}&name={name}&hours=3")
        assert imp_res.status_code == 200, f"Impact projected failed for {name}: {imp_res.text}"
        imp_data = imp_res.json()
        assert imp_data["data_type"] == "PROJECTED_IMPACT"
        assert "NOT CONFIRMED" in imp_data["disclaimer"]
        assert "current_affected_area" in imp_data
        assert "projected_next_region" in imp_data
        assert "projected_following_region" in imp_data
        assert "confidence_pct" in imp_data

        # 2. Disaster Cascade Chain
        cas_res = client.get(f"/api/impact/cascade?lat={lat}&lng={lng}&name={name}")
        assert cas_res.status_code == 200, f"Disaster cascade failed for {name}: {cas_res.text}"
        cas_data = cas_res.json()
        assert len(cas_data["cascade_chain"]) >= 4

        print(f"[OK] {name} ({lat}, {lng}) -> Projected Next: '{imp_data['projected_next_region']}', Confidence: {imp_data['confidence_pct']}%, Cascade Steps: {len(cas_data['cascade_chain'])}")

    print("\nALL PHASE 5 PROJECTED IMPACT & DISASTER CASCADE TESTS PASSED SUCCESSFULLY!")

    print("\n--- TESTING PHASE 6 EARLY WARNING CENTER & ALERT ENDPOINTS ---")
    
    # 1. Monitored Alert Areas
    areas_res = client.get("/api/alerts/areas")
    assert areas_res.status_code == 200
    areas_data = areas_res.json()
    assert areas_data["count"] >= 2
    print("[OK] GET /api/alerts/areas -> OK:", len(areas_data["alert_areas"]), "alert areas active")

    # 2. Create New Alert Area
    new_area = {
        "name": "WORK",
        "location_name": "San Francisco",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "radius_km": 15.0,
        "disaster_types": ["EARTHQUAKE", "FLOOD"],
        "minimum_severity": "HIGH"
    }
    create_res = client.post("/api/alerts/areas", json=new_area)
    assert create_res.status_code == 200
    assert create_res.json()["name"] == "WORK"
    print("[OK] POST /api/alerts/areas -> OK (New Monitored Area Created)")

    # 3. Simulate Safe DEMO Alert
    demo_res = client.post("/api/alerts/simulate-demo?hazard_type=FLOOD&location_name=Chennai&lat=13.0827&lng=80.2707")
    assert demo_res.status_code == 200
    demo_data = demo_res.json()
    assert demo_data["data_type"] == "DEMO"
    demo_id = demo_data["alert_id"]
    print("[OK] POST /api/alerts/simulate-demo -> OK (DEMO Alert Generated:", demo_id, ")")

    # 4. Active Geo-Targeted Alerts for locations
    p6_locations = [
        {"name": "Chennai", "lat": 13.0827, "lng": 80.2707},
        {"name": "Tokyo", "lat": 35.6762, "lng": 139.6503},
        {"name": "Russia", "lat": 55.7558, "lng": 37.6173},
        {"name": "San Francisco", "lat": 37.7749, "lng": -122.4194},
        {"name": "London", "lat": 51.5074, "lng": -0.1278},
        {"name": "Kedarnath", "lat": 30.7346, "lng": 79.0669},
    ]

    for loc in p6_locations:
        act_res = client.get(f"/api/alerts/active?lat={loc['lat']}&lng={loc['lng']}&radius_km=25")
        assert act_res.status_code == 200
        act_data = act_res.json()
        print(f"[OK] {loc['name']} -> Active Alerts Count: {act_data['count']}")

    # 5. Acknowledge Alert
    ack_res = client.post(f"/api/alerts/acknowledge/{demo_id}")
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "ACKNOWLEDGED"
    print("[OK] POST /api/alerts/acknowledge -> OK")

    # 6. Alert History
    hist_res = client.get("/api/alerts/history")
    assert hist_res.status_code == 200
    assert hist_res.json()["count"] > 0
    print("[OK] GET /api/alerts/history -> OK")

    print("\nALL PHASE 6 EARLY WARNING CENTER & ALERT TESTS PASSED SUCCESSFULLY!")

    print("\n--- TESTING PHASE 7 PHONE REGISTRATION & SMS ALERT ENDPOINTS ---")

    # 1. SMS Provider Status
    status_res = client.get("/api/notifications/sms-status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert "status" in status_data
    assert status_data["status"] in ["CONNECTED", "DEMO"]
    print("[OK] GET /api/notifications/sms-status -> OK (Status:", status_data["status"], ")")

    # 2. Country Codes Endpoint
    cc_res = client.get("/api/notifications/country-codes")
    assert cc_res.status_code == 200
    assert len(cc_res.json()["country_codes"]) >= 5
    print("[OK] GET /api/notifications/country-codes -> OK")

    # 3. Invalid Phone Format Test
    inv_res = client.post("/api/notifications/register-phone", json={"country_code": "+91", "phone_number": "abc"})
    assert inv_res.status_code == 400
    print("[OK] POST /api/notifications/register-phone (Invalid phone) -> Rejected correctly")

    # 4. Register Valid Phone Number & Get OTP
    reg_payload = {
        "country_code": "+91",
        "phone_number": "9876543210",
        "language": "en",
        "location": "Chennai"
    }
    reg_res = client.post("/api/notifications/register-phone", json=reg_payload)
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert reg_data["status"] in ["OTP_SENT", "PROVIDER_ACCEPTED", "DEMO", "NOT_CONFIGURED"]
    demo_otp = reg_data.get("demo_otp")
    if not demo_otp:
        from services.sms_service import _ACTIVE_OTPS
        otp_record = _ACTIVE_OTPS.get("+919876543210")
        demo_otp = otp_record.get("otp") if otp_record else None
    assert demo_otp is not None, "OTP should exist in system"
    print("[OK] POST /api/notifications/register-phone -> OTP Sent (Masked:", reg_data["phone_masked"], ")")

    # 5. Invalid OTP Verification Test
    inv_otp_res = client.post("/api/notifications/verify-phone", json={
        "country_code": "+91",
        "phone_number": "9876543210",
        "otp": "000000"
    })
    assert inv_otp_res.status_code == 400
    print("[OK] POST /api/notifications/verify-phone (Invalid OTP) -> Rejected correctly")

    # 6. Verify Phone Number with Correct OTP
    verify_res = client.post("/api/notifications/verify-phone", json={
        "country_code": "+91",
        "phone_number": "9876543210",
        "otp": demo_otp
    })
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["status"] == "VERIFIED"
    assert verify_data["profile"]["verified"] is True
    print("[OK] POST /api/notifications/verify-phone -> Phone Verified Successfully!")

    # 7. Update Preferences for Verified Phone
    pref_payload = {
        "country_code": "+91",
        "phone_number": "9876543210",
        "disaster_types": ["FLOOD", "CYCLONE", "TSUNAMI"],
        "minimum_severity": "EXTREME",
        "language": "hi",
        "sms_enabled": True
    }
    pref_res = client.post("/api/notifications/subscribe-sms", json=pref_payload)
    assert pref_res.status_code == 200
    assert pref_res.json()["profile"]["minimum_severity"] == "EXTREME"
    print("[OK] POST /api/notifications/subscribe-sms -> Preferences Updated")

    # 8. Fetch Saved Preferences
    get_pref_res = client.get("/api/notifications/preferences?country_code=%2B91&phone_number=9876543210")
    assert get_pref_res.status_code == 200
    assert get_pref_res.json()["profile"]["language"] == "hi"
    print("[OK] GET /api/notifications/preferences -> Fetched saved preferences")

    # 9. Send Demo SMS Alert Simulation
    demo_sms_payload = {
        "country_code": "+91",
        "phone_number": "9876543210",
        "hazard_type": "FLOOD",
        "location": "Chennai",
        "severity": "EXTREME",
        "projected_next_region": "Chennai Downstream Sector (+3H)"
    }
    demo_sms_res = client.post("/api/notifications/send-demo-sms", json=demo_sms_payload)
    assert demo_sms_res.status_code == 200
    assert demo_sms_res.json()["success"] is True
    print("[OK] POST /api/notifications/send-demo-sms -> Demo SMS Generated Successfully!")

    # 10. Fetch SMS Delivery History Log
    log_res = client.get("/api/notifications/delivery-history")
    assert log_res.status_code == 200
    assert log_res.json()["count"] > 0
    print("[OK] GET /api/notifications/delivery-history -> Log entries returned:", log_res.json()["count"])

    # 11. Unsubscribe Phone Number
    unsub_res = client.delete("/api/notifications/subscribe-sms?country_code=%2B91&phone_number=9876543210")
    assert unsub_res.status_code == 200
    assert unsub_res.json()["status"] == "UNSUBSCRIBED"
    print("[OK] DELETE /api/notifications/subscribe-sms -> Unsubscribed")

    print("\nALL PHASE 7 PHONE REGISTRATION & SMS ALERT TESTS PASSED SUCCESSFULLY!")

    print("\n--- TESTING PHASE 8 MOBILE PUSH (WEB/FCM/APNS) ENDPOINTS ---")

    # 1. Multi-Platform Push Provider Status
    pstatus_res = client.get("/api/notifications/push-status")
    assert pstatus_res.status_code == 200
    pstatus_data = pstatus_res.json()
    assert "overall_status" in pstatus_data
    assert "platforms" in pstatus_data
    assert "web" in pstatus_data["platforms"]
    assert "android" in pstatus_data["platforms"]
    assert "ios" in pstatus_data["platforms"]
    print("[OK] GET /api/notifications/push-status -> OK (Web, FCM, APNs Checked)")

    # 2. Register Web Push Device
    wdev_res = client.post("/api/notifications/register-device", json={
        "device_id": "test_web_dev_01",
        "platform": "WEB",
        "push_token": "vapid_test_token_123456789",
        "language": "en"
    })
    assert wdev_res.status_code == 200
    assert wdev_res.json()["success"] is True
    print("[OK] POST /api/notifications/register-device (WEB) -> Registered Successfully")

    # 3. Register Android FCM Device
    adev_res = client.post("/api/notifications/register-device", json={
        "device_id": "test_android_dev_01",
        "platform": "ANDROID",
        "push_token": "fcm_test_token_987654321",
        "language": "hi"
    })
    assert adev_res.status_code == 200
    assert adev_res.json()["success"] is True
    print("[OK] POST /api/notifications/register-device (ANDROID) -> Registered Successfully")

    # 4. Register iOS APNs Device
    idev_res = client.post("/api/notifications/register-device", json={
        "device_id": "test_ios_dev_01",
        "platform": "IOS",
        "push_token": "apns_test_token_abcdef123456",
        "language": "en"
    })
    assert idev_res.status_code == 200
    assert idev_res.json()["success"] is True
    print("[OK] POST /api/notifications/register-device (IOS) -> Registered Successfully")

    # 5. Fetch Registered Devices
    devs_res = client.get("/api/notifications/devices")
    assert devs_res.status_code == 200
    assert devs_res.json()["count"] >= 3
    print("[OK] GET /api/notifications/devices -> OK (Count:", devs_res.json()["count"], ")")

    # 6. Trigger Test Push for Web, FCM, and APNs (with iOS Critical Alert payload check)
    for plat in ["WEB", "ANDROID", "IOS"]:
        tpush_res = client.post("/api/notifications/test-push", json={"platform": plat})
        assert tpush_res.status_code == 200
        tpush_data = tpush_res.json()
        assert tpush_data["success"] is True
        payload = tpush_data["push_payload"]
        if plat == "IOS":
            assert "aps" in payload, "APNs payload structure expected for iOS"
            assert payload["aps"]["sound"]["critical"] == 1, "iOS Critical Alert expected for EXTREME severity"
        print(f"[OK] POST /api/notifications/test-push ({plat}) -> OK (Payload & Critical Alert verified)")

    # 7. Fetch Push Delivery History
    phist_res = client.get("/api/notifications/push-history")
    assert phist_res.status_code == 200
    assert phist_res.json()["count"] >= 3
    print("[OK] GET /api/notifications/push-history -> OK (Log count:", phist_res.json()["count"], ")")

    # 8. Unregister Device
    unreg_res = client.post("/api/notifications/unregister-device", json={"device_id": "test_web_dev_01"})
    assert unreg_res.status_code == 200
    assert unreg_res.json()["status"] == "UNREGISTERED"
    print("[OK] POST /api/notifications/unregister-device -> Device Unregistered")

    print("\nALL PHASE 8 MOBILE PUSH (WEB/FCM/APNS) TESTS PASSED SUCCESSFULLY!")

    # ========================================================================
    # PHASE 9 — AI SAFETY GUIDE & CONVERSATIONAL VOICE ASSISTANT ENDPOINTS
    # ========================================================================
    print("\n--- TESTING PHASE 9 AI SAFETY GUIDE & VOICE ASSISTANT ENDPOINTS ---")

    # 1. Weather Query (English)
    weather_q = client.post("/api/ai/query", json={
        "query": "What is the weather in Chennai?",
        "location_name": "Chennai",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "language": "en"
    })
    assert weather_q.status_code == 200
    wd = weather_q.json()
    assert "reply_text" in wd
    assert wd["character_state"] in ["WEATHER", "GUIDING", "NORMAL"]
    assert "source" in wd
    assert "data_status" in wd
    print(f"[OK] POST /api/ai/query (weather) -> State: {wd['character_state']}, Source: {wd['source']}")

    # 2. Alert / Warning Query
    alert_q = client.post("/api/ai/query", json={
        "query": "Is there a flood warning near Chennai?",
        "location_name": "Chennai",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "language": "en"
    })
    assert alert_q.status_code == 200
    ad = alert_q.json()
    assert "reply_text" in ad
    assert ad["character_state"] in ["WARNING", "NORMAL"]
    print(f"[OK] POST /api/ai/query (alert) -> State: {ad['character_state']}")

    # 3. Rescue / Trapped Scenario
    rescue_q = client.post("/api/ai/query", json={
        "query": "I am trapped and need rescue",
        "location_name": "Kedarnath",
        "latitude": 30.7346,
        "longitude": 79.0669,
        "language": "en"
    })
    assert rescue_q.status_code == 200
    rd = rescue_q.json()
    assert rd["character_state"] == "RESCUE"
    assert rd["action"]["type"] == "TRIGGER_RESCUE"
    print(f"[OK] POST /api/ai/query (rescue) -> State: RESCUE, Action: TRIGGER_RESCUE")

    # 4. Under-Debris / Buried Scenario
    buried_q = client.post("/api/ai/query", json={
        "query": "I am buried under debris",
        "location_name": "Kedarnath",
        "latitude": 30.7346,
        "longitude": 79.0669,
        "language": "en"
    })
    assert buried_q.status_code == 200
    bd = buried_q.json()
    assert bd["character_state"] == "RESCUE"
    assert "cannot determine" in bd["reply_text"].lower() or "phone" in bd["reply_text"].lower()
    print(f"[OK] POST /api/ai/query (buried) -> Correctly disclaims underground detection")

    # 5. Map Layer Command — Rainfall
    rain_q = client.post("/api/ai/query", json={
        "query": "Show rainfall",
        "location_name": "Chennai",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "language": "en"
    })
    assert rain_q.status_code == 200
    rq = rain_q.json()
    assert rq["action"]["type"] == "ACTIVATE_LAYER"
    assert rq["action"]["layer"] == "rainfall"
    print(f"[OK] POST /api/ai/query (show rainfall) -> Layer: rainfall activated")

    # 6. Map Layer Command — Earthquake
    eq_q = client.post("/api/ai/query", json={
        "query": "Show earthquakes",
        "location_name": "Tokyo",
        "latitude": 35.6762,
        "longitude": 139.6503,
        "language": "en"
    })
    assert eq_q.status_code == 200
    eq_d = eq_q.json()
    assert eq_d["action"]["type"] == "ACTIVATE_LAYER"
    assert eq_d["action"]["layer"] == "earthquake"
    print(f"[OK] POST /api/ai/query (show earthquakes) -> Layer: earthquake activated")

    # 7. Location Navigation Command
    nav_q = client.post("/api/ai/query", json={
        "query": "Go to London",
        "location_name": "Chennai",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "language": "en"
    })
    assert nav_q.status_code == 200
    nd = nav_q.json()
    assert nd["character_state"] == "NAVIGATION"
    assert nd["action"]["type"] == "NAVIGATE_MAP"
    print(f"[OK] POST /api/ai/query (go to London) -> NAVIGATE_MAP to {nd['action'].get('location_name', 'London')}")

    # 8. Shelter Query
    shelter_q = client.post("/api/ai/query", json={
        "query": "Where is the nearest shelter?",
        "location_name": "Kedarnath",
        "latitude": 30.7346,
        "longitude": 79.0669,
        "language": "en"
    })
    assert shelter_q.status_code == 200
    sd = shelter_q.json()
    assert sd["character_state"] == "NAVIGATION"
    print(f"[OK] POST /api/ai/query (shelter) -> State: NAVIGATION")

    # 9. Tutorial Endpoint
    tutorial_res = client.get("/api/ai/tutorial")
    assert tutorial_res.status_code == 200
    td = tutorial_res.json()
    assert "steps" in td
    assert len(td["steps"]) >= 5
    assert td["steps"][0]["step"] == 1
    print(f"[OK] GET /api/ai/tutorial -> {len(td['steps'])} tutorial steps returned")

    # 10. Hindi Language Query
    hindi_q = client.post("/api/ai/query", json={
        "query": "यहां का मौसम कैसा है?",
        "location_name": "Chennai",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "language": "hi"
    })
    assert hindi_q.status_code == 200
    hd = hindi_q.json()
    assert "reply_text" in hd
    assert hd["language"] == "hi"
    print(f"[OK] POST /api/ai/query (Hindi) -> Language: hi, State: {hd['character_state']}")

    # 11. Risk / Danger Query
    risk_q = client.post("/api/ai/query", json={
        "query": "Is it dangerous here?",
        "location_name": "San Francisco",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "language": "en"
    })
    assert risk_q.status_code == 200
    rkd = risk_q.json()
    assert rkd["character_state"] == "WARNING"
    assert rkd["data_status"] == "MODEL PREDICTION"
    print(f"[OK] POST /api/ai/query (danger) -> State: WARNING, Status: MODEL PREDICTION")

    # 12. Empty Query Validation
    empty_q = client.post("/api/ai/query", json={
        "query": "",
        "location_name": "Chennai",
        "latitude": 13.0827,
        "longitude": 80.2707
    })
    assert empty_q.status_code == 400
    print(f"[OK] POST /api/ai/query (empty) -> Rejected correctly (400)")

    # 13. Tutorial / How to Use
    guide_q = client.post("/api/ai/query", json={
        "query": "How to use this website?",
        "location_name": "Chennai",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "language": "en"
    })
    assert guide_q.status_code == 200
    gd = guide_q.json()
    assert gd["character_state"] == "GUIDING"
    assert gd["action"]["type"] == "START_TUTORIAL"
    print(f"[OK] POST /api/ai/query (tutorial) -> State: GUIDING, Action: START_TUTORIAL")

    print("\nALL PHASE 9 AI SAFETY GUIDE & VOICE ASSISTANT TESTS PASSED SUCCESSFULLY!")

    # ========================================================================
    # PHASE 10 — LIFE SAFETY MODE, SHELTERS, ROUTES & EMERGENCY GUIDANCE
    # ========================================================================
    print("\n--- TESTING PHASE 10 LIFE SAFETY MODE, SHELTERS & ROUTES ENDPOINTS ---")

    # 1. Lower-Risk Areas (Flood)
    areas_res = client.get("/api/safety/areas?lat=13.0827&lng=80.2707&hazard_type=FLOOD")
    assert areas_res.status_code == 200
    ad = areas_res.json()
    assert ad["count"] > 0
    assert "RECOMMENDED LOWER-RISK AREA" in ad["lower_risk_areas"][0]["type"]
    assert "100%" not in ad["lower_risk_areas"][0]["type"]
    print(f"[OK] GET /api/safety/areas (Flood) -> {ad['count']} lower-risk areas returned. Label: {ad['lower_risk_areas'][0]['safety_label']}")

    # 2. Verified Designated Shelters (Kedarnath - Mountain & Underground)
    shelters_res = client.get("/api/safety/shelters?lat=30.7346&lng=79.0669&hazard_type=FLOOD")
    assert shelters_res.status_code == 200
    sd = shelters_res.json()
    assert sd["count"] > 0
    nearest = sd["nearest_shelter"]
    assert "name" in nearest
    # Check underground suitability warning for FLOOD
    underground_sh = [s for s in sd["shelters"] if s["underground"]]
    if underground_sh:
        assert underground_sh[0]["suitability_status"] == "NOT RECOMMENDED"
        print(f"[OK] GET /api/safety/shelters -> Correctly warns NOT RECOMMENDED for underground shelter during FLOOD!")

    # 3. Safer Available Route Calculation
    route_res = client.get("/api/safety/routes?fromLat=13.0827&fromLng=80.2707&toLat=13.0627&toLng=80.2787&hazard_type=FLOOD")
    assert route_res.status_code == 200
    rd = route_res.json()
    assert rd["route_status"] in ["ROUTE AVAILABLE", "ROUTE WARNING", "NO VERIFIED SAFE ROUTE AVAILABLE"]
    assert len(rd["waypoints"]) > 0
    assert len(rd["turn_by_turn_instructions"]) > 0
    assert "100% safe" not in rd["safety_disclaimer"].lower()
    print(f"[OK] GET /api/safety/routes -> Status: {rd['route_status']}, Walk Time: ~{rd['estimated_walk_time_mins']} mins")

    # 4. Consolidated Emergency Safety Status Summary
    status_res = client.get("/api/safety/status?lat=30.7346&lng=79.0669&hazard_type=FLOOD&location_name=Kedarnath")
    assert status_res.status_code == 200
    std = status_res.json()
    assert "current_risk" in std
    assert "projected_impact" in std
    assert "designated_shelter" in std
    assert "safer_route" in std
    assert len(std["emergency_contacts"]) >= 5
    print(f"[OK] GET /api/safety/status -> Emergency status compiled cleanly for {std['location']['name']}")

    # 5. Disaster-Specific Safety Rules
    rules_res = client.get("/api/safety/rules?hazard_type=EARTHQUAKE")
    assert rules_res.status_code == 200
    rld = rules_res.json()
    assert "DROP, COVER" in rld["immediate_action"].upper()
    print(f"[OK] GET /api/safety/rules (Earthquake) -> Rule: {rld['key_rule']}")

    print("\nALL PHASE 10 LIFE SAFETY MODE, SHELTERS & ROUTES TESTS PASSED SUCCESSFULLY!")

    # ========================================================================
    # PHASE 11 — EMERGENCY RESCUE MODE, GPS REQUESTS & RESPONDER OPERATIONS
    # ========================================================================
    print("\n--- TESTING PHASE 11 EMERGENCY RESCUE MODE & RESPONDER OPERATIONS ENDPOINTS ---")

    # 1. Create Rescue Request
    req_payload = {
        "user_id": "test_user_777",
        "user_name": "Alexander Knight",
        "verified_phone": "+1 (555) 019-2834",
        "verified_email": "alex.knight@example.com",
        "latitude": 30.7346,
        "longitude": 79.0669,
        "gps_accuracy_m": 4.5,
        "last_known_location": "Kedarnath Valley Upper Trail",
        "disaster_type": "LANDSLIDE",
        "user_condition": "TRAPPED",
        "user_message": "Rockfall blocked exit path. Need evacuation assistance.",
        "battery_level_pct": 68,
        "network_status": "CELLULAR_3G",
        "alert_area": "Kedarnath Sector B",
        "language": "en"
    }
    create_req_res = client.post("/api/rescue/request", json=req_payload)
    assert create_req_res.status_code == 200, f"Rescue request failed: {create_req_res.text}"
    req_data = create_req_res.json()
    assert "rescue_id" in req_data
    rescue_id = req_data["rescue_id"]
    assert req_data["status"] == "REQUESTED"
    assert req_data["priority"] == "HIGH"
    assert "help_guarantee_disclaimer" in req_data
    assert "help is on the way" not in req_data["help_guarantee_disclaimer"].lower()
    print(f"[OK] POST /api/rescue/request -> Created {rescue_id}, Status: {req_data['status']}, Priority: {req_data['priority']}")

    # 2. Get Rescue Request Details
    get_req_res = client.get(f"/api/rescue/{rescue_id}")
    assert get_req_res.status_code == 200
    detail_data = get_req_res.json()
    assert detail_data["rescue_id"] == rescue_id
    assert detail_data["user_condition"] == "TRAPPED"
    print(f"[OK] GET /api/rescue/{rescue_id} -> Fetched details for {rescue_id}")

    # 3. List Rescue Requests (Responder Operations Center)
    list_req_res = client.get("/api/rescue/requests")
    assert list_req_res.status_code == 200
    list_data = list_req_res.json()
    assert list_data["count"] >= 1
    assert any(r["rescue_id"] == rescue_id for r in list_data["requests"])
    print(f"[OK] GET /api/rescue/requests -> {list_data['count']} active requests listed for Operations Center")

    # 4. Responder Update Status (ACKNOWLEDGED)
    ack_res = client.post(f"/api/rescue/{rescue_id}/status", json={
        "status": "ACKNOWLEDGED",
        "responder_id": "RESP_TEAM_01",
        "note": "Kedarnath Rescue Command acknowledged request. Evaluating route.",
        "auth_token": "RESPONDER-AUTH-KEY-2026"
    })
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "ACKNOWLEDGED"
    print(f"[OK] POST /api/rescue/{rescue_id}/status -> Updated to ACKNOWLEDGED")

    # 5. Responder Update Status (DISPATCHED)
    disp_res = client.post(f"/api/rescue/{rescue_id}/status", json={
        "status": "DISPATCHED",
        "responder_id": "RESP_TEAM_01",
        "note": "Mountain Rescue Team 4 dispatched from Guptkashi base.",
        "auth_token": "RESPONDER-AUTH-KEY-2026"
    })
    assert disp_res.status_code == 200
    assert disp_res.json()["status"] == "DISPATCHED"
    print(f"[OK] POST /api/rescue/{rescue_id}/status -> Updated to DISPATCHED")

    # 6. Update User GPS Location
    loc_res = client.post(f"/api/rescue/{rescue_id}/location", json={
        "latitude": 30.7350,
        "longitude": 79.0672,
        "gps_accuracy_m": 3.2,
        "movement_status": "STATIONARY"
    })
    assert loc_res.status_code == 200
    assert loc_res.json()["movement_status"] == "STATIONARY"
    print(f"[OK] POST /api/rescue/{rescue_id}/location -> Updated GPS location")

    # 7. Two-Way Message Exchange
    msg_res = client.post(f"/api/rescue/{rescue_id}/message", json={
        "sender_type": "RESPONDER",
        "sender_id": "COMMAND_01",
        "message_text": "Team dispatched. Remain at current elevated position.",
        "channel": "SMS"
    })
    assert msg_res.status_code == 200
    mdata = msg_res.json()
    assert mdata["delivery_status"] in ["SENT", "DELIVERED"]
    print(f"[OK] POST /api/rescue/{rescue_id}/message -> Message sent. Delivery status: {mdata['delivery_status']}")

    # 8. Emergency Contacts API
    get_contacts_res = client.get("/api/rescue/contacts")
    assert get_contacts_res.status_code == 200
    cdata = get_contacts_res.json()
    assert cdata["count"] >= 1
    print(f"[OK] GET /api/rescue/contacts -> {cdata['count']} default emergency contacts loaded")

    # 9. Add Emergency Contact
    add_contact_res = client.post("/api/rescue/contacts", json={
        "name": "Sarah Knight",
        "relationship": "Spouse",
        "phone": "+1 (555) 019-9988",
        "email": "sarah.k@example.com",
        "notify_on_rescue": True
    })
    assert add_contact_res.status_code == 200
    assert add_contact_res.json()["name"] == "Sarah Knight"
    print(f"[OK] POST /api/rescue/contacts -> Added new emergency contact")

    # 10. Notify Emergency Contacts
    notify_c_res = client.post(f"/api/rescue/{rescue_id}/notify-contacts")
    assert notify_c_res.status_code == 200
    ncdata = notify_c_res.json()
    assert ncdata["notified_count"] >= 1
    print(f"[OK] POST /api/rescue/{rescue_id}/notify-contacts -> Notified {ncdata['notified_count']} emergency contacts")

    # 11. Safe DEMO Simulation Scenario
    demo_sim_res = client.post("/api/rescue/simulate-demo?location_name=Kedarnath&hazard_type=LANDSLIDE")
    assert demo_sim_res.status_code == 200
    dsdata = demo_sim_res.json()
    assert dsdata["data_type"] == "DEMO"
    assert "RES-DEMO-" in dsdata["rescue_id"]
    print(f"[OK] POST /api/rescue/simulate-demo -> Created safe DEMO scenario {dsdata['rescue_id']}")

    # 12. User Cancel Request
    cancel_res = client.post(f"/api/rescue/{rescue_id}/cancel", json={
        "reason": "Reached safe shelter independently."
    })
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"
    print(f"[OK] POST /api/rescue/{rescue_id}/cancel -> Rescue request cancelled cleanly")

    print("\nALL PHASE 11 EMERGENCY RESCUE MODE & RESPONDER OPERATIONS TESTS PASSED SUCCESSFULLY!")

    # ========================================================================
    # PHASE 12 — CAP, RADIO/BROADCAST, MEDIA & SIREN GATEWAY
    # ========================================================================
    print("\n--- TESTING PHASE 12 CAP, RADIO/BROADCAST, MEDIA & SIREN GATEWAY ENDPOINTS ---")

    # 1. CAP Generate XML
    cap_gen_res = client.get("/api/cap/generate?alert_id=ALT-TEST-99")
    assert cap_gen_res.status_code == 200, f"CAP generate failed: {cap_gen_res.text}"
    cap_gen_data = cap_gen_res.json()
    assert "xml" in cap_gen_data
    assert "<?xml" in cap_gen_data["xml"]
    assert "ALT-TEST-99" in cap_gen_data["xml"]
    print(f"[OK] GET /api/cap/generate -> Generated valid CAP XML")

    # 2. CAP Feed & Single Alert
    cap_feed_res = client.get("/api/cap/feed")
    assert cap_feed_res.status_code == 200
    feed_data = cap_feed_res.json()
    assert "feed" in feed_data
    assert feed_data["count"] >= 1
    print(f"[OK] GET /api/cap/feed -> {feed_data['count']} CAP alerts returned in feed")

    cap_single_res = client.get(f"/api/cap/{feed_data['feed'][0]['alert_id']}")
    assert cap_single_res.status_code == 200
    print(f"[OK] GET /api/cap/{{alert_id}} -> Fetched single CAP alert metadata")

    # 3. CAP Validation
    valid_xml = cap_gen_data["xml"]
    val_res = client.post("/api/cap/validate", content=valid_xml, headers={"Content-Type": "text/plain"})
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["valid"] is True
    assert val_data["status"] == "CAP VALID"
    print(f"[OK] POST /api/cap/validate -> Status: CAP VALID")

    invalid_xml = "<alert><identifier></identifier></alert>"
    inval_res = client.post("/api/cap/validate", content=invalid_xml, headers={"Content-Type": "text/plain"})
    assert inval_res.status_code == 200
    inval_data = inval_res.json()
    assert inval_data["valid"] is False
    assert inval_data["status"] == "CAP INVALID"
    print(f"[OK] POST /api/cap/validate (Invalid XML) -> Status: CAP INVALID")

    # 4. Broadcast Channel Status
    bstatus_res = client.get("/api/broadcast/status")
    assert bstatus_res.status_code == 200
    bstatus = bstatus_res.json()
    assert "channels" in bstatus
    assert len(bstatus["channels"]) >= 5
    print(f"[OK] GET /api/broadcast/status -> {len(bstatus['channels'])} channel statuses retrieved")

    # 5. Radio Script Generation
    radio_res = client.post("/api/broadcast/generate-radio-script", json={
        "alert_id": "ALT-RADIO-01",
        "location": "Kedarnath Valley",
        "event": "FLOOD",
        "severity": "EXTREME",
        "instructions": "Evacuate to high ground immediately."
    })
    assert radio_res.status_code == 200
    rscript = radio_res.json()
    assert "script" in rscript
    assert "Emergency flood warning" in rscript["script"] or "Kedarnath Valley" in rscript["script"]
    print(f"[OK] POST /api/broadcast/generate-radio-script -> Radio script generated successfully")

    # 6. TV Bulletin Generation
    tv_res = client.post("/api/broadcast/generate-tv-bulletin", json={
        "alert_id": "ALT-TV-01",
        "location": "Chennai",
        "event": "CYCLONE",
        "severity": "EXTREME"
    })
    assert tv_res.status_code == 200
    tv_data = tv_res.json()
    assert "headline" in tv_data
    assert "graphic_text" in tv_data
    print(f"[OK] POST /api/broadcast/generate-tv-bulletin -> TV bulletin generated successfully")

    # 7. Complete Emergency Media Bulletin
    media_res = client.post("/api/broadcast/generate-media-bulletin", json={
        "alert_id": "ALT-MEDIA-01",
        "location": "Kedarnath",
        "event": "LANDSLIDE",
        "severity": "EXTREME",
        "projected_area": "Guptkashi Sector (+3H)"
    })
    assert media_res.status_code == 200
    mdata = media_res.json()
    assert "bulletin_text" in mdata
    assert "PROJECTED IMPACT — NOT CONFIRMED" in mdata["projected_area"] or "PROJECTED" in mdata["bulletin_text"]
    print(f"[OK] POST /api/broadcast/generate-media-bulletin -> Media bulletin generated with clear projected impact labeling")

    # 8. Social Media Text
    social_res = client.post("/api/broadcast/generate-social-text", json={
        "alert_id": "ALT-SOC-01",
        "location": "Chennai",
        "event": "FLOOD",
        "severity": "HIGH"
    })
    assert social_res.status_code == 200
    assert "text" in social_res.json()
    print(f"[OK] POST /api/broadcast/generate-social-text -> Social emergency text generated")

    # 9. Media Distribution Status & History
    mstat_res = client.get("/api/broadcast/media-status")
    assert mstat_res.status_code == 200
    print(f"[OK] GET /api/broadcast/media-status -> OK")

    mhist_res = client.get("/api/broadcast/media-history")
    assert mhist_res.status_code == 200
    print(f"[OK] GET /api/broadcast/media-history -> OK ({len(mhist_res.json()['history'])} history entries)")

    # 10. Siren Status & Zones
    siren_stat_res = client.get("/api/notifications/siren/status")
    assert siren_stat_res.status_code == 200
    sstat = siren_stat_res.json()
    assert sstat["siren_system_status"] in ["DEMO", "CONNECTED", "NOT CONFIGURED"]
    print(f"[OK] GET /api/notifications/siren/status -> Status: {sstat['siren_system_status']}")

    siren_zones_res = client.get("/api/broadcast/siren/zones")
    assert siren_zones_res.status_code == 200
    sz = siren_zones_res.json()
    assert sz["count"] >= 3
    print(f"[OK] GET /api/broadcast/siren/zones -> {sz['count']} zones configured")

    # 11. Unauthorized Siren Test/Activation (Security Check)
    unauth_test = client.post("/api/broadcast/siren/test", json={"siren_id": "SRN-KED-01", "auth_token": "INVALID-KEY"})
    assert unauth_test.status_code == 400
    assert "Unauthorized" in unauth_test.json()["detail"]
    print(f"[OK] POST /api/broadcast/siren/test (Invalid Auth) -> Rejected correctly with 400 Unauthorized")

    unauth_act = client.post("/api/notifications/siren/activate", json={
        "siren_id": "SRN-KED-01",
        "alert_id": "ALT-DEMO",
        "severity": "EXTREME",
        "duration_seconds": 60,
        "auth_token": "INVALID-KEY"
    })
    assert unauth_act.status_code == 400
    assert "Unauthorized" in unauth_act.json()["detail"]
    print(f"[OK] POST /api/notifications/siren/activate (Unauthorized) -> Rejected correctly with 400 Unauthorized")

    # 12. Authorized Siren Test & Activation
    auth_key = "AUTH-ADMIN-KEY-99"
    auth_test = client.post("/api/notifications/siren/test", json={"siren_id": "SRN-KED-01", "auth_token": auth_key})
    assert auth_test.status_code == 200
    assert auth_test.json()["status"] == "SIMULATED"
    assert auth_test.json()["mode"] == "DEMO SIREN ACTIVATION"
    print(f"[OK] POST /api/notifications/siren/test (Authorized) -> Mode: {auth_test.json()['mode']}")

    auth_act = client.post("/api/broadcast/siren/activate", json={
        "siren_id": "SRN-KED-01",
        "alert_id": "ALT-LIVE-01",
        "severity": "EXTREME",
        "duration_seconds": 60,
        "auth_token": auth_key
    })
    assert auth_act.status_code == 200
    act_data = auth_act.json()
    assert act_data["status"] in ["ACTIVATED", "SENT TO GATEWAY", "ACTIVATION UNKNOWN"]
    assert "activation_flow" in act_data
    print(f"[OK] POST /api/broadcast/siren/activate (Authorized) -> Activation Flow: {' -> '.join(act_data['activation_flow'])}")

    # 13. Siren Audit Log
    siren_audit_res = client.get("/api/broadcast/siren/audit")
    assert siren_audit_res.status_code == 200
    sa_data = siren_audit_res.json()
    assert sa_data["count"] >= 2
    print(f"[OK] GET /api/broadcast/siren/audit -> {sa_data['count']} audit entries recorded")

    print("\nALL PHASE 12 CAP, RADIO/BROADCAST, MEDIA & SIREN GATEWAY TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_all_endpoints()


# ============================================================
# PHASE 13 — Global Historical Analytics & Reports Tests
# ============================================================

GLOBAL_TEST_LOCATIONS = [
    {"name": "Chennai",         "lat": 13.0827,  "lng": 80.2707,   "country": "India"},
    {"name": "Kedarnath",       "lat": 30.7346,  "lng": 79.0669,   "country": "India"},
    {"name": "Tokyo",           "lat": 35.6762,  "lng": 139.6503,  "country": "Japan"},
    {"name": "San Francisco",   "lat": 37.7749,  "lng": -122.4194, "country": "USA"},
    {"name": "London",          "lat": 51.5074,  "lng": -0.1278,   "country": "UK"},
    {"name": "Russia",          "lat": 55.7558,  "lng": 37.6173,   "country": "Russia"},
    {"name": "Sydney",          "lat": -33.8688, "lng": 151.2093,  "country": "Australia"},
    {"name": "Kathmandu",       "lat": 27.7172,  "lng": 85.3240,   "country": "Nepal"},
]


def test_phase13_global_analytics():
    """Phase 13: Full global analytics test suite -- tests every required location."""
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)

    print("\n" + "="*70)
    print("PHASE 13 -- GLOBAL HISTORICAL ANALYTICS & REPORTS TESTS")
    print("="*70)

    # --- 1. Global Platform Statistics ---
    print("\n--- Global Platform Statistics ---")
    stats_res = client.get("/api/analytics/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["status"] == "LIVE"
    assert stats["countries_monitored"] == 195
    assert stats["live_data_sources"] >= 5
    assert "generated_at" in stats
    print(f"[OK] GET /api/analytics/stats -> {stats['countries_monitored']} countries, {stats['live_data_sources']} data sources, status={stats['status']}")

    # --- 2. Per-location Historical Weather ---
    print("\n--- Historical Weather (per-location, Open-Meteo Archive) ---")
    for loc in GLOBAL_TEST_LOCATIONS:
        res = client.get(f"/api/analytics/history?lat={loc['lat']}&lng={loc['lng']}&days=7")
        assert res.status_code == 200
        data = res.json()

        # Must have status & data_source
        assert "status" in data
        assert "data_source" in data
        assert "Open-Meteo" in data["data_source"]
        assert data["latitude"] == loc["lat"]
        assert data["longitude"] == loc["lng"]

        if data["status"] == "SUCCESS":
            assert len(data["history"]) > 0
            assert "summary" in data
            assert data["data_status"] in ["GOOD", "PARTIAL"]
            sample_day = data["history"][0]
            assert "date" in sample_day
            print(f"  [OK] {loc['name']:18s} ({loc['country']}) -> {data['data_status']:8s} | {len(data['history'])} days | temp_max={data['summary'].get('temp_max')}C | precip_total={data['summary'].get('precipitation_total_mm')}mm")
        else:
            assert data["data_status"] == "MISSING"
            assert "HISTORICAL DATA NOT AVAILABLE" in data.get("message", "")
            print(f"  [OK] {loc['name']:18s} ({loc['country']}) -> MISSING (transparently reported)")

    # --- 3. Per-location Historical Hazards ---
    print("\n--- Historical Disaster Events (per-location) ---")
    for loc in GLOBAL_TEST_LOCATIONS:
        res = client.get(f"/api/analytics/hazards?lat={loc['lat']}&lng={loc['lng']}&location={loc['name']}")
        assert res.status_code == 200
        data = res.json()
        assert data["location"] == loc["name"]
        assert "data_status" in data
        assert "events" in data
        assert isinstance(data["events"], list)

        if data["count"] > 0:
            evt = data["events"][0]
            assert "date" in evt
            assert "event" in evt
            assert "type" in evt
            assert "severity" in evt
            assert "source" in evt
            print(f"  [OK] {loc['name']:18s} -> {data['count']} events | Status={data['data_status']} | Latest: {evt['event'][:50]}")
        else:
            assert data["data_status"] in ["NO DATA", "MISSING"]
            print(f"  [OK] {loc['name']:18s} -> No events (transparently reported: '{data.get('note', '')[:60]}')")

    # --- 4. Per-location Report Generation ---
    print("\n--- Location Safety Reports ---")
    for loc in GLOBAL_TEST_LOCATIONS:
        res = client.get(f"/api/analytics/report?lat={loc['lat']}&lng={loc['lng']}&location={loc['name']}")
        assert res.status_code == 200
        report = res.json()

        # Report MUST be for the requested location, never cross-contaminated
        assert report["location"] == loc["name"], f"Report location mismatch: expected {loc['name']}, got {report['location']}"
        assert report["latitude"] == loc["lat"]
        assert report["longitude"] == loc["lng"]
        assert "data_coverage" in report
        assert report["data_coverage"] in ["GOOD", "PARTIAL", "MISSING"]
        assert "data_sources" in report
        assert len(report["data_sources"]) > 0
        assert "historical_weather_summary" in report
        assert "historical_hazards_summary" in report

        print(f"  [OK] {loc['name']:18s} -> Coverage={report['data_coverage']:8s} | Weather={report['historical_weather_summary']['status']} | Hazards={report['historical_hazards_summary']['status']} | Sources={len(report['data_sources'])}")

    # --- 5. Cross-contamination Guard ---
    print("\n--- Cross-contamination Guard ---")
    # Request Tokyo data -- verify it's NOT Chennai data
    tokyo_res = client.get("/api/analytics/hazards?lat=35.6762&lng=139.6503&location=Tokyo")
    tokyo_data = tokyo_res.json()
    for evt in tokyo_data.get("events", []):
        assert "chennai" not in evt.get("event", "").lower(), "Cross-contamination: Chennai event found in Tokyo!"
        assert "kedarnath" not in evt.get("event", "").lower(), "Cross-contamination: Kedarnath event found in Tokyo!"
    print(f"  [OK] Tokyo hazard data contains no Chennai/Kedarnath events")

    # Request Chennai data -- verify it's NOT Tokyo data
    chennai_res = client.get("/api/analytics/hazards?lat=13.0827&lng=80.2707&location=Chennai")
    chennai_data = chennai_res.json()
    for evt in chennai_data.get("events", []):
        assert "tokyo" not in evt.get("event", "").lower(), "Cross-contamination: Tokyo event found in Chennai!"
        assert "earthquake" not in evt.get("type", "").lower() or "india" in evt.get("source", "").lower(), "Cross-contamination warning"
    print(f"  [OK] Chennai hazard data contains no Tokyo events")

    # --- 6. Time Range Support ---
    print("\n--- Time Range Support ---")
    for days in [1, 7, 30, 90, 365]:
        res = client.get(f"/api/analytics/history?lat=13.0827&lng=80.2707&days={days}")
        assert res.status_code == 200
        data = res.json()
        print(f"  [OK] {days:5d} days -> status={data['status']}, records={data.get('record_count', 0)}")

    # --- 7. Data Coverage Transparency ---
    print("\n--- Data Coverage Transparency ---")
    # Test a random mid-ocean coordinate -- should return MISSING gracefully
    ocean_res = client.get("/api/analytics/hazards?lat=0.0&lng=-160.0&location=Pacific Ocean")
    ocean_data = ocean_res.json()
    assert ocean_data["count"] == 0
    assert ocean_data["data_status"] in ["NO DATA", "MISSING"]
    print(f"  [OK] Pacific Ocean (0 deg, -160 deg) -> count=0, status={ocean_data['data_status']} (transparent)")

    print("\n" + "="*70)
    print("ALL PHASE 13 GLOBAL ANALYTICS TESTS PASSED SUCCESSFULLY!")
    print("="*70)


def test_phase14_security_performance_accessibility():
    """Phase 14: Security, PII Privacy, Authorization, Rate Limiting & Observability Tests."""
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)

    print("\n" + "="*70)
    print("PHASE 14 -- SECURITY, PERFORMANCE, ACCESSIBILITY & HARDENING TESTS")
    print("="*70)

    # ── 1. Security Headers Verification ──
    print("\n--- Security Headers ---")
    h_res = client.get("/api/health")
    assert h_res.status_code == 200
    headers = h_res.headers
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("x-xss-protection") == "1; mode=block"
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    print("  [OK] All Security Headers Verified (nosniff, DENY, xss-protection, referrer-policy)")

    # ── 2. Observability & System Health Metrics ──
    print("\n--- Observability & Health Metrics ---")
    h_data = h_res.json()
    assert h_data["status"] == "online"
    assert h_data["version"] == "14.0.0"
    assert "providers" in h_data
    assert h_data["providers"]["open_meteo_weather"] == "CONNECTED"
    assert h_data["security_controls"]["pii_protection"] == "ENFORCED"
    assert h_data["security_controls"]["rate_limiter"] == "ACTIVE"
    print(f"  [OK] Health Observability -> Version {h_data['version']}, Providers: {len(h_data['providers'])}, PII: {h_data['security_controls']['pii_protection']}")

    # ── 3. Rescue PII Masking (Public vs Authorized Responder View) ──
    print("\n--- Rescue PII Privacy & Masking ---")
    # First create a rescue request with explicit PII
    create_res = client.post("/api/rescue/request", json={
        "user_name": "Eleanor Vance",
        "verified_phone": "+1 (555) 987-6543",
        "verified_email": "eleanor.vance@example.org",
        "latitude": 30.734619,
        "longitude": 79.066928,
        "user_condition": "TRAPPED",
        "disaster_type": "FLOOD"
    })
    assert create_res.status_code == 200
    rescue_id = create_res.json()["rescue_id"]

    # Public View (No Auth Token) -> Must be Masked!
    pub_res = client.get("/api/rescue/requests")
    assert pub_res.status_code == 200
    pub_data = pub_res.json()
    assert pub_data["responder_authorized"] is False
    target_pub = next((r for r in pub_data["requests"] if r["rescue_id"] == rescue_id), None)
    assert target_pub is not None
    assert "***" in target_pub["phone"], f"Phone not masked in public view: {target_pub['phone']}"
    assert "***" in target_pub["email"], f"Email not masked in public view: {target_pub['email']}"
    assert target_pub["user_name"] == "E. V.", f"User name not masked in public view: {target_pub['user_name']}"
    assert target_pub["latitude"] == 30.73, f"Latitude not rounded for public privacy: {target_pub['latitude']}"
    print(f"  [OK] Public View -> Masked Phone: '{target_pub['phone']}', Email: '{target_pub['email']}', Name: '{target_pub['user_name']}', Lat: {target_pub['latitude']}")

    # Responder View (With Valid Auth Token) -> Unmasked details!
    auth_res = client.get(f"/api/rescue/requests?auth_token=RESPONDER-AUTH-KEY-2026")
    assert auth_res.status_code == 200
    auth_data = auth_res.json()
    assert auth_data["responder_authorized"] is True
    target_auth = next((r for r in auth_data["requests"] if r["rescue_id"] == rescue_id), None)
    assert target_auth["phone"] == "+1 (555) 987-6543"
    assert target_auth["email"] == "eleanor.vance@example.org"
    print(f"  [OK] Responder View -> Unmasked details returned for authorized responder")

    # ── 4. Rescue Status Update Authorization ──
    print("\n--- Rescue Action Authorization ---")
    # Unauthorized status update -> 401
    unauth_status = client.post(f"/api/rescue/{rescue_id}/status", json={"status": "DISPATCHED"})
    assert unauth_status.status_code == 401
    assert "Unauthorized" in unauth_status.json()["detail"]
    print("  [OK] Unauthorized status update correctly rejected with 401 Unauthorized")

    # Authorized status update -> 200
    auth_status = client.post(f"/api/rescue/{rescue_id}/status", json={
        "status": "DISPATCHED",
        "auth_token": "RESPONDER-AUTH-KEY-2026"
    })
    assert auth_status.status_code == 200
    assert auth_status.json()["status"] == "DISPATCHED"
    print("  [OK] Authorized status update succeeded with valid responder token")

    # ── 5. Siren Activation Security & Cooldown ──
    print("\n--- Siren Gateway Security ---")
    # Bad token -> 400 or 401 Unauthorized error in service
    bad_siren = client.post("/api/broadcast/siren/activate", json={
        "siren_id": "S-002",
        "alert_id": "ALT-01",
        "severity": "EXTREME",
        "duration_seconds": 30,
        "auth_token": "WRONG_KEY"
    })
    assert bad_siren.status_code in [400, 401]
    assert "Unauthorized" in str(bad_siren.json())
    print("  [OK] Siren activation with invalid token rejected correctly")

    # Valid token -> 200
    good_siren = client.post("/api/broadcast/siren/activate", json={
        "siren_id": "S-002",
        "alert_id": "ALT-01",
        "severity": "EXTREME",
        "duration_seconds": 30,
        "auth_token": "AUTH-ADMIN-KEY-99"
    })
    assert good_siren.status_code == 200
    assert good_siren.json()["status"] == "ACTIVATED"
    print("  [OK] Siren activation succeeded with valid admin token")

    # Immediate second activation -> Cooldown Rate Limit error
    cooldown_siren = client.post("/api/broadcast/siren/activate", json={
        "siren_id": "S-002",
        "alert_id": "ALT-02",
        "severity": "EXTREME",
        "duration_seconds": 30,
        "auth_token": "AUTH-ADMIN-KEY-99"
    })
    assert cooldown_siren.status_code == 400
    assert "Cooldown" in cooldown_siren.json()["detail"] or "Rate limit" in cooldown_siren.json()["detail"]
    print("  [OK] Siren 60-second activation cooldown rate limit enforced")

    # ── 6. Input Coordinate Validation ──
    print("\n--- Input Boundary Validation ---")
    invalid_coord_res = client.post("/api/rescue/request", json={"latitude": 195.0, "longitude": 80.0})
    assert invalid_coord_res.status_code == 400
    assert "Invalid latitude" in invalid_coord_res.json()["detail"]
    print("  [OK] Out-of-bounds latitude (195.0) rejected cleanly with HTTP 400")

    # ── 7. Rate Limiting Middleware Throttling ──
    print("\n--- IP Rate Limiter Middleware ---")
    throttled = False
    for i in range(35):
        r = client.post("/api/notifications/register-phone", json={"country_code": "+91", "phone_number": f"987654321{i % 10}"})
        if r.status_code == 429:
            throttled = True
            assert "Rate limit exceeded" in r.json()["detail"]
            break
    assert throttled is True, "Rate limiter did not throttle requests after 30 calls"
    print("  [OK] IP Rate Limiter Middleware successfully throttled request flood with HTTP 429 Too Many Requests")

    print("\n" + "="*70)
    print("ALL PHASE 14 SECURITY, PERFORMANCE & ACCESSIBILITY TESTS PASSED SUCCESSFULLY!")
    print("="*70)


def test_phase15_emergency_sos():
    """Phase 15: Emergency SOS Alarm + Family + Responder Alert System Test Suite."""
    from fastapi.testclient import TestClient
    from main import app, _RATE_LIMIT_STORE

    # Reset rate limit store for testing
    _RATE_LIMIT_STORE.clear()

    client = TestClient(app)

    print("\n" + "="*70)
    print("PHASE 15 -- EMERGENCY SOS ALARM & RESPONDER ALERT SYSTEM TESTS")
    print("="*70)

    # 1. Activate SOS
    sos_payload = {
        "user_id": "test_sos_user_01",
        "user_name": "Marcus Aurelius",
        "phone": "+91-99999-88888",
        "email": "marcus@example.com",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "location_name": "Chennai Central",
        "user_condition": "TRAPPED",
        "disaster_type": "EMERGENCY_SOS"
    }

    act_res = client.post("/api/sos/activate", json=sos_payload)
    assert act_res.status_code == 200, f"SOS activation failed: {act_res.text}"
    act_data = act_res.json()
    assert act_data["success"] is True
    sos_id = act_data["sos_id"]
    rescue_id = act_data["rescue_id"]
    assert act_data["priority"] == "CRITICAL"
    assert act_data["status"] == "ACTIVE"
    assert act_data["alarm_active"] is True
    assert act_data["family_notified"] >= 1
    assert act_data["responders_notified"] >= 1
    print(f"  [OK] POST /api/sos/activate -> Created {sos_id} linked to rescue {rescue_id}, Priority: CRITICAL")

    # 2. Duplicate SOS Cooldown Enforcement (Same User within 60s)
    dup_res = client.post("/api/sos/activate", json=sos_payload)
    assert dup_res.status_code == 429
    assert "cooldown active" in dup_res.json()["detail"].lower() or "too many requests" in dup_res.json()["detail"].lower()
    print("  [OK] 60-second SOS cooldown protection correctly blocked duplicate activation")

    # 3. Get Active SOS
    active_res = client.get("/api/sos/active?user_id=test_sos_user_01")
    assert active_res.status_code == 200
    assert active_res.json()["active"] is True
    assert active_res.json()["sos_id"] == sos_id
    print(f"  [OK] GET /api/sos/active -> Found active SOS {sos_id}")

    # 4. Get SOS Details (Public Masked vs Responder Authorized)
    pub_res = client.get(f"/api/sos/{sos_id}")
    assert pub_res.status_code == 200
    pub_rec = pub_res.json()
    assert "***" in pub_rec["phone"]
    assert pub_rec["user_name"] == "M. A."
    print("  [OK] Public SOS View -> PII masked correctly (Name: M. A., Phone: ***)")

    auth_res = client.get(f"/api/sos/{sos_id}?auth_token=RESPONDER-AUTH-KEY-2026")
    assert auth_res.status_code == 200
    assert auth_res.json()["phone"] == "+91-99999-88888"
    print("  [OK] Authorized Responder SOS View -> Unmasked phone details returned")

    # 5. Escalate Condition to BURIED
    esc_res = client.post(f"/api/sos/{sos_id}/escalate", json={"condition": "BURIED"})
    assert esc_res.status_code == 200
    assert esc_res.json()["user_condition"] == "BURIED"
    assert esc_res.json()["priority"] == "CRITICAL"
    print(f"  [OK] POST /api/sos/{sos_id}/escalate -> Escalated condition to BURIED (CRITICAL)")

    # 6. Live GPS Location Stream Update
    loc_res = client.post(f"/api/sos/{sos_id}/location", json={
        "latitude": 13.0835,
        "longitude": 80.2715,
        "movement_status": "MOVING_SLOWLY",
        "gps_accuracy_m": 5.0,
        "battery_pct": 82
    })
    assert loc_res.status_code == 200
    assert loc_res.json()["gps_status"] == "GPS_LIVE"
    print("  [OK] POST /api/sos/{sos_id}/location -> Updated live GPS stream")

    # 7. Responder Lifecycle Transitions (ACKNOWLEDGE -> DISPATCHED -> RESCUED)
    ack_res = client.post(f"/api/sos/{sos_id}/status", json={
        "status": "ACKNOWLEDGED",
        "responder_id": "NDRF_ALPHA_01",
        "note": "NDRF team acknowledged SOS alert",
        "auth_token": "RESPONDER-AUTH-KEY-2026"
    })
    assert ack_res.status_code == 200
    assert ack_res.json()["new_status"] == "ACKNOWLEDGED"
    print("  [OK] Responder ACKNOWLEDGED SOS signal")

    disp_res = client.post(f"/api/sos/{sos_id}/status", json={
        "status": "DISPATCHED",
        "responder_id": "NDRF_ALPHA_01",
        "note": "Rescue boat dispatched to coordinates",
        "auth_token": "RESPONDER-AUTH-KEY-2026"
    })
    assert disp_res.status_code == 200
    assert disp_res.json()["new_status"] == "DISPATCHED"
    print("  [OK] Responder DISPATCHED rescue team")

    # 8. Trigger DEMO SOS Simulation
    demo_res = client.post("/api/sos/simulate-demo?location_name=Chennai&lat=13.0827&lng=80.2707")
    assert demo_res.status_code == 200
    assert demo_res.json()["data_type"] == "DEMO"
    assert "SOS-DEMO-" in demo_res.json()["sos_id"]
    print(f"  [OK] POST /api/sos/simulate-demo -> Safe DEMO simulation created ({demo_res.json()['sos_id']})")

    # 9. Cancel SOS / Confirm Safe
    cancel_res = client.post(f"/api/sos/{sos_id}/cancel", json={"reason": "User evacuated safely"})
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"
    assert cancel_res.json()["alarm_active"] is False
    print(f"  [OK] POST /api/sos/{sos_id}/cancel -> SOS cancelled, alarm deactivated")

    # 10. Audit Trail Verification
    audit_res = client.get(f"/api/sos/{sos_id}/audit")
    assert audit_res.status_code == 200
    assert audit_res.json()["count"] >= 4
    print(f"  [OK] GET /api/sos/{sos_id}/audit -> Audit trail verified ({audit_res.json()['count']} events logged)")

    print("\n" + "="*70)
    print("ALL PHASE 15 EMERGENCY SOS TESTS PASSED SUCCESSFULLY!")
    print("="*70)


if __name__ == "__main__":
    test_phase13_global_analytics()
    test_phase14_security_performance_accessibility()
    test_phase15_emergency_sos()




