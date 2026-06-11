import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Shrimp, BacteriaPatch, SmokeParticle, ExchangeParticle, CameraState, COLORS, VENT_CONFIG, CAMERA_CONFIG, hexToRgb } from '../utils/constants';

interface SimulationCanvasProps {
  width: number;
  height: number;
  getState: () => any;
  onShrimpClick: (shrimpId: string) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  width,
  height,
  getState,
  onShrimpClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cameraRef = useRef<CameraState>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, COLORS.deepSeaBlack);
    gradient.addColorStop(1, COLORS.ventBlue);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 50; i++) {
      const x = (i * 73) % w;
      const y = (i * 47) % h;
      const r = 1 + (i % 5);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, []);

  const drawVent = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const diameter = VENT_CONFIG.diameter;
    const radius = diameter / 2;
    
    const bodyGradient = ctx.createRadialGradient(
      x - radius * 0.3, y - radius * 0.3, 0,
      x, y, radius
    );
    bodyGradient.addColorStop(0, '#4a4a4a');
    bodyGradient.addColorStop(0.5, '#2d2d2d');
    bodyGradient.addColorStop(1, '#1a1a1a');
    
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.3, radius, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyGradient;
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.8, y + radius * 0.3);
    ctx.quadraticCurveTo(x - radius * 0.9, y - radius * 0.2, x - radius * 0.5, y - radius * 0.5);
    ctx.quadraticCurveTo(x - radius * 0.3, y - radius * 0.7, x, y - radius * 0.8);
    ctx.quadraticCurveTo(x + radius * 0.3, y - radius * 0.7, x + radius * 0.5, y - radius * 0.5);
    ctx.quadraticCurveTo(x + radius * 0.9, y - radius * 0.2, x + radius * 0.8, y + radius * 0.3);
    ctx.closePath();
    ctx.fillStyle = bodyGradient;
    ctx.fill();
    
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.6, y - radius * 0.3);
    ctx.quadraticCurveTo(x - radius * 0.4, y, x - radius * 0.5, y + radius * 0.2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x + radius * 0.4, y - radius * 0.4);
    ctx.quadraticCurveTo(x + radius * 0.3, y - radius * 0.1, x + radius * 0.5, y + radius * 0.1);
    ctx.stroke();
    
    const openingGradient = ctx.createRadialGradient(
      x, y - radius * 0.7, 0,
      x, y - radius * 0.7, radius * 0.4
    );
    openingGradient.addColorStop(0, 'rgba(255, 200, 100, 0.8)');
    openingGradient.addColorStop(0.5, 'rgba(255, 150, 50, 0.5)');
    openingGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    
    ctx.beginPath();
    ctx.ellipse(x, y - radius * 0.7, radius * 0.35, radius * 0.15, 0, 0, Math.PI * 2);
    ctx.fillStyle = openingGradient;
    ctx.fill();
    
    ctx.shadowColor = 'rgba(255, 150, 50, 0.5)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.ellipse(x, y - radius * 0.7, radius * 0.2, radius * 0.08, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 200, 100, 0.9)';
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  const drawSmokeParticles = useCallback((ctx: CanvasRenderingContext2D, particles: SmokeParticle[]) => {
    for (const p of particles) {
      const alpha = 0.8 * (1 - p.life / p.maxLife);
      
      const gradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.size
      );
      gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.8})`);
      gradient.addColorStop(0.5, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.4})`);
      gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }, []);

  const drawBacteriaPatch = useCallback((ctx: CanvasRenderingContext2D, patch: BacteriaPatch) => {
    const { x, y, radius, colorRGB, glowIntensity } = patch;
    
    ctx.shadowColor = `rgb(${colorRGB.r}, ${colorRGB.g}, ${colorRGB.b})`;
    ctx.shadowBlur = 20 * glowIntensity;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${colorRGB.r}, ${colorRGB.g}, ${colorRGB.b}, ${0.8 * glowIntensity})`);
    gradient.addColorStop(0.6, `rgba(${colorRGB.r}, ${colorRGB.g}, ${colorRGB.b}, ${0.4 * glowIntensity})`);
    gradient.addColorStop(1, `rgba(${colorRGB.r}, ${colorRGB.g}, ${colorRGB.b}, 0)`);
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    ctx.globalAlpha = 0.3 * glowIntensity;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + patch.glowIntensity;
      const dist = radius * 0.5;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const pr = radius * 0.2;
      
      const spotGradient = ctx.createRadialGradient(px, py, 0, px, py, pr);
      spotGradient.addColorStop(0, `rgba(255, 255, 255, 0.5)`);
      spotGradient.addColorStop(1, `rgba(${colorRGB.r}, ${colorRGB.g}, ${colorRGB.b}, 0)`);
      
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = spotGradient;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, []);

  const drawShrimp = useCallback((ctx: CanvasRenderingContext2D, shrimp: Shrimp) => {
    ctx.save();
    ctx.translate(shrimp.x, shrimp.y);
    ctx.rotate(shrimp.angle);
    
    const bodyLength = shrimp.bodyLength;
    const bodyWidth = shrimp.bodyWidth;
    
    if (shrimp.hasBacteria && shrimp.bacteriaColorRGB && shrimp.bacteriaSize > 0) {
      const bacteriaColor = shrimp.bacteriaColorRGB;
      ctx.globalAlpha = 0.4;
      
      const bacteriaGradient = ctx.createRadialGradient(
        0, 0, 0,
        0, 0, shrimp.bacteriaSize + bodyWidth
      );
      bacteriaGradient.addColorStop(0, `rgba(${bacteriaColor.r}, ${bacteriaColor.g}, ${bacteriaColor.b}, 0.6)`);
      bacteriaGradient.addColorStop(0.5, `rgba(${bacteriaColor.r}, ${bacteriaColor.g}, ${bacteriaColor.b}, 0.3)`);
      bacteriaGradient.addColorStop(1, `rgba(${bacteriaColor.r}, ${bacteriaColor.g}, ${bacteriaColor.b}, 0)`);
      
      ctx.beginPath();
      ctx.ellipse(0, 0, bodyLength / 2 + shrimp.bacteriaSize, bodyWidth / 2 + shrimp.bacteriaSize * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = bacteriaGradient;
      ctx.fill();
      
      ctx.strokeStyle = `rgba(${bacteriaColor.r}, ${bacteriaColor.g}, ${bacteriaColor.b}, 0.5)`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const innerR = bodyWidth / 2;
        const outerR = bodyWidth / 2 + shrimp.bacteriaSize * (0.7 + Math.sin(shrimp.colorPhase + i) * 0.3);
        
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
        ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
    }
    
    const colorIntensity = 0.5 + Math.sin(shrimp.colorPhase) * 0.5;
    const bodyGradient = ctx.createLinearGradient(-bodyLength / 2, 0, bodyLength / 2, 0);
    bodyGradient.addColorStop(0, `rgba(248, 187, 208, ${0.5 + colorIntensity * 0.3})`);
    bodyGradient.addColorStop(0.5, `rgba(255, 249, 196, ${0.6 + colorIntensity * 0.3})`);
    bodyGradient.addColorStop(1, `rgba(255, 245, 210, ${0.5 + colorIntensity * 0.3})`);
    
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyLength / 2, bodyWidth / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyGradient;
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyLength / 2, bodyWidth / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    const antennaLength = bodyLength * 0.8;
    const antennaWave = Math.sin(shrimp.antennaPhase) * 0.2;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 0.8;
    
    ctx.beginPath();
    ctx.moveTo(bodyLength / 2 - 1, -bodyWidth / 4);
    ctx.quadraticCurveTo(
      bodyLength / 2 + antennaLength * 0.5, -bodyWidth / 2 + antennaWave * 5,
      bodyLength / 2 + antennaLength, -bodyWidth / 3 + antennaWave * 3
    );
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(bodyLength / 2 - 1, bodyWidth / 4);
    ctx.quadraticCurveTo(
      bodyLength / 2 + antennaLength * 0.5, bodyWidth / 2 - antennaWave * 5,
      bodyLength / 2 + antennaLength, bodyWidth / 3 - antennaWave * 3
    );
    ctx.stroke();
    
    const glowBrightness = shrimp.glowIntensity;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8 * glowBrightness;
    
    ctx.beginPath();
    ctx.arc(-bodyLength / 2 + 2, 0, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 229, 255, ${glowBrightness})`;
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    if (shrimp.isMarked) {
      ctx.strokeStyle = 'rgba(255, 235, 59, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.ellipse(0, 0, bodyLength / 2 + 4, bodyWidth / 2 + 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    ctx.restore();
    
    if (shrimp.isMarked && shrimp.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(shrimp.trail[0].x, shrimp.trail[0].y);
      
      for (let i = 1; i < shrimp.trail.length; i++) {
        const point = shrimp.trail[i];
        const alpha = i / shrimp.trail.length;
        ctx.strokeStyle = `rgba(255, 235, 59, ${alpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }
  }, []);

  const drawExchangeParticles = useCallback((ctx: CanvasRenderingContext2D, particles: ExchangeParticle[]) => {
    for (const p of particles) {
      const progress = p.life / p.maxLife;
      const alpha = Math.sin(progress * Math.PI);
      
      const ringGradient = ctx.createRadialGradient(
        p.x, p.y, p.radius * 0.8,
        p.x, p.y, p.radius
      );
      ringGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      ringGradient.addColorStop(0.5, `${p.color}${Math.floor(alpha * 128).toString(16).padStart(2, '0')}`);
      ringGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = ringGradient;
      ctx.fill();
      
      for (const particle of p.particles) {
        const px = p.x + Math.cos(particle.angle + progress * 2) * particle.distance;
        const py = p.y + Math.sin(particle.angle + progress * 2) * particle.distance;
        
        ctx.beginPath();
        ctx.arc(px, py, particle.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = alpha * 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const state = getState();
    if (!state) return;
    
    const camera = cameraRef.current;
    
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    
    drawBackground(ctx, width, height);
    
    ctx.translate(width / 2 + camera.offsetX, height / 2 + camera.offsetY);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-state.ventX, -state.ventY);
    
    drawVent(ctx, state.ventX, state.ventY);
    
    drawSmokeParticles(ctx, state.smokeParticles);
    
    for (const patch of state.patches) {
      drawBacteriaPatch(ctx, patch);
    }
    
    const markedShrimps = state.shrimps.filter((s: Shrimp) => s.isMarked);
    for (const shrimp of markedShrimps) {
      if (shrimp.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(shrimp.trail[0].x, shrimp.trail[0].y);
        for (let i = 1; i < shrimp.trail.length; i++) {
          const alpha = i / shrimp.trail.length;
          ctx.strokeStyle = `rgba(255, 235, 59, ${alpha * 0.5})`;
          ctx.lineWidth = 2;
          ctx.lineTo(shrimp.trail[i].x, shrimp.trail[i].y);
        }
        ctx.stroke();
      }
    }
    
    for (const shrimp of state.shrimps) {
      drawShrimp(ctx, shrimp);
    }
    
    drawExchangeParticles(ctx, state.exchangeParticles);
    
    ctx.restore();
    
    animationFrameRef.current = requestAnimationFrame(render);
  }, [width, height, getState, drawBackground, drawVent, drawSmokeParticles, drawBacteriaPatch, drawShrimp, drawExchangeParticles]);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const camera = cameraRef.current;
    const state = getState();
    if (!state) return { x: 0, y: 0 };
    
    const worldX = (screenX - width / 2 - camera.offsetX) / camera.zoom + state.ventX;
    const worldY = (screenY - height / 2 - camera.offsetY) / camera.zoom + state.ventY;
    
    return { x: worldX, y: worldY };
  }, [width, height, getState]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const camera = cameraRef.current;
    const delta = -e.deltaY * CAMERA_CONFIG.zoomSpeed;
    camera.zoom = Math.max(CAMERA_CONFIG.minZoom, Math.min(CAMERA_CONFIG.maxZoom, camera.zoom * (1 + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      
      cameraRef.current.offsetX += dx;
      cameraRef.current.offsetY += dy;
      
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      const dx = Math.abs(e.clientX - lastMousePosRef.current.x);
      const dy = Math.abs(e.clientY - lastMousePosRef.current.y);
      
      if (dx < 5 && dy < 5) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const worldPos = screenToWorld(x, y);
          
          const state = getState();
          if (state) {
            let closest: any = null;
            let closestDist = Infinity;
            
            for (const shrimp of state.shrimps) {
              const dist = Math.hypot(shrimp.x - worldPos.x, shrimp.y - worldPos.y);
              const hitRadius = shrimp.bodyLength / 2 + shrimp.bacteriaSize + 10;
              
              if (dist < hitRadius && dist < closestDist) {
                closest = shrimp;
                closestDist = dist;
              }
            }
            
            if (closest) {
              onShrimpClick(closest.id);
            }
          }
        }
      }
      
      isDraggingRef.current = false;
    }
  }, [screenToWorld, getState, onShrimpClick]);

  const handleMouseLeave = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'block',
        cursor: isDraggingRef.current ? 'grabbing' : 'grab',
      }}
    />
  );
};
