import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Capsule } from '../types';

interface StarData {
  capsule: Capsule;
  x: number;
  y: number;
  baseSize: number;
  color: string;
  twinkleOffset: number;
  matched: boolean;
  currentScale: number;
  targetScale: number;
  currentOpacity: number;
  targetOpacity: number;
  fireflies: Firefly[];
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  content: string;
}

interface Props {
  capsules: Capsule[];
  allCapsules: Capsule[];
  onStarClick: (capsule: Capsule) => void;
}

const PAGE_SIZE = 200;
const FIREFLY_COLORS = ['#aaffaa', '#ffaa88', '#ffffaa', '#aaffff', '#ffaaff'];

export default function StarChart({ capsules, allCapsules, onStarClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const starsRef = useRef<StarData[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const [hoveredStar, setHoveredStar] = useState<StarData | null>(null);
  const [page, setPage] = useState(1);

  const displayedCapsules = useMemo(() => {
    const allMatchedIds = new Set(capsules.map(c => c.id));
    const result: { capsule: Capsule; matched: boolean }[] = [];

    capsules.slice(0, PAGE_SIZE).forEach(c => result.push({ capsule: c, matched: true }));

    const remaining = allCapsules.filter(c => !allMatchedIds.has(c.id));
    remaining.slice(0, Math.max(0, PAGE_SIZE - result.length)).forEach(c => {
      result.push({ capsule: c, matched: false });
    });

    return result;
  }, [capsules, allCapsules, page]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = container.clientWidth + 'px';
      canvas.style.height = container.clientHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layoutStars();
    };

    const layoutStars = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const padding = 50;

      starsRef.current = displayedCapsules.map(({ capsule, matched }, i) => {
        const photoCount = capsule.photos?.length || 0;
        const baseSize = 4 + photoCount * 2;
        const color = capsule.isOpened ? '#88ccff' : '#ffdd88';

        const existing = starsRef.current.find(s => s.capsule.id === capsule.id);
        const angle = (i / displayedCapsules.length) * Math.PI * 2 + Math.random() * 0.5;
        const radius = padding + Math.random() * Math.min(w, h) * 0.35;
        const x = existing?.x ?? w / 2 + Math.cos(angle) * radius;
        const y = existing?.y ?? h / 2 + Math.sin(angle) * radius;

        const fireflies: Firefly[] = [];
        if (capsule.reply) {
          for (let f = 0; f < 3; f++) {
            fireflies.push({
              x: x + (Math.random() - 0.5) * 40,
              y: y + (Math.random() - 0.5) * 40,
              vx: (Math.random() - 0.5) * 0.8,
              vy: (Math.random() - 0.5) * 0.8,
              size: 4,
              color: FIREFLY_COLORS[Math.floor(Math.random() * FIREFLY_COLORS.length)],
              content: capsule.reply.content
            });
          }
        }

        return {
          capsule,
          x, y,
          baseSize,
          color,
          twinkleOffset: Math.random() * Math.PI * 2,
          matched,
          currentScale: existing?.currentScale ?? 0,
          targetScale: matched ? 1 : 0,
          currentOpacity: existing?.currentOpacity ?? 0,
          targetOpacity: matched ? 1 : 0,
          fireflies
        };
      });
    };

    resize();
    window.addEventListener('resize', resize);

    const stars = starsRef.current;
    const now = () => performance.now() / 1000;

    const animate = () => {
      const t = now();
      const w = container.clientWidth;
      const h = container.clientHeight;

      ctx.clearRect(0, 0, w, h);

      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
      bgGrad.addColorStop(0, '#0b0a1a');
      bgGrad.addColorStop(0.5, '#0a1630');
      bgGrad.addColorStop(1, '#050510');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 80; i++) {
        const bx = ((i * 137.5) % w + w) % w;
        const by = ((i * 89.3) % h + h) % h;
        const bs = 0.5 + (i % 3) * 0.5;
        ctx.fillStyle = '#8899aa';
        ctx.beginPath();
        ctx.arc(bx, by, bs, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      starsRef.current.forEach(star => {
        const ease = 0.08;
        star.currentScale += (star.targetScale - star.currentScale) * ease;
        star.currentOpacity += (star.targetOpacity - star.currentOpacity) * ease;

        if (star.currentOpacity < 0.01 && star.targetOpacity === 0) return;

        const twinkle = Math.sin(t * 2 + star.twinkleOffset) * 0.3 + 1;
        const isHovered = hoveredRef.current === star.capsule.id;
        const size = star.baseSize * star.currentScale * twinkle * (isHovered ? 1.8 : 1);
        const opacity = star.currentOpacity;

        const glowGrad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, size * 4);
        glowGrad.addColorStop(0, star.color);
        glowGrad.addColorStop(0.3, star.color + '80');
        glowGrad.addColorStop(1, 'transparent');
        ctx.globalAlpha = opacity * 0.6;
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(star.x, star.y, size * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = opacity;
        ctx.fillStyle = star.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isHovered) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = opacity * 0.8;
          ctx.beginPath();
          ctx.arc(star.x, star.y, size + 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        star.fireflies.forEach(f => {
          f.x += f.vx;
          f.y += f.vy;
          const dx = f.x - star.x;
          const dy = f.y - star.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 50) {
            f.vx = -dx / dist * 0.5 + (Math.random() - 0.5) * 0.5;
            f.vy = -dy / dist * 0.5 + (Math.random() - 0.5) * 0.5;
          }
          const fAlpha = Math.sin(t * 3 + f.x * 0.1) * 0.3 + 0.7;
          ctx.globalAlpha = fAlpha * opacity;
          const fGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 2);
          fGrad.addColorStop(0, f.color);
          fGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = fGrad;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.size * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    const getMousePos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMove = (e: MouseEvent) => {
      const pos = getMousePos(e);
      let found: StarData | null = null;
      for (const star of starsRef.current) {
        const dx = pos.x - star.x;
        const dy = pos.y - star.y;
        const hitR = star.baseSize * star.currentScale + 15;
        if (dx * dx + dy * dy < hitR * hitR && star.targetOpacity > 0.5) {
          found = star;
          break;
        }
      }
      hoveredRef.current = found?.capsule.id || null;
      setHoveredStar(found);
      canvas.style.cursor = found ? 'pointer' : 'default';
    };

    const handleClick = (e: MouseEvent) => {
      const pos = getMousePos(e);
      for (const star of starsRef.current) {
        const dx = pos.x - star.x;
        const dy = pos.y - star.y;
        const hitR = star.baseSize * star.currentScale + 15;
        if (dx * dx + dy * dy < hitR * hitR && star.targetOpacity > 0.5) {
          onStarClick(star.capsule);
          break;
        }
      }
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [displayedCapsules, onStarClick]);

  return (
    <div ref={containerRef} className="starchart-container">
      <canvas ref={canvasRef} className="starchart-canvas" />
      {hoveredStar && (
        <div
          className="star-tooltip"
          style={{
            left: hoveredStar.x + 20,
            top: hoveredStar.y - 20
          }}
        >
          <div className="tooltip-title">
            {hoveredStar.capsule.isOpened ? (
              <>
                <span style={{ color: '#88ccff' }}>●</span>
                {hoveredStar.capsule.senderName} → {hoveredStar.capsule.recipientName}
              </>
            ) : (
              <>
                <span style={{ color: '#ffdd88' }}>✦</span>
                未开启胶囊
              </>
            )}
          </div>
          <div className="tooltip-mood">{hoveredStar.capsule.mood} {new Date(hoveredStar.capsule.createdAt).toLocaleDateString()}</div>
          <div className="tooltip-open">
            开启时间：{new Date(hoveredStar.capsule.openAt).toLocaleDateString()}
          </div>
          {hoveredStar.capsule.photos?.length > 0 && (
            <div className="tooltip-photos">📷 {hoveredStar.capsule.photos.length} 张照片</div>
          )}
          {hoveredStar.capsule.reply && (
            <div className="tooltip-reply">💬 {hoveredStar.capsule.reply.content}</div>
          )}
        </div>
      )}
      <div className="starchart-legend">
        <span><i style={{ background: '#ffdd88' }}></i> 未开启</span>
        <span><i style={{ background: '#88ccff' }}></i> 已开启</span>
      </div>
    </div>
  );
}
