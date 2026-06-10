import React, { useRef, useEffect, useCallback } from 'react';

interface WaveformViewProps {
  waveform: Float32Array | null;
  playing: boolean;
  onRenderTime: (ms: number) => void;
}

const WaveformView: React.FC<WaveformViewProps> = ({ waveform, playing, onRenderTime }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playheadRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#12121e';
    ctx.fillRect(0, 0, width, height);

    if (waveform && waveform.length > 0) {
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#7c5cbf');
      gradient.addColorStop(1, '#b39ddb');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const step = Math.max(1, Math.floor(waveform.length / width));
      const centerY = height / 2;

      for (let x = 0; x < width; x++) {
        const i = x * step;
        if (i >= waveform.length) break;
        const y = centerY - waveform[i] * (height * 0.4);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      if (playing) {
        playheadRef.current += 1 / 30;
        if (playheadRef.current > 1) playheadRef.current = 0;
      }

      const playheadX = playheadRef.current * width;
      ctx.strokeStyle = 'rgba(212, 191, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }

    const elapsed = performance.now() - startTime;
    onRenderTime(elapsed);
  }, [waveform, playing, onRenderTime]);

  useEffect(() => {
    playheadRef.current = 0;
  }, [waveform]);

  useEffect(() => {
    const animate = () => {
      draw();
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={200}
      style={{
        width: 400,
        height: 200,
        backgroundColor: '#12121e',
        borderRadius: 12,
        display: 'block',
      }}
    />
  );
};

export default WaveformView;
