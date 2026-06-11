import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface MeasurementStationProps {
  label: string;
  angle: number;
  onAngleChange: (angle: number) => void;
  spinResult: number | null;
  resultKey?: number;
}

export default function MeasurementStation({
  label,
  angle,
  onAngleChange,
  spinResult,
  resultKey = 0,
}: MeasurementStationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
    }>
  >([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (spinResult !== null) {
      const newParticles = [];
      const particleCount = 20;
      const color = spinResult === 1 ? '#f44336' : '#2196f3';
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
        const speed = 2 + Math.random() * 3;
        newParticles.push({
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color,
        });
      }
      setParticles(newParticles);
    }
  }, [spinResult, resultKey]);

  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 0.02,
          }))
          .filter((p) => p.life > 0)
      );
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particles.length > 0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 90;

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createRadialGradient(
      centerX - 20,
      centerY - 20,
      0,
      centerX,
      centerY,
      radius
    );
    gradient.addColorStop(0, '#3a4a5a');
    gradient.addColorStop(0.5, '#2a3a4a');
    gradient.addColorStop(1, '#1a2a3a');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#4a5a6a';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 188, 212, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const startAngle = (Math.PI * 2 * i) / 8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.8, startAngle, startAngle + Math.PI / 4);
      ctx.stroke();
    }

    for (let i = 0; i < 72; i++) {
      const tickAngle = (Math.PI * 2 * i) / 72;
      const innerRadius = i % 9 === 0 ? radius * 0.75 : radius * 0.85;
      const outerRadius = radius * 0.92;

      const x1 = centerX + Math.cos(tickAngle) * innerRadius;
      const y1 = centerY + Math.sin(tickAngle) * innerRadius;
      const x2 = centerX + Math.cos(tickAngle) * outerRadius;
      const y2 = centerY + Math.sin(tickAngle) * outerRadius;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = i % 9 === 0 ? '#00bcd4' : '#4a6a8a';
      ctx.lineWidth = i % 9 === 0 ? 2 : 1;
      ctx.stroke();
    }

    for (let i = 0; i < 8; i++) {
      const labelAngle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      const labelRadius = radius * 0.65;
      const x = centerX + Math.cos(labelAngle) * labelRadius;
      const y = centerY + Math.sin(labelAngle) * labelRadius;
      const degrees = i * 45;

      ctx.font = 'bold 10px Arial';
      ctx.fillStyle = '#00bcd4';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${degrees}°`, x, y);
    }

    const indicatorAngle = (angle * Math.PI) / 180 - Math.PI / 2;
    const indicatorLength = radius * 0.85;

    ctx.save();
    ctx.shadowColor = '#ff9800';
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(indicatorAngle) * indicatorLength,
      centerY + Math.sin(indicatorAngle) * indicatorLength
    );
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ff9800';
    ctx.fill();

    ctx.restore();

    particles.forEach((p) => {
      const px = centerX + p.x;
      const py = centerY + p.y - radius - 20;
      ctx.beginPath();
      ctx.arc(px, py, 4 * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    if (spinResult !== null) {
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = spinResult === 1 ? '#f44336' : '#2196f3';
      ctx.shadowColor = spinResult === 1 ? '#f44336' : '#2196f3';
      ctx.shadowBlur = 10;

      const resultY = centerY - radius - 40;
      if (spinResult === 1) {
        const size = 16;
        ctx.beginPath();
        ctx.moveTo(centerX - size, resultY - size);
        ctx.lineTo(centerX + size, resultY + size);
        ctx.moveTo(centerX + size, resultY - size);
        ctx.lineTo(centerX - size, resultY + size);
        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = 4;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(centerX, resultY, 14, 0, Math.PI * 2);
        ctx.strokeStyle = '#2196f3';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(label, centerX, centerY + radius + 25);
  }, [angle, spinResult, particles, label]);

  return (
    <div className="measurement-station">
      <canvas
        ref={canvasRef}
        width={220}
        height={280}
        style={{ display: 'block' }}
      />
      <div className="angle-control">
        <motion.div
          className="angle-slider-container"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <input
            type="range"
            min="0"
            max="360"
            step="0.1"
            value={angle}
            onChange={(e) => onAngleChange(parseFloat(e.target.value))}
            className="angle-slider"
          />
          <motion.div
            className="angle-display"
            key={angle}
            initial={{ opacity: 0.8, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {angle.toFixed(1)}°
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
