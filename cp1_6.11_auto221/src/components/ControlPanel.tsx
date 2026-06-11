import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MoodMode, PerformanceLevel } from '../types';
import { MOOD_NAMES } from '../types';

interface Props {
  hueOffset: number;
  speedMultiplier: number;
  particleCount: number;
  mood: MoodMode;
  performanceLevel: PerformanceLevel;
  isOpen: boolean;
  onHueOffsetChange: (v: number) => void;
  onSpeedMultiplierChange: (v: number) => void;
  onParticleCountChange: (v: number) => void;
  onMoodChange: (m: MoodMode) => void;
  onTogglePanel: () => void;
}

const MOODS: Array<{ key: NonNullable<MoodMode>; label: string; desc: string }> = [
  { key: 'calm', label: MOOD_NAMES.calm, desc: '温柔' },
  { key: 'excited', label: MOOD_NAMES.excited, desc: '快速' },
  { key: 'melancholy', label: MOOD_NAMES.melancholy, desc: '缓慢' },
  { key: 'joyful', label: MOOD_NAMES.joyful, desc: '跳跃' },
];

export default function ControlPanel({
  hueOffset,
  speedMultiplier,
  particleCount,
  mood,
  performanceLevel,
  isOpen,
  onHueOffsetChange,
  onSpeedMultiplierChange,
  onParticleCountChange,
  onMoodChange,
  onTogglePanel,
}: Props) {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const showExpanded = !isMobile || isOpen;

  return (
    <>
      {isMobile && !isOpen && (
        <motion.button
          className="minimized-icon"
          onClick={onTogglePanel}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="打开控制面板"
        />
      )}

      <AnimatePresence>
        {showExpanded && (
          <motion.div
            key="panel"
            className="control-panel fade-in"
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="panel-header">
              <p className="panel-title">情绪风暴控制</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="performance-indicator">
                  <span
                    className={`indicator-dot ${performanceLevel}`}
                    title={performanceLevel === 'high' ? '高性能' : '性能优化'}
                  />
                  <span>{performanceLevel === 'high' ? '高性能' : '优化中'}</span>
                </div>
                {isMobile && (
                  <button className="close-btn" onClick={onTogglePanel} aria-label="关闭面板">
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="slider-group">
              <div className="slider-label">
                <span>色调偏移</span>
                <span className="slider-value">{Math.round(hueOffset)}°</span>
              </div>
              <input
                type="range"
                className="slider"
                min={0}
                max={360}
                step={1}
                value={hueOffset}
                onChange={(e) => onHueOffsetChange(Number(e.target.value))}
                style={{ transition: 'all 0.3s cubic-bezier(0.25,0.1,0.25,1)' }}
              />
            </div>

            <div className="slider-group">
              <div className="slider-label">
                <span>速度倍率</span>
                <span className="slider-value">{speedMultiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                className="slider"
                min={0.1}
                max={5.0}
                step={0.1}
                value={speedMultiplier}
                onChange={(e) => onSpeedMultiplierChange(Number(e.target.value))}
                style={{ transition: 'all 0.3s cubic-bezier(0.25,0.1,0.25,1)' }}
              />
            </div>

            <div className="slider-group">
              <div className="slider-label">
                <span>粒子密度</span>
                <span className="slider-value">{particleCount}</span>
              </div>
              <input
                type="range"
                className="slider"
                min={100}
                max={800}
                step={10}
                value={particleCount}
                onChange={(e) => onParticleCountChange(Number(e.target.value))}
                style={{ transition: 'all 0.3s cubic-bezier(0.25,0.1,0.25,1)' }}
              />
            </div>

            <div className="mood-buttons">
              {MOODS.map((m) => {
                const active = mood === m.key;
                return (
                  <motion.button
                    key={m.key}
                    className={`mood-btn ${m.key} ${active ? 'active' : ''}`}
                    onClick={() => onMoodChange(active ? null : m.key)}
                    whileHover={{ scale: 1.05, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    {m.label}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
