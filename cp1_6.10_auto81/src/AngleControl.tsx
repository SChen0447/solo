import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ColorStop, gradientToStopsArray } from './utils';

interface AngleControlProps {
  angle: number;
  stops: ColorStop[];
  onAngleChange: (angle: number) => void;
}

const AngleControl: React.FC<AngleControlProps> = ({ angle, stops, onAngleChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastAngleRef = useRef<number>(angle);

  const drawKnob = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 80;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const radius = 34;

    ctx.clearRect(0, 0, size, size);

    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#3a3a5a');
    gradient.addColorStop(1, '#2a2a4a');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, radius + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    const tickCount = 36;
    for (let i = 0; i < tickCount; i++) {
      const tickAngle = (i / tickCount) * Math.PI * 2 - Math.PI / 2;
      const isMajor = i % 9 === 0;
      const innerR = radius - (isMajor ? 8 : 4);
      const outerR = radius - 1;
      ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = isMajor ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(center + Math.cos(tickAngle) * innerR, center + Math.sin(tickAngle) * innerR);
      ctx.lineTo(center + Math.cos(tickAngle) * outerR, center + Math.sin(tickAngle) * outerR);
      ctx.stroke();
    }

    const pointerAngle = (angle / 360) * Math.PI * 2 - Math.PI / 2;
    const pointerLen = radius - 10;
    const pointerX = center + Math.cos(pointerAngle) * pointerLen;
    const pointerY = center + Math.sin(pointerAngle) * pointerLen;

    ctx.strokeStyle = '#0066ff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(pointerX, pointerY);
    ctx.stroke();

    ctx.fillStyle = '#0066ff';
    ctx.beginPath();
    ctx.arc(center, center, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [angle]);

  useEffect(() => {
    drawKnob();
  }, [drawKnob]);

  const calculateAngle = (e: MouseEvent | React.MouseEvent): number => {
    const canvas = canvasRef.current;
    if (!canvas) return angle;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    return Math.round(deg) % 360;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const newAngle = calculateAngle(e);
    lastAngleRef.current = newAngle;
    onAngleChange(newAngle);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const newAngle = calculateAngle(e);
        if (Math.abs(newAngle - lastAngleRef.current) >= 1) {
          lastAngleRef.current = newAngle;
          onAngleChange(newAngle);
        }
      });
    };

    const handleMouseUp = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onAngleChange]);

  const gradientCSS = gradientToStopsArray(stops);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'transform 0.05s ease-out',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            fontSize: 14,
            fontWeight: 600,
            color: '#e0e0e0',
            marginTop: 18,
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          {angle}°
        </div>
      </div>
      <div
        style={{
          width: 200,
          height: 100,
          borderRadius: 8,
          background: `linear-gradient(${angle}deg, ${gradientCSS})`,
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
};

export default AngleControl;
