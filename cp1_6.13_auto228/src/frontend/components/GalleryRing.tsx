import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PaintingCard, Painting } from './PaintingCard';

interface GalleryRingProps {
  paintings: Painting[];
  palettes: Record<string, string[]>;
  onAddPetal: (id: string) => void;
  onPaintingClick: (painting: Painting) => void;
}

interface ViewportConfig {
  radius: number;
  cardWidth: number;
  cardHeight: number;
}

const getViewportConfig = (): ViewportConfig => {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
  if (width < 480) {
    return { radius: 150, cardWidth: 100, cardHeight: 130 };
  }
  if (width < 768) {
    return { radius: 200, cardWidth: 120, cardHeight: 160 };
  }
  return { radius: 300, cardWidth: 150, cardHeight: 200 };
};

export const GalleryRing: React.FC<GalleryRingProps> = ({
  paintings,
  palettes,
  onAddPetal,
  onPaintingClick,
}) => {
  const [rotation, setRotation] = useState(0);
  const [viewport, setViewport] = useState<ViewportConfig>(getViewportConfig);
  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef<number>();
  const centerRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setViewport(getViewportConfig());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getAngleFromCenter = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    centerRef.current = { x: cx, y: cy };
    return Math.atan2(clientY - cy, clientX - cx);
  }, []);

  useEffect(() => {
    const inertiaLoop = () => {
      if (!isDraggingRef.current && Math.abs(velocityRef.current) > 0.0001) {
        rotationRef.current += velocityRef.current;
        velocityRef.current *= 0.9;
        setRotation(rotationRef.current);
      }
      rafRef.current = requestAnimationFrame(inertiaLoop);
    };
    rafRef.current = requestAnimationFrame(inertiaLoop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
    velocityRef.current = 0;
    lastAngleRef.current = getAngleFromCenter(e.clientX, e.clientY);
    lastTimeRef.current = performance.now();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [getAngleFromCenter]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const currentAngle = getAngleFromCenter(e.clientX, e.clientY);
    const now = performance.now();
    let deltaAngle = currentAngle - lastAngleRef.current;
    const dt = now - lastTimeRef.current;

    if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
    if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

    const deltaDeg = deltaAngle * (180 / Math.PI) * 0.15;
    rotationRef.current += deltaDeg;
    setRotation(rotationRef.current);

    if (dt > 0) {
      velocityRef.current = (deltaDeg / dt) * 16;
    }

    lastAngleRef.current = currentAngle;
    lastTimeRef.current = now;
  }, [getAngleFromCenter]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
    }
  }, []);

  const { radius, cardWidth, cardHeight } = viewport;
  const angleStep = 360 / paintings.length;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        touchAction: 'none',
        cursor: isDraggingRef.current ? 'grabbing' : 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 0,
          height: 0,
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          transformStyle: 'preserve-3d',
          transition: isDraggingRef.current ? 'none' : undefined,
        }}
      >
        {paintings.map((painting, index) => {
          const angle = index * angleStep;
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;
          const palette = palettes[painting.theme] || palettes['星夜'];

          return (
            <div
              key={painting.id}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: cardWidth,
                height: cardHeight,
                transform: `translate(${x - cardWidth / 2}px, ${y - cardHeight / 2}px) rotate(${-rotation - angle + 90}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <div
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  transform: `scale(${cardWidth / 150})`,
                  transformOrigin: 'top left',
                }}
              >
                <PaintingCard
                  painting={painting}
                  palette={palette}
                  onAddPetal={onAddPetal}
                  onClick={onPaintingClick}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: radius * 2,
          height: radius * 2,
          borderRadius: '50%',
          border: '1px dashed rgba(255,255,255,0.08)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #ffffff, #8888ff)',
          boxShadow: '0 0 20px #8888ff, 0 0 40px #4444ff40',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -140%)',
          fontSize: '14px',
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '4px',
          pointerEvents: 'none',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '22px', fontWeight: 300, letterSpacing: '8px', marginBottom: '6px' }}>
          时痕·艺廊
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px' }}>
          Time Trace Gallery
        </div>
      </div>
    </div>
  );
};
