import { useState, useCallback, useEffect } from 'react';
import LavaCanvas from './components/LavaCanvas';
import ControlPanel from './components/ControlPanel';
import { COLOR_SCHEMES, ColorScheme } from './types';
import { motion } from 'framer-motion';

const PARTICLES_PER_UNLOCK = 5;

function App() {
  const [temperature, setTemperature] = useState(50);
  const [gravityAngle, setGravityAngle] = useState(270);
  const [colorSchemes, setColorSchemes] = useState<ColorScheme[]>(COLOR_SCHEMES);
  const [currentSchemeId, setCurrentSchemeId] = useState('warm-orange');
  const [collectedParticles, setCollectedParticles] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);

  const currentScheme = colorSchemes.find((s) => s.id === currentSchemeId) || colorSchemes[0];
  const nextLockedIndex = colorSchemes.findIndex((s) => !s.unlocked);
  const particlesToNextUnlock = PARTICLES_PER_UNLOCK;

  const handleParticleCollect = useCallback(() => {
    setCollectedParticles((prev) => prev + 1);
    setTotalCollected((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (nextLockedIndex >= 0 && collectedParticles >= PARTICLES_PER_UNLOCK) {
      setColorSchemes((prev) => {
        const newSchemes = [...prev];
        if (newSchemes[nextLockedIndex]) {
          newSchemes[nextLockedIndex] = {
            ...newSchemes[nextLockedIndex],
            unlocked: true,
          };
        }
        return newSchemes;
      });
      setCollectedParticles((prev) => prev - PARTICLES_PER_UNLOCK);
    }
  }, [collectedParticles, nextLockedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setTemperature((prev) => Math.min(prev + 10, 100));
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setTemperature((prev) => Math.max(prev - 10, 0));
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setGravityAngle((prev) => (prev - 15 + 360) % 360);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setGravityAngle((prev) => (prev + 15) % 360);
          break;
        case ' ':
          setGravityAngle(270);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-container">
      <div className="background-gradient" />
      
      <motion.header
        className="app-header"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
      >
        <h1 className="app-title">
          <span className="title-icon">🔥</span>
          虚拟熔岩灯
          <span className="title-sub">Lava Lamp Simulator</span>
        </h1>
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">已收集</span>
            <span className="stat-value">{totalCollected}</span>
            <span className="stat-unit">微粒</span>
          </div>
        </div>
      </motion.header>

      <ControlPanel
        temperature={temperature}
        onTemperatureChange={setTemperature}
        gravityAngle={gravityAngle}
        onGravityAngleChange={setGravityAngle}
        colorSchemes={colorSchemes}
        currentSchemeId={currentSchemeId}
        onSchemeChange={setCurrentSchemeId}
        collectedParticles={collectedParticles}
        particlesToUnlock={particlesToNextUnlock}
      />

      <main className="canvas-container">
        <div className="canvas-frame">
          <div className="frame-corner top-left" />
          <div className="frame-corner top-right" />
          <div className="frame-corner bottom-left" />
          <div className="frame-corner bottom-right" />
          <LavaCanvas
            temperature={temperature}
            gravityAngle={gravityAngle}
            currentScheme={currentScheme}
            onParticleCollect={handleParticleCollect}
            complementaryColor={currentScheme.complementary}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p className="hint-text">
          <span>💡 提示：</span>
          使用 W/S 或 ↑/↓ 调节温度，A/D 或 ←/→ 调整重力方向，空格键重置
        </p>
      </footer>
    </div>
  );
}

export default App;
