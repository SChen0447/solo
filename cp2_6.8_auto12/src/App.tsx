import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import type { GameState } from './game/types';
import ControlPanel from './ui/ControlPanel';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;
const MIN_CANVAS_WIDTH = 1024;

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 20,
    wave: 0,
    isPlaying: false,
    isGameOver: false,
    speed: 1,
    totalKills: 0,
    highestDamage: 0,
    currentCurvature: 0,
  });
  const [speedPulse, setSpeedPulse] = useState(false);
  const [scale, setScale] = useState(1);

  const handleStateChange = useCallback((state: GameState) => {
    setGameState(state);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const engine = new GameEngine(canvas, {
      onStateChange: handleStateChange,
    });
    gameEngineRef.current = engine;

    engine.start();

    return () => {
      engine.destroy();
      gameEngineRef.current = null;
    };
  }, [handleStateChange]);

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const availableWidth = windowWidth - 160;

      if (availableWidth < MIN_CANVAS_WIDTH) {
        const newScale = Math.max(0.5, availableWidth / CANVAS_WIDTH);
        setScale(newScale);
      } else {
        setScale(1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSpeedToggle = useCallback(() => {
    if (!gameEngineRef.current) return;

    const currentSpeed = gameEngineRef.current.getSpeed();
    const newSpeed = currentSpeed === 1 ? 2 : 1;
    gameEngineRef.current.setSpeed(newSpeed);

    setSpeedPulse(true);
    setTimeout(() => setSpeedPulse(false), 600);
  }, []);

  const handleReset = useCallback(() => {
    if (!gameEngineRef.current) return;
    gameEngineRef.current.reset();
  }, []);

  const handleRestart = useCallback(() => {
    if (!gameEngineRef.current) return;
    gameEngineRef.current.reset();
  }, []);

  return (
    <div className="app-container">
      <ControlPanel
        gameState={gameState}
        onSpeedToggle={handleSpeedToggle}
        onReset={handleReset}
        speedPulse={speedPulse}
      />

      <div className="game-wrapper">
        <div
          className="canvas-container"
          style={{
            width: CANVAS_WIDTH * scale,
            height: CANVAS_HEIGHT * scale,
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: CANVAS_WIDTH * scale,
              height: CANVAS_HEIGHT * scale,
            }}
          />
        </div>
      </div>

      {gameState.isGameOver && (
        <div className="game-over-overlay">
          <div className="game-over-panel">
            <h2>游戏结束</h2>
            <div className="game-over-stats">
              <div className="stat-row">
                <span className="stat-label">总分数</span>
                <span className="stat-value">{gameState.score}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">杀敌数</span>
                <span className="stat-value">{gameState.totalKills}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">生存波数</span>
                <span className="stat-value">{gameState.wave}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">最高单次伤害</span>
                <span className="stat-value">{gameState.highestDamage}</span>
              </div>
            </div>
            <button onClick={handleRestart}>重新开始</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
