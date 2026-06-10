import { useRef, useEffect } from 'react';

interface PitchVisualizerProps {
  deviation: number;
  volume: number;
}

function PitchVisualizer({ deviation, volume }: PitchVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);
  const animationRef = useRef<number>(0);

  const getDeviationColor = (dev: number): string => {
    const absDev = Math.abs(dev);
    if (absDev <= 50) {
      return '#4caf50';
    } else if (absDev <= 75) {
      const t = (absDev - 50) / 25;
      return interpolateColor('#4caf50', '#ffeb3b', t);
    } else if (absDev <= 100) {
      const t = (absDev - 75) / 25;
      return interpolateColor('#ffeb3b', '#ff9800', t);
    } else {
      const t = Math.min(1, (absDev - 100) / 50);
      return interpolateColor('#ff9800', '#f44336', t);
    }
  };

  const interpolateColor = (color1: string, color2: string, t: number): string => {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    if (!c1 || !c2) return color1;

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const bgGradient = ctx.createLinearGradient(0, 0, width, 0);
      bgGradient.addColorStop(0, 'rgba(244, 67, 54, 0.3)');
      bgGradient.addColorStop(0.25, 'rgba(255, 152, 0, 0.3)');
      bgGradient.addColorStop(0.5, 'rgba(76, 175, 80, 0.3)');
      bgGradient.addColorStop(0.75, 'rgba(255, 152, 0, 0.3)');
      bgGradient.addColorStop(1, 'rgba(244, 67, 54, 0.3)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const barHeight = height;
      const indicatorWidth = 4;

      const normalizedDeviation = Math.max(-1, Math.min(1, deviation / 200));
      const indicatorX = centerX + normalizedDeviation * (width / 2 - indicatorWidth / 2);
      const indicatorColor = getDeviationColor(deviation);

      const indicatorGradient = ctx.createLinearGradient(indicatorX, 0, indicatorX + indicatorWidth, 0);
      indicatorGradient.addColorStop(0, indicatorColor);
      indicatorGradient.addColorStop(0.5, lightenColor(indicatorColor, 30));
      indicatorGradient.addColorStop(1, indicatorColor);
      
      ctx.fillStyle = indicatorGradient;
      ctx.shadowColor = indicatorColor;
      ctx.shadowBlur = 10;
      ctx.fillRect(indicatorX, 0, indicatorWidth, barHeight);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, barHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      if (volume > 0.1) {
        const color = getDeviationColor(deviation);
        for (let i = 0; i < Math.ceil(volume * 5); i++) {
          particlesRef.current.push({
            x: indicatorX + indicatorWidth / 2,
            y: Math.random() * barHeight,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1,
            color: color,
          });
        }
      }

      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;

        if (p.life <= 0) return false;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
        ctx.globalAlpha = 1;

        return true;
      });

      if (particlesRef.current.length > 200) {
        particlesRef.current = particlesRef.current.slice(-200);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    const lightenColor = (color: string, percent: number): string => {
      const rgb = hexToRgb(color);
      if (!rgb) return color;
      const r = Math.min(255, rgb.r + (255 - rgb.r) * percent / 100);
      const g = Math.min(255, rgb.g + (255 - rgb.g) * percent / 100);
      const b = Math.min(255, rgb.b + (255 - rgb.b) * percent / 100);
      return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [deviation, volume]);

  return (
    <div className="pitch-visualizer">
      <div className="pitch-labels">
        <span className="pitch-label low">低 ↓</span>
        <span className="pitch-label perfect">● 完美</span>
        <span className="pitch-label high">↑ 高</span>
      </div>
      <canvas ref={canvasRef} className="pitch-canvas" />
    </div>
  );
}

export default PitchVisualizer;
