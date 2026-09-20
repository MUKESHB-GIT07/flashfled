"""
test_otp_flow.py — Phase 16: OTP Delivery Integration Tests
============================================================
Covers all required test cases:

  1. DEMO mode    — missing credentials → OTP 123456 returned in response
  2. NOT_CONFIGURED — only SID set, others missing → treated as DEMO
  3. Twilio REAL mode — mocked successful send → PROVIDER_ACCEPTED, no OTP in response
  4. Twilio REAL mode — mocked failure → DELIVERY_FAILED, no OTP in response
  5. Valid OTP verification → success, phone marked verified
  6. Invalid OTP verification → INVALID OTP error
  7. Expired OTP verification → SESSION EXPIRED error
  8. Resend cooldown enforcement → RATE_LIMITED within 30s window
  9. Too many attempts → INVALID LOGIN, record consumed
 10. HTTP API surface via TestClient
"""

import sys
import os
import time

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pytest
from unittest.mock import patch, MagicMock

# ── Import service functions directly ───────────────────────────────────────
from services.auth_service import (
    request_phone_otp,
    verify_phone_otp,
    _is_twilio_configured,
    _send_otp_via_twilio,
    _PHONE_OTP_STORE,
    DEMO_OTP,
    OTP_EXPIRES_SECONDS,
    RESEND_COOLDOWN_SECONDS,
)

# ── Helpers ──────────────────────────────────────────────────────────────────

TEST_PHONE = "+919999900001"
TEST_CC    = "+91"


def _clear_otp(phone: str = TEST_PHONE):
    """Remove any OTP record for a phone so tests start clean."""
    _PHONE_OTP_STORE.pop(phone.strip(), None)


def _env_no_twilio():
    """Patch environment so Twilio is NOT configured."""
    return patch.dict(os.environ, {
        "TWILIO_ACCOUNT_SID": "",
        "TWILIO_AUTH_TOKEN": "",
        "TWILIO_PHONE_NUMBER": "",
    }, clear=False)


def _env_twilio_configured():
    """Patch environment so Twilio IS fully configured."""
    return patch.dict(os.environ, {
        "TWILIO_ACCOUNT_SID": "ACtest_sid_abc123",
        "TWILIO_AUTH_TOKEN":  "test_auth_token_xyz",
        "TWILIO_PHONE_NUMBER": "+15005550006",   # Twilio test magic number
    }, clear=False)


# ═══════════════════════════════════════════════════════════════════════════
# 1. DEMO MODE — No Twilio credentials → 123456 returned in response
# ═══════════════════════════════════════════════════════════════════════════

class TestOtpDemoMode:

    def setup_method(self):
        _clear_otp(TEST_PHONE)

    def test_demo_mode_returns_otp_in_response(self):
        """When Twilio is not configured the fixed demo OTP must be visible in response."""
        with _env_no_twilio():
            res = request_phone_otp(TEST_PHONE, TEST_CC)

        assert res["success"] is True, f"Expected success=True, got: {res}"
        assert res.get("demo_otp") == DEMO_OTP, (
            f"Expected demo_otp='123456', got: {res.get('demo_otp')}"
        )
        assert res.get("is_demo") is True
        print(f"[OK] DEMO mode: status={res.get('status')} demo_otp={res.get('demo_otp')}")

    def test_demo_mode_status_label(self):
        """Status should be DEMO or NOT_CONFIGURED, never PROVIDER_ACCEPTED."""
        with _env_no_twilio():
            res = request_phone_otp(TEST_PHONE, TEST_CC)

        assert res["status"] in ("DEMO", "NOT_CONFIGURED"), (
            f"Unexpected status in demo mode: {res['status']}"
        )
        print(f"[OK] DEMO status label: {res['status']}")

    def test_demo_otp_stored_and_verifiable(self):
        """The stored OTP in DEMO mode must be verifiable with code '123456'."""
        with _env_no_twilio():
            request_phone_otp(TEST_PHONE, TEST_CC)

        res = verify_phone_otp(TEST_PHONE, DEMO_OTP)
        assert res["success"] is True, f"Expected verify success, got: {res}"
        assert res["verified"] is True
        print(f"[OK] DEMO OTP '123456' verified successfully")


