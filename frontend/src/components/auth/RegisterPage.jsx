import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './RegisterPage.module.css';
import OtpVerification from './OtpVerification';

const COUNTRIES = [
  { name: 'India', code: '+91' },
  { name: 'USA', code: '+1' },
  { name: 'UK', code: '+44' },
  { name: 'Japan', code: '+81' },
  { name: 'Australia', code: '+61' },
  { name: 'Canada', code: '+1' },
  { name: 'Germany', code: '+49' },
  { name: 'Brazil', code: '+55' },
  { name: 'France', code: '+33' },
  { name: 'South Korea', code: '+82' },
  { name: 'China', code: '+86' },
  { name: 'Singapore', code: '+65' },
  { name: 'UAE', code: '+971' },
  { name: 'Saudi Arabia', code: '+966' },
  { name: 'Indonesia', code: '+62' },
  { name: 'Mexico', code: '+52' },
  { name: 'Pakistan', code: '+92' },
  { name: 'Bangladesh', code: '+880' },
  { name: 'Sri Lanka', code: '+94' },
  { name: 'Nigeria', code: '+234' },
  { name: 'South Africa', code: '+27' },
  { name: 'Italy', code: '+39' },
  { name: 'Spain', code: '+34' },
  { name: 'Netherlands', code: '+31' },
  { name: 'Sweden', code: '+46' },
  { name: 'Norway', code: '+47' },
  { name: 'Denmark', code: '+45' },
  { name: 'Switzerland', code: '+41' },
  { name: 'Poland', code: '+48' },
  { name: 'Russia', code: '+7' },
  { name: 'Turkey', code: '+90' },
  { name: 'Egypt', code: '+20' },
  { name: 'Kenya', code: '+254' },
  { name: 'Ghana', code: '+233' },
  { name: 'Argentina', code: '+54' },
  { name: 'Chile', code: '+56' },
  { name: 'Colombia', code: '+57' },
  { name: 'Thailand', code: '+66' },
  { name: 'Vietnam', code: '+84' },
  { name: 'Philippines', code: '+63' },
  { name: 'Malaysia', code: '+60' }
];

