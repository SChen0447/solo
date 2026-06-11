import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  RadarData,
  PlacedScent,
  RADAR_DIMENSIONS,
  RADAR_LABELS,
  Formula,
  getFormulaRadarData,
  getAllPlacedScents,
  getTotalConcentration,
} from '@/utils/formula';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface ScentChartProps {
  radarData: RadarData;
  placedScents: PlacedScent[];
  totalConcentration: number;
  themeColor: string;
  size?: number;
  showParticles?: boolean;
  className?: string;
}

interface MiniRadarProps {
  radarData: RadarData;
  size?: number;
  themeColor: string;
}

interface ComparisonOverlayProps {
  formulas: Formula[];
  onClose: () => void;
}

const CHART_CENTER = 175;
const CHART_SIZE = 350;
const RADAR_RADIUS = 150;

const getRadarPoint = (index: number, value: number, centerX: number, centerY: number, radius: number) => {
  const angle = (index * 2 * Math.PI) / RADAR_DIMENSIONS.length - Math.PI / 2;
  const r = (value / 100) * radius;
  return {
    x: centerX + r * Math.cos(angle),
    y: centerY + r * Math.sin(angle),
  };
};

const drawRadar = (
  ctx: CanvasRenderingContext2D,
  radarData: RadarData,
  centerX: number,
  centerY: number,
  radius: number,
  themeColor: string,
  alpha: number = 0.6,
) => {
  const points = RADAR_DIMENSIONS.map((dim, idx) =>
    getRadarPoint(idx, radarData[dim], centerX, centerY, radius),
  );

  ctx.save();
  ctx.beginPath();
  points.forEach((point, idx) => {
    if (idx === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.closePath();

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, hexToRgba(themeColor, alpha));
  gradient.addColorStop(1, hexToRgba(themeColor, alpha * 0.3));
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = themeColor;
    ctx.fill();
  });
  ctx.restore();
};

