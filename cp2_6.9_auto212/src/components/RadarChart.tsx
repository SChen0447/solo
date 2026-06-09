import { useEffect, useRef, useState } from 'react';

interface RadarChartProps {
  acidity: number;
  bitterness: number;
  sweetness: number;
  body: number;
  cleanliness: number;
  size?: number;
}

const DIMENSIONS = [
  { key: 'acidity', label: '酸度', color: '#E74C3C' },
  { key: 'bitterness', label: '苦度', color: '#8B4513' },
  { key: 'sweetness', label: '甜度', color: '#F39C12' },
  { key: 'body', label: '醇厚度', color: '#D4A574' },
  { key: 'cleanliness', label: '干净度', color: '#27AE60' }
];

export default function RadarChart({
  acidity,
  bitterness,
  sweetness,
  body,
  cleanliness,
  size = 280
}: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fadeIn, setFadeIn] = useState(false);

  const values = [acidity, bitterness, sweetness, body, cleanliness];
  const totalScore = Number(
    (acidity * 0.2 + bitterness * 0.15 + sweetness * 0.25 + body * 0.2 + cleanliness * 0.2).toFixed(2)
  );

  useEffect(() => {
    setFadeIn(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.38;
    const sides = 5;
    const angleStep = (Math.PI * 2) / sides;
    const startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);

    for (let level = 1; level <= 5; level++) {
      const r = (radius * level) / 5;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = startAngle + i * angleStep;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.strokeStyle = level === 5 ? '#8B5E3C' : '#C68E4A40';
      ctx.lineWidth = level === 5 ? 1.5 : 1;
      ctx.stroke();
    }

    for (let i = 0; i < sides; i++) {
      const angle = startAngle + i * angleStep;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
      ctx.strokeStyle = '#C68E4A40';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const dataPoints = values.map((value, i) => {
      const angle = startAngle + i * angleStep;
      const r = (radius * value) / 10;
      return {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
        angle,
        color: DIMENSIONS[i].color
      };
    });

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(139, 94, 60, 0.4)');
    gradient.addColorStop(0.5, 'rgba(198, 142, 74, 0.35)');
    gradient.addColorStop(1, 'rgba(231, 76, 60, 0.25)');

    ctx.beginPath();
    dataPoints.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        const prevPoint = dataPoints[i - 1];
        const cpx1 = prevPoint.x + (point.x - prevPoint.x) * 0.5;
        const cpy1 = prevPoint.y + (point.y - prevPoint.y) * 0.5;
        ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpx1, cpy1);
      }
    });
    const lastPoint = dataPoints[dataPoints.length - 1];
    const firstPoint = dataPoints[0];
    const cpx = lastPoint.x + (firstPoint.x - lastPoint.x) * 0.5;
    const cpy = lastPoint.y + (firstPoint.y - lastPoint.y) * 0.5;
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, cpx, cpy);
    ctx.quadraticCurveTo(firstPoint.x, firstPoint.y, firstPoint.x, firstPoint.y);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    dataPoints.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.strokeStyle = '#8B5E3C';
    ctx.lineWidth = 2;
    ctx.stroke();

    dataPoints.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = point.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    DIMENSIONS.forEach((dim, i) => {
      const angle = startAngle + i * angleStep;
      const labelRadius = radius + 24;
      const x = centerX + labelRadius * Math.cos(angle);
      const y = centerY + labelRadius * Math.sin(angle);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = dim.color;
      ctx.fillText(dim.label, x, y);

      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText(String(values[i]), x, y + 14);
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, 28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();
    ctx.strokeStyle = '#8B5E3C';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#8B5E3C';
    ctx.fillText(totalScore.toFixed(1), centerX, centerY - 2);

    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#999';
    ctx.fillText('总分', centerX, centerY + 14);
  }, [acidity, bitterness, sweetness, body, cleanliness, size, totalScore]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out'
      }}
    />
  );
}
