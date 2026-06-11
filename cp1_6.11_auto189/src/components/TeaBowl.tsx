import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TeaType, TEA_INFO, blendTeaColor, hexToRgb } from '../store';

interface TeaBowlProps {
  teaType: TeaType | null;
  waterTemp: number;
  onTaste: () => void;
  showRipple: boolean;
  onRippleEnd: () => void;
}

const BOWL_SIZE = 220;
const INNER_SIZE = 180;

const TeaBowl: React.FC<TeaBowlProps> = ({ teaType, waterTemp, onTaste, showRipple, onRippleEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const shimmerPhaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = INNER_SIZE * dpr;
    canvas.height = INNER_SIZE * dpr;
    ctx.scale(dpr, dpr);

    let running = true;

    const draw = () => {
      if (!running || !ctx) return;
      ctx.clearRect(0, 0, INNER_SIZE, INNER_SIZE);

      if (teaType) {
        const info = TEA_INFO[teaType];
        const cx = INNER_SIZE / 2;
        const cy = INNER_SIZE / 2;
        const r = INNER_SIZE / 2 - 4;

        const grad = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, r);
        grad.addColorStop(0, info.gradientTo);
        grad.addColorStop(1, info.gradientFrom);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        shimmerPhaseRef.current += 0.035;
        const phase = shimmerPhaseRef.current;
        const shimmerX = cx + Math.cos(phase) * 30;
        const shimmerY = cy + Math.sin(phase * 0.7) * 20;
        const shimmerGrad = ctx.createRadialGradient(shimmerX, shimmerY, 5, shimmerX, shimmerY, 50);
        shimmerGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
        shimmerGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
        shimmerGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = shimmerGrad;
        ctx.fill();

        const shimmer2X = cx + Math.cos(phase * 1.3 + 2) * 25;
        const shimmer2Y = cy + Math.sin(phase * 0.5 + 1) * 25;
        const shimmer2 = ctx.createRadialGradient(shimmer2X, shimmer2Y, 3, shimmer2X, shimmer2Y, 35);
        shimmer2.addColorStop(0, 'rgba(255,255,255,0.15)');
        shimmer2.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = shimmer2;
        ctx.fill();
      } else {
        const cx = INNER_SIZE / 2;
        const cy = INNER_SIZE / 2;
        const r = INNER_SIZE / 2 - 4;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 195, 185, 0.15)';
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [teaType, waterTemp]);

  const blendedColor = teaType ? blendTeaColor(teaType, waterTemp) : '#c8c3b9';
  const rgbStr = teaType ? hexToRgb(blendedColor) : '200, 195, 185';

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          width: BOWL_SIZE,
          height: BOWL_SIZE,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 35% 25%, #5a504a, #2a2320 70%, #1a1512)',
          boxShadow: `
            0 8px 32px rgba(0,0,0,0.35),
            inset 0 2px 8px rgba(255,255,255,0.08),
            inset 0 -4px 12px rgba(0,0,0,0.4)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: INNER_SIZE,
            height: INNER_SIZE,
            borderRadius: '50%',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: INNER_SIZE,
              height: INNER_SIZE,
              borderRadius: '50%',
            }}
          />

          <AnimatePresence>
            {showRipple && (
              <>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={`ripple-${i}`}
                    initial={{ scale: 0, opacity: 0.7 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ duration: 1.5, delay: i * 0.3, ease: 'easeOut' }}
                    onAnimationComplete={() => {
                      if (i === 2) onRippleEnd();
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: 60,
                      height: 60,
                      marginLeft: -30,
                      marginTop: -30,
                      borderRadius: '50%',
                      border: `2px solid rgba(${rgbStr}, 0.6)`,
                      pointerEvents: 'none',
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {teaType && (
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: '#6b5e4f',
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              background: blendedColor,
              border: '1px solid rgba(0,0,0,0.15)',
            }}
          />
          <span>{blendedColor}</span>
          <span style={{ color: '#9e9485' }}>rgb({rgbStr})</span>
        </div>
      )}

      {teaType && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onTaste}
          style={{
            marginTop: 16,
            padding: '10px 32px',
            background: 'linear-gradient(135deg, #5a4a3a, #3a2a1a)',
            color: '#f5f0e8',
            border: 'none',
            borderRadius: 24,
            fontSize: 15,
            fontFamily: "'Noto Serif JP', serif",
            cursor: 'pointer',
            letterSpacing: 4,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          }}
        >
          品 鑑
        </motion.button>
      )}
    </div>
  );
};

export default TeaBowl;
