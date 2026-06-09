import { useEffect, useRef, useState, useCallback } from 'react';
import { MazeGenerator, MazeMode } from './mazeGenerator';
import { GameLoop, GameState } from './GameLoop';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;
const MAZE_COLUMNS = 15;
const MAZE_ROWS = 25;

interface RippleState {
  active: boolean;
  mode: MazeMode;
  startTime: number;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  const mazeGeneratorRef = useRef<MazeGenerator | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [ripple, setRipple] = useState<RippleState | null>(null);
  const [pulseIndicator, setPulseIndicator] = useState(false);
  const [rippleProgress, setRippleProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const mazeGenerator = new MazeGenerator(MAZE_COLUMNS, MAZE_ROWS);
    mazeGeneratorRef.current = mazeGenerator;

    const cellSize = CANVAS_WIDTH / MAZE_COLUMNS;

    const gameLoop = new GameLoop(canvas, mazeGenerator, {
      onGameStateChange: (state) => {
        setGameState({ ...state });
      },
      onRender: () => {
      },
      onModeChange: (mode) => {
        setRipple({
          active: true,
          mode,
          startTime: performance.now()
        });
        setRippleProgress(0);
      }
    });

    gameLoop.setCellSize(cellSize);
    gameLoop.setCanvasHeight(CANVAS_HEIGHT);
    gameLoopRef.current = gameLoop;

    setGameState({ ...gameLoop.gameState });

    gameLoop.start();

    return () => {
      gameLoop.stop();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!ripple?.active) return;

    let lastTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - ripple.startTime;
      const progress = Math.min(1, elapsed / 1000);
      setRippleProgress(progress);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setRipple(null);
        setRippleProgress(0);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [ripple]);

  const handleCanvasClick = useCallback(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.handleClick();

      setPulseIndicator(true);
      setTimeout(() => setPulseIndicator(false), 100);
    }
  }, []);

  const getModeText = (mode: MazeMode): string => {
    switch (mode) {
      case 'fast': return '快速模式';
      case 'slow': return '慢速模式';
      default: return '正常模式';
    }
  };

  const getModeColor = (mode: MazeMode): string => {
    switch (mode) {
      case 'fast': return '#ff4444';
      case 'slow': return '#4488ff';
      default: return '#00ff99';
    }
  };

  const getRippleStyle = (): React.CSSProperties => {
    if (!ripple) return { display: 'none' };

    const progress = rippleProgress;
    const opacity = (1 - progress) * 0.8;
    const scale = 0.2 + progress * 1.2;
    const color = getModeColor(ripple.mode);

    return {
      opacity,
      transform: `translate(-50%, -50%) scale(${scale})`,
      borderColor: color,
      boxShadow: `0 0 40px 15px ${color}60, 0 0 80px 30px ${color}30, inset 0 0 20px 5px ${color}40`
    };
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h1 className="game-title">节奏迷宫跑酷</h1>
      </div>

      <div className="game-main">
        <div className="status-panel">
          <div className="status-item">
            <span className="status-label">模式</span>
            <span
              className="status-value mode-value"
              style={{ color: gameState ? getModeColor(gameState.mode) : '#00ff99' }}
            >
              {gameState ? getModeText(gameState.mode) : '正常模式'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">距离</span>
            <span className="status-value">{gameState?.distance || 0} 格</span>
          </div>
          <div className="status-item">
            <span className="status-label">关卡</span>
            <span className="status-value">{gameState?.level || 1}</span>
          </div>
          <div className="status-item">
            <span className="status-label">BPM</span>
            <span className="status-value">{gameState?.bpm || 120}</span>
          </div>
        </div>

        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            className="game-canvas"
            onClick={handleCanvasClick}
          />
          <div className="ripple-overlay" style={getRippleStyle()}>
          </div>

          <div className={`pulse-indicator ${pulseIndicator ? 'active' : ''}`}>
            <div className="pulse-ring"></div>
            <div className="pulse-core"></div>
          </div>
        </div>
      </div>

      <div className="game-footer">
        <p className="hint-text">点击鼠标控制迷宫节奏 · 快速点击生成弯道 · 慢速点击生成直道</p>
      </div>

      {gameState?.gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            <h2 className="game-over-title">游戏结束</h2>
            <p className="game-over-score">距离: {gameState.distance} 格</p>
            <p className="game-over-level">关卡: {gameState.level}</p>
            <p className="game-over-hint">角色将自动重置...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
