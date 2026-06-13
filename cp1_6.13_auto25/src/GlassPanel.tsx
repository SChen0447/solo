import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import {
  Polygon,
  rgbToString,
  pointsToSvgPath,
  generateVoronoiLikePolygons,
  Point,
} from './utils';

interface GlassPanelProps {
  rotationY: number;
  onRotationChange: (rotation: number) => void;
  panelWidth: number;
  panelHeight: number;
  seed?: number;
}

const GlassPanel: React.FC<GlassPanelProps> = ({
  rotationY,
  onRotationChange,
  panelWidth,
  panelHeight,
  seed,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const startRotationRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const pendingRotationRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const polygons = useMemo<Polygon[]>(() => {
    return generateVoronoiLikePolygons(panelWidth, panelHeight, 26);
  }, [panelWidth, panelHeight, seed]);

  const [noisePatternId] = useState(() => `noise-${Math.random().toString(36).slice(2, 10)}`);
  const [frostId] = useState(() => `frost-${Math.random().toString(36).slice(2, 10)}`);
  const [innerGlowId] = useState(() => `glow-${Math.random().toString(36).slice(2, 10)}`);

  const applyRotation = useCallback(() => {
    if (pendingRotationRef.current !== null) {
      const val = Math.max(0, Math.min(180, pendingRotationRef.current));
      onRotationChange(val);
      pendingRotationRef.current = null;
    }
    rafIdRef.current = requestAnimationFrame(applyRotation);
  }, [onRotationChange]);

  useEffect(() => {
    rafIdRef.current = requestAnimationFrame(applyRotation);
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [applyRotation]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    lastXRef.current = e.clientX;
    startRotationRef.current = rotationY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [rotationY]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastXRef.current;
    const rotationDelta = dx * 0.38;
    const newRotation = startRotationRef.current + rotationDelta;
    pendingRotationRef.current = newRotation;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  }, []);

  const frostedTexturePath = useMemo(() => {
    const lines: string[] = [];
    for (let i = 0; i < 60; i++) {
      const x1 = Math.random() * panelWidth;
      const y1 = Math.random() * panelHeight;
      const x2 = x1 + (Math.random() - 0.5) * 80;
      const y2 = y1 + (Math.random() - 0.5) * 80;
      lines.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`);
    }
    return lines.join(' ');
  }, [panelWidth, panelHeight, seed]);

  const perspectiveDepth = Math.abs(Math.sin((rotationY * Math.PI) / 180));
  const rotationScale = 1 - perspectiveDepth * 0.12;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDragging ? 'grabbing' : isHovering ? 'grab' : 'default',
        perspective: '1400px',
        userSelect: 'none',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={() => setIsHovering(true)}
      onPointerLeave={() => setIsHovering(false)}
    >
      <div
        style={{
          transform: `rotateY(${rotationY}deg) scale(${rotationScale})`,
          transformStyle: 'preserve-3d',
          transition: isDragging ? 'none' : 'transform 0.3s ease',
          position: 'relative',
          width: panelWidth,
          height: panelHeight,
          boxShadow: `
            0 0 60px rgba(255, 180, 80, ${0.12 + perspectiveDepth * 0.18}),
            inset 0 0 40px rgba(0, 0, 0, 0.35),
            0 25px 70px rgba(0, 0, 0, 0.6)
          `,
          borderRadius: '18px',
          border: '6px solid #3a3a3a',
          background: '#0a0a0a',
          overflow: 'hidden',
        }}
      >
        <svg
          ref={svgRef}
          width={panelWidth}
          height={panelHeight}
          viewBox={`0 0 ${panelWidth} ${panelHeight}`}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            background: 'radial-gradient(ellipse at center, #1a1810 0%, #0d0c08 60%, #050503 100%)',
          }}
        >
          <defs>
            <filter id={innerGlowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <pattern
              id={noisePatternId}
              patternUnits="userSpaceOnUse"
              width="180"
              height="180"
            >
              {Array.from({ length: 45 }).map((_, i) => {
                const cx = Math.random() * 180;
                const cy = Math.random() * 180;
                const r = 0.6 + Math.random() * 2.2;
                const opacity = 0.04 + Math.random() * 0.12;
                return (
                  <circle
                    key={`n-${i}`}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={i % 2 === 0 ? '#ffffff' : '#d0e8ff'}
                    opacity={opacity}
                  />
                );
              })}
            </pattern>
            <filter id={frostId} x="0" y="0" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.9"
                numOctaves="3"
                result="noise"
                seed={seed ?? 42}
              />
              <feColorMatrix
                in="noise"
                type="matrix"
                values="
                  1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 0.08 0
                "
                result="frostNoise"
              />
              <feComposite in="SourceGraphic" in2="frostNoise" operator="arithmetic" k1="1" k2="0" k3="1" k4="0" />
            </filter>
          </defs>

          <g filter={`url(#${innerGlowId})`}>
            {polygons.map((poly) => {
              const pathD = pointsToSvgPath(poly.points);
              return (
                <g key={poly.id}>
                  <path
                    d={pathD}
                    fill={rgbToString(poly.color, poly.color.a ?? 0.78)}
                    stroke="#2a2a2a"
                    strokeWidth={4.5}
                    strokeLinejoin="round"
                    style={{
                      mixBlendMode: 'normal' as const,
                      transition: 'fill 0.3s ease',
                    }}
                  />
                  <path
                    d={pathD}
                    fill={`url(#${noisePatternId})`}
                    opacity={0.22}
                    style={{ mixBlendMode: 'overlay' as const, pointerEvents: 'none' }}
                  />
                  <path
                    d={pathD}
                    fill="rgba(255, 255, 255, 0.06)"
                    style={{ mixBlendMode: 'screen' as const, pointerEvents: 'none' }}
                  />
                </g>
              );
            })}
          </g>

          <g pointerEvents="none">
            {polygons.map((poly) => (
              <path
                key={`lead-${poly.id}`}
                d={pointsToSvgPath(poly.points)}
                fill="none"
                stroke="#424242"
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {polygons.map((poly) => (
              <path
                key={`lead-hi-${poly.id}`}
                d={pointsToSvgPath(poly.points)}
                fill="none"
                stroke="#5a5a5a"
                strokeWidth={1}
                strokeLinejoin="round"
                opacity={0.55}
              />
            ))}
          </g>

          <path
            d={frostedTexturePath}
            stroke="rgba(255,255,255,0.025)"
            strokeWidth="0.6"
            fill="none"
            pointerEvents="none"
          />

          <rect
            x={0}
            y={0}
            width={panelWidth}
            height={panelHeight}
            fill="none"
            stroke={isHovering ? '#8a7a5a' : '#4a4438'}
            strokeWidth={isDragging ? 3 : 1.5}
            opacity={isHovering ? 0.85 : 0.45}
            style={{ transition: 'all 0.3s ease', pointerEvents: 'none' }}
          />
        </svg>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(${125 + rotationY * 0.5}deg,
              rgba(255, 220, 140, ${0.04 + perspectiveDepth * 0.08}) 0%,
              rgba(255, 180, 90, ${0.02 + perspectiveDepth * 0.04}) 40%,
              transparent 70%)`,
            pointerEvents: 'none',
            borderRadius: '14px',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '11px',
          color: isHovering ? 'rgba(220,200,160,0.7)' : 'rgba(160,150,130,0.45)',
          transition: 'color 0.3s ease',
          letterSpacing: '0.5px',
          pointerEvents: 'none',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}
      >
        拖拽旋转 · 角度 {rotationY.toFixed(0)}°
      </div>
    </div>
  );
};

export default GlassPanel;
