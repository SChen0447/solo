import { useEffect, useRef, useState } from 'react';

interface WaveLine {
  baseY: number;
  amplitude: number;
  speed: number;
  phase: number;
  opacity: number;
}

interface FloatingBottle {
  x: number;
  y: number;
  size: number;
  direction: number;
  speed: number;
  bobPhase: number;
  opacity: number;
}

interface OceanSceneProps {
  onFpsUpdate?: (fps: number) => void;
}

const BOTTLE_COLORS = ['#66ccff', '#88dd88', '#ffaa66', '#ff66aa', '#aa88ff'];

function OceanScene({ onFpsUpdate }: OceanSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const wavesRef = useRef<WaveLine[]>([]);
  const bottlesRef = useRef<FloatingBottle[]>([]);
  const lastTimeRef = useRef<number>(0);
  const fpsFramesRef = useRef<number>(0);
  const fpsLastCheckRef = useRef<number>(0);
  const waveCountRef = useRef<number>(20);
  const lastWaveUpdateRef = useRef<number>(0);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
      initWaves(rect.width, rect.height);
      initBottles(rect.width, rect.height);
    };

    const initWaves = (width: number, height: number) => {
      const waves: WaveLine[] = [];
      const count = waveCountRef.current;
      for (let i = 0; i < count; i++) {
        waves.push({
          baseY: (height * 0.2) + (i / count) * (height * 0.7),
          amplitude: 8 + Math.random() * 20,
          speed: 0.3 + Math.random() * 0.8,
          phase: Math.random() * Math.PI * 2,
          opacity: 0.3 + Math.random() * 0.3,
        });
      }
      wavesRef.current = waves;
    };

    const initBottles = (width: number, height: number) => {
      const bottles: FloatingBottle[] = [];
      const count = 5;
      for (let i = 0; i < count; i++) {
        bottles.push(createBottle(width, height));
      }
      bottlesRef.current = bottles;
    };

    const createBottle = (width: number, height: number): FloatingBottle => {
      const fromLeft = Math.random() > 0.5;
      return {
        x: fromLeft ? -40 : width + 40,
        y: height * 0.3 + Math.random() * (height * 0.5),
        size: 30 + Math.random() * 10,
        direction: fromLeft ? 1 : -1,
        speed: 0.3 + Math.random() * 0.5,
        bobPhase: Math.random() * Math.PI * 2,
        opacity: 0.3 + Math.random() * 0.3,
      };
    };

    const drawWave = (ctx: CanvasRenderingContext2D, wave: WaveLine, width: number, time: number) => {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 255, 255, ${wave.opacity})`;
      ctx.lineWidth = 1.5;

      const segments = Math.ceil(width / 40);
      const step = width / segments;

      for (let i = 0; i <= segments; i++) {
        const x = i * step;
        const y = wave.baseY + Math.sin((x / 80) + wave.phase + time * wave.speed * 0.001) * wave.amplitude;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = (i - 1) * step;
          const cpX = (prevX + x) / 2;
          const cpY = wave.baseY + Math.sin((cpX / 80) + wave.phase + time * wave.speed * 0.001) * wave.amplitude;
          ctx.quadraticCurveTo(cpX, cpY, x, y);
        }
      }

      ctx.stroke();
    };

    const drawBottle = (ctx: CanvasRenderingContext2D, bottle: FloatingBottle, color: string) => {
      ctx.save();
      ctx.translate(bottle.x, bottle.y);
      ctx.globalAlpha = bottle.opacity;

      const s = bottle.size;
      const bobOffset = Math.sin(bottle.bobPhase) * 3;
      ctx.translate(0, bobOffset);
      ctx.rotate(bottle.direction * 0.1 + Math.sin(bottle.bobPhase * 0.5) * 0.05);

      ctx.fillStyle = color;
      ctx.globalAlpha = bottle.opacity * 0.5;

      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.35, s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.globalAlpha = bottle.opacity * 0.6;
      ctx.beginPath();
      ctx.ellipse(-s * 0.12, -s * 0.2, s * 0.06, s * 0.2, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#c4a44c';
      ctx.globalAlpha = bottle.opacity * 0.8;
      ctx.fillRect(-s * 0.1, -s * 0.65, s * 0.2, s * 0.15);

      ctx.restore();
    };

    const render = (time: number) => {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
        fpsLastCheckRef.current = time;
      }

      fpsFramesRef.current++;
      if (time - fpsLastCheckRef.current >= 1000) {
        const fps = fpsFramesRef.current;
        fpsFramesRef.current = 0;
        fpsLastCheckRef.current = time;

        if (waveCountRef.current > 10 && fps < 50) {
          waveCountRef.current = 10;
          initWaves(width, height);
          forceUpdate(n => n + 1);
        } else if (waveCountRef.current < 20 && fps >= 55) {
          waveCountRef.current = Math.min(20, waveCountRef.current + 2);
          initWaves(width, height);
          forceUpdate(n => n + 1);
        }

        if (onFpsUpdate) onFpsUpdate(fps);
      }

      if (time - lastWaveUpdateRef.current >= 1000) {
        wavesRef.current.forEach(wave => {
          wave.phase += (Math.random() - 0.5) * 0.3;
        });
        lastWaveUpdateRef.current = time;
      }

      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#0a2a5a');
      gradient.addColorStop(1, '#051535');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      wavesRef.current.forEach(wave => drawWave(ctx, wave, width, time));

      bottlesRef.current.forEach((bottle, idx) => {
        bottle.x += bottle.direction * bottle.speed;
        bottle.bobPhase += 0.03;

        if (bottle.x < -60 || bottle.x > width + 60) {
          Object.assign(bottle, createBottle(width, height));
        }

        const color = BOTTLE_COLORS[idx % BOTTLE_COLORS.length];
        drawBottle(ctx, bottle, color);
      });

      lastTimeRef.current = time;
      animationRef.current = requestAnimationFrame(render);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [onFpsUpdate]);

  return (
    <div ref={containerRef} className="ocean-scene-container">
      <canvas ref={canvasRef} className="ocean-canvas" />
    </div>
  );
}

export default OceanScene;
