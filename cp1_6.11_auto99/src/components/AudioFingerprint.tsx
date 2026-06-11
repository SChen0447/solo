import { useRef, useEffect } from 'react';
import { getFrequencyBandColor } from '@/utils/colorUtils';

interface AudioFingerprintProps {
  fingerprint: number[];
  dominantBand: 'low' | 'mid' | 'high';
}

export default function AudioFingerprint({ fingerprint, dominantBand }: AudioFingerprintProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || fingerprint.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const color = getFrequencyBandColor(dominantBand);
    const step = w / (fingerprint.length - 1);

    ctx.beginPath();
    ctx.moveTo(0, h / 2);

    for (let i = 0; i < fingerprint.length; i++) {
      const x = i * step;
      const y = h / 2 - fingerprint[i] * h * 0.4;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = (i - 1) * step;
        const prevY = h / 2 - fingerprint[i - 1] * h * 0.4;
        const cpx = (prevX + x) / 2;
        ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
      }
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [fingerprint, dominantBand]);

  if (fingerprint.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      width={48}
      height={24}
      style={{
        display: 'block',
        flexShrink: 0,
      }}
    />
  );
}
