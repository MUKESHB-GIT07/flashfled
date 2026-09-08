import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [oauthStatus, setOauthStatus] = useState(null);

  const STORAGE_KEY = 'em_platform_session';

  const checkDemoStatus = (userData, responseIsDemo) => {
    return (userData?.role === 'CITIZEN' && userData?.user_id === 'usr_demo_2026_01') || responseIsDemo === true;
  };

  const getAuthHeaders = useCallback(() => {
    return session?.token ? { 'Authorization': `Bearer ${session.token}` } : {};
  }, [session]);

  const fetchOauthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/oauth-status`);
      if (response.ok) {
        const data = await response.json();
        setOauthStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch OAuth status', err);
    }
  };

  const refreshUser = useCallback(async () => {
    if (!session?.token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsDemo(checkDemoStatus(data.user, data.is_demo));
      } else {
        if (response.status === 401) {
          logout();
        }
      }
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  }, [session, getAuthHeaders]);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      fetchOauthStatus();
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedSession = JSON.parse(stored);
          if (parsedSession.expires_at && new Date(parsedSession.expires_at) > new Date()) {
            setSession(parsedSession);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (err) {
        localStorage.removeItem(STORAGE_KEY);
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  useEffect(() => {
    if (session && !user) {
      refreshUser();
    }
  }, [session, user, refreshUser]);

  const login = async (identifier, password) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Login failed');
      
      const sessionObj = data.session || {};
      const newSession = { token: sessionObj.session_token || data.session_token, expires_at: sessionObj.expires_at || data.expires_at };
      setSession(newSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      setUser(data.user);
      setIsDemo(checkDemoStatus(data.user, data.is_demo));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const loginDemo = async () => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Demo login failed');
      
      const sessionObj = data.session || {};
      const newSession = { token: sessionObj.session_token || data.session_token, expires_at: sessionObj.expires_at || data.expires_at };
      setSession(newSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      setUser(data.user);
      setIsDemo(checkDemoStatus(data.user, data.is_demo || true));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (payload) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Registration failed');
      
      const sessionObj = data.session || {};
      const newSession = { token: sessionObj.session_token || data.session_token, expires_at: sessionObj.expires_at || data.expires_at };
      setSession(newSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      setUser(data.user);
      setIsDemo(checkDemoStatus(data.user, data.is_demo));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (session?.token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
      }
    } catch (err) {
      console.error('Logout API failed', err);
    } finally {
      setSession(null);
      setUser(null);
      setIsDemo(false);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const requestPhoneOtp = async (phone, countryCode) => {
    const cleanPhone = phone ? phone.trim() : '';
    const response = await fetch(`${API_BASE_URL}/auth/request-phone-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, phone_number: cleanPhone, country_code: countryCode })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMsg = data.detail || data.message || data.error || `HTTP ${response.status}: Failed to request OTP`;
      throw new Error(errMsg);
    }
    return data;
  };

  const verifyPhoneOtp = async (phone, otp) => {
    const cleanPhone = phone ? phone.trim() : '';
    const cleanOtp = otp ? otp.trim() : '';
    const response = await fetch(`${API_BASE_URL}/auth/verify-phone-otp`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ phone: cleanPhone, phone_number: cleanPhone, otp: cleanOtp })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMsg = data.detail || data.message || data.error || `HTTP ${response.status}: Failed to verify OTP`;
      throw new Error(errMsg);
    }
    await refreshUser();
    return data;
  };

  const requestEmailVerification = async (email) => {
    const response = await fetch(`${API_BASE_URL}/auth/request-email-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to request email verification');
    return data;
  };

  const verifyEmail = async (email, code) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ email, code })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to verify email');
    await refreshUser();
    return data;
  };

  const value = {
    user,
    session,
    isDemo,
    loading,
    error,
    oauthStatus,
    login,
    loginDemo,
    register,
    logout,
    refreshUser,
    requestPhoneOtp,
    verifyPhoneOtp,
    requestEmailVerification,
    verifyEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
