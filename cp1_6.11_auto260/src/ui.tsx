import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameVisualizer } from './visualizer';
import { initGameState, updateGame } from './game';
import type { GameState, InputState } from './types';

const glassStyle: React.CSSProperties = {
  background: 'rgba(62, 39, 35, 0.6)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: '#efebe9',
};

const buttonStyle: React.CSSProperties = {
  ...glassStyle,
  padding: '6px 14px',
  cursor: 'pointer',
  fontSize: '13px',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'box-shadow 0.2s',
};

function useGameLoop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const visualizerRef = useRef<GameVisualizer | null>(null);
  const inputRef = useRef<InputState>({
    keys: new Set(),
    mousePosition: { x: 0, y: 0 },
    rightClickPosition: null,
    scrollDelta: 0,
  });
  const lastTimeRef = useRef(0);
  const rafRef = useRef(0);
  const [score, setScore] = useState({ friendly: 0, enemy: 0 });
  const [zoom, setZoom] = useState(1.0);
  const [antCount, setAntCount] = useState({ friendly: 0, enemy: 0, player: 1 });
  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef(0);

  const gameLoop = useCallback((timestamp: number) => {
    const dt = Math.min(timestamp - lastTimeRef.current, 50);
    lastTimeRef.current = timestamp;

    frameCountRef.current++;
    fpsTimerRef.current += dt;
    if (fpsTimerRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / fpsTimerRef.current));
      frameCountRef.current = 0;
      fpsTimerRef.current = 0;
    }

    const state = gameRef.current;
    const viz = visualizerRef.current;
    if (!state || !viz) return;

    updateGame(state, inputRef.current, dt);
    inputRef.current.scrollDelta = 0;
    inputRef.current.rightClickPosition = null;

    viz.render(state);

    if (Math.floor(timestamp / 500) !== Math.floor((timestamp - dt) / 500)) {
      setScore({ ...state.score });
      setZoom(state.zoom);
      const fCount = state.ants.filter((a) => a.role === 'friendly').length;
      const eCount = state.ants.filter((a) => a.role === 'enemy').length;
      setAntCount({ friendly: fCount, enemy: eCount, player: 1 });
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const viz = new GameVisualizer(canvas);
    visualizerRef.current = viz;

    const handleResize = () => {
      viz.resize(window.innerWidth, window.innerHeight);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    gameRef.current = initGameState();

    const handleKeyDown = (e: KeyboardEvent) => {
      inputRef.current.keys.add(e.key);
      if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      inputRef.current.keys.delete(e.key);
    };
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      inputRef.current.scrollDelta += e.deltaY;
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      inputRef.current.rightClickPosition = { x: e.clientX, y: e.clientY };
    };
    const handleMouseMove = (e: MouseEvent) => {
      inputRef.current.mousePosition = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('mousemove', handleMouseMove);

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gameLoop]);

  const handleZoomIn = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.zoom = Math.min(2.0, gameRef.current.zoom + 0.1);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.zoom = Math.max(0.5, gameRef.current.zoom - 0.1);
    }
  }, []);

  const handleReset = useCallback(() => {
    gameRef.current = initGameState();
    visualizerRef.current?.resize(window.innerWidth, window.innerHeight);
  }, []);

  return {
    canvasRef,
    score,
    zoom,
    antCount,
    fps,
    handleZoomIn,
    handleZoomOut,
    handleReset,
  };
}

const GlassButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  style?: React.CSSProperties;
}> = ({ children, onClick, style }) => {
  return (
    <motion.button
      onClick={onClick}
      style={{ ...buttonStyle, ...style }}
      whileHover={{
        boxShadow: '0 0 4px #00e676',
      }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  );
};

const TopBar: React.FC<{
  score: { friendly: number; enemy: number };
  antCount: { friendly: number; enemy: number; player: number };
  fps: number;
  onReset: () => void;
}> = ({ score, antCount, fps, onReset }) => {
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        ...glassStyle,
        position: 'fixed',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        zIndex: 100,
        fontSize: '13px',
      }}
    >
      <span style={{ color: '#ffd54f' }}>
        🏠 我方: <strong>{score.friendly}</strong>
      </span>
      <span style={{ color: '#ef5350' }}>
        ⚔️ 敌方: <strong>{score.enemy}</strong>
      </span>
      <span style={{ color: '#a5d6a7' }}>🐜 友蚁: {antCount.friendly}</span>
      <span style={{ color: '#ef9a9a' }}>🔴 敌蚁: {antCount.enemy}</span>
      <span style={{ color: fps < 45 ? '#ef5350' : '#81c784' }}>FPS: {fps}</span>
      <GlassButton onClick={onReset} style={{ padding: '4px 10px', fontSize: '11px' }}>
        重置
      </GlassButton>
    </motion.div>
  );
};

const ZoomControls: React.FC<{
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}> = ({ zoom, onZoomIn, onZoomOut }) => {
  return (
    <motion.div
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
      style={{
        ...glassStyle,
        position: 'fixed',
        right: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        padding: '10px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        zIndex: 100,
      }}
    >
      <GlassButton onClick={onZoomIn} style={{ padding: '6px 10px' }}>＋</GlassButton>
      <motion.div
        key={zoom}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        style={{ fontSize: '11px', color: '#bcaaa4' }}
      >
        {zoom.toFixed(1)}x
      </motion.div>
      <GlassButton onClick={onZoomOut} style={{ padding: '6px 10px' }}>－</GlassButton>
    </motion.div>
  );
};

const StatusPanel: React.FC<{
  zoom: number;
  score: { friendly: number; enemy: number };
}> = ({ zoom, score }) => {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
      style={{
        ...glassStyle,
        position: 'fixed',
        bottom: 16,
        left: 16,
        padding: '12px 16px',
        zIndex: 100,
        fontSize: '12px',
        lineHeight: '1.8',
        minWidth: '180px',
      }}
    >
      <div style={{ color: '#bcaaa4', marginBottom: '4px', fontSize: '11px', letterSpacing: '1px' }}>操作指南</div>
      <div style={{ color: '#a1887f' }}>WASD — 移动工蚁</div>
      <div style={{ color: '#a1887f' }}>滚轮 — 缩放视野</div>
      <div style={{ color: '#a1887f' }}>右键 — 设置路标</div>
      <div style={{ marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
        <div style={{ color: '#4fc3f7' }}>● 友方信息素</div>
        <div style={{ color: '#ef5350' }}>● 敌方信息素</div>
        <div style={{ color: '#ce93d8' }}>● 冲突区域</div>
      </div>
    </motion.div>
  );
};

const MinimapLabel: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      style={{
        position: 'fixed',
        top: 10,
        left: 10,
        zIndex: 99,
        fontSize: '9px',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: '1px',
        pointerEvents: 'none',
      }}
    >
      信息素热力图
    </motion.div>
  );
};

export const App: React.FC = () => {
  const {
    canvasRef,
    score,
    zoom,
    antCount,
    fps,
    handleZoomIn,
    handleZoomOut,
    handleReset,
  } = useGameLoop();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#3e2723',
        cursor: 'crosshair',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
      <AnimatePresence>
        <TopBar score={score} antCount={antCount} fps={fps} onReset={handleReset} />
        <ZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
        <StatusPanel zoom={zoom} score={score} />
        <MinimapLabel />
      </AnimatePresence>
    </div>
  );
};
