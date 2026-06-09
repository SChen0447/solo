import { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './GameEngine';
import { GameCanvas } from './components/GameCanvas';
import { ControlPanel } from './components/ControlPanel';
import { GameOverOverlay } from './components/GameOverOverlay';
import { GameState, DEFAULT_CONFIG } from './types';
import { Renderer } from './Renderer';
import './App.css';

function App() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [speed, setSpeed] = useState(1);
  const [killedCount, setKilledCount] = useState(0);
  const [towersDeployed, setTowersDeployed] = useState(false);
  const rendererRef = useRef<Renderer | null>(null);

  useEffect(() => {
    const gameEngine = new GameEngine(DEFAULT_CONFIG);

    gameEngine.setCallbacks({
      onStateChange: (state) => {
        setGameState(state);
        if (state === 'victory' && rendererRef.current) {
          const centerX = DEFAULT_CONFIG.canvasWidth / 2;
          const centerY = DEFAULT_CONFIG.canvasHeight / 2;
          gameEngine.projectileManager.createVictoryParticles(centerX, centerY);
        }
      },
      onScoreChange: (killed) => {
        setKilledCount(killed);
      }
    });

    setEngine(gameEngine);

    return () => {
      gameEngine.reset();
    };
  }, []);

  const handleRendererReady = useCallback((renderer: Renderer) => {
    rendererRef.current = renderer;
  }, []);

  const handleStart = useCallback(() => {
    if (!engine) return;
    engine.start();
  }, [engine]);

  const handlePause = useCallback(() => {
    if (!engine) return;
    engine.pause();
  }, [engine]);

  const handleResume = useCallback(() => {
    if (!engine) return;
    engine.resume();
  }, [engine]);

  const handleReset = useCallback(() => {
    if (!engine) return;
    engine.reset();
    setGameState('idle');
    setKilledCount(0);
    setTowersDeployed(false);
    setSpeed(1);
  }, [engine]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    if (engine) {
      engine.setSpeedMultiplier(newSpeed);
    }
  }, [engine]);

  const handleDeployTowers = useCallback(() => {
    if (!engine || towersDeployed) return;

    const towerPositions = [
      { x: 150, y: 300 },
      { x: 350, y: 280 },
      { x: 550, y: 320 }
    ];

    towerPositions.forEach(pos => {
      const tower = engine.createTower(pos.x, pos.y);
      engine.placeTower(tower.id);
    });

    setTowersDeployed(true);
  }, [engine, towersDeployed]);

  const handleRestart = useCallback(() => {
    handleReset();
  }, [handleReset]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">战略塔防</h1>
        <p className="app-subtitle">炮塔瞄准与弹道模拟系统</p>
      </header>

      <main className="app-main">
        <div className="game-area">
          <GameCanvas engine={engine} onRendererReady={handleRendererReady} />
          <GameOverOverlay
            gameState={gameState === 'victory' || gameState === 'defeat' ? gameState : null}
            onRestart={handleRestart}
          />
        </div>

        <ControlPanel
          gameState={gameState}
          speed={speed}
          killedCount={killedCount}
          totalMonsters={DEFAULT_CONFIG.totalMonsters}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onReset={handleReset}
          onSpeedChange={handleSpeedChange}
          onDeployTowers={handleDeployTowers}
          towersDeployed={towersDeployed}
        />
      </main>

      <footer className="app-footer">
        <p>使用 Canvas 2D 渲染 · 60FPS 流畅体验</p>
      </footer>
    </div>
  );
}

export default App;
