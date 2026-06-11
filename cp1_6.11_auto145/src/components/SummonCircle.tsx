import { useEffect, useRef, useState } from 'react';
import type { Point, ElementType } from '../types';
import { detectElement, elementInfo } from '../utils/elementDetector';

interface SummonCircleProps {
  runePoints: Point[][];
  potionColor: string;
}

interface Particle {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  size: number;
  alpha: number;
  color: string;
}

const CANVAS_SIZE = 380;
const CIRCLE_RADIUS = 180;
const PARTICLE_COUNT = 200;
const ANIM_DURATION = 1200;

export default function SummonCircle({ runePoints, potionColor }: SummonCircleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const animatingRef = useRef(false);

  const [isAnimating, setIsAnimating] = useState(false);
  const [summoned, setSummoned] = useState(false);
  const [element, setElement] = useState<ElementType | null>(null);

  const hasRunes = runePoints.length > 0;
  const hasPotion = !!potionColor;
  const canSummon = hasRunes && hasPotion && !summoned && !isAnimating;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;

    const drawStatic = () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      if (!hasRunes && !hasPotion) return;

      if (potionColor) {
        ctx.beginPath();
        ctx.arc(cx, cy, CIRCLE_RADIUS, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, CIRCLE_RADIUS);
        grad.addColorStop(0, hexToRgba(potionColor, 0.35));
        grad.addColorStop(1, hexToRgba(potionColor, 0.05));
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;

      const rings = 3;
      for (let i = 1; i <= rings; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (CIRCLE_RADIUS / rings) * i, 0, Math.PI * 2);
        ctx.globalAlpha = 0.8 - i * 0.15;
        ctx.stroke();
      }

      const spokes = 12;
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
        ctx.lineTo(cx + Math.cos(a) * CIRCLE_RADIUS, cy + Math.sin(a) * CIRCLE_RADIUS);
        ctx.stroke();
      }

      ctx.restore();

      if (runePoints.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        const total = runePoints.length;
        runePoints.forEach((stroke, idx) => {
          if (stroke.length < 2) return;
          const ringIdx = idx % rings;
          const ringR = (CIRCLE_RADIUS / rings) * (ringIdx + 1);
          const angleOffset = (idx / total) * Math.PI * 2;

          const minX = Math.min(...stroke.map(p => p.x));
          const maxX = Math.max(...stroke.map(p => p.x));
          const minY = Math.min(...stroke.map(p => p.y));
          const maxY = Math.max(...stroke.map(p => p.y));
          const strokeW = Math.max(1, maxX - minX);
          const strokeH = Math.max(1, maxY - minY);
          const scale = Math.min(60 / strokeW, 60 / strokeH);
          const ox = cx + Math.cos(angleOffset) * (ringR - 30);
          const oy = cy + Math.sin(angleOffset) * (ringR - 30);
          const rot = angleOffset + Math.PI / 2;

          ctx.save();
          ctx.translate(ox, oy);
          ctx.rotate(rot);
          ctx.translate(-(minX + strokeW / 2) * scale, -(minY + strokeH / 2) * scale);
          ctx.beginPath();
          ctx.moveTo(stroke[0].x * scale, stroke[0].y * scale);
          for (let i = 1; i < stroke.length; i++) {
            ctx.lineTo(stroke[i].x * scale, stroke[i].y * scale);
          }
          ctx.stroke();
          ctx.restore();
        });
        ctx.restore();
      }
    };

    const render = () => {
      if (!animatingRef.current) {
        drawStatic();
        return;
      }
      const t = Math.min(1, (performance.now() - startTimeRef.current) / ANIM_DURATION);
      drawStatic();
      drawParticles(ctx, cx, cy, t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(render);
      } else {
        animatingRef.current = false;
        setIsAnimating(false);
        setSummoned(true);
        if (potionColor) {
          setElement(detectElement(potionColor));
        }
      }
    };

    if (!animatingRef.current) {
      drawStatic();
    } else {
      rafRef.current = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [runePoints, potionColor]);

  const drawParticles = (ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) => {
    const ease = t * t * (3 - 2 * t);
    particlesRef.current.forEach(p => {
      const x = p.startX + (p.targetX - p.startX) * ease;
      const y = p.startY + (p.targetY - p.startY) * ease;
      const size = p.size * (1 - ease * 0.6);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(p.color, p.alpha * (1 - ease * 0.4));
      ctx.fill();
    });
  };

  const initParticles = () => {
    const particles: Particle[] = [];
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const corners = [
      { x: 0, y: 0 },
      { x: CANVAS_SIZE, y: 0 },
      { x: 0, y: CANVAS_SIZE },
      { x: CANVAS_SIZE, y: CANVAS_SIZE },
    ];
    const baseColor = potionColor || '#b39ddb';
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const corner = corners[i % corners.length];
      particles.push({
        startX: corner.x + (Math.random() - 0.5) * 40,
        startY: corner.y + (Math.random() - 0.5) * 40,
        x: 0, y: 0,
        targetX: cx + (Math.random() - 0.5) * 40,
        targetY: cy + (Math.random() - 0.5) * 40,
        size: 2 + Math.random() * 4,
        alpha: 0.6 + Math.random() * 0.4,
        color: baseColor,
      });
    }
    particlesRef.current = particles;
  };

  const handleSummon = () => {
    if (!canSummon) return;
    initParticles();
    startTimeRef.current = performance.now();
    animatingRef.current = true;
    setIsAnimating(true);
  };

  const handleReset = () => {
    setSummoned(false);
    setElement(null);
  };

  useEffect(() => {
    if (!hasRunes || !hasPotion) {
      handleReset();
    }
  }, [hasRunes, hasPotion]);

  const info = element ? elementInfo[element] : null;

  return (
    <div className="summon-wrap">
      <div className="summon-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="summon-canvas"
        />
        {summoned && info && (
          <div className="sprite-container">
            <div className="element-badge">{info.icon}</div>
            <div className="sprite-frames">
              <div className="sprite-anim">{getSpriteEmoji(element)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="summon-status">
        {!hasRunes && !hasPotion && '请先绘制符文并调配魔药'}
        {hasRunes && !hasPotion && '请调配魔药'}
        {!hasRunes && hasPotion && '请绘制并确认符文'}
        {canSummon && '准备就绪，点击召唤按钮'}
        {isAnimating && '元素汇聚中...'}
        {summoned && info && `召唤成功！${info.name}属性精灵已降临`}
      </div>

      <div className="rune-actions">
        {!summoned && (
          <button className="btn btn-primary" onClick={handleSummon} disabled={!canSummon}>
            {isAnimating ? '召唤中...' : '✨ 召唤'}
          </button>
        )}
        {summoned && (
          <div className="rune-status" style={{ color: info?.color }}>
            {info ? `${info.icon} ${info.name}元素精灵` : ''}
          </div>
        )}
      </div>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getSpriteEmoji(el: ElementType | null): string {
  switch (el) {
    case 'fire': return '🔥';
    case 'water': return '🐬';
    case 'earth': return '🌱';
    case 'wind': return '🦋';
    default: return '✨';
  }
}
