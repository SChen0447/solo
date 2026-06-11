import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RingLevel } from '../hooks/useGameState';

interface UIPanelProps {
  levels: RingLevel[];
  currentLevelIndex: number;
  progress: number;
  remainingNodes: number;
  isCrownWithered: boolean;
  onReset: () => void;
  onSwitchLevel: (index: number) => void;
}

const glassStyle: React.CSSProperties = {
  background: 'rgba(27,59,27,0.55)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius: 12,
  border: '1px solid rgba(102,187,106,0.2)',
};

const ResetButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const audioRef = useRef<AudioContext | null>(null);

  const handleClick = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new AudioContext();
      }
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // audio not available
    }
    onClick();
  }, [onClick]);

  return (
    <motion.button
      onClick={handleClick}
      style={{
        ...glassStyle,
        padding: '10px 24px',
        color: '#e0f2f1',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(128,203,196,0.3)',
        letterSpacing: 1,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(128,203,196,0.3), transparent)',
          opacity: 0,
          transition: 'opacity 0.3s',
        }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>✦ 重置</span>
    </motion.button>
  );
};

const MiniMap: React.FC<{
  levels: RingLevel[];
  currentLevelIndex: number;
}> = ({ levels, currentLevelIndex }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(27,59,27,0.8)';
    ctx.fillRect(0, 0, w, h);

    const level = levels[currentLevelIndex];
    if (!level) return;

    const scale = Math.min(w, h) / (level.diameter + 120);
    const ox = w / 2;
    const oy = h / 2;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    const r = level.diameter / 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(215,204,200,0.4)';
    ctx.lineWidth = 2 / scale;
    ctx.stroke();

    for (const node of level.nodes) {
      const nx = node.x - (level.diameter / 2 + (640 - level.diameter / 2));
      const ny = node.y - 360;
      ctx.beginPath();
      ctx.arc(nx, ny, 2 / scale, 0, Math.PI * 2);
      ctx.fillStyle = node.connected ? '#81c784' : '#4fc3f7';
      ctx.fill();
    }

    for (const path of level.vinePaths) {
      const node = level.nodes.find((n) => n.id === path.fromNodeId);
      if (!node) continue;
      const nx = node.x - (level.diameter / 2 + (640 - level.diameter / 2));
      const ny = node.y - 360;
      const cpx = path.controlPoints[0].x - (level.diameter / 2 + (640 - level.diameter / 2));
      const cpy = path.controlPoints[0].y - 360;
      const epx = path.endPoint.x - (level.diameter / 2 + (640 - level.diameter / 2));
      const epy = path.endPoint.y - 360;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.quadraticCurveTo(cpx, cpy, epx, epy);
      ctx.strokeStyle = 'rgba(102,187,106,0.6)';
      ctx.lineWidth = 1 / scale;
      ctx.stroke();
    }

    ctx.restore();
  }, [levels, currentLevelIndex]);

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={120}
      style={{
        width: '100%',
        borderRadius: 8,
        border: '1px solid rgba(102,187,106,0.15)',
      }}
    />
  );
};

const UIPanel: React.FC<UIPanelProps> = ({
  levels,
  currentLevelIndex,
  progress,
  remainingNodes,
  isCrownWithered,
  onReset,
  onSwitchLevel,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const progressColor = `rgb(${Math.round(244 - clampedProgress * 1.8)},${Math.round(67 + clampedProgress * 1.4)},${Math.round(54 + clampedProgress * 0.3)})`;

  return (
    <div
      style={{
        width: 260,
        minWidth: 220,
        height: '100%',
        background: 'rgba(27,59,27,0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderLeft: '1px solid rgba(102,187,106,0.15)',
        display: 'flex',
        flexDirection: 'column',
        padding: 20,
        gap: 16,
        color: '#c8e6c9',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        overflowY: 'auto',
      }}
    >
      <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#a5d6a7', letterSpacing: 2 }}>
        古树年轮 · 水脉追踪
      </div>

      <div style={glassStyle}>
        <div style={{ padding: '10px 14px', fontSize: 12, color: '#a5d6a7' }}>
          年轮选择
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '0 12px 12px' }}>
          {levels.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => onSwitchLevel(i)}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                color: i === currentLevelIndex ? '#1b3b1b' : '#a5d6a7',
                background:
                  i === currentLevelIndex
                    ? 'linear-gradient(135deg, #66bb6a, #ffd54f)'
                    : 'rgba(102,187,106,0.15)',
                transition: 'all 0.3s',
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              {i + 1}
            </motion.button>
          ))}
        </div>
      </div>

      <div style={glassStyle}>
        <div style={{ padding: '12px 14px', fontSize: 12, color: '#a5d6a7' }}>
          完成度
        </div>
        <div style={{ padding: '0 14px 12px' }}>
          <div
            style={{
              width: '100%',
              height: 10,
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 5,
              overflow: 'hidden',
            }}
          >
            <motion.div
              style={{
                height: '100%',
                borderRadius: 5,
                background: `linear-gradient(90deg, #f44336, ${progressColor}, #4caf50)`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${clampedProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, marginTop: 4, color: '#81c784' }}>
            {clampedProgress.toFixed(1)}%
          </div>
        </div>
      </div>

      <div style={glassStyle}>
        <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#a5d6a7' }}>未连接节点</span>
          <AnimatePresence mode="popLayout">
            <motion.span
              key={remainingNodes}
              initial={{ scale: 1.4, color: '#ff8a65' }}
              animate={{ scale: 1, color: isCrownWithered ? '#ef5350' : '#e0f2f1' }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ fontSize: 22, fontWeight: 700 }}
            >
              {remainingNodes}
            </motion.span>
          </AnimatePresence>
        </div>
        {isCrownWithered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              padding: '4px 14px 10px',
              fontSize: 11,
              color: '#ef5350',
              fontWeight: 600,
            }}
          >
            ⚠ 树冠枯萎中！漏接超过2个节点
          </motion.div>
        )}
      </div>

      <div style={glassStyle}>
        <div style={{ padding: '10px 14px', fontSize: 12, color: '#a5d6a7' }}>
          小地图
        </div>
        <div style={{ padding: '0 12px 12px' }}>
          <MiniMap levels={levels} currentLevelIndex={currentLevelIndex} />
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <ResetButton onClick={onReset} />
      </div>
    </div>
  );
};

export default UIPanel;
