import { useRef, useEffect, useCallback } from 'react';
import { audioEngine } from './AudioEngine';
import { useAudioStore, type WaveMode } from '@/store/audioStore';

interface RenderState {
  currentMode: WaveMode;
  transitionProgress: number;
  prevData: Float32Array;
  currentData: Float32Array;
}

export default function WaveVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const renderStateRef = useRef<RenderState>({
    currentMode: 'bars',
    transitionProgress: 1,
    prevData: new Float32Array(128),
    currentData: new Float32Array(128),
  });
  const prevModeRef = useRef<WaveMode>('bars');
  const waveMode = useAudioStore((s) => s.waveMode);
  const themeColors = useAudioStore((s) => s.themeColors);
  const tracks = useAudioStore((s) => s.tracks);

  const BAR_COUNT = 128;

  const getBarColor = useCallback(
    (index: number, _height: number) => {
      const freq = index / BAR_COUNT;
      if (freq < 0.2) {
        return '#ff3366';
      } else if (freq < 0.6) {
        return '#33ff99';
      } else {
        return '#66b3ff';
      }
    },
    []
  );

  useEffect(() => {
    if (waveMode !== prevModeRef.current) {
      const rs = renderStateRef.current;
      rs.prevData = new Float32Array(rs.currentData);
      rs.currentMode = waveMode;
      rs.transitionProgress = 0;
      prevModeRef.current = waveMode;
    }
  }, [waveMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();

    const drawBars = (
      data: Float32Array,
      w: number,
      h: number,
      alpha: number
    ) => {
      const barWidth = w / BAR_COUNT;
      for (let i = 0; i < BAR_COUNT; i++) {
        const val = data[i];
        const barH = val * h * 0.85;
        const x = i * barWidth;
        const color = getBarColor(i, val);

        const grad = ctx!.createLinearGradient(x, h, x, h - barH);
        grad.addColorStop(0, `rgba(26, 26, 46, ${0.6 * alpha})`);
        grad.addColorStop(0.3, color + Math.round(alpha * 180).toString(16).padStart(2, '0'));
        grad.addColorStop(1, color + Math.round(alpha * 255).toString(16).padStart(2, '0'));

        ctx!.fillStyle = grad;
        ctx!.fillRect(x + 1, h - barH, barWidth - 2, barH);
      }
    };

    const drawLines = (
      data: Float32Array,
      w: number,
      h: number,
      alpha: number
    ) => {
      const step = w / (BAR_COUNT - 1);
      ctx!.beginPath();
      ctx!.moveTo(0, h);

      for (let i = 0; i < BAR_COUNT; i++) {
        const x = i * step;
        const y = h - data[i] * h * 0.85;
        if (i === 0) {
          ctx!.lineTo(x, y);
        } else {
          const prevX = (i - 1) * step;
          const prevY = h - data[i - 1] * h * 0.85;
          const cpx = (prevX + x) / 2;
          ctx!.bezierCurveTo(cpx, prevY, cpx, y, x, y);
        }
      }

      ctx!.lineTo(w, h);
      ctx!.closePath();

      const fillGrad = ctx!.createLinearGradient(0, 0, w, 0);
      fillGrad.addColorStop(0, `rgba(255, 51, 102, ${0.2 * alpha})`);
      fillGrad.addColorStop(0.3, `rgba(51, 255, 153, ${0.2 * alpha})`);
      fillGrad.addColorStop(0.7, `rgba(102, 179, 255, ${0.2 * alpha})`);
      fillGrad.addColorStop(1, `rgba(102, 179, 255, ${0.1 * alpha})`);
      ctx!.fillStyle = fillGrad;
      ctx!.fill();

      ctx!.beginPath();
      for (let i = 0; i < BAR_COUNT; i++) {
        const x = i * step;
        const y = h - data[i] * h * 0.85;
        if (i === 0) {
          ctx!.moveTo(x, y);
        } else {
          const prevX = (i - 1) * step;
          const prevY = h - data[i - 1] * h * 0.85;
          const cpx = (prevX + x) / 2;
          ctx!.bezierCurveTo(cpx, prevY, cpx, y, x, y);
        }
      }
      ctx!.strokeStyle = themeColors.primary + Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx!.lineWidth = 2;
      ctx!.stroke();
    };

    const drawParticles = (
      data: Float32Array,
      w: number,
      h: number,
      alpha: number
    ) => {
      const step = w / (BAR_COUNT - 1);
      const particles: { x: number; y: number; r: number; color: string }[] = [];

      for (let i = 0; i < BAR_COUNT; i++) {
        const x = i * step;
        const y = h - data[i] * h * 0.85;
        const r = 2 + data[i] * 6;
        const color = getBarColor(i, data[i]);
        particles.push({ x, y, r, color });
      }

      ctx!.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < Math.min(i + 5, particles.length); j++) {
          const dx = particles[j].x - particles[i].x;
          const dy = particles[j].y - particles[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < step * 4) {
            const lineAlpha = (1 - dist / (step * 4)) * 0.4 * alpha;
            ctx!.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }

      for (const p of particles) {
        const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2);
        grad.addColorStop(0, p.color + Math.round(alpha * 220).toString(16).padStart(2, '0'));
        grad.addColorStop(0.6, p.color + Math.round(alpha * 100).toString(16).padStart(2, '0'));
        grad.addColorStop(1, p.color + '00');
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r * 2, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    };

    const draw = () => {
      const rs = renderStateRef.current;
      const dpr = window.devicePixelRatio;
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);

      const combinedData = new Float32Array(BAR_COUNT);
      let hasData = false;

      for (let t = 0; t < 4; t++) {
        if (tracks[t].loaded && tracks[t].playing) {
          const freqData = audioEngine.getFrequencyData(t);
          for (let i = 0; i < BAR_COUNT && i < freqData.length; i++) {
            combinedData[i] = Math.max(combinedData[i], freqData[i] / 255);
          }
          hasData = true;
        }
      }

      if (!hasData) {
        for (let i = 0; i < BAR_COUNT; i++) {
          combinedData[i] = 0.02 + 0.01 * Math.sin(Date.now() / 1000 + i * 0.2);
        }
      }

      rs.currentData = combinedData;

      if (rs.transitionProgress < 1) {
        rs.transitionProgress = Math.min(1, rs.transitionProgress + 1 / (0.3 * 60));

        const prevAlpha = 1 - rs.transitionProgress;
        const currAlpha = rs.transitionProgress;

        const drawMode = (mode: WaveMode, data: Float32Array, alpha: number) => {
          if (alpha <= 0) return;
          ctx!.globalAlpha = alpha;
          switch (mode) {
            case 'bars': drawBars(data, w, h, 1); break;
            case 'lines': drawLines(data, w, h, 1); break;
            case 'particles': drawParticles(data, w, h, 1); break;
          }
          ctx!.globalAlpha = 1;
        };

        const prevMode = prevModeRef.current;
        drawMode(prevMode as WaveMode, rs.prevData, prevAlpha);
        drawMode(rs.currentMode, combinedData, currAlpha);
      } else {
        switch (rs.currentMode) {
          case 'bars': drawBars(combinedData, w, h, 1); break;
          case 'lines': drawLines(combinedData, w, h, 1); break;
          case 'particles': drawParticles(combinedData, w, h, 1); break;
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [tracks, themeColors, getBarColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}
