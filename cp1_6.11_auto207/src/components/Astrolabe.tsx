import React, { useCallback, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import constellations from '../data/stars';

const ZODIAC_ABBR = constellations.map(c => c.abbr);
const PLANET_SYMBOLS = ['☉', '☽', '♂', '♀', '☿'];

interface AstrolabeProps {
  outerAngle: number;
  onOuterAngleChange: (angle: number) => void;
  size: number;
  flashSign: number | null;
  failFlash: boolean;
  highlightedStars: number[] | null;
  constellationId: number;
}

export default function Astrolabe({
  outerAngle,
  onOuterAngleChange,
  size,
  flashSign,
  failFlash,
  highlightedStars,
  constellationId,
}: AstrolabeProps) {
  const center = size / 2;
  const outerR = size / 2 - 8;
  const midR = outerR * 0.72;
  const innerR = midR * 0.6;
  const centerR = 5;

  const dragging = useRef(false);
  const lastAngle = useRef(0);
  const containerRef = useRef<SVGSVGElement>(null);

  const getAngleFromEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX || 0) - cx;
    const dy = (e.clientY || 0) - cy;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      lastAngle.current = getAngleFromEvent(e);
      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const newAngle = getAngleFromEvent(ev);
        let delta = newAngle - lastAngle.current;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        const updated = ((outerAngle + delta) % 360 + 360) % 360;
        onOuterAngleChange(updated);
        lastAngle.current = newAngle;
      };
      const handleMouseUp = () => {
        dragging.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [outerAngle, onOuterAngleChange, getAngleFromEvent]
  );

  const touchStartAngle = useRef(0);
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent;
      dragging.current = true;
      lastAngle.current = getAngleFromEvent(fakeEvent);
      const handleTouchMove = (ev: TouchEvent) => {
        if (!dragging.current || ev.touches.length !== 1) return;
        const t = ev.touches[0];
        const rect = containerRef.current!.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = t.clientX - cx;
        const dy = t.clientY - cy;
        const newAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        let delta = newAngle - lastAngle.current;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        const updated = ((outerAngle + delta) % 360 + 360) % 360;
        onOuterAngleChange(updated);
        lastAngle.current = newAngle;
      };
      const handleTouchEnd = () => {
        dragging.current = false;
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    },
    [outerAngle, onOuterAngleChange, getAngleFromEvent]
  );

  const gemPositions = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 + 22.5) * (Math.PI / 180);
    const r = outerR - 4;
    return { x: center + r * Math.cos(a), y: center + r * Math.sin(a) };
  });

  const currentConstellation = constellations[constellationId];
  const starPositions = currentConstellation.stars.map((s) => ({
    x: center + (s.x - 0.5) * innerR * 1.6,
    y: center + (s.y - 0.5) * innerR * 1.6,
  }));

  return (
    <motion.svg
      ref={containerRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ cursor: dragging.current ? 'grabbing' : 'grab' }}
    >
      <defs>
        <filter id="noise-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
          <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" result="noisy" />
          <feComponentTransfer in="noisy">
            <feFuncA type="linear" slope="0.97" />
          </feComponentTransfer>
        </filter>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="center-glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="parchment-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4a3520" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#2a1e12" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#1a1a2e" stopOpacity="0.8" />
        </radialGradient>
        <radialGradient id="center-glow-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c9a96e" stopOpacity="1" />
          <stop offset="50%" stopColor="#c9a96e" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#c9a96e" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle
        cx={center}
        cy={center}
        r={outerR}
        fill="url(#parchment-fill)"
        stroke="#c9a96e"
        strokeWidth="0.5"
        strokeOpacity="0.3"
        filter="url(#noise-filter)"
      />

      <g
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ cursor: 'grab' }}
      >
        <motion.g
          animate={{
            rotate: outerAngle,
            scale: dragging.current ? 1.2 : 1,
          }}
          transition={{
            rotate: { type: 'spring', stiffness: 120, damping: 20 },
            scale: { type: 'spring', stiffness: 300, damping: 25 },
          }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        >
          <circle
            cx={center}
            cy={center}
            r={outerR}
            fill="none"
            stroke={failFlash ? '#8b0000' : '#c9a96e'}
            strokeWidth="0.5"
            strokeOpacity={failFlash ? 0.8 : 0.5}
          />
          <circle
            cx={center}
            cy={center}
            r={outerR - 12}
            fill="none"
            stroke="#c9a96e"
            strokeWidth="0.3"
            strokeOpacity="0.3"
          />

          {ZODIAC_ABBR.map((abbr, i) => {
            const startAngle = i * 30;
            const midAngle = startAngle + 15;
            const rad = midAngle * (Math.PI / 180);
            const textR = outerR - 22;
            const tx = center + textR * Math.cos(rad);
            const ty = center + textR * Math.sin(rad);
            const isFlash = flashSign === i;

            return (
              <g key={abbr}>
                <line
                  x1={center + (outerR - 12) * Math.cos(startAngle * (Math.PI / 180))}
                  y1={center + (outerR - 12) * Math.sin(startAngle * (Math.PI / 180))}
                  x2={center + outerR * Math.cos(startAngle * (Math.PI / 180))}
                  y2={center + outerR * Math.sin(startAngle * (Math.PI / 180))}
                  stroke="#c9a96e"
                  strokeWidth="0.5"
                  strokeOpacity="0.4"
                />
                {isFlash && (
                  <circle
                    cx={tx}
                    cy={ty}
                    r="18"
                    fill="#c9a96e"
                    opacity="0"
                  >
                    <animate
                      attributeName="opacity"
                      values="0;0.6;0"
                      dur="0.8s"
                      fill="freeze"
                    />
                  </circle>
                )}
                <text
                  x={tx}
                  y={ty}
                  fill={isFlash ? '#fff' : '#c9a96e'}
                  fontSize="8"
                  fontFamily="Cinzel, serif"
                  textAnchor="middle"
                  dominantBaseline="central"
                  opacity={isFlash ? 1 : 0.7}
                  fontWeight={isFlash ? '700' : '400'}
                >
                  {abbr}
                </text>
              </g>
            );
          })}
        </motion.g>
      </g>

      <circle
        cx={center}
        cy={center}
        r={midR}
        fill="none"
        stroke="#c9a96e"
        strokeWidth="0.4"
        strokeOpacity="0.35"
      />
      <circle
        cx={center}
        cy={center}
        r={midR - 8}
        fill="none"
        stroke="#c9a96e"
        strokeWidth="0.2"
        strokeOpacity="0.2"
      />

      {PLANET_SYMBOLS.map((sym, i) => {
        const angle = i * 72 + 36;
        const rad = angle * (Math.PI / 180);
        const pr = midR - 4;
        return (
          <g key={sym}>
            <circle
              cx={center + pr * Math.cos(rad)}
              cy={center + pr * Math.sin(rad)}
              r="10"
              fill="rgba(26,26,46,0.6)"
              stroke="#c9a96e"
              strokeWidth="0.3"
              strokeOpacity="0.4"
            />
            <text
              x={center + pr * Math.cos(rad)}
              y={center + pr * Math.sin(rad)}
              fill="#c9a96e"
              fontSize="12"
              textAnchor="middle"
              dominantBaseline="central"
              opacity="0.7"
            >
              {sym}
            </text>
          </g>
        );
      })}

      <circle
        cx={center}
        cy={center}
        r={innerR}
        fill="none"
        stroke="#c9a96e"
        strokeWidth="0.3"
        strokeOpacity="0.25"
      />

      {highlightedStars &&
        starPositions.map((sp, idx) => (
          <g key={`star-${idx}`}>
            <circle
              cx={sp.x}
              cy={sp.y}
              r="3"
              fill="#a8d8ea"
              opacity="0.9"
              filter="url(#glow)"
            />
          </g>
        ))}

      {highlightedStars &&
        currentConstellation.connections.map(([a, b], idx) => {
          const sa = starPositions[a];
          const sb = starPositions[b];
          return (
            <line
              key={`conn-${idx}`}
              x1={sa.x}
              y1={sa.y}
              x2={sb.x}
              y2={sb.y}
              stroke="#a8d8ea"
              strokeWidth="0.8"
              strokeDasharray="3 2"
              opacity="0.7"
            />
          );
        })}

      <circle cx={center} cy={center} r="12" fill="url(#center-glow-grad)" opacity="0.3" />
      <motion.circle
        cx={center}
        cy={center}
        r={centerR}
        fill="#c9a96e"
        filter="url(#center-glow)"
        animate={{
          r: [centerR, centerR + 2, centerR],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {gemPositions.map((pos, i) => (
        <circle
          key={`gem-${i}`}
          cx={pos.x}
          cy={pos.y}
          r="1.5"
          fill="#7b9e6b"
          opacity="0.7"
        />
      ))}

      <line
        x1={center}
        y1={center - innerR}
        x2={center}
        y2={center - outerR + 2}
        stroke="#c9a96e"
        strokeWidth="0.3"
        strokeOpacity="0.4"
        strokeDasharray="2 2"
      />
    </motion.svg>
  );
}
