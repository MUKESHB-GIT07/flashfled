import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * WindCanvasOverlay — High Performance Canvas Wind Particle Flow Visualization
 * Renders smooth moving wind flow particles across Leaflet map at 60 FPS.
 */
export default function WindCanvasOverlay({
  windSpeedKmh = 18,
  windDirectionDeg = 220,
  isPlaying = true,
  speedFactor = 1,
  timeStep = 'NOW'
}) {
  const map = useMap();
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const mapContainer = map.getContainer();
    let canvas = canvasRef.current;

    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '450'; // On top of basemap tiles, below popups
      mapContainer.appendChild(canvas);
      canvasRef.current = canvas;
    }

    const ctx = canvas.getContext('2d');

    // Resize canvas to match map container
    const resizeCanvas = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      initParticles(size.x, size.y);
    };

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Initialize wind flow particles
    const initParticles = (width, height) => {
      // Scale particle count based on screen width (max 1200 on desktop, 500 on mobile)
      const particleCount = width < 600 ? 500 : 1200;
      const particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          age: Math.floor(Math.random() * 80),
          maxAge: 40 + Math.random() * 60,
          speedMult: 0.6 + Math.random() * 0.8
        });
      }
      particlesRef.current = particles;
    };

    resizeCanvas();

    // Map timeStep offset to wind velocity modulation
    let speedMod = 1.0;
    if (timeStep === '+1H') speedMod = 1.1;
    if (timeStep === '+3H') speedMod = 1.25;
    if (timeStep === '+6H') speedMod = 1.4;
    if (timeStep === '+12H') speedMod = 1.6;
    if (timeStep === '+24H') speedMod = 1.8;
    if (timeStep === '+3D') speedMod = 2.0;
    if (timeStep === '+7D') speedMod = 2.2;

    const currentSpeed = Math.max(5, windSpeedKmh * speedMod);

    // Convert meteorological wind direction (where wind comes from) to math direction angle
    const rad = ((windDirectionDeg + 180) % 360) * (Math.PI / 180);
    const u = Math.sin(rad) * (currentSpeed / 12) * speedFactor;
    const v = -Math.cos(rad) * (currentSpeed / 12) * speedFactor;

    // Wind speed color mapping
    const getParticleColor = (spd) => {
      if (spd < 15) return 'rgba(167, 139, 250, 0.75)'; // Light Purple
      if (spd < 30) return 'rgba(56, 189, 248, 0.85)';  // Cyan / Blue
      if (spd < 50) return 'rgba(251, 191, 36, 0.9)';   // Amber / Yellow
      if (spd < 80) return 'rgba(251, 146, 60, 0.95)';  // Orange
      return 'rgba(244, 63, 94, 1.0)';                  // Red / Magenta
    };

    const color = getParticleColor(currentSpeed);

    // Animation Loop
    const animate = () => {
      if (!isPlaying || prefersReducedMotion) {
        // Static frame draw for reduced motion or paused state
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        particlesRef.current.forEach((p) => {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + u * 4, p.y + v * 4);
          ctx.stroke();
        });
        return;
      }

      // Fade canvas slightly for motion trail effect
      ctx.fillStyle = 'rgba(10, 15, 30, 0.88)';
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;

      const particles = particlesRef.current;
      const width = canvas.width;
      const height = canvas.height;

      ctx.beginPath();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const oldX = p.x;
        const oldY = p.y;

        p.x += u * p.speedMult;
        p.y += v * p.speedMult;
        p.age++;

        if (p.age >= p.maxAge || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          p.x = Math.random() * width;
          p.y = Math.random() * height;
          p.age = 0;
        } else {
          ctx.moveTo(oldX, oldY);
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleMove = () => {
      resizeCanvas();
    };

    map.on('moveend zoomend resize', handleMove);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.off('moveend zoomend resize', handleMove);
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
        canvasRef.current = null;
      }
    };
  }, [map, windSpeedKmh, windDirectionDeg, isPlaying, speedFactor, timeStep]);

  return null;
}