const RegisterPage = ({ onBack, onRegistered = () => {} }) => {
  const { register, requestPhoneOtp, verifyPhoneOtp } = useAuth();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1 State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('India');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');

  // Step 2 State
  const [otpSent, setOtpSent] = useState(false);
  const [otpStatus, setOtpStatus] = useState('idle');
  const [demoOtpValue, setDemoOtpValue] = useState(null);
  const [countdown, setCountdown] = useState(60);

  // Step 3 State
  const [consentCritical, setConsentCritical] = useState(false);
  const [consentUpdates, setConsentUpdates] = useState(false);
  const [language, setLanguage] = useState('English');

  const getPasswordStrength = (pwd) => {
    if (pwd.length < 8) return { label: 'WEAK', color: 'red', width: '33%' };
    if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return { label: 'STRONG', color: 'green', width: '100%' };
    return { label: 'FAIR', color: 'amber', width: '66%' };
  };

  const handleCountryChange = (e) => {
    const selected = e.target.value;
    setCountry(selected);
    const cObj = COUNTRIES.find(c => c.name === selected);
    if (cObj) setCountryCode(cObj.code);
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setStep(2);
  };

  const sendOtp = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await requestPhoneOtp(phone, countryCode);
      setOtpSent(true);
      if (res.is_demo || res.demo_otp) {
        setDemoOtpValue(res.demo_otp || '123456');
      }
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpComplete = async (otp) => {
    setOtpStatus('verifying');
    setError(null);
    try {
      await verifyPhoneOtp(phone, otp);
      setOtpStatus('success');
      setTimeout(() => setStep(3), 1000);
    } catch (err) {
      setOtpStatus('error');
      setError('INVALID OTP');
    }
  };

  const skipPhoneVerify = () => {
    setStep(3);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!consentCritical) {
      setError("You must agree to receive critical alerts.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await register({
        full_name: fullName,
        email,
        password,
        phone,
        country,
        country_code: countryCode,
        language_preference: language,
        preferences: {
          critical_alerts: consentCritical,
          updates: consentUpdates
        }
      });
      onRegistered();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const strength = getPasswordStrength(password);

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={onBack}>← BACK TO LOGIN</button>
      
      <div className={styles.card}>
        <div className={styles.stepIndicator}>
          <div className={`${styles.circle} ${step >= 1 ? styles.activeCircle : ''} ${step > 1 ? styles.completedCircle : ''}`}>1</div>
          <div className={`${styles.line} ${step >= 2 ? styles.activeLine : ''}`}></div>
          <div className={`${styles.circle} ${step >= 2 ? styles.activeCircle : ''} ${step > 2 ? styles.completedCircle : ''}`}>2</div>
          <div className={`${styles.line} ${step >= 3 ? styles.activeLine : ''}`}></div>
          <div className={`${styles.circle} ${step >= 3 ? styles.activeCircle : ''}`}>3</div>
        </div>

        {error && (
          <div className={styles.errorAlert}>
            {error.toUpperCase()}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleStep1Submit} className={styles.form}>
            <h2 className={styles.stepTitle}>PERSONAL DETAILS</h2>
            
            <div className={styles.inputGroup}>
              <label>Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={styles.input} />
            </div>

            <div className={styles.inputGroup}>
              <label>Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={styles.input} />
            </div>

            <div className={styles.inputGroup}>
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={styles.input} />
              {password.length > 0 && (
                <div className={styles.strengthBar}>
                  <div className={styles.strengthTrack}>
                    <div 
                      className={styles.strengthFill} 
                      style={{ width: strength.width, backgroundColor: `var(--accent-${strength.color === 'red' ? 'risk-critical' : strength.color})` }}
                    ></div>
                  </div>
                  <span style={{ color: `var(--accent-${strength.color})`, fontSize: '0.75rem' }}>{strength.label}</span>
                </div>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={styles.input} />
            </div>

            <div className={styles.row}>
              <div className={styles.inputGroup} style={{ flex: 1 }}>
                <label>Country</label>
                <select value={country} onChange={handleCountryChange} className={styles.select}>
                  {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className={styles.inputGroup} style={{ width: '80px' }}>
                <label>Code</label>
                <input type="text" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className={styles.input} />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={styles.input} />
            </div>

            <button type="submit" className={styles.primaryButton}>CONTINUE</button>
          </form>
        )}

        {step === 2 && (
          <div className={styles.form}>
            <h2 className={styles.stepTitle}>PHONE VERIFICATION</h2>
            <p className={styles.textHelp}>Verifying: {countryCode} {phone}</p>
            
            {!otpSent ? (
              <button onClick={sendOtp} className={styles.primaryButton} disabled={isLoading}>
                {isLoading ? 'SENDING...' : 'SEND OTP'}
              </button>
            ) : (
              <div className={styles.otpWrapper}>
                <div className={styles.statusBadge}>
                  {demoOtpValue ? 'DEMO MODE' : 'LIVE'}
                </div>
                
                <OtpVerification 
                  length={6} 
                  onComplete={handleOtpComplete}
                  onResend={sendOtp}
                  countdown={countdown}
                  status={otpStatus}
                  errorMessage={error}
                  demoOtp={demoOtpValue}
                />
              </div>
            )}
            
            <button onClick={skipPhoneVerify} className={styles.textButton}>
              Skip for now (verify later)
            </button>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className={styles.form}>
            <h2 className={styles.stepTitle}>CONSENT & FINISH</h2>
            
            <div className={styles.checkboxGroup}>
              <input 
                type="checkbox" 
                id="consent1" 
                checked={consentCritical} 
                onChange={(e) => setConsentCritical(e.target.checked)} 
                className={styles.checkbox}
              />
              <label htmlFor="consent1">
                I agree to receive critical emergency safety alerts for my registered locations. This is required for emergency notification delivery.
              </label>
            </div>

            <div className={styles.checkboxGroup}>
              <input 
                type="checkbox" 
                id="consent2" 
                checked={consentUpdates} 
                onChange={(e) => setConsentUpdates(e.target.checked)} 
                className={styles.checkbox}
              />
              <label htmlFor="consent2">
                I agree to receive platform updates, non-emergency communications, and safety tips.
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label>Language Preference</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={styles.select}>
                {['English', 'Hindi', 'Tamil', 'Telugu', 'French', 'Spanish', 'Japanese', 'Chinese', 'Portuguese'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <button type="submit" className={styles.primaryButton} disabled={isLoading || !consentCritical}>
              {isLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
