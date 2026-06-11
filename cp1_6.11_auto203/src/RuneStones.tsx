import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RuneStone, SHICHEN } from './types';

interface RuneStonesProps {
  runes: RuneStone[];
  containerSize?: number;
  centerX?: number;
  centerY?: number;
  onRuneLit?: (index: number) => void;
}

const SHICHEN_SYMBOLS = ['⿰', '⿱', '⿲', '⿳', '⿴', '⿵', '⿶', '⿷', '⿸', '⿹', '⿺', '⿻'];
const SHICHEN_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const playBellSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // audio not supported
  }
};

const LightBeam: React.FC<{
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  visible: boolean;
}> = ({ startX, startY, endX, endY, visible }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    playBellSound();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const wobble = (Math.random() - 0.5) * 4;

      const grad = ctx.createLinearGradient(startX, startY, endX, endY);
      grad.addColorStop(0, `rgba(255, 215, 0, 0.9)`);
      grad.addColorStop(0.5, `rgba(201, 169, 110, 0.6)`);
      grad.addColorStop(1, `rgba(255, 215, 0, 0.3)`);

      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 15;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(startX + wobble, startY);
      const midX = (startX + endX) / 2 + wobble * 0.5;
      const midY = (startY + endY) / 2;
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 248, 200, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(startX + wobble * 0.5, startY);
      ctx.quadraticCurveTo(midX * 0.8, midY, endX, endY);
      ctx.stroke();
      ctx.restore();

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [visible, startX, startY, endX, endY]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      width={Math.abs(endX - startX) + 100}
      height={Math.abs(endY - startY) + 100}
      style={{
        position: 'absolute',
        left: Math.min(startX, endX) - 50,
        top: Math.min(startY, endY) - 50,
        pointerEvents: 'none',
        zIndex: 5
      }}
    />
  );
};

const RuneStoneItem: React.FC<{
  rune: RuneStone;
  index: number;
  posX: number;
  posY: number;
  centerX: number;
  centerY: number;
}> = ({ rune, index, posX, posY, centerX, centerY }) => {
  const litColor = '#c9a96e';
  const dimColor = '#4a4a4a';
  const currentColor = rune.isLit ? litColor : dimColor;
  const displaySymbol = SHICHEN_SYMBOLS[index] || SHICHEN[index]?.symbol || '◈';
  const displayName = SHICHEN_NAMES[index] || SHICHEN[index]?.name || `${index}`;

  return (
    <React.Fragment key={index}>
      <motion.div
        style={{
          position: 'absolute',
          left: posX - 28,
          top: posY - 40,
          width: 56,
          height: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3
        }}
        animate={{
          filter: rune.isLit ? 'drop-shadow(0 0 12px rgba(255,215,0,0.6))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
        }}
        transition={{ duration: 0.8 }}
      >
        <svg width="56" height="80" viewBox="0 0 56 80">
          <defs>
            <linearGradient id={`stone-grad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={rune.isLit ? '#e8d5a8' : '#5a5a5a'} />
              <stop offset="50%" stopColor={currentColor} />
              <stop offset="100%" stopColor={rune.isLit ? '#8b6914' : '#3a3a3a'} />
            </linearGradient>
          </defs>

          <motion.path
            d="M8 10 Q8 5 16 5 L40 5 Q48 5 48 10 L48 68 Q48 75 40 75 L28 75 L28 78 L28 75 L16 75 Q8 75 8 68 Z"
            fill={`url(#stone-grad-${index})`}
            stroke={rune.isLit ? '#ffd700' : '#2a2a2a'}
            strokeWidth={2}
            initial={{ fill: `url(#stone-grad-${index})` }}
            animate={{}}
            transition={{ duration: 0.8 }}
          />

          <path
            d="M12 12 L44 12 M12 70 L44 70"
            stroke={rune.isLit ? '#ffd700' : '#3a3a3a'}
            strokeWidth={1}
            opacity={0.6}
          />

          <text
            x="28"
            y="35"
            textAnchor="middle"
            fontSize="18"
            fill={rune.isLit ? '#fff8c8' : '#6a6a6a'}
            fontFamily="Georgia, serif"
            style={{ transition: 'fill 0.8s' }}
          >
            {displaySymbol}
          </text>
          <text
            x="28"
            y="58"
            textAnchor="middle"
            fontSize="14"
            fontWeight="bold"
            fill={rune.isLit ? '#fff8c8' : '#6a6a6a'}
            fontFamily="Georgia, serif"
            style={{ transition: 'fill 0.8s' }}
          >
            {displayName}
          </text>

          <circle cx="12" cy="12" r="2" fill={rune.isLit ? '#ffd700' : '#3a3a3a'} />
          <circle cx="44" cy="12" r="2" fill={rune.isLit ? '#ffd700' : '#3a3a3a'} />
          <circle cx="12" cy="68" r="2" fill={rune.isLit ? '#ffd700' : '#3a3a3a'} />
          <circle cx="44" cy="68" r="2" fill={rune.isLit ? '#ffd700' : '#3a3a3a'} />
        </svg>

        <AnimatePresence>
          {rune.isLit && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            >
              {[0, 1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  initial={{ y: 0, opacity: 0.8, scale: 0.5 }}
                  animate={{
                    y: -30 - i * 10,
                    opacity: 0,
                    scale: 0.2
                  }}
                  transition={{
                    duration: 1.2,
                    delay: i * 0.15,
                    repeat: Infinity,
                    repeatDelay: 0.5
                  }}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 10,
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: '#ffd700',
                    boxShadow: '0 0 6px #ffd700',
                    transform: 'translateX(-50%)'
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <LightBeam
        startX={posX}
        startY={posY - 40}
        endX={centerX}
        endY={centerY}
        visible={rune.isLit}
      />
    </React.Fragment>
  );
};

const RuneStones: React.FC<RuneStonesProps> = ({
  runes,
  containerSize = 500,
  centerX,
  centerY,
  onRuneLit
}) => {
  const cx = centerX ?? containerSize / 2;
  const cy = centerY ?? containerSize / 2;
  const radius = containerSize / 2 - 30;

  useEffect(() => {
    runes.forEach(r => {
      if (r.isLit && onRuneLit) {
        onRuneLit(r.index);
      }
    });
  }, [runes, onRuneLit]);

  return (
    <div
      style={{
        position: 'absolute',
        width: containerSize,
        height: containerSize,
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 2
      }}
    >
      {runes.map((rune, index) => {
        const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
        const posX = cx + Math.cos(angle) * radius;
        const posY = cy + Math.sin(angle) * radius;

        return (
          <RuneStoneItem
            key={index}
            rune={rune}
            index={index}
            posX={posX}
            posY={posY}
            centerX={cx}
            centerY={cy}
          />
        );
      })}
    </div>
  );
};

export default RuneStones;
