import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AudioEngine, PRESET_TRACKS } from './audioEngine';
import { GameLoop } from './gameLoop';
import { Renderer } from './renderer';
import GameUI from './components/GameUI';
import { GameStatus, GameState } from './types';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentTrackId, setCurrentTrackId] = useState(PRESET_TRACKS[0].id);
  const [obstaclesPassed, setObstaclesPassed] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [isNarrow, setIsNarrow] = useState(false);

  const gameStateRef = useRef<GameState>('menu');
  const currentTrackIdRef = useRef<string>(PRESET_TRACKS[0].id);

  const handleResize = useCallback(() => {
    if (!canvasRef.current || !rendererRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    rendererRef.current.resize(width, height);

    const aspect = width / height;
    setIsNarrow(aspect < 4 / 3);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const audioEngine = new AudioEngine();
    const gameLoop = new GameLoop();
    const renderer = new Renderer(canvasRef.current);

    audioEngineRef.current = audioEngine;
    gameLoopRef.current = gameLoop;
    rendererRef.current = renderer;

    gameLoop.setOnStatusChange((status: GameStatus) => {
      if (status.state !== gameStateRef.current) {
        gameStateRef.current = status.state;
        setGameState(status.state);
      }
      setScore(status.gameData.score);
      setCombo(status.gameData.combo);
      setLives(status.gameData.lives);
      setObstaclesPassed(status.gameData.obstaclesPassed);
      setMaxCombo(status.gameData.maxCombo);
    });

    gameLoop.setOnGameOver(() => {
      audioEngine.pause();
    });

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioEngine.stop();
    };
  }, [handleResize]);

  const gameLoopFn = useCallback((timestamp: number) => {
    if (!audioEngineRef.current || !gameLoopRef.current || !rendererRef.current) {
      return;
    }

    const deltaTime = lastTimeRef.current > 0 ? (timestamp - lastTimeRef.current) / 1000 : 0;
    lastTimeRef.current = timestamp;

    const audioData = audioEngineRef.current.getRealtimeData();
    const currentTime = audioData.currentTime;
    const rhythmIntensity = audioData.rhythmIntensity;

    if (gameStateRef.current === 'playing') {
      gameLoopRef.current.update(deltaTime, currentTime, rhythmIntensity);
    }

    const status = gameLoopRef.current.getStatus();
    rendererRef.current.render(status, deltaTime, rhythmIntensity);

    animationFrameRef.current = requestAnimationFrame(gameLoopFn);
  }, []);

  const handleStart = useCallback(async () => {
    if (!audioEngineRef.current || !gameLoopRef.current) return;

    try {
      const analysis = await audioEngineRef.current.loadTrack(currentTrackIdRef.current);
      gameLoopRef.current.setBeatSchedule(analysis.beats);

      gameLoopRef.current.start();
      await audioEngineRef.current.play();

      lastTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(gameLoopFn);
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  }, [gameLoopFn]);

  const handlePause = useCallback(() => {
    if (!audioEngineRef.current || !gameLoopRef.current) return;
    audioEngineRef.current.pause();
    gameLoopRef.current.pause();
  }, []);

  const handleResume = useCallback(() => {
    if (!audioEngineRef.current || !gameLoopRef.current) return;
    audioEngineRef.current.resume();
    gameLoopRef.current.resume();
    lastTimeRef.current = 0;
  }, []);

  const handleRestart = useCallback(async () => {
    if (!audioEngineRef.current || !gameLoopRef.current) return;

    audioEngineRef.current.stop();
    gameLoopRef.current.reset();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    gameStateRef.current = 'menu';
    setGameState('menu');

    setTimeout(() => {
      handleStart();
    }, 100);
  }, [handleStart]);

  const handleTrackChange = useCallback((trackId: string) => {
    currentTrackIdRef.current = trackId;
    setCurrentTrackId(trackId);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameLoopRef.current) return;

      if (gameStateRef.current === 'playing') {
        switch (e.key) {
          case 'ArrowLeft':
          case 'a':
          case 'A':
            gameLoopRef.current.moveLeft();
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            gameLoopRef.current.moveRight();
            break;
          case 'ArrowUp':
          case 'w':
          case 'W':
          case ' ':
            e.preventDefault();
            gameLoopRef.current.jump();
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            gameLoopRef.current.slide();
            break;
          case 'Escape':
          case 'p':
          case 'P':
            handlePause();
            break;
        }
      } else if (gameStateRef.current === 'paused') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          handleResume();
        }
      } else if (gameStateRef.current === 'menu') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePause, handleResume, handleStart]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
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
      <GameUI
        gameState={gameState}
        score={score}
        combo={combo}
        lives={lives}
        tracks={PRESET_TRACKS}
        currentTrackId={currentTrackId}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onRestart={handleRestart}
        onTrackChange={handleTrackChange}
        obstaclesPassed={obstaclesPassed}
        maxCombo={maxCombo}
        isNarrow={isNarrow}
      />
    </div>
  );
};

export default App;