# ═══════════════════════════════════════════════════════════════════════════
# 2. NOT_CONFIGURED — Only partial credentials → treated as DEMO
# ═══════════════════════════════════════════════════════════════════════════

class TestOtpNotConfigured:

    def setup_method(self):
        _clear_otp(TEST_PHONE)

    def test_partial_credentials_treated_as_demo(self):
        """If only ACCOUNT_SID is set (but AUTH_TOKEN or PHONE missing), it's still DEMO."""
        with patch.dict(os.environ, {
            "TWILIO_ACCOUNT_SID": "ACsome_sid",
            "TWILIO_AUTH_TOKEN": "",          # missing
            "TWILIO_PHONE_NUMBER": "",        # missing
        }, clear=False):
            configured = _is_twilio_configured()
            assert configured is False, "Should NOT be configured with partial credentials"

            res = request_phone_otp(TEST_PHONE, TEST_CC)

        assert res["success"] is True
        assert res.get("demo_otp") == DEMO_OTP
        print(f"[OK] Partial Twilio credentials → DEMO mode (status={res['status']})")

    def test_all_three_required(self):
        """_is_twilio_configured() must require ALL three env vars."""
        cases = [
            {"TWILIO_ACCOUNT_SID": "x", "TWILIO_AUTH_TOKEN": "", "TWILIO_PHONE_NUMBER": ""},
            {"TWILIO_ACCOUNT_SID": "",  "TWILIO_AUTH_TOKEN": "y", "TWILIO_PHONE_NUMBER": ""},
            {"TWILIO_ACCOUNT_SID": "",  "TWILIO_AUTH_TOKEN": "",  "TWILIO_PHONE_NUMBER": "z"},
            {"TWILIO_ACCOUNT_SID": "x", "TWILIO_AUTH_TOKEN": "y", "TWILIO_PHONE_NUMBER": ""},
        ]
        for env in cases:
            with patch.dict(os.environ, env, clear=False):
                assert _is_twilio_configured() is False, (
                    f"Should NOT be configured with {env}"
                )
        print("[OK] _is_twilio_configured() correctly requires all 3 vars")


# ═══════════════════════════════════════════════════════════════════════════
# 3. REAL MODE — Mocked successful Twilio send → PROVIDER_ACCEPTED
# ═══════════════════════════════════════════════════════════════════════════

