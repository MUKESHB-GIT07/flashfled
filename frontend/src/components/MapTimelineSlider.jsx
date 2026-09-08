import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward } from 'lucide-react';
import styles from './MapTimelineSlider.module.css';

export const TIME_STEPS_CATALOG = [
  { id: 'NOW', label: 'NOW', offsetHours: 0, status: 'LIVE / OBSERVED' },
  { id: '+1H', label: '+1H', offsetHours: 1, status: 'FORECAST MODEL' },
  { id: '+3H', label: '+3H', offsetHours: 3, status: 'FORECAST MODEL' },
  { id: '+6H', label: '+6H', offsetHours: 6, status: 'FORECAST MODEL' },
  { id: '+12H', label: '+12H', offsetHours: 12, status: 'FORECAST MODEL' },
  { id: '+24H', label: '+24H', offsetHours: 24, status: 'FORECAST MODEL' },
  { id: '+3D', label: '+3D', offsetHours: 72, status: 'PROJECTED CASCADE' },
  { id: '+7D', label: '+7D', offsetHours: 168, status: 'PROJECTED CASCADE' },
];

export default function MapTimelineSlider({ selectedTimeStep = 'NOW', onChangeTimeStep }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMult, setSpeedMult] = useState(1); // 1x or 2x
  const playIntervalRef = useRef(null);

  const currentIndex = TIME_STEPS_CATALOG.findIndex((ts) => ts.id === selectedTimeStep);
  const currentStep = TIME_STEPS_CATALOG[currentIndex >= 0 ? currentIndex : 0];

  // Auto playback stepping
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = speedMult === 2 ? 1000 : 2000;
      playIntervalRef.current = setInterval(() => {
        onChangeTimeStep((prevStep) => {
          const idx = TIME_STEPS_CATALOG.findIndex((ts) => ts.id === prevStep);
          const nextIdx = (idx + 1) % TIME_STEPS_CATALOG.length;
          return TIME_STEPS_CATALOG[nextIdx].id;
        });
      }, intervalMs);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, speedMult, onChangeTimeStep]);

  const handleSliderChange = (e) => {
    const idx = Number(e.target.value);
    if (TIME_STEPS_CATALOG[idx]) {
      onChangeTimeStep(TIME_STEPS_CATALOG[idx].id);
    }
  };

  const toggleSpeed = () => {
    setSpeedMult((prev) => (prev === 1 ? 2 : 1));
  };

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <div className={styles.controlsGroup}>
          <button
            className={styles.playBtn}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Timeline' : 'Play Forecast Animation'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
          </button>
          <button className={styles.speedBtn} onClick={toggleSpeed} title="Toggle animation speed">
            {speedMult}x
          </button>
        </div>

        <div className={styles.badgeGroup}>
          <span className={styles.timeLabel}>FORECAST TIMELINE: {currentStep.label}</span>
          <span
            className={`${styles.statusTag} ${
              currentStep.id === 'NOW' ? styles.liveTag : styles.forecastTag
            }`}
          >
            {currentStep.status}
          </span>
        </div>
      </div>

      <div className={styles.sliderTrack}>
        <input
          type="range"
          min="0"
          max={TIME_STEPS_CATALOG.length - 1}
          value={currentIndex >= 0 ? currentIndex : 0}
          onChange={handleSliderChange}
          className={styles.rangeInput}
        />
        <div className={styles.stepsRow}>
          {TIME_STEPS_CATALOG.map((ts, idx) => (
            <button
              key={ts.id}
              className={`${styles.stepBtn} ${ts.id === selectedTimeStep ? styles.stepActive : ''}`}
              onClick={() => onChangeTimeStep(ts.id)}
            >
              {ts.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
