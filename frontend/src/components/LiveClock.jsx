import React, { useState, useEffect, useRef } from 'react';
import styles from './LiveClock.module.css';

/**
 * LiveClock — Phase 2
 * ===================
 * Displays system time (updated every second) clearly separated
 * from source data timestamps.
 *
 * Shows:
 *   DATE (e.g. 07 SEP 2026)
 *   TIME (e.g. 18:42:18)
 *   TIMEZONE (e.g. IST / UTC+5:30)
 *   ● SYSTEM LIVE pulse dot
 *
 * Props:
 *   compact  — boolean: if true shows condensed single-line version
 */
export default function LiveClock({ compact = false }) {
  const [now, setNow] = useState(new Date());
  const intervalRef = useRef(null);

  useEffect(() => {
    // Tick exactly every second
    const tick = () => setNow(new Date());
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Format helpers
  const pad = (n) => String(n).padStart(2, '0');

  const day = pad(now.getDate());
  const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();

  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());

  // Resolve local timezone abbreviation
  const tzString = Intl.DateTimeFormat('en', { timeZoneName: 'short' })
    .formatToParts(now)
    .find((p) => p.type === 'timeZoneName')?.value || 'LOCAL';

  if (compact) {
    return (
      <div className={styles.compact} aria-label="System clock">
        <span className={styles.pulseDot} aria-hidden="true" />
        <span className={styles.compactTime}>{hh}:{mm}:{ss}</span>
        <span className={styles.compactTz}>{tzString}</span>
      </div>
    );
  }

  return (
    <div className={styles.clock} role="timer" aria-label="System live clock" aria-live="off">
      {/* Status label */}
      <div className={styles.statusRow}>
        <span className={styles.pulseDot} aria-hidden="true" />
        <span className={styles.statusLabel}>SYSTEM LIVE</span>
      </div>

      {/* Date */}
      <div className={styles.date}>{day} {month} {year}</div>

      {/* Time — SS ticks visually */}
      <div className={styles.timeRow}>
        <span className={styles.hhmm}>{hh}:{mm}</span>
        <span className={styles.separator}>:</span>
        <span className={styles.seconds} key={ss}>{ss}</span>
      </div>

      {/* Timezone */}
      <div className={styles.timezone}>
        <span className={styles.tzLabel}>SYSTEM TIME</span>
        <span className={styles.tzValue}>{tzString}</span>
      </div>

      {/* Distinction note */}
      <div className={styles.distinction}>
        System time is separate from source data timestamps
      </div>
    </div>
  );
}