class TestOtpTwilioSuccess:

    def setup_method(self):
        _clear_otp(TEST_PHONE)

    def test_real_mode_returns_provider_accepted(self):
        """With Twilio configured and mocked success, status must be PROVIDER_ACCEPTED."""
        mock_twilio_result = {"success": True, "sid": "SM_mock_success_sid_123", "status": "PROVIDER_ACCEPTED"}

        with _env_twilio_configured():
            with patch("services.auth_service._send_otp_via_twilio", return_value=mock_twilio_result):
                res = request_phone_otp(TEST_PHONE, TEST_CC)

        assert res["success"] is True, f"Expected success=True, got: {res}"
        assert res["status"] == "PROVIDER_ACCEPTED", (
            f"Expected PROVIDER_ACCEPTED, got: {res['status']}"
        )
        print(f"[OK] REAL mode success: status={res['status']}")

    def test_real_mode_does_not_expose_otp(self):
        """The OTP must NOT appear in the API response in REAL mode."""
        mock_twilio_result = {"success": True, "sid": "SM_mock_success_sid_456", "status": "PROVIDER_ACCEPTED"}

        with _env_twilio_configured():
            with patch("services.auth_service._send_otp_via_twilio", return_value=mock_twilio_result):
                res = request_phone_otp(TEST_PHONE, TEST_CC)

        assert "demo_otp" not in res, (
            f"OTP must NOT be exposed in REAL mode response. Got keys: {list(res.keys())}"
        )
        assert res.get("is_demo") is not True
        print("[OK] REAL mode: demo_otp NOT in response")

    def test_real_mode_otp_is_random(self):
        """Random OTP in REAL mode must be a 6-digit numeric string."""
        mock_twilio_result = {"success": True, "sid": "SM_abc", "status": "PROVIDER_ACCEPTED"}

        with _env_twilio_configured():
            with patch("services.auth_service._send_otp_via_twilio", return_value=mock_twilio_result):
                request_phone_otp(TEST_PHONE, TEST_CC)

        # Inspect stored OTP directly (never from API response)
        stored = _PHONE_OTP_STORE.get(TEST_PHONE.strip())
        assert stored is not None, "OTP should be stored after successful send"
        otp_val = stored["otp"]
        assert len(otp_val) == 6, f"OTP must be 6 digits, got: {otp_val!r}"
        assert otp_val.isdigit(), f"OTP must be numeric, got: {otp_val!r}"
        print(f"[OK] REAL mode: OTP is a 6-digit code stored in server (not exposed)")

    def test_twilio_helper_receives_correct_phone(self):
        """_send_otp_via_twilio must be called with the E.164 phone number."""
        calls = []
        def capture_call(phone_e164, otp):
            calls.append({"phone": phone_e164, "otp": otp})
            return {"success": True, "sid": "SM_phone_check", "status": "PROVIDER_ACCEPTED"}

        with _env_twilio_configured():
            with patch("services.auth_service._send_otp_via_twilio", side_effect=capture_call):
                request_phone_otp(TEST_PHONE, TEST_CC)  # TEST_PHONE starts with '+'

        assert len(calls) == 1, "Expected _send_otp_via_twilio to be called once"
        called_phone = calls[0]["phone"]
        assert called_phone == TEST_PHONE, (
            f"Expected 'to' to be {TEST_PHONE!r}, got: {called_phone!r}"
        )
        print(f"[OK] _send_otp_via_twilio called with correct phone={called_phone}")


# ═══════════════════════════════════════════════════════════════════════════
# 4. REAL MODE — Mocked Twilio failure → DELIVERY_FAILED
# ═══════════════════════════════════════════════════════════════════════════

class TestOtpTwilioFailure:

    def setup_method(self):
        _clear_otp(TEST_PHONE)

    def test_twilio_exception_returns_delivery_failed(self):
        """If Twilio raises an exception, status must be DELIVERY_FAILED."""
        mock_fail = {"success": False, "error": "SMS delivery failed.", "status": "DELIVERY_FAILED"}

        with _env_twilio_configured():
            with patch("services.auth_service._send_otp_via_twilio", return_value=mock_fail):
                res = request_phone_otp(TEST_PHONE, TEST_CC)

        assert res["success"] is False, f"Expected success=False on Twilio error, got: {res}"
        assert res["status"] == "DELIVERY_FAILED", (
            f"Expected DELIVERY_FAILED, got: {res['status']}"
        )
        print(f"[OK] Twilio error -> DELIVERY_FAILED: {res['message']}")

    def test_delivery_failure_clears_otp_store(self):
        """After DELIVERY_FAILED, the OTP must NOT remain in the store (allow clean retry)."""
        mock_fail = {"success": False, "error": "SMS delivery failed.", "status": "DELIVERY_FAILED"}

        with _env_twilio_configured():
            with patch("services.auth_service._send_otp_via_twilio", return_value=mock_fail):
                request_phone_otp(TEST_PHONE, TEST_CC)

        stored = _PHONE_OTP_STORE.get(TEST_PHONE.strip())
        assert stored is None, (
            "OTP must be cleared from store after DELIVERY_FAILED (allow immediate retry)"
        )
        print("[OK] OTP store cleared after DELIVERY_FAILED")

    def test_delivery_failure_does_not_expose_otp(self):
        """DELIVERY_FAILED response must not contain demo_otp."""
        mock_fail = {"success": False, "error": "SMS delivery failed.", "status": "DELIVERY_FAILED"}

        with _env_twilio_configured():
            with patch("services.auth_service._send_otp_via_twilio", return_value=mock_fail):
                res = request_phone_otp(TEST_PHONE, TEST_CC)

        assert "demo_otp" not in res
        print("[OK] DELIVERY_FAILED: OTP not in response")

    def test_delivery_failure_error_message_is_generic(self):
        """Error message must be generic (no credentials / stack trace exposed)."""
        mock_fail = {"success": False, "error": "SMS delivery failed.", "status": "DELIVERY_FAILED"}

        with _env_twilio_configured():
            with patch("services.auth_service._send_otp_via_twilio", return_value=mock_fail):
                res = request_phone_otp(TEST_PHONE, TEST_CC)

        # Must say PROVIDER UNAVAILABLE or similar generic phrase
        assert "PROVIDER UNAVAILABLE" in res["message"] or res["status"] == "DELIVERY_FAILED"
        # Must NOT expose the fake SID from env
        assert "ACtest_sid_abc123" not in res.get("message", "")
        assert "ACtest_sid_abc123" not in res.get("error", "")
        print(f"[OK] DELIVERY_FAILED: No credentials exposed in error message")



