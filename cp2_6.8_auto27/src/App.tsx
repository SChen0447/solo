import { useEffect, useRef, useState, useCallback } from 'react';
import { GameCore, type BeatPhase } from './core';
import { GameLogic, GAME_CONFIG } from './game';
import { GameRenderer } from './renderer';
import './App.css';

type Screen = 'welcome' | 'playing' | 'gameover';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameCoreRef = useRef<GameCore | null>(null);
  const gameLogicRef = useRef<GameLogic | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const animationFrameRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [screen, setScreen] = useState<Screen>('welcome');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [bpm, setBpm] = useState(100);

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 360, height: 640 });

  const beatPhaseRef = useRef<BeatPhase | null>(null);
  const lastBeatIndexRef = useRef<number>(-1);

  useEffect(() => {
    const updateSize = () => {
      const container = gameContainerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const aspectRatio = 9 / 16;
      let width = containerWidth;
      let height = width / aspectRatio;

      if (height > containerHeight) {
        height = containerHeight;
        width = height * aspectRatio;
      }

      setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    gameCoreRef.current = new GameCore();
    gameLogicRef.current = new GameLogic();

    gameCoreRef.current.setCallbacks({
      onBeat: (beatIndex) => {
        if (gameLogicRef.current && beatPhaseRef.current) {
          gameLogicRef.current.spawnObstacleIfNeeded(
            beatIndex,
            gameCoreRef.current!.getBeatTimes()
          );
        }
      },
    });

    return () => {
      if (gameCoreRef.current) {
        gameCoreRef.current.destroy();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new GameRenderer(canvasRef.current);
      rendererRef.current.resize(canvasSize.width, canvasSize.height);
    }
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.resize(canvasSize.width, canvasSize.height);
    }
  }, [canvasSize]);

  const startGame = useCallback(() => {
    if (!gameCoreRef.current || !gameLogicRef.current || !rendererRef.current) return;

    gameLogicRef.current.reset();
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setMissCount(0);
    setScreen('playing');

    gameCoreRef.current.start();

    const gameLoop = () => {
      if (!gameCoreRef.current || !gameLogicRef.current || !rendererRef.current) return;

      const phase = gameCoreRef.current.getBeatPhase();
      beatPhaseRef.current = phase;

      const deltaTime = 1 / 60;

      gameLogicRef.current.update(deltaTime, phase, gameCoreRef.current.getBeatTimes());

      const gameState = gameLogicRef.current.getGameState();
      if (gameState.isGameOver) {
        setScreen('gameover');
        setScore(gameState.score);
        setMaxCombo(gameState.maxCombo);
        gameCoreRef.current.stop();
        return;
      }

      if (gameState.score !== score) {
        setScore(gameState.score);
      }
      if (gameState.combo !== combo) {
        setCombo(gameState.combo);
      }
      if (gameState.maxCombo !== maxCombo) {
        setMaxCombo(gameState.maxCombo);
      }
      if (gameState.missCount !== missCount) {
        setMissCount(gameState.missCount);
      }

      const judgement = gameLogicRef.current.getLastJudgement();
      if (judgement.type) {
        rendererRef.current.setJudgementStartTime(performance.now());
      }

      rendererRef.current.clear();
      rendererRef.current.drawBackground();
      rendererRef.current.drawTrack(gameLogicRef.current.getTrackOffset());
      rendererRef.current.drawObstacles(gameLogicRef.current.getObstacles());
      rendererRef.current.drawPlayer(gameLogicRef.current.getPlayer());
      rendererRef.current.drawHUD(
        gameState.score,
        gameState.combo,
        gameCoreRef.current.getBeatFlashIntensity()
      );
      rendererRef.current.drawJudgement(judgement);
      rendererRef.current.drawComboPopups(gameLogicRef.current.getComboPopups());

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [score, combo, maxCombo, missCount]);

  useEffect(() => {
    if (screen === 'welcome' && rendererRef.current) {
      rendererRef.current.drawStartScreen();
    }
  }, [screen]);

  useEffect(() => {
    if (screen === 'gameover' && rendererRef.current && gameLogicRef.current) {
      const gs = gameLogicRef.current.getGameState();
      rendererRef.current.drawGameOver(gs.score, gs.maxCombo);
    }
  }, [screen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'playing' || !gameLogicRef.current) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        gameLogicRef.current.setKeyState('space', true);
      } else if (e.code === 'ArrowDown' || e.key === 'ArrowDown') {
        e.preventDefault();
        gameLogicRef.current.setKeyState('down', true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!gameLogicRef.current) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        gameLogicRef.current.setKeyState('space', false);
      } else if (e.code === 'ArrowDown' || e.key === 'ArrowDown') {
        e.preventDefault();
        gameLogicRef.current.setKeyState('down', false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [screen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !gameCoreRef.current) return;

    setIsLoading(true);
    setFileName(file.name);

    try {
      await gameCoreRef.current.loadAudioFromFile(file);
      setBpm(gameCoreRef.current.getBpm());
    } catch (error) {
      console.error('Failed to load audio:', error);
      alert('音频加载失败，请尝试其他文件');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDemo = () => {
    if (!gameCoreRef.current) return;
    gameCoreRef.current.loadDemoTrack();
    setFileName('Demo Track (100 BPM)');
    setBpm(100);
  };

  const handleStart = () => {
    if (!gameCoreRef.current) return;

    const state = gameCoreRef.current.getState();
    if (state === 'idle') {
      loadDemo();
    }

    setTimeout(() => {
      startGame();
    }, 100);
  };

  const handleRestart = () => {
    setScreen('welcome');
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (gameCoreRef.current) {
      gameCoreRef.current.stop();
    }
  };

  const handleJumpStart = () => {
    if (screen === 'playing' && gameLogicRef.current) {
      gameLogicRef.current.setKeyState('space', true);
    }
  };

  const handleJumpEnd = () => {
    if (gameLogicRef.current) {
      gameLogicRef.current.setKeyState('space', false);
    }
  };

  const handleSlideStart = () => {
    if (screen === 'playing' && gameLogicRef.current) {
      gameLogicRef.current.setKeyState('down', true);
    }
  };

  const handleSlideEnd = () => {
    if (gameLogicRef.current) {
      gameLogicRef.current.setKeyState('down', false);
    }
  };

  return (
    <div className="app-container">
      <div className="game-wrapper" ref={gameContainerRef}>
        <div className="game-container" style={{ width: canvasSize.width, height: canvasSize.height }}>
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="game-canvas"
          />

          {screen === 'welcome' && (
            <div className="welcome-overlay">
              <div className="welcome-content">
                <h1 className="game-title">节奏跑酷</h1>
                <p className="game-subtitle">RHYTHM RUNNER</p>

                <div className="instructions">
                  <p>空格 / 跳跃键 = 跳跃（可二段跳）</p>
                  <p>↓ / 滑铲键 = 滑铲</p>
                  <p>跟随节拍躲避障碍物！</p>
                </div>

                {fileName && (
                  <div className="file-info">
                    <span className="file-name">{fileName}</span>
                    <span className="bpm-info">BPM: {bpm}</span>
                  </div>
                )}

                <div className="button-group">
                  <button className="btn btn-primary" onClick={handleStart} disabled={isLoading}>
                    {isLoading ? '加载中...' : '开始游戏'}
                  </button>
                  <label className="btn btn-secondary">
                    上传音乐
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,.mp3"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button className="btn btn-secondary" onClick={loadDemo}>
                    使用Demo
                  </button>
                </div>
              </div>
            </div>
          )}

          {screen === 'gameover' && (
            <div className="gameover-overlay" onClick={handleRestart}>
              <div className="gameover-content">
                <h2 className="gameover-title">游戏结束</h2>
                <div className="final-stats">
                  <div className="stat-item">
                    <span className="stat-label">得分</span>
                    <span className="stat-value">{score}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">最大连击</span>
                    <span className="stat-value">{maxCombo}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Miss次数</span>
                    <span className="stat-value">{missCount}</span>
                  </div>
                </div>
                <button className="btn btn-primary restart-btn" onClick={handleRestart}>
                  重新开始
                </button>
              </div>
            </div>
          )}
        </div>

        {screen === 'playing' && (
          <div className="mobile-controls">
            <button
              className="control-btn jump-btn"
              onTouchStart={handleJumpStart}
              onTouchEnd={handleJumpEnd}
              onMouseDown={handleJumpStart}
              onMouseUp={handleJumpEnd}
              onMouseLeave={handleJumpEnd}
            >
              跳跃
            </button>
            <button
              className="control-btn slide-btn"
              onTouchStart={handleSlideStart}
              onTouchEnd={handleSlideEnd}
              onMouseDown={handleSlideStart}
              onMouseUp={handleSlideEnd}
              onMouseLeave={handleSlideEnd}
            >
              滑铲
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
