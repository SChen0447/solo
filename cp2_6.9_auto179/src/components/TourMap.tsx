import React, { useEffect, useRef } from 'react';
import { Venue } from '../types';

interface TourMapProps {
  venues: Venue[];
  width?: number;
  height?: number;
}

const statusColors: Record<string, string> = {
  confirmed: '#4CAF50',
  pending: '#FF9800',
  cancelled: '#F44336'
};

const TourMap: React.FC<TourMapProps> = ({ venues, width = 280, height = 180 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || venues.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0D47A1';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 30) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    const lats = venues.map(v => v.lat);
    const lngs = venues.map(v => v.lng);
    const minLat = Math.min(...lats) - 2;
    const maxLat = Math.max(...lats) + 2;
    const minLng = Math.min(...lngs) - 2;
    const maxLng = Math.max(...lngs) + 2;

    const padding = 20;
    const toX = (lng: number) => padding + ((lng - minLng) / (maxLng - minLng)) * (width - padding * 2);
    const toY = (lat: number) => height - padding - ((lat - minLat) / (maxLat - minLat)) * (height - padding * 2);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#FF6F00');
    gradient.addColorStop(0.5, '#FF8F00');
    gradient.addColorStop(1, '#FFAB00');

    ctx.save();
    ctx.shadowColor = '#FF6F00';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    venues.forEach((v, i) => {
      const x = toX(v.lng);
      const y = toY(v.lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();

    venues.forEach((v, i) => {
      const x = toX(v.lng);
      const y = toY(v.lat);
      const color = statusColors[v.status];

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), x, y + 4);
    });

  }, [venues, width, height]);

  return <canvas ref={canvasRef} className="tour-map-canvas" />;
};

export default TourMap;
