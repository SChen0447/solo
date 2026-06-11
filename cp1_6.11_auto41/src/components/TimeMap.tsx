import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { AnchorPoint } from '../types';
import { latLngToXY, getColorByLatitude, clamp, lerp, distance } from '../utils/geo';
import { animateValue, easeOutCubic, throttle } from '../utils/animation';

interface TimeMapProps {
  anchors: AnchorPoint[];
  onAnchorSelect: (cityId: string, lat: number, lng: number) => void;
  flyToCoords: { lat: number; lng: number } | null;
}

interface HoveredAnchor {
  anchor: AnchorPoint;
  screenX: number;
  screenY: number;
}

const TimeMap: React.FC<TimeMapProps> = ({ anchors, onAnchorSelect, flyToCoords }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredAnchor, setHoveredAnchor] = useState<HoveredAnchor | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const mapStateRef = useRef({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    targetOffsetX: 0,
    targetOffsetY: 0,
    targetScale: 1,
    animationId: null as number | null,
    flyAnimationId: null as number | null,
  });

  const mapWidth = 1200;
  const mapHeight = 600;

  const continentPaths = useMemo(() => [
    { fill: '#E8E4D8', stroke: '#C4C0B4', d: 'M150,120 L200,100 L280,110 L350,90 L420,100 L480,80 L550,90 L600,70 L680,80 L750,100 L800,120 L820,180 L780,220 L700,240 L620,230 L550,250 L480,240 L400,260 L320,250 L250,230 L180,200 Z' },
    { fill: '#E8E4D8', stroke: '#C4C0B4', d: 'M100,280 L150,260 L200,280 L250,300 L280,350 L260,420 L220,450 L160,440 L100,400 L80,340 Z' },
    { fill: '#E8E4D8', stroke: '#C4C0B4', d: 'M450,280 L500,260 L550,280 L580,320 L560,380 L520,420 L470,430 L430,400 L420,340 L435,300 Z' },
    { fill: '#E8E4D8', stroke: '#C4C0B4', d: 'M600,300 L700,280 L800,300 L900,320 L950,380 L920,450 L850,480 L780,470 L720,450 L650,420 L610,380 L590,340 Z' },
    { fill: '#E8E4D8', stroke: '#C4C0B4', d: 'M950,180 L1000,160 L1080,180 L1100,240 L1080,300 L1020,330 L960,320 L920,280 L910,230 Z' },
    { fill: '#E8E4D8', stroke: '#C4C0B4', d: 'M300,480 L400,470 L500,480 L550,510 L520,540 L420,550 L320,540 L280,510 Z' },
  ], []);

  const handleResize = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({ width: clientWidth, height: clientHeight });
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const state = mapStateRef.current;
    const scale = dimensions.width / mapWidth;
    return {
      x: (screenX - state.offsetX) / (state.scale * scale),
      y: (screenY - state.offsetY) / (state.scale * scale),
    };
  }, [dimensions.width]);

  const findAnchorAtPosition = useCallback((worldX: number, worldY: number) => {
    const scale = dimensions.width / mapWidth;
    const hitRadius = 20 / (mapStateRef.current.scale * scale);

    for (const anchor of anchors) {
      const { x, y } = latLngToXY(anchor.lat, anchor.lng, mapWidth, mapHeight);
      if (distance(worldX, worldY, x, y) < hitRadius) {
        return anchor;
      }
    }
    return null;
  }, [anchors, dimensions.width]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = mapStateRef.current;
    const scale = dimensions.width / mapWidth;
    const displayScale = state.scale * scale;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    ctx.save();
    ctx.translate(state.offsetX, state.offsetY);
    ctx.scale(displayScale, displayScale);

    ctx.fillStyle = '#EDE8DC';
    ctx.fillRect(0, 0, mapWidth, mapHeight);

    ctx.strokeStyle = 'rgba(90, 138, 138, 0.1)';
    ctx.lineWidth = 0.5;
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = (90 - lat) / 180 * mapHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(mapWidth, y);
      ctx.stroke();
    }
    for (let lng = -150; lng <= 150; lng += 30) {
      const x = (lng + 180) / 360 * mapWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mapHeight);
      ctx.stroke();
    }

    for (const continent of continentPaths) {
      ctx.fillStyle = continent.fill;
      ctx.strokeStyle = continent.stroke;
      ctx.lineWidth = 1;
      const path = new Path2D(continent.d);
      ctx.fill(path);
      ctx.stroke(path);
    }

    for (const anchor of anchors) {
      const { x, y } = latLngToXY(anchor.lat, anchor.lng, mapWidth, mapHeight);
      const isHovered = hoveredAnchor?.anchor.id === anchor.id;
      const baseRadius = isHovered ? 10 : 6;
      const color = getColorByLatitude(anchor.lat);

      ctx.beginPath();
      ctx.arc(x, y, baseRadius + 4, 0, Math.PI * 2);
      ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ', 0.3)');
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (isHovered) {
        ctx.beginPath();
        ctx.arc(x, y, baseRadius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [dimensions, anchors, hoveredAnchor, continentPaths]);

  const startAnimation = useCallback(() => {
    const state = mapStateRef.current;
    if (state.animationId) return;

    const animate = () => {
      const dx = state.targetOffsetX - state.offsetX;
      const dy = state.targetOffsetY - state.offsetY;
      const ds = state.targetScale - state.scale;

      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(ds) < 0.001) {
        state.offsetX = state.targetOffsetX;
        state.offsetY = state.targetOffsetY;
        state.scale = state.targetScale;
        state.animationId = null;
        render();
        return;
      }

      state.offsetX += dx * 0.15;
      state.offsetY += dy * 0.15;
      state.scale += ds * 0.15;

      render();
      state.animationId = requestAnimationFrame(animate);
    };

    state.animationId = requestAnimationFrame(animate);
  }, [render]);

  const flyTo = useCallback((lat: number, lng: number) => {
    const state = mapStateRef.current;
    if (state.flyAnimationId) {
      cancelAnimationFrame(state.flyAnimationId);
    }

    const scale = dimensions.width / mapWidth;
    const { x, y } = latLngToXY(lat, lng, mapWidth, mapHeight);
    
    const startOffsetX = state.offsetX;
    const startOffsetY = state.offsetY;
    const startScale = state.scale;
    
    const targetScale = 2.5;
    const targetOffsetX = dimensions.width / 2 - x * targetScale * scale;
    const targetOffsetY = dimensions.height / 2 - y * targetScale * scale;

    const startTime = performance.now();
    const duration = 800;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      state.offsetX = lerp(startOffsetX, targetOffsetX, eased);
      state.offsetY = lerp(startOffsetY, targetOffsetY, eased);
      state.scale = lerp(startScale, targetScale, eased);
      state.targetOffsetX = state.offsetX;
      state.targetOffsetY = state.offsetY;
      state.targetScale = state.scale;

      render();

      if (progress < 1) {
        state.flyAnimationId = requestAnimationFrame(animate);
      } else {
        state.flyAnimationId = null;
      }
    };

    state.flyAnimationId = requestAnimationFrame(animate);
  }, [dimensions, render]);

  useEffect(() => {
    if (flyToCoords) {
      flyTo(flyToCoords.lat, flyToCoords.lng);
    } else {
      const state = mapStateRef.current;
      state.targetScale = 1;
      state.targetOffsetX = 0;
      state.targetOffsetY = 0;
      startAnimation();
    }
  }, [flyToCoords, flyTo, startAnimation]);

  useEffect(() => {
    if (dimensions.width > 0) {
      const state = mapStateRef.current;
      const scale = dimensions.width / mapWidth;
      state.offsetY = (dimensions.height - mapHeight * scale) / 2;
      state.targetOffsetY = state.offsetY;
      render();
    }
  }, [dimensions, render]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (flyToCoords) return;
    const state = mapStateRef.current;
    state.isDragging = true;
    state.lastMouseX = e.clientX;
    state.lastMouseY = e.clientY;
  }, [flyToCoords]);

  const handleMouseMove = useCallback(throttle((e: React.MouseEvent) => {
    const state = mapStateRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (state.isDragging && !flyToCoords) {
      const dx = e.clientX - state.lastMouseX;
      const dy = e.clientY - state.lastMouseY;
      
      state.offsetX += dx;
      state.offsetY += dy;
      state.targetOffsetX = state.offsetX;
      state.targetOffsetY = state.offsetY;
      
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
      
      render();
      setHoveredAnchor(null);
    } else if (!flyToCoords) {
      const world = screenToWorld(screenX, screenY);
      const anchor = findAnchorAtPosition(world.x, world.y);
      
      if (anchor) {
        setHoveredAnchor({ anchor, screenX, screenY });
        canvasRef.current!.style.cursor = 'pointer';
      } else {
        setHoveredAnchor(null);
        canvasRef.current!.style.cursor = state.isDragging ? 'grabbing' : 'grab';
      }
    }
  }, 16), [flyToCoords, render, screenToWorld, findAnchorAtPosition]);

  const handleMouseUp = useCallback(() => {
    const state = mapStateRef.current;
    state.isDragging = false;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (flyToCoords) return;
    const state = mapStateRef.current;
    if (state.isDragging) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);
    const anchor = findAnchorAtPosition(world.x, world.y);

    if (anchor) {
      onAnchorSelect(anchor.id, anchor.lat, anchor.lng);
    }
  }, [flyToCoords, screenToWorld, findAnchorAtPosition, onAnchorSelect]);

  const handleWheel = useCallback(throttle((e: React.WheelEvent) => {
    if (flyToCoords) return;
    e.preventDefault();
    
    const state = mapStateRef.current;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = clamp(state.scale * delta, 0.5, 4);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const scale = dimensions.width / mapWidth;
    const worldX = (mouseX - state.offsetX) / (state.scale * scale);
    const worldY = (mouseY - state.offsetY) / (state.scale * scale);
    
    state.scale = newScale;
    state.targetScale = newScale;
    state.offsetX = mouseX - worldX * state.scale * scale;
    state.offsetY = mouseY - worldY * state.scale * scale;
    state.targetOffsetX = state.offsetX;
    state.targetOffsetY = state.offsetY;
    
    render();
  }, 16), [flyToCoords, dimensions, render]);

  const handleMouseLeave = useCallback(() => {
    setHoveredAnchor(null);
    const state = mapStateRef.current;
    state.isDragging = false;
  }, []);

  useEffect(() => {
    return () => {
      const state = mapStateRef.current;
      if (state.animationId) cancelAnimationFrame(state.animationId);
      if (state.flyAnimationId) cancelAnimationFrame(state.flyAnimationId);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          display: 'block',
          cursor: flyToCoords ? 'default' : 'grab',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      {hoveredAnchor && (
        <div
          className="animate-fade-in-up"
          style={{
            position: 'absolute',
            left: hoveredAnchor.screenX + 16,
            top: hoveredAnchor.screenY - 8,
            zIndex: 'var(--z-preview)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(248, 244, 234, 0.95)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              boxShadow: 'var(--shadow-md)',
              backdropFilter: 'blur(8px)',
              minWidth: '180px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '15px',
                color: 'var(--color-text)',
                marginBottom: '4px',
              }}
            >
              {hoveredAnchor.anchor.cityName}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.4,
              }}
            >
              {hoveredAnchor.anchor.description}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeMap;
