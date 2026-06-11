import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ColorScheme } from '../types';

interface ControlPanelProps {
  temperature: number;
  onTemperatureChange: (value: number) => void;
  gravityAngle: number;
  onGravityAngleChange: (angle: number) => void;
  colorSchemes: ColorScheme[];
  currentSchemeId: string;
  onSchemeChange: (schemeId: string) => void;
  collectedParticles: number;
  particlesToUnlock: number;
}

const PRESET_DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315];

export default function ControlPanel({
  temperature,
  onTemperatureChange,
  gravityAngle,
  onGravityAngleChange,
  colorSchemes,
  currentSchemeId,
  onSchemeChange,
  collectedParticles,
  particlesToUnlock,
}: ControlPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dialRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDialMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isMobile) return;
      e.preventDefault();
      setIsDragging(true);
    },
    [isMobile]
  );

  const handleDialMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dialRef.current) return;

      const rect = dialRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      const normalizedAngle = (angle + 360) % 360;

      onGravityAngleChange(normalizedAngle);
    },
    [isDragging, onGravityAngleChange]
  );

  const handleDialMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDialMouseMove);
      window.addEventListener('mouseup', handleDialMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleDialMouseMove);
        window.removeEventListener('mouseup', handleDialMouseUp);
      };
    }
  }, [isDragging, handleDialMouseMove, handleDialMouseUp]);

  const handlePresetDirection = (angle: number) => {
    onGravityAngleChange(angle);
  };

  const getTemperatureLabel = () => {
    if (temperature < 30) return '冷';
    if (temperature > 70) return '热';
    return '温';
  };

  const nextLockedScheme = colorSchemes.find((s) => !s.unlocked);
  const progress = nextLockedScheme
    ? Math.min((collectedParticles / particlesToUnlock) * 100, 100)
    : 100;

  return (
    <motion.div
      className="control-panel"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="control-section temperature-section">
        <div className="control-label">
          <span className="label-text">温度</span>
          <span className="label-value">{Math.round(temperature)}°</span>
          <span className="label-indicator">{getTemperatureLabel()}</span>
        </div>
        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={temperature}
            onChange={(e) => onTemperatureChange(Number(e.target.value))}
            className="temperature-slider"
            style={{
              background: `linear-gradient(to right, #4a90d9 0%, #f5a623 ${temperature}%, #333 ${temperature}%, #333 100%)`,
            }}
          />
        </div>
      </div>

      <div className="control-section gravity-section">
        <div className="control-label">
          <span className="label-text">重力方向</span>
          <span className="label-value">{Math.round(gravityAngle)}°</span>
        </div>
        <div className="gravity-dial-wrapper">
          {isMobile ? (
            <div className="preset-directions">
              {PRESET_DIRECTIONS.map((angle) => (
                <motion.button
                  key={angle}
                  className={`preset-btn ${Math.abs(gravityAngle - angle) < 22.5 ? 'active' : ''}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePresetDirection(angle)}
                >
                  <div
                    className="preset-arrow"
                    style={{ transform: `rotate(${angle}deg)` }}
                  />
                </motion.button>
              ))}
            </div>
          ) : (
            <div
              ref={dialRef}
              className={`gravity-dial ${isDragging ? 'dragging' : ''}`}
              onMouseDown={handleDialMouseDown}
            >
              <div className="dial-face">
                <div className="dial-marks">
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                    <div
                      key={angle}
                      className="dial-mark"
                      style={{ transform: `rotate(${angle}deg)` }}
                    />
                  ))}
                </div>
                <div
                  className="dial-pointer"
                  style={{ transform: `rotate(${gravityAngle}deg)` }}
                >
                  <div className="pointer-triangle" />
                </div>
                <div className="dial-center" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="control-section colors-section">
        <div className="control-label">
          <span className="label-text">颜色方案</span>
          <span className="label-value">
            {collectedParticles} / {particlesToUnlock}
          </span>
        </div>
        <div className="color-grid">
          {colorSchemes.map((scheme) => {
            const isActive = scheme.id === currentSchemeId;
            const isLocked = !scheme.unlocked;

            return (
              <motion.div
                key={scheme.id}
                className={`color-swatch ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                whileHover={!isLocked ? { scale: 1.1 } : {}}
                whileTap={!isLocked ? { scale: 0.95 } : {}}
                onClick={() => !isLocked && onSchemeChange(scheme.id)}
                title={isLocked ? `收集 ${particlesToUnlock} 个微粒解锁` : scheme.name}
              >
                <div
                  className="swatch-gradient"
                  style={{
                    background: `linear-gradient(135deg, ${scheme.background.top} 0%, ${scheme.background.bottom} 100%)`,
                  }}
                >
                  <div
                    className="swatch-lava"
                    style={{
                      background: `radial-gradient(circle, ${scheme.lava.center} 0%, ${scheme.lava.edge} 100%)`,
                    }}
                  />
                </div>
                {isLocked && (
                  <div className="lock-overlay">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
        {nextLockedScheme && (
          <div className="unlock-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">
              再收集 {particlesToUnlock - collectedParticles} 个解锁下一种
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
