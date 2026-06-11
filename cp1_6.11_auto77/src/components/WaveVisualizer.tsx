import React, { useRef, useEffect } from 'react';
import { AudioAnalysisData } from '../utils/audioEngine';

interface WaveVisualizerProps {
  analysisData: AudioAnalysisData | null;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

const WaveVisualizer: React.FC<WaveVisualizerProps> = ({ analysisData, canvasRef }) => {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvas = canvasRef || internalCanvasRef;
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvasEl = canvas.current;
    if (!canvasEl) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvasEl.getBoundingClientRect();
      canvasEl.width = rect.width * dpr;
      canvasEl.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = () => {
      const rect = canvasEl.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.fillStyle = '#0d1b2a';
      ctx.fillRect(0, 0, width, height);

      if (analysisData) {
        drawFrequencyBars(ctx, analysisData.frequencyData, width, height);
        drawTimeDomainWave(ctx, analysisData.timeDomainData, width, height);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analysisData, canvas]);

  const drawFrequencyBars = (
    ctx: CanvasRenderingContext2D,
    frequencyData: Uint8Array,
    width: number,
    height: number
  ) => {
    const barCount = frequencyData.length;
    const gap = 2;
    const barWidth = (width - gap * (barCount - 1)) / barCount;

    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#7c4dff');
    gradient.addColorStop(1, '#ff6b9d');

    ctx.fillStyle = gradient;

    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i];
      const barHeight = (value / 255) * height * 0.9;
      const x = i * (barWidth + gap);
      const y = height - barHeight;

      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const drawTimeDomainWave = (
    ctx: CanvasRenderingContext2D,
    timeDomainData: Uint8Array,
    width: number,
    height: number
  ) => {
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;

    ctx.beginPath();

    const sliceWidth = width / timeDomainData.length;
    let x = 0;

    for (let i = 0; i < timeDomainData.length; i++) {
      const v = timeDomainData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  return (
    <canvas
      ref={canvas}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        borderRadius: '8px',
      }}
    />
  );
};

export default WaveVisualizer;