# ═══════════════════════════════════════════════════════════════════════════
# 5. Valid OTP verification → success
# ═══════════════════════════════════════════════════════════════════════════

class TestOtpVerifyValid:

    def setup_method(self):
        _clear_otp(TEST_PHONE)

    def test_correct_otp_succeeds(self):
        """A correct OTP returns success=True and verified=True."""
        with _env_no_twilio():
            request_phone_otp(TEST_PHONE, TEST_CC)

        res = verify_phone_otp(TEST_PHONE, DEMO_OTP)
        assert res["success"] is True
        assert res.get("verified") is True
        assert res.get("phone") == TEST_PHONE.strip()
        print(f"[OK] Valid OTP verified: {res['message']}")

    def test_otp_consumed_after_success(self):
        """After successful verification, the OTP must be consumed (one-time use)."""
        with _env_no_twilio():
            request_phone_otp(TEST_PHONE, TEST_CC)

        verify_phone_otp(TEST_PHONE, DEMO_OTP)

        # Second attempt must fail
        res2 = verify_phone_otp(TEST_PHONE, DEMO_OTP)
        assert res2["success"] is False
        print("[OK] OTP consumed after first use ✓")


# ═══════════════════════════════════════════════════════════════════════════
# 6. Invalid OTP → INVALID OTP error
# ═══════════════════════════════════════════════════════════════════════════

class TestOtpVerifyInvalid:

    def setup_method(self):
        _clear_otp(TEST_PHONE)

    def test_wrong_otp_returns_invalid_otp(self):
        """Wrong OTP code returns INVALID OTP status."""
        with _env_no_twilio():
            request_phone_otp(TEST_PHONE, TEST_CC)

        res = verify_phone_otp(TEST_PHONE, "000000")  # Wrong code
        assert res["success"] is False
        assert "INVALID OTP" in res.get("error", ""), (
            f"Expected 'INVALID OTP' error, got: {res.get('error')!r}"
        )
        print(f"[OK] Wrong OTP → {res['error']} (status={res.get('status')})")

    def test_no_otp_record_returns_invalid(self):
        """Calling verify without first requesting OTP returns an error."""
        res = verify_phone_otp("+910000000000", "123456")
        assert res["success"] is False
        print(f"[OK] No OTP record → {res['error']}")


# ═══════════════════════════════════════════════════════════════════════════
# 7. Expired OTP → SESSION EXPIRED
# ═══════════════════════════════════════════════════════════════════════════

class TestOtpExpiry:

    def setup_method(self):
        _clear_otp(TEST_PHONE)

    def test_expired_otp_returns_session_expired(self):
        """An expired OTP must return SESSION EXPIRED, not INVALID OTP."""
        with _env_no_twilio():
            request_phone_otp(TEST_PHONE, TEST_CC)

        # Manually expire the OTP by backdating its expires_at
        phone_key = TEST_PHONE.strip()
        _PHONE_OTP_STORE[phone_key]["expires_at"] = time.time() - 1  # already expired

        res = verify_phone_otp(TEST_PHONE, DEMO_OTP)
        assert res["success"] is False
        assert "SESSION EXPIRED" in res.get("error", ""), (
            f"Expected 'SESSION EXPIRED', got: {res.get('error')!r}"
        )
        assert res.get("status") == "EXPIRED"
        print(f"[OK] Expired OTP → {res['error']} (status={res.get('status')})")

    def test_expired_otp_removed_from_store(self):
        """After expiry check, OTP record must be removed from store."""
        with _env_no_twilio():
            request_phone_otp(TEST_PHONE, TEST_CC)

        phone_key = TEST_PHONE.strip()
        _PHONE_OTP_STORE[phone_key]["expires_at"] = time.time() - 1

        verify_phone_otp(TEST_PHONE, DEMO_OTP)
        assert phone_key not in _PHONE_OTP_STORE, "Expired OTP must be removed from store"
        print("[OK] Expired OTP removed from store ✓")


