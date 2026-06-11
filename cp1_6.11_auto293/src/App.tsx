import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import UIPanel from './components/UIPanel';
import { useGameState } from './hooks/useGameState';

const App: React.FC = () => {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const canvasW = Math.max(size.w - 260, 800);
  const canvasH = size.h;

  const game = useGameState(canvasW, canvasH);

  const updateParticlesRef = useRef(game.updateParticles);
  const spawnParticlesRef = useRef(game.spawnParticles);
  const checkCrownWitherRef = useRef(game.checkCrownWither);
  const cleanupClickEffectsRef = useRef(game.cleanupClickEffects);

  updateParticlesRef.current = game.updateParticles;
  spawnParticlesRef.current = game.spawnParticles;
  checkCrownWitherRef.current = game.checkCrownWither;
  cleanupClickEffectsRef.current = game.cleanupClickEffects;

  useEffect(() => {
    const onResize = () => {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let lastTime = performance.now();
    let particleTimer = 0;
    let witherTimer = 0;
    let effectTimer = 0;
    let rafId = 0;

    const loop = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;

      particleTimer += delta;
      witherTimer += delta;
      effectTimer += delta;

      if (particleTimer > 100) {
        updateParticlesRef.current(particleTimer);
        spawnParticlesRef.current();
        particleTimer = 0;
      }
      if (witherTimer > 500) {
        checkCrownWitherRef.current();
        witherTimer = 0;
      }
      if (effectTimer > 200) {
        cleanupClickEffectsRef.current();
        effectTimer = 0;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#1b3b1b',
      }}
    >
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <GameCanvas
          levels={game.levels}
          currentLevelIndex={game.currentLevelIndex}
          particles={game.particles}
          clickEffects={game.clickEffects}
          dragging={game.dragging}
          onStartDrag={game.startDrag}
          onUpdateDrag={game.updateDrag}
          onEndDrag={game.endDrag}
          width={canvasW}
          height={canvasH}
        />
      </div>
      <UIPanel
        levels={game.levels}
        currentLevelIndex={game.currentLevelIndex}
        progress={game.progress}
        remainingNodes={game.remainingNodes}
        isCrownWithered={game.isCrownWithered}
        onReset={game.resetGame}
        onSwitchLevel={game.switchLevel}
      />
    </div>
  );
};

export default App;
