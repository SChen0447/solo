import React, { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAlchemy } from '@/phases/Phases';
import { getMaterialById } from '@/data/materials';
import type { Particle } from '@/types';
import { updateParticles, createSuccessParticles, createSmokeParticles, createBubbleParticles, mixColors, hexToRgb } from '@/utils/particles';

interface FurnaceProps {
  size?: number;
}

const Furnace: React.FC<FurnaceProps> = ({ size = 600 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const { state, checkResonance, addMaterial } = useAlchemy();
  const lastResultRef = useRef(state.synthesisResult);
  const lastResonanceRef = useRef<string[]>([]);

  const handleDrop = useCallback((e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
    const materialId = e.dataTransfer.getData('materialId');
    if (materialId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * size;
      const y = ((e.clientY - rect.top) / rect.height) * size;
      addMaterial(materialId, x, y);
    }
  }, [addMaterial, size]);

  const handleDragOver = (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
  };

  useEffect(() => {
    checkResonance();
  }, [state.temperature, state.crucibleMaterials, checkResonance]);

  useEffect(() => {
    if (state.synthesisResult === 'success' && lastResultRef.current !== 'success') {
      const colors = state.crucibleMaterials.map(rm => {
        const m = getMaterialById(rm.materialId);
        return m?.color || '#ffffff';
      });
      const color = mixColors(colors);
      particlesRef.current.push(...createSuccessParticles(size / 2, size / 2, color, 40));
    } else if (state.synthesisResult === 'fail' && lastResultRef.current !== 'fail') {
      particlesRef.current.push(...createSmokeParticles(size / 2, size / 2, 50));
    }
    lastResultRef.current = state.synthesisResult;
  }, [state.synthesisResult, state.crucibleMaterials, size]);

  useEffect(() => {
    if (state.isResonating && state.resonatingMaterialIds.length > 0) {
      const newIds = state.resonatingMaterialIds.filter(id => !lastResonanceRef.current.includes(id));
      newIds.forEach(id => {
        const mat = getMaterialById(id);
        if (mat) {
          particlesRef.current.push(...createSuccessParticles(size / 2, size / 2.2, mat.color, 15));
        }
      });
    }
    lastResonanceRef.current = [...state.resonatingMaterialIds];
  }, [state.isResonating, state.resonatingMaterialIds, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const crucibleRadius = size * 0.32;
    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      time += 0.02;

      const materialColors = state.crucibleMaterials.map(rm => {
        const m = getMaterialById(rm.materialId);
        return m?.color || '#333333';
      });
      let liquidColor = mixColors(materialColors);
      const rgb = hexToRgb(liquidColor.startsWith('#') ? liquidColor : '#333333');

      if (state.isResonating) {
        const flicker = 0.5 + 0.5 * Math.sin(time * 8);
        liquidColor = `rgb(${Math.min(255, rgb.r + 30 * flicker)}, ${Math.min(255, rgb.g + 20 * flicker)}, ${Math.min(255, rgb.b + 10 * flicker)})`;
      }

      if (state.crucibleMaterials.length > 0) {
        const grad = ctx.createRadialGradient(centerX, centerY + 10, 10, centerX, centerY + 10, crucibleRadius);
        grad.addColorStop(0, liquidColor);
        grad.addColorStop(1, `rgba(${rgb.r * 0.5}, ${rgb.g * 0.5}, ${rgb.b * 0.5}, 0.9)`);
        ctx.beginPath();
        ctx.arc(centerX, centerY, crucibleRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        if (state.stirSpeed > 0 || state.temperature > 30) {
          for (let i = 0; i < 5; i++) {
            const angle = time * (state.stirSpeed * 0.5 + 1) + (i * Math.PI * 2) / 5;
            const r = crucibleRadius * 0.6 * (0.5 + 0.5 * Math.sin(time * 3 + i));
            const bx = centerX + Math.cos(angle) * r;
            const by = centerY + Math.sin(angle) * r * 0.8;
            ctx.beginPath();
            ctx.arc(bx, by, 4 + Math.sin(time * 2 + i) * 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + 0.2 * Math.sin(time * 3 + i)})`;
            ctx.fill();
          }
        }

        if (Math.random() < (state.temperature / 200) + (state.stirSpeed / 30)) {
          const mat = getMaterialById(state.crucibleMaterials[Math.floor(Math.random() * state.crucibleMaterials.length)].materialId);
          if (mat) particlesRef.current.push(...createBubbleParticles(centerX, centerY, mat.color, 1));
        }

        if (state.isResonating) {
          ctx.strokeStyle = `rgba(255, 215, 0, ${0.6 + 0.4 * Math.sin(time * 6)})`;
          ctx.lineWidth = 3;
          for (let ring = 0; ring < 3; ring++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, crucibleRadius * (0.3 + ring * 0.25) + Math.sin(time * 4 + ring) * 5, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        if (state.synthesisResult === 'success') {
          ctx.save();
          ctx.translate(centerX, centerY);
          for (let i = 0; i < 6; i++) {
            ctx.rotate(Math.PI / 3);
            ctx.beginPath();
            ctx.moveTo(0, -crucibleRadius * 0.7);
            ctx.lineTo(8, 0);
            ctx.lineTo(-8, 0);
            ctx.closePath();
            ctx.fillStyle = `rgba(255, 215, 0, ${0.4 + 0.3 * Math.sin(time * 5 + i)})`;
            ctx.fill();
          }
          ctx.restore();
        }
      } else {
        ctx.beginPath();
        ctx.arc(centerX, centerY, crucibleRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
      }

      particlesRef.current = updateParticles(particlesRef.current);
      particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        if (p.type === 'smoke') {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          const srgb = hexToRgb(p.color);
          ctx.fillStyle = `rgba(${srgb.r}, ${srgb.g}, ${srgb.b}, ${p.alpha * 0.6})`;
        } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
        }
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [size, state.crucibleMaterials, state.isResonating, state.stirSpeed, state.temperature, state.synthesisResult]);

  const crucibleRadius = size * 0.32;

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="absolute top-0 left-0"
      >
        <defs>
          <radialGradient id="forgeGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b4513" />
            <stop offset="50%" stopColor="#5c2a2a" />
            <stop offset="100%" stopColor="#1e1e1e" />
          </radialGradient>
          <linearGradient id="copperRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8a860" />
            <stop offset="50%" stopColor="#cd7f32" />
            <stop offset="100%" stopColor="#8b5a2b" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 5} fill="url(#forgeGradient)" />
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 10} fill="none" stroke="url(#copperRim)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={crucibleRadius + 20} fill="none" stroke="#cd7f32" strokeWidth="4" opacity="0.6" />
        <g transform={`translate(${size / 2}, ${size / 2})`} opacity="0.3">
          {[0, 1, 2, 3, 4, 5].map(i => {
            const angle = (i * Math.PI) / 3;
            const x = Math.cos(angle) * (crucibleRadius + 5);
            const y = Math.sin(angle) * (crucibleRadius + 5);
            return <line key={i} x1="0" y1="0" x2={x} y2={y} stroke="#cd7f32" strokeWidth="2" />;
          })}
          {[0, 1, 2, 3, 4, 5].map(i => {
            const angle1 = (i * Math.PI) / 3;
            const angle2 = ((i + 1) * Math.PI) / 3;
            const x1 = Math.cos(angle1) * (crucibleRadius + 5);
            const y1 = Math.sin(angle1) * (crucibleRadius + 5);
            const x2 = Math.cos(angle2) * (crucibleRadius + 5);
            const y2 = Math.sin(angle2) * (crucibleRadius + 5);
            return <line key={`l${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cd7f32" strokeWidth="2" />;
          })}
        </g>
        {state.isResonating && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={crucibleRadius + 15}
            fill="none"
            stroke="#ffd700"
            strokeWidth="3"
            opacity="0.8"
            filter="url(#glow)"
          />
        )}
      </svg>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ borderRadius: '50%' }}
      />
      {state.crucibleMaterials.map((rm, idx) => {
        const mat = getMaterialById(rm.materialId);
        if (!mat) return null;
        const posX = rm.position.x || (size / 2 + (idx - 1.5) * 50);
        const posY = rm.position.y || size / 2;
        return (
          <motion.div
            key={`${rm.materialId}-${idx}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute pointer-events-none"
            style={{
              left: posX - 15,
              top: posY - 15,
              width: 30,
              height: 30,
              backgroundColor: mat.color,
              borderRadius: mat.shape === 'circle' ? '50%' : mat.shape === 'square' ? '4px' : '0',
              transform: mat.shape === 'diamond' ? 'rotate(45deg)' : undefined,
              boxShadow: `0 0 10px ${mat.color}, inset 0 0 5px rgba(255,255,255,0.3)`,
              opacity: state.synthesisResult === 'idle' || state.synthesisResult === 'processing' ? 0.9 : 0.3
            }}
          />
        );
      })}
    </motion.div>
  );
};

export default Furnace;
