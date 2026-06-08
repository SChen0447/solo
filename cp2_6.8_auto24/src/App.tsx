import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FluidPhysics } from './physics';
import { FluidRenderer } from './renderer';
import { FluidType } from './types';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const physicsRef = useRef<FluidPhysics | null>(null);
  const rendererRef = useRef<FluidRenderer | null>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const [selectedType, setSelectedType] = useState<FluidType>(FluidType.WATER);
  const [gravityMultiplier, setGravityMultiplier] = useState<number>(1);
  const [particleCount, setParticleCount] = useState<number>(0);
  const [fps, setFps] = useState<number>(60);
  const [isPanelDragging, setIsPanelDragging] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ x: 20, y: 20 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [lastSpawnPos, setLastSpawnPos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const physics = new FluidPhysics();
    const renderer = new FluidRenderer(canvasRef.current);

    physicsRef.current = physics;
    rendererRef.current = renderer;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      physics.setSize(width, height);
      renderer.setSize(width, height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      physics.update(dt);
      renderer.render(physics.getParticles(), dt);

      setParticleCount(physics.getActiveCount());
      setFps(renderer.getFPS());

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    if (physicsRef.current) {
      physicsRef.current.config.gravity = 500 * gravityMultiplier;
    }
  }, [gravityMultiplier]);

  const spawnParticles = useCallback((x: number, y: number, vx: number = 0, vy: number = 0) => {
    if (!physicsRef.current) return;
    
    const count = 3;
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 10;
      const offsetY = (Math.random() - 0.5) * 10;
      physicsRef.current.addParticle(
        x + offsetX,
        y + offsetY,
        selectedType,
        vx * 0.5 + (Math.random() - 0.5) * 50,
        vy * 0.5 + (Math.random() - 0.5) * 50
      );
    }
  }, [selectedType]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      setIsMouseDown(true);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setLastSpawnPos({ x, y });
        setMousePos({ x, y });
      }
    } else if (e.button === 2) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && physicsRef.current) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const count = 20 + Math.floor(Math.random() * 31);
        physicsRef.current.addExplosion(x, y, count);
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    if (rendererRef.current && physicsRef.current) {
      const hovered = physicsRef.current.getParticleAt(x, y);
      rendererRef.current.setHoveredParticle(hovered);
      rendererRef.current.setMousePosition(x, y);
    }

    if (isMouseDown) {
      const dx = x - lastSpawnPos.x;
      const dy = y - lastSpawnPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        const vx = (dx / dist) * 200;
        const vy = (dy / dist) * 200;
        spawnParticles(x, y, vx, vy);
        setLastSpawnPos({ x, y });
      }
    }
  }, [isMouseDown, lastSpawnPos, spawnParticles]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      setIsMouseDown(true);
      setLastSpawnPos({ x, y });
      setMousePos({ x, y });
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setMousePos({ x, y });

    if (isMouseDown) {
      const dx = x - lastSpawnPos.x;
      const dy = y - lastSpawnPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        const vx = (dx / dist) * 200;
        const vy = (dy / dist) * 200;
        spawnParticles(x, y, vx, vy);
        setLastSpawnPos({ x, y });
      }
    }
  }, [isMouseDown, lastSpawnPos, spawnParticles]);

  const handleTouchEnd = useCallback(() => {
    setIsMouseDown(false);
  }, []);

  const handleReset = useCallback(() => {
    if (physicsRef.current) {
      physicsRef.current.reset();
    }
  }, []);

  const handlePanelMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || 
        (e.target as HTMLElement).tagName === 'INPUT') {
      return;
    }
    
    setIsPanelDragging(true);
    setDragOffset({
      x: e.clientX - panelPosition.x,
      y: e.clientY - panelPosition.y
    });
  }, [panelPosition]);

  const handlePanelMouseMove = useCallback((e: MouseEvent) => {
    if (isPanelDragging) {
      setPanelPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isPanelDragging, dragOffset]);

  const handlePanelMouseUp = useCallback(() => {
    setIsPanelDragging(false);
  }, []);

  useEffect(() => {
    if (isPanelDragging) {
      window.addEventListener('mousemove', handlePanelMouseMove);
      window.addEventListener('mouseup', handlePanelMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePanelMouseMove);
      window.removeEventListener('mouseup', handlePanelMouseUp);
    };
  }, [isPanelDragging, handlePanelMouseMove, handlePanelMouseUp]);

  const fluidTypes = [
    { type: FluidType.WATER, label: '水', color: '#4fc3f7' },
    { type: FluidType.OIL, label: '油', color: '#ffd54f' },
    { type: FluidType.MAGMA, label: '岩浆', color: '#ff5722' }
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'block',
          cursor: 'crosshair',
          touchAction: 'none'
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          padding: '12px 16px',
          background: 'rgba(0, 0, 0, 0.7)',
          border: '1px solid #00d4ff',
          borderRadius: 8,
          color: '#fff',
          fontSize: isMobile ? 12 : 14,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          zIndex: 100,
          pointerEvents: 'none',
          transition: 'all 150ms ease-out'
        }}
      >
        <div style={{ marginBottom: 6 }}>
          粒子数: <span style={{ color: '#00d4ff', fontWeight: 'bold' }}>{particleCount}</span>
        </div>
        <div>
          FPS: <span style={{ color: fps >= 50 ? '#4caf50' : fps >= 30 ? '#ff9800' : '#f44336', fontWeight: 'bold' }}>{fps}</span>
        </div>
      </div>

      <div
        onMouseDown={handlePanelMouseDown}
        style={{
          position: 'absolute',
          left: isMobile ? 10 : panelPosition.x,
          top: isMobile ? 'auto' : panelPosition.y,
          bottom: isMobile ? 10 : 'auto',
          right: isMobile ? 10 : 'auto',
          padding: isMobile ? 12 : 16,
          background: 'rgba(10, 10, 20, 0.85)',
          border: '1px solid #00d4ff',
          borderRadius: 12,
          color: '#fff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          zIndex: 100,
          cursor: isPanelDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          backdropFilter: 'blur(10px)',
          transition: 'all 150ms ease-out',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'column',
          gap: isMobile ? 10 : 12,
          minWidth: isMobile ? 'auto' : 220
        }}
      >
        <div
          style={{
            fontSize: isMobile ? 14 : 16,
            fontWeight: 'bold',
            color: '#00d4ff',
            marginBottom: isMobile ? 4 : 0,
            textAlign: isMobile ? 'center' : 'left',
            cursor: 'move'
          }}
        >
          控制面板
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            gap: isMobile ? 6 : 8
          }}
        >
          <span style={{ fontSize: isMobile ? 11 : 12, color: '#aaa' }}>粒子类型:</span>
          <div
            style={{
              display: 'flex',
              gap: 6,
              flex: 1
            }}
          >
            {fluidTypes.map(({ type, label, color }) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                style={{
                  flex: 1,
                  padding: isMobile ? '6px 8px' : '8px 12px',
                  fontSize: isMobile ? 11 : 13,
                  border: `2px solid ${color}`,
                  borderRadius: 6,
                  background: selectedType === type ? color : 'transparent',
                  color: selectedType === type ? '#000' : color,
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out',
                  fontWeight: selectedType === type ? 'bold' : 'normal'
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? 11 : 12 }}>
            <span style={{ color: '#aaa' }}>重力强度</span>
            <span style={{ color: '#00d4ff', fontWeight: 'bold' }}>{gravityMultiplier.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={gravityMultiplier}
            onChange={(e) => setGravityMultiplier(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: isMobile ? 4 : 6,
              borderRadius: 3,
              background: 'linear-gradient(to right, #4fc3f7, #ff5722)',
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>

        <button
          onClick={handleReset}
          style={{
            padding: isMobile ? '8px 16px' : '10px 20px',
            fontSize: isMobile ? 12 : 14,
            border: '2px solid #00d4ff',
            borderRadius: 6,
            background: 'transparent',
            color: '#00d4ff',
            cursor: 'pointer',
            transition: 'all 150ms ease-out',
            fontWeight: 'bold'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#00d4ff';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#00d4ff';
          }}
        >
          重置画布
        </button>

        {!isMobile && (
          <div
            style={{
              fontSize: 11,
              color: '#666',
              textAlign: 'center',
              marginTop: 4
            }}
          >
            左键拖拽生成粒子 | 右键爆炸
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
