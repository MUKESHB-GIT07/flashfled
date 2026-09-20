import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './LoginPage.module.css';
import RegisterPage from './RegisterPage';
import OtpVerification from './OtpVerification';

const LoginPage = ({ onAuthenticated = () => {}, onCancel = () => {} }) => {
  const { login, loginDemo, requestPhoneOtp, verifyPhoneOtp, oauthStatus, error: contextError } = useAuth();
  
  const [activeMode, setActiveMode] = useState('login'); // 'login' | 'register' | 'demo'
  const [loginTab, setLoginTab] = useState('phone'); // 'phone' | 'email'
  
  // Phone + OTP State
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpStatus, setOtpStatus] = useState('idle');
  const [otpError, setOtpError] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [demoOtpValue, setDemoOtpValue] = useState(null);

  // Email + Password State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [localError, setLocalError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotMsg, setShowForgotMsg] = useState(false);

  const error = localError || contextError;

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setIsLoading(true);
    try {
      const res = await requestPhoneOtp(phone, countryCode);
      setOtpSent(true);
      if (res.is_demo || res.demo_otp) {
        setDemoOtpValue(res.demo_otp || '123456');
      }
      // Start countdown
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setLocalError(err.message || 'NETWORK ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpComplete = async (otp) => {
    setOtpStatus('verifying');
    setOtpError(null);
    try {
      await verifyPhoneOtp(phone, otp);
      setOtpStatus('success');
      // Login complete, context will update
    } catch (err) {
      setOtpStatus('error');
      setOtpError('INVALID LOGIN');
      setLocalError('INVALID LOGIN');
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setLocalError(err.message || 'INVALID LOGIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLocalError(null);
    setIsLoading(true);
    try {
      await loginDemo();
    } catch (err) {
      setLocalError(err.message || 'NETWORK ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  if (activeMode === 'register') {
    return <RegisterPage onBack={() => setActiveMode('login')} />;
  }

  return (
    <div className={styles.container}>
      <button className={styles.backToDashboardBtn} onClick={onCancel} style={{
        position: 'absolute', top: '24px', left: '24px', zIndex: 100,
        background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(148, 163, 184, 0.2)',
        color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', fontSize: '0.75rem',
        fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer', letterSpacing: '0.05em'
      }}>
        ← BACK TO DASHBOARD
      </button>
      <div className={styles.leftPanel}>
        <div className={styles.animatedBg}></div>
        <div className={styles.branding}>
          <div className={styles.smallLabel}>GLOBAL MULTI-DISASTER</div>
          <h1 className={styles.title}>EARLY WARNING PLATFORM</h1>
          <p className={styles.subtitle}>Secure Emergency Intelligence System</p>
          <div className={styles.chips}>
            <span className={styles.chip}>SIH26192</span>
            <span className={styles.chip}>MHA</span>
            <span className={styles.chip}>DISASTER MGMT</span>
          </div>
          <div className={styles.statusRow}>
            <div className={styles.pulsingDot}></div>
            <span>SYSTEM OPERATIONAL</span>
          </div>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.authCard}>
          
          <div className={styles.modeTabs}>
            <button 
              className={`${styles.modeTab} ${activeMode === 'login' ? styles.activeMode : ''}`}
              onClick={() => setActiveMode('login')}
            >
              LOGIN
            </button>
            <button 
              className={`${styles.modeTab} ${activeMode === 'register' ? styles.activeMode : ''}`}
              onClick={() => setActiveMode('register')}
            >
              CREATE ACCOUNT
            </button>
            <button 
              className={`${styles.modeTab} ${activeMode === 'demo' ? styles.activeMode : ''}`}
              onClick={() => setActiveMode('demo')}
            >
              DEMO
            </button>
            <div className={`${styles.tabIndicator} ${styles[activeMode]}`}></div>
          </div>

          <div className={styles.cardContent}>
            {error && (
              <div className={styles.errorAlert}>
                {error.toUpperCase()}
              </div>
            )}

            {activeMode === 'login' && (
              <>
                <div className={styles.subTabs}>
                  <button 
                    className={`${styles.subTab} ${loginTab === 'phone' ? styles.activeSubTab : ''}`}
                    onClick={() => { setLoginTab('phone'); setOtpSent(false); setLocalError(null); }}
                  >
                    PHONE + OTP
                  </button>
                  <button 
                    className={`${styles.subTab} ${loginTab === 'email' ? styles.activeSubTab : ''}`}
                    onClick={() => { setLoginTab('email'); setLocalError(null); }}
                  >
                    EMAIL + PASSWORD
                  </button>
                </div>

                {loginTab === 'phone' && !otpSent && (
                  <form onSubmit={handlePhoneSubmit} className={styles.form}>
                    <div className={styles.phoneInputGroup}>
                      <select 
                        value={countryCode} 
                        onChange={(e) => setCountryCode(e.target.value)}
                        className={styles.countrySelect}
                      >
                        <option value="+91">+91</option>
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                      </select>
                      <input 
                        type="tel" 
                        placeholder="Phone Number" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={styles.input}
                        required
                      />
                    </div>
                    <button type="submit" className={styles.primaryButton} disabled={isLoading}>
                      {isLoading ? 'SENDING...' : 'SEND OTP'}
                    </button>
                  </form>
                )}

                {loginTab === 'phone' && otpSent && (
                  <div className={styles.otpSection}>
                    <OtpVerification 
                      length={6} 
                      onComplete={handleOtpComplete}
                      onResend={handlePhoneSubmit}
                      countdown={countdown}
                      status={otpStatus}
                      errorMessage={otpError}
                      demoOtp={demoOtpValue}
                    />
                  </div>
                )}

                {loginTab === 'email' && (
                  <form onSubmit={handleEmailSubmit} className={styles.form}>
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.input}
                      required
                    />
                    <div className={styles.passwordGroup}>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={styles.input}
                        required
                      />
                      <button 
                        type="button" 
                        className={styles.togglePassword}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                    <div className={styles.forgotActions}>
                      <button 
                        type="button" 
                        className={styles.textLink}
                        onClick={() => setShowForgotMsg(true)}
                      >
                        Forgot Password?
                      </button>
                      {showForgotMsg && <span className={styles.hintText}>Reset instructions will be sent to your email.</span>}
                    </div>
                    <button type="submit" className={styles.primaryButton} disabled={isLoading}>
                      {isLoading ? 'AUTHENTICATING...' : 'LOGIN'}
                    </button>
                  </form>
                )}

                <div className={styles.socialDivider}>
                  <span>OR</span>
                </div>
                
                <div className={styles.socialButtons}>
                  <button className={styles.socialBtn}>
                    Google
                    <span className={styles.socialBadge}>{oauthStatus?.google ? 'LIVE' : 'DEMO'}</span>
                  </button>
                  <button className={styles.socialBtn}>
                    Apple
                    <span className={styles.socialBadge}>{oauthStatus?.apple ? 'LIVE' : 'DEMO'}</span>
                  </button>
                </div>
              </>
            )}

            {activeMode === 'demo' && (
              <div className={styles.demoSection}>
                <p className={styles.demoExplanation}>
                  Explore the platform with a pre-configured demo account. No SMS or real alerts will be sent in demo mode.
                </p>
                <div className={styles.demoIndicator}>
                  DEMO ACCOUNT — No real alerts sent
                </div>
                <button 
                  onClick={handleDemoLogin} 
                  className={styles.primaryButton}
                  disabled={isLoading}
                >
                  {isLoading ? 'STARTING DEMO...' : 'CONTINUE AS DEMO'}
                </button>
              </div>
            )}
          </div>

          <div className={styles.versionLabel}>
            v2.4.1-stable
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
