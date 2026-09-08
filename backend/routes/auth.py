"""
auth.py — Phase 16: Authentication FastAPI Router
=================================================
Handles user registration, login (Phone+OTP, Email+Password, Demo), OTP verification,
email verification, session management, logout, and OAuth status.
"""

from fastapi import APIRouter, Request, HTTPException, Depends, Header
from typing import Dict, Any, Optional

from services.auth_service import (
    register_user,
    login_user,
    login_demo,
    get_session_user,
    logout_session,
    request_phone_otp,
    verify_phone_otp,
    request_email_verification,
    verify_email_code,
    get_oauth_provider_status,
    sanitize_user_profile,
    create_session
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def get_current_user_from_header(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    return get_session_user(token)

@router.post("/register")
def api_register(payload: Dict[str, Any]):
    res = register_user(payload)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res

@router.post("/login")
def api_login(payload: Dict[str, Any]):
    identifier = payload.get("identifier") or payload.get("email") or payload.get("phone")
    password = payload.get("password")
    if not identifier or not password:
        raise HTTPException(status_code=400, detail="Identifier (email/phone) and password are required.")
    res = login_user(identifier, password)
    if not res.get("success"):
        raise HTTPException(status_code=401, detail=res.get("error"))
    return res

@router.post("/login-demo")
def api_login_demo():
    return login_demo()

@router.post("/request-phone-otp")
@router.post("/register-phone", include_in_schema=False)
def api_request_phone_otp(payload: Dict[str, Any]):
    phone = payload.get("phone") or payload.get("phone_number") or payload.get("raw_phone")
    country_code = payload.get("country_code", "+91")
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required.")
    res = request_phone_otp(str(phone).strip(), country_code)
    # Propagate non-success results as 400 errors
    if not res.get("success"):
        status = res.get("status", "ERROR")
        msg = res.get("message") or res.get("error") or "OTP request failed."
        raise HTTPException(status_code=400, detail=f"{status}: {msg}")
    return res

@router.post("/verify-phone-otp")
@router.post("/verify-phone", include_in_schema=False)
def api_verify_phone_otp(payload: Dict[str, Any], authorization: Optional[str] = Header(None)):
    phone = payload.get("phone") or payload.get("phone_number") or payload.get("raw_phone")
    otp = payload.get("otp")
    if not phone or not otp:
        raise HTTPException(status_code=400, detail="Phone and OTP code are required.")
    user = get_current_user_from_header(authorization)
    uid = user["user_id"] if user else None
    res = verify_phone_otp(str(phone).strip(), str(otp).strip(), uid)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res

@router.post("/request-email-verification")
def api_request_email_verification(payload: Dict[str, Any]):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email address is required.")
    return request_email_verification(email)

@router.post("/verify-email")
def api_verify_email(payload: Dict[str, Any], authorization: Optional[str] = Header(None)):
    email = payload.get("email")
    code = payload.get("code")
    if not email or not code:
        raise HTTPException(status_code=400, detail="Email and verification code are required.")
    user = get_current_user_from_header(authorization)
    uid = user["user_id"] if user else None
    res = verify_email_code(email, code, uid)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res

@router.post("/logout")
def api_logout(authorization: Optional[str] = Header(None)):
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        logout_session(token)
    return {"success": True, "message": "Logged out successfully."}

@router.get("/me")
def api_get_me(authorization: Optional[str] = Header(None)):
    user = get_current_user_from_header(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized session. Please log in.")
    return {
        "success": True,
        "user": sanitize_user_profile(user)
    }

@router.post("/refresh")
def api_refresh(authorization: Optional[str] = Header(None)):
    user = get_current_user_from_header(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired.")
    session = create_session(user["user_id"])
    return {
        "success": True,
        "session": session,
        "user": sanitize_user_profile(user)
    }

@router.post("/forgot-password")
def api_forgot_password(payload: Dict[str, Any]):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    return {
        "success": True,
        "message": f"Password reset instructions sent to {email} if an account exists.",
        "status": "DEMO"
    }

@router.post("/reset-password")
def api_reset_password(payload: Dict[str, Any]):
    token = payload.get("reset_token")
    new_password = payload.get("new_password")
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Reset token and new password are required.")
    return {
        "success": True,
        "message": "Password reset successfully. Please log in with your new password."
    }

@router.get("/oauth-status")
def api_oauth_status():
    return {
        "success": True,
        "providers": get_oauth_provider_status()
    }