# ═══════════════════════════════════════════════════════════════════════════
# 8. Resend cooldown → RATE_LIMITED
# ═══════════════════════════════════════════════════════════════════════════

class TestOtpRateLimit:

    def setup_method(self):
        _clear_otp(TEST_PHONE)

    def test_rapid_resend_returns_rate_limited(self):
        """A second OTP request within 30s must return RATE_LIMITED."""
        with _env_no_twilio():
            request_phone_otp(TEST_PHONE, TEST_CC)
            res2 = request_phone_otp(TEST_PHONE, TEST_CC)  # within 30s

        assert res2["success"] is False
        assert res2["status"] == "RATE_LIMITED", (
            f"Expected RATE_LIMITED, got: {res2['status']}"
        )
        assert "retry_after" in res2
        assert res2["retry_after"] > 0
        print(f"[OK] Rapid resend → RATE_LIMITED, retry_after={res2['retry_after']}s")

    def test_resend_allowed_after_cooldown(self):
        """After cooldown window, a resend must succeed."""
        with _env_no_twilio():
            request_phone_otp(TEST_PHONE, TEST_CC)

        # Simulate cooldown having elapsed
        phone_key = TEST_PHONE.strip()
        _PHONE_OTP_STORE[phone_key]["created_at"] = time.time() - RESEND_COOLDOWN_SECONDS - 1

        with _env_no_twilio():
            res2 = request_phone_otp(TEST_PHONE, TEST_CC)

        assert res2["success"] is True, f"Expected success after cooldown, got: {res2}"
        print(f"[OK] Resend allowed after cooldown ✓")


# ═══════════════════════════════════════════════════════════════════════════
# 9. Too many attempts → INVALID LOGIN, record consumed
# ═══════════════════════════════════════════════════════════════════════════

class TestOtpTooManyAttempts:

    def setup_method(self):
        _clear_otp(TEST_PHONE)

    def test_five_wrong_then_sixth_fails(self):
        """After 5 wrong attempts, the 6th must return INVALID LOGIN and purge the record."""
        with _env_no_twilio():
            request_phone_otp(TEST_PHONE, TEST_CC)

        # 5 wrong attempts
        for i in range(5):
            res = verify_phone_otp(TEST_PHONE, "000000")
            assert res["success"] is False

        # 6th attempt (even with correct OTP) should return INVALID LOGIN
        res_final = verify_phone_otp(TEST_PHONE, DEMO_OTP)
        assert res_final["success"] is False
        assert "INVALID LOGIN" in res_final.get("error", ""), (
            f"Expected INVALID LOGIN on 6th attempt, got: {res_final.get('error')!r}"
        )
        print(f"[OK] 5+1 wrong attempts → {res_final['error']}")

    def test_otp_purged_after_too_many_attempts(self):
        """OTP record must be purged after too many attempts."""
        with _env_no_twilio():
            request_phone_otp(TEST_PHONE, TEST_CC)

        phone_key = TEST_PHONE.strip()

        for _ in range(6):
            verify_phone_otp(TEST_PHONE, "000000")

        assert phone_key not in _PHONE_OTP_STORE, (
            "OTP record must be removed after too many failed attempts"
        )
        print("[OK] OTP record purged after too many attempts ✓")


# ═══════════════════════════════════════════════════════════════════════════
# 10. HTTP API Surface via TestClient
# ═══════════════════════════════════════════════════════════════════════════

