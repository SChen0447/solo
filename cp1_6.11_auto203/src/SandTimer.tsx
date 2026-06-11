import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface SandTimerProps {
  sandRatio: number;
  isFlipping: boolean;
  isFlowing: boolean;
  flowSpeed: number;
  onSandFinished?: () => void;
}

const TIMER_WIDTH = 120;
const TIMER_HEIGHT = 200;
const MAX_PARTICLES = 40;

interface SandParticle {
  x: number;
  y: number;
  vy: number;
  active: boolean;
}

const SandTimer: React.FC<SandTimerProps> = ({ sandRatio, isFlipping, isFlowing, flowSpeed, onSandFinished }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<SandParticle[]>([]);
  const animRef = useRef<number>(0);
  const prevRatioRef = useRef<number>(sandRatio);

  useEffect(() => {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particlesRef.current.push({ x: 0, y: 0, vy: 0, active: false });
    }
  }, []);

  useEffect(() => {
    if (prevRatioRef.current > 0 && sandRatio <= 0 && onSandFinished) {
      onSandFinished();
    }
    prevRatioRef.current = sandRatio;
  }, [sandRatio, onSandFinished]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const spawnParticle = () => {
      const p = particlesRef.current.find(p => !p.active);
      if (p) {
        p.x = TIMER_WIDTH / 2 + (Math.random() - 0.5) * 6;
        p.y = TIMER_HEIGHT / 2 - 5;
        p.vy = 1.5 + Math.random() * 1.5 + flowSpeed * 2;
        p.active = true;
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, TIMER_WIDTH, TIMER_HEIGHT);

      if (!isFlipping) {
        const topRatio = Math.max(0, Math.min(1, sandRatio));
        const bottomRatio = 1 - topRatio;
        const topFillHeight = (TIMER_HEIGHT / 2 - 20) * topRatio;
        const bottomFillHeight = (TIMER_HEIGHT / 2 - 20) * bottomRatio;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(15, 20);
        ctx.lineTo(TIMER_WIDTH - 15, 20);
        ctx.lineTo(TIMER_WIDTH / 2 + 8, TIMER_HEIGHT / 2 - 5);
        ctx.lineTo(TIMER_WIDTH / 2 - 8, TIMER_HEIGHT / 2 - 5);
        ctx.closePath();
        ctx.clip();

        const topSandGrad = ctx.createLinearGradient(0, TIMER_HEIGHT / 2 - topFillHeight, 0, TIMER_HEIGHT / 2);
        topSandGrad.addColorStop(0, '#ffd700');
        topSandGrad.addColorStop(1, '#b8860b');
        ctx.fillStyle = topSandGrad;
        ctx.fillRect(0, TIMER_HEIGHT / 2 - topFillHeight, TIMER_WIDTH, topFillHeight);

        if (topFillHeight > 2) {
          ctx.fillStyle = 'rgba(255, 248, 200, 0.6)';
          for (let i = 0; i < 8; i++) {
            const px = 20 + Math.random() * (TIMER_WIDTH - 40);
            const py = TIMER_HEIGHT / 2 - topFillHeight + 2 + Math.random() * 3;
            ctx.fillRect(px, py, 2, 2);
          }
        }
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(TIMER_WIDTH / 2 - 8, TIMER_HEIGHT / 2 + 5);
        ctx.lineTo(TIMER_WIDTH / 2 + 8, TIMER_HEIGHT / 2 + 5);
        ctx.lineTo(TIMER_WIDTH - 15, TIMER_HEIGHT - 20);
        ctx.lineTo(15, TIMER_HEIGHT - 20);
        ctx.closePath();
        ctx.clip();

        const bottomBase = TIMER_HEIGHT - 20;
        if (bottomFillHeight > 0) {
          const pileHeight = bottomFillHeight;
          ctx.beginPath();
          ctx.moveTo(15, bottomBase);
          const peakX = TIMER_WIDTH / 2;
          const peakY = bottomBase - pileHeight;
          ctx.quadraticCurveTo(peakX - 20, bottomBase - pileHeight * 0.7, peakX, peakY);
          ctx.quadraticCurveTo(peakX + 20, bottomBase - pileHeight * 0.7, TIMER_WIDTH - 15, bottomBase);
          ctx.closePath();

          const bottomSandGrad = ctx.createLinearGradient(0, peakY, 0, bottomBase);
          bottomSandGrad.addColorStop(0, '#ffd700');
          bottomSandGrad.addColorStop(1, '#b8860b');
          ctx.fillStyle = bottomSandGrad;
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 248, 200, 0.7)';
          const dotCount = Math.min(20, Math.floor(bottomRatio * 20) + 1);
          for (let i = 0; i < dotCount; i++) {
            const px = peakX - 30 + Math.random() * 60;
            const pyRange = bottomBase - peakY;
            const py = bottomBase - Math.random() * pyRange * 0.9 - 1;
            ctx.fillRect(px, py, 3, 3);
          }
        }
        ctx.restore();

        if (isFlowing && topRatio > 0 && bottomRatio < 1) {
          const spawnRate = Math.min(3, Math.max(1, Math.floor(flowSpeed * 2)));
          for (let i = 0; i < spawnRate; i++) {
            if (particlesRef.current.filter(p => p.active).length < MAX_PARTICLES) {
              spawnParticle();
            }
          }

          particlesRef.current.forEach(p => {
            if (!p.active) return;
            p.y += p.vy;
            if (p.y > TIMER_HEIGHT / 2 + 10 && bottomRatio < 1) {
              const bottomLimit = TIMER_HEIGHT - 22 - (bottomFillHeight * 0.5);
              if (p.y > bottomLimit) {
                p.active = false;
              }
            }
            if (p.y > TIMER_HEIGHT - 15) {
              p.active = false;
            }
          });

          ctx.fillStyle = '#ffd700';
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 3;
          particlesRef.current.forEach(p => {
            if (p.active) {
              ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
            }
          });
          ctx.shadowBlur = 0;
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [sandRatio, isFlipping, isFlowing, flowSpeed]);

  const frameColor = '#6b4423';
  const frameLight = '#8b6914';
  const glassColor = 'rgba(245, 230, 204, 0.08)';
  const glassBorder = 'rgba(201, 169, 110, 0.4)';

  return (
    <motion.div
      style={{
        position: 'relative',
        width: TIMER_WIDTH,
        height: TIMER_HEIGHT,
        display: 'inline-block'
      }}
      animate={{ rotate: isFlipping ? 180 : 0 }}
      transition={{ duration: 1.2, ease: 'easeInOut' }}
    >
      <svg
        width={TIMER_WIDTH}
        height={TIMER_HEIGHT}
        viewBox={`0 0 ${TIMER_WIDTH} ${TIMER_HEIGHT}`}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <defs>
          <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={frameColor} />
            <stop offset="50%" stopColor={frameLight} />
            <stop offset="100%" stopColor={frameColor} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x={5} y={5} width={TIMER_WIDTH - 10} height={18} rx={3} fill="url(#frameGrad)" stroke="#3a2418" strokeWidth={2} />
        <rect x={5} y={TIMER_HEIGHT - 23} width={TIMER_WIDTH - 10} height={18} rx={3} fill="url(#frameGrad)" stroke="#3a2418" strokeWidth={2} />

        <circle cx={15} cy={14} r={3} fill="#c9a96e" stroke="#5a4410" strokeWidth={1} />
        <circle cx={TIMER_WIDTH - 15} cy={14} r={3} fill="#c9a96e" stroke="#5a4410" strokeWidth={1} />
        <circle cx={15} cy={TIMER_HEIGHT - 14} r={3} fill="#c9a96e" stroke="#5a4410" strokeWidth={1} />
        <circle cx={TIMER_WIDTH - 15} cy={TIMER_HEIGHT - 14} r={3} fill="#c9a96e" stroke="#5a4410" strokeWidth={1} />

        <path
          d={`M 15 23 L ${TIMER_WIDTH - 15} 23 L ${TIMER_WIDTH / 2 + 10} ${TIMER_HEIGHT / 2} L ${TIMER_WIDTH / 2 - 10} ${TIMER_HEIGHT / 2} Z`}
          fill={glassColor}
          stroke={glassBorder}
          strokeWidth={1.5}
        />
        <path
          d={`M ${TIMER_WIDTH / 2 - 10} ${TIMER_HEIGHT / 2} L ${TIMER_WIDTH / 2 + 10} ${TIMER_HEIGHT / 2} L ${TIMER_WIDTH - 15} ${TIMER_HEIGHT - 23} L 15 ${TIMER_HEIGHT - 23} Z`}
          fill={glassColor}
          stroke={glassBorder}
          strokeWidth={1.5}
        />

        <line x1={TIMER_WIDTH / 2} y1={28} x2={TIMER_WIDTH / 2} y2={TIMER_HEIGHT / 2 - 8} stroke="rgba(201,169,110,0.25)" strokeWidth={1} />
        <line x1={TIMER_WIDTH / 2} y1={TIMER_HEIGHT / 2 + 8} x2={TIMER_WIDTH / 2} y2={TIMER_HEIGHT - 28} stroke="rgba(201,169,110,0.25)" strokeWidth={1} />
      </svg>

      <canvas
        ref={canvasRef}
        width={TIMER_WIDTH}
        height={TIMER_HEIGHT}
        style={{ position: 'absolute', top: 0, left: 0, filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.3))' }}
      />
    </motion.div>
  );
};

export default SandTimer;
