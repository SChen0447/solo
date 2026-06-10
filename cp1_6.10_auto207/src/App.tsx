import React, { useEffect, useRef, useState } from 'react';
import { useApp } from './context/AppContext';
import IslandScene from './components/IslandScene';
import CollectorPanel from './components/CollectorPanel';
import MixAnimation from './components/MixAnimation';
import FragmentPanel from './components/FragmentPanel';
import FPSCounter from './components/FPSCounter';

const App: React.FC = () => {
  const { state, collectedCount, isAllCollected, resetState, setActiveFragment } = useApp();
  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let rafId: number;
    const updateFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      rafId = requestAnimationFrame(updateFPS);
    };
    rafId = requestAnimationFrame(updateFPS);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const progress = collectedCount / 8;
  const progressColor = `hsl(${progress * 80}, 70%, 50%)`;

  return (
    <div className={`app-container ${state.isPlayingMix ? 'mix-mode' : ''}`}>
      {!state.isPlayingMix && (
        <>
          <div className="canvas-container">
            <IslandScene fps={fps} />
          </div>

          <div className="progress-bar">
            <span className="progress-label">灵感收集</span>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${progress * 100}%`,
                  background: progressColor,
                  color: progressColor
                }}
              />
            </div>
            <span className="progress-label">{collectedCount}/8</span>
          </div>

          <button className="reset-btn" onClick={resetState} title="重置进度">
            重新开始
          </button>

          <CollectorPanel />

          {state.activeFragmentId && (
            <FragmentPanel
              fragmentId={state.activeFragmentId}
              onClose={() => setActiveFragment(null)}
            />
          )}
        </>
      )}

      {state.isPlayingMix && <MixAnimation />}

      <FPSCounter fps={fps} />
    </div>
  );
};

export default App;
