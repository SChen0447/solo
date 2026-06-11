import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SpriteManager, EnvParams } from './SpriteManager';
import EnvControls from './EnvControls';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteManagerRef = useRef<SpriteManager | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const fpsRef = useRef<number[]>([]);

  const [env, setEnv] = useState<EnvParams>({
    temperature: 37.5,
    ph: 6.75,
    sulfide: 0.2
  });

  const [shrimpHealths, setShrimpHealths] = useState<number[]>([]);
  const [averageHealth, setAverageHealth] = useState<number>(0);
  const [symbiosisSuccess, setSymbiosisSuccess] = useState<boolean>(false);
  const [displayFps, setDisplayFps] = useState<number>(0);

  const envRef = useRef<EnvParams>(env);
  useEffect(() => {
    envRef.current = env;
  }, [env]);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a0f1c');
    gradient.addColorStop(0.3, '#0d1525');
    gradient.addColorStop(0.6, '#122542');
    gradient.addColorStop(1, '#1a3a5c');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % width;
      const y = (i * 97.3) % height;
      const size = 0.5 + (i % 3) * 0.5;
      const alpha = 0.1 + (i % 5) * 0.05;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100, 150, 200, ${alpha})`;
      ctx.fill();
    }

    for (let i = 0; i < 20; i++) {
      const x = (i * 211.7 + Date.now() * 0.01) % (width + 200) - 100;
      const y = (i * 173.9) % height;
      const particleSize = 2 + (i % 4);

      ctx.beginPath();
      ctx.arc(x, y, particleSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150, 200, 255, ${0.03 + (i % 3) * 0.02})`;
      ctx.fill();
    }
  }, []);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;

    if (spriteManagerRef.current) {
      spriteManagerRef.current.resize(width, height);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    handleResize();

    spriteManagerRef.current = new SpriteManager(canvas.width, canvas.height);
    spriteManagerRef.current.onSymbiosisSuccess = () => {
      setSymbiosisSuccess(true);
      setTimeout(() => setSymbiosisSuccess(false), 5000);
    };

    window.addEventListener('resize', handleResize);

    let stateUpdateCounter = 0;

    const animate = (currentTime: number) => {
      if (!spriteManagerRef.current || !ctx) return;

      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      if (deltaTime > 0) {
        fpsRef.current.push(1000 / deltaTime);
        if (fpsRef.current.length > 60) {
          fpsRef.current.shift();
        }
      }

      stateUpdateCounter++;
      if (stateUpdateCounter >= 15) {
        stateUpdateCounter = 0;
        const avgFps = fpsRef.current.length > 0
          ? fpsRef.current.reduce((a, b) => a + b, 0) / fpsRef.current.length
          : 0;
        setDisplayFps(Math.round(avgFps));

        if (spriteManagerRef.current) {
          setShrimpHealths(spriteManagerRef.current.getShrimpHealths());
          setAverageHealth(spriteManagerRef.current.getAverageHealth());
          const symbiosisStatus = spriteManagerRef.current.getSymbiosisStatus();
          if (symbiosisStatus.success && !symbiosisSuccess) {
            setSymbiosisSuccess(true);
          }
        }
      }

      drawBackground(ctx, canvas.width, canvas.height);

      spriteManagerRef.current.update(envRef.current);
      spriteManagerRef.current.draw(ctx, envRef.current);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawBackground, handleResize, symbiosisSuccess]);

  const handleEnvChange = (newEnv: EnvParams) => {
    setEnv(newEnv);
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden'
  };

  const canvasStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    height: '100%'
  };

  const fpsDisplayStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    left: '20px',
    padding: '10px 16px',
    background: 'rgba(26, 58, 92, 0.4)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 140, 0, 0.2)',
    color: displayFps >= 45 ? '#00e676' : displayFps >= 30 ? '#ffc107' : '#ff4444',
    fontSize: '13px',
    fontWeight: 600,
    zIndex: 100,
    fontFamily: 'monospace'
  };

  const titleStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    background: 'rgba(26, 58, 92, 0.3)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 140, 0, 0.2)',
    color: '#ff8c00',
    fontSize: '18px',
    fontWeight: 600,
    zIndex: 100,
    textShadow: '0 0 15px rgba(255, 140, 0, 0.5)',
    letterSpacing: '2px'
  };

  return (
    <div style={containerStyle}>
      <canvas
        ref={canvasRef}
        style={canvasStyle}
      />

      <div style={titleStyle}>
        🌊 深海热液喷口 - 盲虾共生生态模拟
      </div>

      <div style={fpsDisplayStyle}>
        FPS: {displayFps}
      </div>

      <EnvControls
        env={env}
        onEnvChange={handleEnvChange}
        shrimpHealths={shrimpHealths}
        averageHealth={averageHealth}
        symbiosisSuccess={symbiosisSuccess}
      />
    </div>
  );
};

export default App;