const drawRadarGrid = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  showLabels: boolean = true,
) => {
  ctx.save();
  ctx.strokeStyle = '#c49a6c44';
  ctx.lineWidth = 1;

  for (let level = 1; level <= 5; level++) {
    const r = (radius * level) / 5;
    ctx.beginPath();
    RADAR_DIMENSIONS.forEach((_, idx) => {
      const point = getRadarPoint(idx, (level / 5) * 100, centerX, centerY, radius);
      if (idx === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.closePath();
    ctx.stroke();
  }

  ctx.strokeStyle = '#c49a6c66';
  RADAR_DIMENSIONS.forEach((_, idx) => {
    const point = getRadarPoint(idx, 100, centerX, centerY, radius);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  });

  if (showLabels) {
    ctx.fillStyle = '#8b7355';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    RADAR_DIMENSIONS.forEach((dim, idx) => {
      const labelRadius = radius + 20;
      const point = getRadarPoint(idx, 100, centerX, centerY, labelRadius);
      ctx.fillText(RADAR_LABELS[dim], point.x, point.y + 4);
    });
  }
  ctx.restore();
};

const hexToRgba = (hex: string, alpha: number): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(196, 154, 108, ${alpha})`;
};

export const MiniRadar: React.FC<MiniRadarProps> = ({
  radarData,
  size = 45,
  themeColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const center = size / 2;
  const radius = (size / 2) - 5;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    drawRadarGrid(ctx, center, center, radius, false);
    drawRadar(ctx, radarData, center, center, radius, themeColor, 0.5);
  }, [radarData, size, themeColor, center, radius]);

  return <canvas ref={canvasRef} width={size} height={size} />;
};

const ScentChart: React.FC<ScentChartProps> = ({
  radarData,
  placedScents,
  totalConcentration,
  themeColor,
  size = CHART_SIZE,
  showParticles = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = Math.min(size / 2 - 40, RADAR_RADIUS);

  const maxParticles = Math.min(500, Math.max(0, Math.floor(totalConcentration / 2)));

  const createParticle = useCallback(
    (scent: PlacedScent): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius * 0.3;
      return {
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 3 + Math.random() * 3,
        color: scent.color,
        alpha: 0.3 + Math.random() * 0.4,
        life: 0,
        maxLife: 300 + Math.random() * 200,
      };
    },
    [centerX, centerY, radius],
  );

  const updateParticle = useCallback(
    (particle: Particle, deltaTime: number): boolean => {
      particle.vx += (Math.random() - 0.5) * 0.05;
      particle.vy += (Math.random() - 0.5) * 0.05;

      const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
      if (speed > 0.5) {
        particle.vx = (particle.vx / speed) * 0.5;
        particle.vy = (particle.vy / speed) * 0.5;
      }

      particle.x += particle.vx * deltaTime * 0.06;
      particle.y += particle.vy * deltaTime * 0.06;

      particle.life += deltaTime;

      const distFromCenter = Math.sqrt(
        Math.pow(particle.x - centerX, 2) + Math.pow(particle.y - centerY, 2),
      );
      if (distFromCenter > radius * 0.9) {
        const angle = Math.atan2(particle.y - centerY, particle.x - centerX);
        particle.x = centerX + Math.cos(angle) * radius * 0.9;
        particle.y = centerY + Math.sin(angle) * radius * 0.9;
        particle.vx *= -0.5;
        particle.vy *= -0.5;
      }

      return particle.life < particle.maxLife;
    },
    [centerX, centerY, radius],
  );

  const drawParticle = useCallback(
    (ctx: CanvasRenderingContext2D, particle: Particle) => {
      const lifeRatio = particle.life / particle.maxLife;
      const fadeAlpha = lifeRatio < 0.1
        ? lifeRatio * 10
        : lifeRatio > 0.9
        ? (1 - lifeRatio) * 10
        : 1;

      ctx.save();
      ctx.globalAlpha = particle.alpha * fadeAlpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = particle.alpha * fadeAlpha * 0.3;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (timestamp: number) => {
      const deltaTime = lastTimeRef.current
        ? (timestamp - lastTimeRef.current) / 16.67
        : 1;
      lastTimeRef.current = timestamp;

      ctx.clearRect(0, 0, size, size);

      drawRadarGrid(ctx, centerX, centerY, radius, true);
      drawRadar(ctx, radarData, centerX, centerY, radius, themeColor, 0.6);

      if (showParticles) {
        particlesRef.current = particlesRef.current.filter((p) =>
          updateParticle(p, deltaTime),
        );

        if (particlesRef.current.length < maxParticles && placedScents.length > 0) {
          const scent =
            placedScents[Math.floor(Math.random() * placedScents.length)];
          particlesRef.current.push(createParticle(scent));
        }

        particlesRef.current.forEach((p) => drawParticle(ctx, p));
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [
    size,
    radarData,
    themeColor,
    showParticles,
    maxParticles,
    placedScents,
    centerX,
    centerY,
    radius,
    createParticle,
    updateParticle,
    drawParticle,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`scent-chart ${className}`}
      style={{ display: 'block' }}
    />
  );
};

export const ComparisonOverlay: React.FC<ComparisonOverlayProps> = ({
  formulas,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const canvasSize = useMemo(() => {
    const count = formulas.length;
    return { width: count * 190 - 40, height: 450 };
  }, [formulas.length]);

  const totalConcentration = useMemo(() => {
    return formulas.reduce((sum, f) => {
      return sum + getTotalConcentration(f.topNotes, f.middleNotes, f.baseNotes);
    }, 0);
  }, [formulas]);

  const maxParticles = Math.min(500, Math.max(0, Math.floor(totalConcentration / 2)));

  const colors = useMemo(
    () => ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'].slice(0, formulas.length),
    [formulas.length],
  );

  const createComparisonParticle = useCallback(
    (scent: PlacedScent, centerX: number, radius: number): Particle => {
      const angle = Math.random() * Math.PI - Math.PI / 2;
      const dist = Math.random() * radius * 0.4;
      return {
        x: centerX + Math.cos(angle) * dist,
        y: 320 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 3 + Math.random() * 3,
        color: scent.color,
        alpha: 0.3 + Math.random() * 0.4,
        life: 0,
        maxLife: 300 + Math.random() * 200,
      };
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (timestamp: number) => {
      const deltaTime = lastTimeRef.current
        ? (timestamp - lastTimeRef.current) / 16.67
        : 1;
      lastTimeRef.current = timestamp;

      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      formulas.forEach((formula, idx) => {
        const centerX = idx * 190 + 75;
        const centerY = 100;
        const radius = 60;
        const radarData = getFormulaRadarData(formula);

        drawRadarGrid(ctx, centerX, centerY, radius, false);
        drawRadar(ctx, radarData, centerX, centerY, radius, colors[idx], 0.5);

        ctx.fillStyle = colors[idx];
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formula.name, centerX, centerY + radius + 30);
      });

      particlesRef.current = particlesRef.current.filter((p) => {
        p.vx += (Math.random() - 0.5) * 0.05;
        p.vy += (Math.random() - 0.5) * 0.05;

        p.x += p.vx * deltaTime * 0.06;
        p.y += p.vy * deltaTime * 0.06;
        p.life += deltaTime;

        if (p.y < 220) {
          p.y = 220;
          p.vy *= -0.5;
        }
        if (p.y > 420) {
          p.y = 420;
          p.vy *= -0.5;
        }
        if (p.x < 20) {
          p.x = 20;
          p.vx *= -0.5;
        }
        if (p.x > canvasSize.width - 20) {
          p.x = canvasSize.width - 20;
          p.vx *= -0.5;
        }

        return p.life < p.maxLife;
      });

      if (particlesRef.current.length < maxParticles) {
        const formula = formulas[Math.floor(Math.random() * formulas.length)];
        const scents = getAllPlacedScents(formula.topNotes, formula.middleNotes, formula.baseNotes);
        if (scents.length > 0) {
          const scent = scents[Math.floor(Math.random() * scents.length)];
          const centerX = (canvasSize.width - 40) / 2 + 20;
          particlesRef.current.push(
            createComparisonParticle(scent, centerX, 150),
          );
        }
      }

      particlesRef.current.forEach((particle) => {
        const lifeRatio = particle.life / particle.maxLife;
        const fadeAlpha = lifeRatio < 0.1
          ? lifeRatio * 10
          : lifeRatio > 0.9
          ? (1 - lifeRatio) * 10
          : 1;

        ctx.save();
        ctx.globalAlpha = particle.alpha * fadeAlpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [
    formulas,
    colors,
    canvasSize,
    maxParticles,
    createComparisonParticle,
  ]);

  return (
    <div className="comparison-overlay" onClick={onClose}>
      <div className="comparison-content" onClick={(e) => e.stopPropagation()}>
        <button className="comparison-close-btn" onClick={onClose}>
          ×
        </button>
        <h3 className="comparison-title">配方对比分析</h3>
        <div className="comparison-legend">
          {formulas.map((f, idx) => (
            <div key={f.id} className="legend-item">
              <span
                className="legend-color"
                style={{ backgroundColor: colors[idx] }}
              />
              <span className="legend-name">{f.name}</span>
            </div>
          ))}
        </div>
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="comparison-canvas"
        />
      </div>
      <style>{`
        .comparison-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.67);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .comparison-content {
          background: linear-gradient(135deg, #f7f3ee 0%, #e8d8c8 100%);
          border-radius: 20px;
          padding: 30px;
          position: relative;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .comparison-close-btn {
          position: absolute;
          top: 15px;
          right: 20px;
          background: none;
          border: none;
          font-size: 28px;
          color: #8b7355;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          line-height: 1;
          transition: color 0.2s;
        }

        .comparison-close-btn:hover {
          color: #333;
        }

        .comparison-title {
          margin: 0 0 20px 0;
          color: #5c4a3a;
          font-size: 20px;
          text-align: center;
        }

        .comparison-legend {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .legend-name {
          font-size: 13px;
          color: #5c4a3a;
          font-weight: 500;
        }

        .comparison-canvas {
          display: block;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
};

export default ScentChart;
