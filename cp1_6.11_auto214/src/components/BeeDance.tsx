import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DanceInfo, QueenDance } from '../types';

interface BeeDanceProps {
  phase: 'watching' | 'guessing' | 'result' | 'transition';
  danceInfo: DanceInfo | null;
  queenDances?: QueenDance[];
  isQueenChallenge?: boolean;
  onDanceEnd?: () => void;
  flyingTarget?: { x: number; y: number } | null;
  onFlyComplete?: () => void;
}

const TEMPLATE_WIDTH = 240;
const TEMPLATE_HEIGHT = 200;
const CENTER_X = TEMPLATE_WIDTH / 2;
const CENTER_Y = TEMPLATE_HEIGHT / 2;

const getHexagonPoints = (cx: number, cy: number, r: number): string => {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(' ');
};

const rotatePoint = (
  cx: number,
  cy: number,
  x: number,
  y: number,
  angle: number
): { x: number; y: number } => {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  const rotatedX = dx * cos - dy * sin;
  const rotatedY = dx * sin + dy * cos;
  return { x: cx + rotatedX, y: cy + rotatedY };
};

const generateRoundPath = (
  cx: number,
  cy: number,
  radius: number,
  t: number
): { x: number; y: number } => {
  return {
    x: cx + radius * Math.cos(t),
    y: cy + radius * Math.sin(t),
  };
};