class TestOtpHttpApi:

    def setup_method(self):
        from fastapi.testclient import TestClient
        from main import app
        self.client = TestClient(app)
        _clear_otp(TEST_PHONE)

    def test_api_request_otp_demo_mode(self):
        """POST /api/auth/request-phone-otp returns 200 with demo_otp in demo mode."""
        with _env_no_twilio():
            res = self.client.post("/api/auth/request-phone-otp", json={
                "phone": TEST_PHONE,
                "country_code": TEST_CC
            })

        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["success"] is True
        assert data.get("demo_otp") == DEMO_OTP
        print(f"[OK] POST /api/auth/request-phone-otp (demo) → status={data.get('status')}")

    def test_api_missing_phone_returns_400(self):
        """POST /api/auth/request-phone-otp without phone returns 400."""
        res = self.client.post("/api/auth/request-phone-otp", json={})
        assert res.status_code == 400
        print(f"[OK] Missing phone → 400: {res.json().get('detail')}")

    def test_api_verify_otp_success(self):
        """POST /api/auth/verify-phone-otp with correct OTP returns success."""
        with _env_no_twilio():
            self.client.post("/api/auth/request-phone-otp", json={
                "phone": TEST_PHONE,
                "country_code": TEST_CC
            })
        res = self.client.post("/api/auth/verify-phone-otp", json={
            "phone": TEST_PHONE,
            "otp": DEMO_OTP
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data.get("verified") is True
        print(f"[OK] POST /api/auth/verify-phone-otp → verified={data.get('verified')}")

    def test_api_verify_wrong_otp_returns_400(self):
        """POST /api/auth/verify-phone-otp with wrong OTP returns 400."""
        with _env_no_twilio():
            self.client.post("/api/auth/request-phone-otp", json={
                "phone": TEST_PHONE,
                "country_code": TEST_CC
            })
        res = self.client.post("/api/auth/verify-phone-otp", json={
            "phone": TEST_PHONE,
            "otp": "000000"
        })
        assert res.status_code == 400
        data = res.json()
        assert "INVALID OTP" in data.get("detail", "") or "INVALID" in data.get("detail", "")
        print(f"[OK] Wrong OTP → 400: {data.get('detail')}")

    def test_api_request_otp_rate_limit(self):
        """Second rapid POST /api/auth/request-phone-otp returns 400 with RATE_LIMITED."""
        with _env_no_twilio():
            self.client.post("/api/auth/request-phone-otp", json={
                "phone": TEST_PHONE, "country_code": TEST_CC
            })
            res2 = self.client.post("/api/auth/request-phone-otp", json={
                "phone": TEST_PHONE, "country_code": TEST_CC
            })
        assert res2.status_code == 400
        data = res2.json()
        assert "RATE_LIMITED" in data.get("detail", "") or "wait" in data.get("detail", "").lower()
        print(f"[OK] Rapid resend → 400 RATE_LIMITED: {data.get('detail')}")

    def test_api_real_mode_mocked_success(self):
        """POST /api/auth/request-phone-otp in REAL mode returns PROVIDER_ACCEPTED."""
        mock_twilio_result = {"success": True, "sid": "SM_api_test_success", "status": "PROVIDER_ACCEPTED"}

        with _env_twilio_configured():
            with patch("services.auth_service._send_otp_via_twilio", return_value=mock_twilio_result):
                res = self.client.post("/api/auth/request-phone-otp", json={
                    "phone": TEST_PHONE,
                    "country_code": TEST_CC
                })

        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "PROVIDER_ACCEPTED"
        assert "demo_otp" not in data
        print(f"[OK] API REAL mode -> PROVIDER_ACCEPTED, demo_otp absent")


# ═══════════════════════════════════════════════════════════════════════════
# Direct unit test for _send_otp_via_twilio helper
# ═══════════════════════════════════════════════════════════════════════════

class TestSendOtpViaTwilio:

    def setup_method(self):
        # No store state needed for unit tests of _send_otp_via_twilio
        pass

    def test_success_returns_provider_accepted(self):
        """_send_otp_via_twilio returns PROVIDER_ACCEPTED when Twilio succeeds."""
        mock_msg = MagicMock()
        mock_msg.sid = "SM_unit_test_sid"
        mock_client_instance = MagicMock()
        mock_client_instance.messages.create.return_value = mock_msg

        # Simulate twilio.rest.Client being importable by patching builtins import
        real_import = __builtins__.__import__ if hasattr(__builtins__, "__import__") else __import__

        def fake_import(name, *args, **kwargs):
            if name == "twilio.rest":
                mock_module = MagicMock()
                mock_module.Client = lambda sid, token: mock_client_instance
                return mock_module
            return real_import(name, *args, **kwargs)

        import builtins
        with _env_twilio_configured():
            with patch.object(builtins, "__import__", side_effect=fake_import):
                result = _send_otp_via_twilio(TEST_PHONE, "987654")

        assert result["success"] is True
        assert result["status"] == "PROVIDER_ACCEPTED"
        assert result["sid"] == "SM_unit_test_sid"
        print(f"[OK] _send_otp_via_twilio success: status={result['status']}, sid={result['sid']}")

    def test_exception_returns_delivery_failed(self):
        """_send_otp_via_twilio returns DELIVERY_FAILED when twilio is not installed."""
        # When twilio is not installed, ImportError is caught and DELIVERY_FAILED is returned
        with _env_twilio_configured():
            # Don't patch anything — twilio is not installed, so ImportError fires naturally
            result = _send_otp_via_twilio(TEST_PHONE, "987654")

        # Should get DELIVERY_FAILED because import fails
        assert result["success"] is False
        assert result["status"] == "DELIVERY_FAILED"
        assert any(k in result.get("error", "").lower() for k in ("failed", "twilio", "installed", "unavailable"))
        print(f"[OK] _send_otp_via_twilio failure handling -> DELIVERY_FAILED: {result['error']}")



# ═══════════════════════════════════════════════════════════════════════════
# Run all tests
# ═══════════════════════════════════════════════════════════════════════════

def run_all_otp_tests():
    """Run all OTP tests sequentially with human-readable output."""
    print("\n" + "="*70)
    print("  PHASE 16 -- OTP DELIVERY INTEGRATION TESTS")
    print("="*70)

    test_classes = [
        TestOtpDemoMode,
        TestOtpNotConfigured,
        TestOtpTwilioSuccess,
        TestOtpTwilioFailure,
        TestOtpVerifyValid,
        TestOtpVerifyInvalid,
        TestOtpExpiry,
        TestOtpRateLimit,
        TestOtpTooManyAttempts,
        TestOtpHttpApi,
        TestSendOtpViaTwilio,
    ]

    passed = 0
    failed = 0
    errors = []

    for cls in test_classes:
        instance = cls()
        methods = [m for m in dir(cls) if m.startswith("test_")]
        print(f"\n-- {cls.__name__} ({len(methods)} tests) --")
        for method_name in methods:
            instance.setup_method()
            try:
                getattr(instance, method_name)()
                passed += 1
            except Exception as e:
                failed += 1
                errors.append(f"  FAIL  {cls.__name__}.{method_name}: {e}")
                print(f"  [FAIL] {method_name}: {e}")

    print("\n" + "="*70)
    print(f"  RESULTS: {passed} passed | {failed} failed")
    if errors:
        print("\n  FAILURES:")
        for e in errors:
            print(e)
    print("="*70 + "\n")

    # Report SMS configuration status
    print("SMS CONFIGURATION STATUS:")
    configured = _is_twilio_configured()
    if configured:
        sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
        print(f"  [LIVE] REAL SMS MODE: Twilio configured (SID: {sid[:8]}****)")
        print("         Real OTPs will be dispatched to actual phone numbers.")
    else:
        print("  [DEMO] DEMO SMS MODE: Twilio credentials not configured.")
        print("         Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to enable real SMS.")
        print(f"         Demo OTP is always: {DEMO_OTP}")
    print()

    return failed == 0


if __name__ == "__main__":
    success = run_all_otp_tests()
    sys.exit(0 if success else 1)
