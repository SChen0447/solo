import { useState, useCallback, useEffect } from 'react';
import ColorStormCanvas from './components/ColorStormCanvas';
import ControlPanel from './components/ControlPanel';
import type { MoodMode, PerformanceLevel } from './types';
import { PRESET_COLORS, MOOD_NAMES } from './types';
import { averageHue, hueToColorName } from './utils/colors';

export default function App() {
  const [hueOffset, setHueOffset] = useState<number>(180);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(2.55);
  const [particleCount, setParticleCount] = useState<number>(450);
  const [mood, setMood] = useState<MoodMode>(null);
  const [performanceLevel, setPerformanceLevel] = useState<PerformanceLevel>('high');
  const [currentParticleCount, setCurrentParticleCount] = useState<number>(300);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);

  const avgHue = averageHue(PRESET_COLORS, hueOffset);
  const colorName = hueToColorName(avgHue);
  const moodName = mood ? MOOD_NAMES[mood] : '自由';

  const handlePerformanceChange = useCallback((level: PerformanceLevel) => {
    setPerformanceLevel(level);
  }, []);

  const handleParticleCountChange = useCallback((count: number) => {
    setCurrentParticleCount(count);
  }, []);

  const handleReset = useCallback(() => {
    setHueOffset(180);
    setSpeedMultiplier(2.55);
    setParticleCount(450);
    setMood(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        handleReset();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleReset]);

  return (
    <div className="app-container">
      <div className="canvas-wrapper">
        <ColorStormCanvas
          hueOffset={hueOffset}
          speedMultiplier={speedMultiplier}
          particleCount={particleCount}
          mood={mood}
          onPerformanceChange={handlePerformanceChange}
          onParticleCountChange={handleParticleCountChange}
        />
      </div>

      <ControlPanel
        hueOffset={hueOffset}
        speedMultiplier={speedMultiplier}
        particleCount={particleCount}
        mood={mood}
        performanceLevel={performanceLevel}
        isOpen={isPanelOpen}
        onHueOffsetChange={setHueOffset}
        onSpeedMultiplierChange={setSpeedMultiplier}
        onParticleCountChange={setParticleCount}
        onMoodChange={setMood}
        onTogglePanel={() => setIsPanelOpen((v) => !v)}
      />

      <div className="status-bar">
        <p>粒子总数：{currentParticleCount}</p>
        <p>主色调：{colorName}色</p>
        <p>情绪模式：{moodName}</p>
      </div>
    </div>
  );
}