const BeeDance: React.FC<BeeDanceProps> = ({
  phase,
  danceInfo,
  queenDances = [],
  isQueenChallenge = false,
  onDanceEnd,
  flyingTarget,
  onFlyComplete,
}) => {
  const [beePositions, setBeePositions] = useState<{ x: number; y: number; rotation: number }[]>([]);
  const [fadeOutBee, setFadeOutBee] = useState(false);
  const [flyingBee, setFlyingBee] = useState<{ x: number; y: number } | null>(null);
  const [wingFlap, setWingFlap] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const danceEndedRef = useRef<boolean>(false);

  const renderHoneycombTexture = () => {
    const cells = [];
    const cellSize = 18;
    const hexR = cellSize / Math.sqrt(3);
    for (let row = -3; row < 12; row++) {
      for (let col = -2; col < 12; col++) {
        const offsetX = row % 2 === 0 ? 0 : cellSize * 0.75;
        const cx = col * cellSize * 1.5 + offsetX + 20;
        const cy = row * hexR * 1.73 + 15;
        const distFromCenter = Math.sqrt(
          Math.pow(cx - CENTER_X, 2) + Math.pow(cy - CENTER_Y, 2)
        );
        if (distFromCenter < 95) {
          cells.push(
            <polygon
              key={`hex-${row}-${col}`}
              points={getHexagonPoints(cx, cy, cellSize * 0.45)}
              fill="none"
              stroke="#e8c88a"
              strokeWidth="0.8"
              opacity="0.4"
            />
          );
        }
      }
    }
    return cells;
  };

  const getFigure8Position = (
    cx: number,
    cy: number,
    waggleAngle: number,
    cycleT: number
  ): { x: number; y: number } => {
    const t = cycleT * Math.PI * 4;
    const scale = 70;
    let loopX = scale * Math.sin(t);
    let loopY = scale * 0.5 * Math.sin(t * 2);
    const waggleZone = Math.abs(Math.sin(t)) < 0.15;
    if (waggleZone) {
      loopY *= 0.3;
    }
    return rotatePoint(cx, cy, cx + loopX, cy + loopY, waggleAngle);
  };

  const getRoundPosition = (
    cx: number,
    cy: number,
    cycleT: number
  ): { x: number; y: number } => {
    const radius = 60;
    let t = cycleT * Math.PI * 2;
    if (cycleT > 0.5) {
      t = Math.PI - (cycleT - 0.5) * Math.PI * 2;
    }
    return generateRoundPath(cx, cy, radius, t);
  };

  const animateDance = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = (timestamp - startTimeRef.current) / 1000;

      if (phase === 'watching' && elapsed >= 5 && !danceEndedRef.current) {
        danceEndedRef.current = true;
        onDanceEnd?.();
        return;
      }

      const newPositions: { x: number; y: number; rotation: number }[] = [];

      if (isQueenChallenge && queenDances.length > 0) {
        queenDances.forEach((dance) => {
          let pos: { x: number; y: number };
          const freqFactor = dance.distanceCategory === 'near' ? 0.8 : 2;
          const cycleT = (elapsed % freqFactor) / freqFactor;

          if (dance.danceType === 'figure8') {
            pos = getFigure8Position(CENTER_X, CENTER_Y, dance.waggleAngle, cycleT);
          } else {
            pos = getRoundPosition(CENTER_X, CENTER_Y, cycleT);
          }

          const prevPos = newPositions.length > 0
            ? newPositions[newPositions.length - 1]
            : { x: CENTER_X, y: CENTER_Y };
          const rotation =
            (Math.atan2(pos.y - prevPos.y, pos.x - prevPos.x) * 180) / Math.PI;

          newPositions.push({ ...pos, rotation });
        });
      } else if (danceInfo) {
        const freqFactor = danceInfo.distanceCategory === 'near' ? 0.8 : 2;
        const cycleT = (elapsed % freqFactor) / freqFactor;
        let pos: { x: number; y: number };

        if (danceInfo.danceType === 'figure8') {
          pos = getFigure8Position(CENTER_X, CENTER_Y, danceInfo.waggleAngle, cycleT);
        } else {
          pos = getRoundPosition(CENTER_X, CENTER_Y, cycleT);
        }

        const prevPos = beePositions.length > 0 ? beePositions[0] : { x: CENTER_X, y: CENTER_Y };
        const rotation =
          (Math.atan2(pos.y - prevPos.y, pos.x - prevPos.x) * 180) / Math.PI;

        newPositions.push({ ...pos, rotation });
      }

      setBeePositions(newPositions);

      animationRef.current = requestAnimationFrame(animateDance);
    },
    [phase, danceInfo, queenDances, isQueenChallenge, onDanceEnd]
  );

  useEffect(() => {
    if (phase === 'watching' || (phase === 'guessing' && isQueenChallenge)) {
      startTimeRef.current = 0;
      danceEndedRef.current = false;
      animationRef.current = requestAnimationFrame(animateDance);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [phase, animateDance, isQueenChallenge]);

  useEffect(() => {
    if (flyingTarget) {
      setFlyingBee({ x: CENTER_X, y: CENTER_Y });
      const startX = CENTER_X;
      const startY = CENTER_Y;
      const duration = 800;
      const arcHeight = 30;
      const flyStart = performance.now();

      const animateFly = (now: number) => {
        const t = Math.min((now - flyStart) / duration, 1);
        const progress = t < 0.5
          ? 2 * t * t
          : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const x = startX + (flyingTarget.x - startX) * progress;
        const y =
          startY + (flyingTarget.y - startY) * progress - arcHeight * Math.sin(t * Math.PI);

        setFlyingBee({ x, y });

        if (t < 1) {
          requestAnimationFrame(animateFly);
        } else {
          setWingFlap(true);
          setTimeout(() => {
            setWingFlap(false);
            setFlyingBee(null);
            onFlyComplete?.();
          }, 600);
        }
      };

      requestAnimationFrame(animateFly);
    }
  }, [flyingTarget, onFlyComplete]);

  useEffect(() => {
    if (phase === 'transition') {
      setFadeOutBee(true);
      const timer = setTimeout(() => {
        setFadeOutBee(false);
        setBeePositions([]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const BeeIcon: React.FC<{ color?: string; flapping?: boolean }> = ({
    color = '#f7c600',
    flapping = false,
  }) => (
    <g>
      <ellipse cx="0" cy="0" rx="6" ry="10" fill={color} stroke="#222" strokeWidth="1" />
      <rect x="-5" y="-6" width="10" height="2.5" fill="#222" rx="1" />
      <rect x="-5" y="-1" width="10" height="2.5" fill="#222" rx="1" />
      <rect x="-5" y="4" width="10" height="2" fill="#222" rx="1" />
      <ellipse
        cx="-4"
        cy="-2"
        rx={flapping ? '7' : '5'}
        ry={flapping ? '2' : '3'}
        fill="rgba(200,230,255,0.7)"
        style={{
          transformOrigin: '-4px -2px',
          animation: flapping ? 'none' : 'wingFlap 0.08s ease infinite alternate',
        }}
      />
      <ellipse
        cx="4"
        cy="-2"
        rx={flapping ? '7' : '5'}
        ry={flapping ? '2' : '3'}
        fill="rgba(200,230,255,0.7)"
        style={{
          transformOrigin: '4px -2px',
          animation: flapping ? 'none' : 'wingFlap 0.08s ease infinite alternate-reverse',
        }}
      />
    </g>
  );

  const getDancePathD = (dance: DanceInfo | QueenDance): string => {
    const points: { x: number; y: number }[] = [];
    const steps = 200;
    const freqFactor = dance.distanceCategory === 'near' ? 0.8 : 2;

    for (let i = 0; i <= steps; i++) {
      const tRatio = (i / steps) * freqFactor;
      const cycleT = (tRatio % freqFactor) / freqFactor;

      if (dance.danceType === 'figure8') {
        points.push(getFigure8Position(CENTER_X, CENTER_Y, dance.waggleAngle, cycleT));
      } else {
        points.push(getRoundPosition(CENTER_X, CENTER_Y, cycleT));
      }
    }

    let d = '';
    points.forEach((p, idx) => {
      d += idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`;
    });
    return d;
  };

  return (
    <div className="honeycomb-template">
      <svg width={TEMPLATE_WIDTH} height={TEMPLATE_HEIGHT}>
        <defs>
          <linearGradient id="honeyFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff3d6" />
            <stop offset="100%" stopColor="#ffe8a8" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <polygon
          points={getHexagonPoints(CENTER_X, CENTER_Y, 95)}
          fill="url(#honeyFill)"
          stroke="#6b4226"
          strokeWidth="2"
          opacity="0.98"
        />

        {renderHoneycombTexture()}

        <polygon
          points={getHexagonPoints(CENTER_X, CENTER_Y, 95)}
          fill="none"
          stroke="#6b4226"
          strokeWidth="2"
        />

        <line
          x1={CENTER_X}
          y1={CENTER_Y}
          x2={CENTER_X + 70 * Math.cos((-90 * Math.PI) / 180)}
          y2={CENTER_Y + 70 * Math.sin((-90 * Math.PI) / 180)}
          stroke="#c78a2c"
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity="0.5"
        />
        <text
          x={CENTER_X + 75 * Math.cos((-90 * Math.PI) / 180)}
          y={CENTER_Y + 75 * Math.sin((-90 * Math.PI) / 180) + 4}
          fill="#6b4226"
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
        >
          N
        </text>

        <AnimatePresence>
          {phase !== 'transition' &&
            !flyingBee &&
            beePositions.map((pos, idx) => {
              const pathColor =
                isQueenChallenge && queenDances[idx] ? queenDances[idx].pathColor : null;
              const danceData =
                isQueenChallenge && queenDances[idx] ? queenDances[idx] : danceInfo;

              return (
                <g key={idx}>
                  {danceData && (
                    <path
                      d={getDancePathD(danceData)}
                      fill="none"
                      stroke={pathColor || '#c78a2c'}
                      strokeWidth="2"
                      strokeDasharray="6,4"
                      opacity={fadeOutBee ? 0 : 0.4}
                      style={{ transition: 'opacity 0.5s ease' }}
                    />
                  )}
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: fadeOutBee ? 0 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{
                      transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.rotation + 90}deg)`,
                      transformOrigin: `${pos.x}px ${pos.y}px`,
                    }}
                  >
                    <BeeIcon color={pathColor || '#f7c600'} />
                  </motion.g>
                </g>
              );
            })}
        </AnimatePresence>

        {flyingBee && (
          <g
            style={{
              transform: `translate(${flyingBee.x}px, ${flyingBee.y}px)`,
            }}
          >
            <BeeIcon color="#f7c600" flapping={wingFlap} />
          </g>
        )}
      </svg>

      <style>{`
        @keyframes wingFlap {
          0% { transform: scaleY(0.8) translateY(-1px); }
          100% { transform: scaleY(1.2) translateY(-2px); }
        }
      `}</style>
    </div>
  );
};

export default BeeDance;
