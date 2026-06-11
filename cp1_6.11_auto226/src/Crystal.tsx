import { useEffect, useRef, useState } from 'react';
import { Crystal } from './types';

interface Props {
  crystal: Crystal;
  canvasW: number;
  canvasH: number;
  isHovered: boolean;
}

function getPolygonPoints(sides: number, radius: number, rotationDeg: number) {
  const points: { x: number; y: number }[] = [];
  const rot = (rotationDeg * Math.PI) / 180;
  for (let i = 0; i < sides; i++) {
    const angle = (i * Math.PI * 2) / sides - Math.PI / 2 + rot;
    points.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }
  return points;
}

export default function CrystalComp({ crystal, isHovered }: Props) {
  const rippleCanvasRef = useRef<HTMLCanvasElement>(null);
  const [now, setNow] = useState(Date.now());
  const animRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Ripple rendering
  useEffect(() => {
    const canvas = rippleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (const ripple of crystal.ripples) {
      const elapsed = (now - ripple.startTime) / 1000;
      if (elapsed > 1.5) continue;
      const offsetX = ripple.centerX - crystal.x;
      const offsetY = ripple.centerY - crystal.y;

      const baseSpeed = 150;
      for (let ring = 0; ring < 3; ring++) {
        const ringDelay = ring * 0.15;
        const t = elapsed - ringDelay;
        if (t < 0) continue;
        const radius = t * baseSpeed;
        const alpha = Math.max(0, 0.8 * (1 - t / 1.5));
        ctx.beginPath();
        ctx.arc(cx + offsetX, cy + offsetY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(crystal.color, alpha);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [crystal.ripples, crystal.color, crystal.x, crystal.y, now]);

  const sides = 18;
  const baseRadius = crystal.size / 2;
  const glowRadius = baseRadius + 6;
  const points = getPolygonPoints(sides, baseRadius, crystal.rotation);
  const glowPoints = getPolygonPoints(sides, glowRadius, crystal.rotation);

  const flashElapsed = (now - crystal.flashTime) / 1000;
  let flashOpacity = 1;
  if (flashElapsed < 0.3) {
    const t = flashElapsed / 0.3;
    flashOpacity = t < 0.5 ? 1 + t * 2 : 1 + (1 - t) * 2;
  }

  const hoverScale = isHovered ? 1.1 : 1;
  const glowColor = crystal.hit ? '#ffd700' : crystal.color;
  const glowAlpha = isHovered ? 0.7 : 0.35;

  return (
    <div
      style={{
        position: 'absolute',
        left: crystal.x,
        top: crystal.y,
        width: 0,
        height: 0,
        pointerEvents: 'none',
      }}
    >
      {/* Ripple canvas */}
      <canvas
        ref={rippleCanvasRef}
        width={600}
        height={600}
        style={{
          position: 'absolute',
          left: -300,
          top: -300,
          width: 600,
          height: 600,
          pointerEvents: 'none',
        }}
      />

      {/* Crystal SVG */}
      <svg
        width={crystal.size + 40}
        height={crystal.size + 40}
        viewBox={`${-(crystal.size + 40) / 2} ${-(crystal.size + 40) / 2} ${crystal.size + 40} ${crystal.size + 40}`}
        style={{
          position: 'absolute',
          left: -(crystal.size + 40) / 2,
          top: -(crystal.size + 40) / 2,
          transform: `scale(${hoverScale})`,
          transition: 'transform 0.15s ease',
          filter: isHovered
            ? `drop-shadow(0 0 6px #66fcf1) drop-shadow(0 0 12px ${glowColor})`
            : `drop-shadow(0 0 ${isHovered ? 8 : 4}px ${hexToRgba(glowColor, glowAlpha)})`,
          opacity: flashOpacity,
        }}
      >
        {/* Outer glow polygon */}
        <polygon
          points={glowPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={hexToRgba(glowColor, 0.25)}
          strokeWidth={4}
        />
        <polygon
          points={getPolygonPoints(sides, baseRadius + 3, crystal.rotation)
            .map((p) => `${p.x},${p.y}`)
            .join(' ')}
          fill="none"
          stroke={hexToRgba(glowColor, 0.4)}
          strokeWidth={2}
        />

        {/* Main crystal */}
        <defs>
          <linearGradient
            id={`grad-${crystal.id}`}
            x1="-50%"
            y1="-50%"
            x2="50%"
            y2="50%"
          >
            <stop
              offset="0%"
              stopColor={lightenColor(crystal.color, 0.3)}
              stopOpacity="1"
            />
            <stop
              offset="50%"
              stopColor={crystal.color}
              stopOpacity="1"
            />
            <stop
              offset="100%"
              stopColor={darkenColor(crystal.color, 0.3)}
              stopOpacity="1"
            />
          </linearGradient>
          <filter id={`glow-${crystal.id}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <polygon
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={`url(#grad-${crystal.id})`}
          stroke={crystal.hit ? '#ffd700' : lightenColor(crystal.color, 0.5)}
          strokeWidth={crystal.hit ? 1.5 : 1}
          filter={`url(#glow-${crystal.id})`}
        />

        {/* Inner facets */}
        {(() => {
          const innerPoints = getPolygonPoints(sides, baseRadius * 0.55, crystal.rotation);
          const facetPaths: JSX.Element[] = [];
          for (let i = 0; i < sides; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % sides];
            const ip = innerPoints[i];
            facetPaths.push(
              <polygon
                key={`facet-${i}`}
                points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${ip.x},${ip.y}`}
                fill={lightenColor(crystal.color, 0.1 + (i % 3) * 0.1)}
                stroke={hexToRgba(lightenColor(crystal.color, 0.5), 0.4)}
                strokeWidth={0.5}
                opacity={0.6}
              />
            );
          }
          return facetPaths;
        })()}

        {/* Crack lines if hit */}
        {crystal.hit &&
          crystal.crackLines.map((cl, idx) => {
            if (cl.points.length < 2) return null;
            const d = cl.points
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
              .join(' ');
            return (
              <path
                key={`crack-${idx}`}
                d={d}
                fill="none"
                stroke="#ffd700"
                strokeWidth={1}
                strokeLinecap="round"
                opacity={0.9}
              />
            );
          })}

        {/* Center highlight */}
        <circle
          cx={0}
          cy={0}
          r={baseRadius * 0.18}
          fill={hexToRgba('#ffffff', crystal.hit ? 0.5 : 0.3)}
        />

        {/* Pitch label */}
        <text
          x={0}
          y={baseRadius + 18}
          textAnchor="middle"
          fontFamily="sans-serif"
          fontSize="10"
          fill={crystal.hit ? '#ffd700' : '#c5c6c7'}
          opacity={crystal.hit ? 1 : 0.6}
        >
          {crystal.pitchName}
        </text>
      </svg>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lightenColor(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + Math.round(255 * amount));
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + Math.round(255 * amount));
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darkenColor(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.max(0, parseInt(h.substring(0, 2), 16) - Math.round(255 * amount));
  const g = Math.max(0, parseInt(h.substring(2, 4), 16) - Math.round(255 * amount));
  const b = Math.max(0, parseInt(h.substring(4, 6), 16) - Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
