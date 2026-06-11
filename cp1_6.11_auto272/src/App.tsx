import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, KeyState } from './types';
import {
  createInitialGameState,
  updatePlayerPhysics,
  checkCheckpoints,
  spawnVortex,
  createTrailParticle,
  createCheckpointParticles,
  updateParticles,
  updateVortexes,
  clampCameraPhi,
  formatTime,
} from './GameLogic';
import GameScene from './GameScene';
import HUD from './HUD';

function App() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState());
  const keysRef = useRef<KeyState>({ w: false, s: false, a: false, d: false });
  const lastTimeRef = useRef<number>(performance.now());
  const lastVortexSpawnRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const gameStateRef = useRef(gameState);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [screenShakeKey, setScreenShakeKey] = useState(0);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const playBellSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.05);
    oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 's' || key === 'a' || key === 'd') {
        keysRef.current[key as keyof KeyState] = true;
        if (gameStateRef.current.startTime === null) {
          setGameState((prev) => ({ ...prev, startTime: Date.now() }));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 's' || key === 'a' || key === 'd') {
        keysRef.current[key as keyof KeyState] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = e.clientX - lastMousePosRef.current.x;
      const deltaY = e.clientY - lastMousePosRef.current.y;

      setGameState((prev) => ({
        ...prev,
        cameraAngle: {
          ...prev.cameraAngle,
          theta: prev.cameraAngle.theta - deltaX * 0.5,
          phi: clampCameraPhi(prev.cameraAngle.phi + deltaY * 0.3),
        },
      }));

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    let animationId: number;

    const gameLoop = () => {
      const currentTime = performance.now();
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      setGameState((prev) => {
        if (prev.isFinished) return prev;

        const { player: newPlayer, hitVortex } = updatePlayerPhysics(
          prev.player,
          keysRef.current,
          prev.airflows,
          prev.vortexes,
          deltaTime
        );

        const checkpointResult = checkCheckpoints(
          newPlayer,
          prev.checkpoints,
          prev.currentCheckpoint
        );

        let newCheckpoints = prev.checkpoints;
        let newParticles = [...prev.particles];
        let showFlash = false;
        let flashColor = '#00FF00';

        if (checkpointResult.passed && checkpointResult.checkpoint) {
          playBellSound();
          showFlash = true;
          newCheckpoints = prev.checkpoints.map((cp) =>
            cp.id === checkpointResult.checkpoint!.id ? { ...cp, passed: true } : cp
          );
          newParticles = [...newParticles, ...createCheckpointParticles(checkpointResult.checkpoint.position)];
        }

        if (hitVortex) {
          showFlash = true;
          flashColor = '#8B0000';
          setScreenShakeKey((k) => k + 1);
        }

        const now = Date.now();
        let newVortexes = updateVortexes(prev.vortexes);
        if (now - lastVortexSpawnRef.current > Math.random() * 2000 + 3000) {
          const newVortex = spawnVortex(prev.islands, newVortexes);
          if (newVortex) {
            newVortexes = [...newVortexes, newVortex];
          }
          lastVortexSpawnRef.current = now;
        }

        if (Math.random() < 0.6) {
          newParticles.push(createTrailParticle(newPlayer));
        }
        newParticles = updateParticles(newParticles, deltaTime);

        const isFinished = checkpointResult.newIndex >= prev.totalCheckpoints;
        const elapsedTime = prev.startTime !== null ? now - prev.startTime : 0;

        return {
          ...prev,
          player: newPlayer,
          checkpoints: newCheckpoints,
          currentCheckpoint: checkpointResult.newIndex,
          vortexes: newVortexes,
          particles: newParticles,
          elapsedTime,
          isFinished,
          showFlash,
          flashColor,
        };
      });

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [playBellSound]);

  const displayTime = gameState.startTime !== null ? formatTime(gameState.elapsedTime) : '00:00.000';

  return (
    <div className={`game-container ${gameState.screenShake || screenShakeKey > 0 ? 'screen-shake' : ''}`} key={screenShakeKey}>
      <GameScene gameState={gameState} />
      <HUD
        currentCheckpoint={gameState.currentCheckpoint}
        totalCheckpoints={gameState.totalCheckpoints}
        elapsedTime={displayTime}
        playerPosition={gameState.player.position}
        islands={gameState.islands}
        checkpoints={gameState.checkpoints}
        vortexes={gameState.vortexes}
        isFinished={gameState.isFinished}
      />
      {gameState.showFlash && (
        <div
          className="flash-overlay"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, ${gameState.flashColor} 100%)`,
          }}
        />
      )}
    </div>
  );
}

export default App;
