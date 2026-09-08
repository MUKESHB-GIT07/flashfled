import React, { useState, useRef, useEffect } from 'react';
import styles from './OtpVerification.module.css';

const OtpVerification = ({ 
  length = 6, 
  onComplete, 
  onResend, 
  countdown, 
  status, 
  errorMessage, 
  demoOtp 
}) => {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, e) => {
    const value = e.target.value;
    if (isNaN(value)) return;

    const newOtp = [...otp];
    // take only the last character in case of rapid typing
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Trigger complete if full
    if (newOtp.every(v => v !== '') && index === length - 1) {
      onComplete(newOtp.join(''));
    }

    // Move to next input
    if (value !== '' && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length).split('');
    if (pastedData.some(isNaN)) return;

    const newOtp = [...otp];
    pastedData.forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);

    // Focus on the next empty box or the last one
    const focusIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[focusIndex].focus();

    if (newOtp.every(v => v !== '')) {
      onComplete(newOtp.join(''));
    }
  };

  const isError = status === 'error';
  const isSuccess = status === 'success';

  return (
    <div className={styles.container}>
      {demoOtp && (
        <div className={styles.demoHint}>
          <span className={styles.lockIcon}>🔒</span>
          DEMO MODE — OTP: {demoOtp}
        </div>
      )}
      
      <div 
        className={`${styles.otpGroup} ${isError ? styles.errorShake : ''} ${isSuccess ? styles.successScale : ''}`}
        onPaste={handlePaste}
      >
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={`${styles.otpBox} ${digit ? styles.filledBox : ''} ${isError ? styles.errorBox : ''} ${isSuccess ? styles.successBox : ''}`}
            disabled={status === 'verifying' || status === 'success'}
          />
        ))}
        {status === 'verifying' && <div className={styles.overlaySpinner}></div>}
      </div>

      {isError && errorMessage && (
        <div className={styles.errorMessage}>{errorMessage}</div>
      )}

      <div className={styles.actionRow}>
        {countdown > 0 ? (
          <span className={styles.countdown}>Resend OTP in {countdown}s</span>
        ) : (
          <button type="button" onClick={onResend} className={styles.resendBtn} disabled={status === 'verifying'}>
            RESEND OTP
          </button>
        )}
      </div>
    </div>
  );
};

export default OtpVerification;
