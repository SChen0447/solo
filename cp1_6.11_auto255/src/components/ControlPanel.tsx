import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { temperatureColor } from '../utils/colorUtils';

interface ControlPanelProps {
  sunAngle: number;
  windSpeed: number;
  humidity: number;
  onSunAngleChange: (value: number) => void;
  onWindSpeedChange: (value: number) => void;
  onHumidityChange: (value: number) => void;
  onStartDrying: () => void;
  isDrying: boolean;
}

const DryingRackIcon: React.FC = () => (
  <svg width="50" height="50" viewBox="0 0 50 50">
    <rect x="10" y="35" width="30" height="3" fill="#5d4037" rx="1" />
    <rect x="10" y="25" width="30" height="3" fill="#6d4c41" rx="1" />
    <rect x="10" y="15" width="30" height="3" fill="#795548" rx="1" />
    <rect x="8" y="10" width="4" height="32" fill="#5d4037" rx="2" />
    <rect x="38" y="10" width="4" height="32" fill="#5d4037" rx="2" />
    <line x1="15" y1="18" x2="15" y2="23" stroke="#a1887f" strokeWidth="2" />
    <line x1="25" y1="18" x2="25" y2="23" stroke="#a1887f" strokeWidth="2" />
    <line x1="35" y1="18" x2="35" y2="23" stroke="#a1887f" strokeWidth="2" />
  </svg>
);

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
  color?: string;
}

const CustomSlider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  color = '#8d6e63',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateValue(e.clientX);
  }, []);

  const updateValue = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    let percent = (clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    const newValue = min + percent * (max - min);
    const steppedValue = Math.round(newValue / step) * step;
    onChange(Math.max(min, Math.min(max, steppedValue)));
  }, [min, max, step, onChange]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateValue(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateValue]);

  return (
    <div className="slider-item">
      <div className="slider-label">
        <span>{label}</span>
        <span className="slider-value">{value.toFixed(step < 1 ? 1 : 0)}{unit}</span>
      </div>
      <div
        ref={trackRef}
        className="slider-track"
        onMouseDown={handleMouseDown}
        style={{
          background: `linear-gradient(to right, ${color} ${percentage}%, #d7ccc8 ${percentage}%)`,
        }}
      >
        <motion.div
          className="slider-thumb"
          style={{ left: `${percentage}%`, background: color }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        />
      </div>
    </div>
  );
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  sunAngle,
  windSpeed,
  humidity,
  onSunAngleChange,
  onWindSpeedChange,
  onHumidityChange,
  onStartDrying,
  isDrying,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const sunColor = temperatureColor(sunAngle);

  return (
    <div className="control-panel-container">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="slider-panel"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <CustomSlider
              label="阳光角度"
              value={sunAngle}
              min={0}
              max={90}
              unit="°"
              onChange={onSunAngleChange}
              color={sunColor}
            />
            <CustomSlider
              label="风速等级"
              value={windSpeed}
              min={0}
              max={5}
              unit="级"
              onChange={onWindSpeedChange}
              color="#607d8b"
            />
            <CustomSlider
              label="空气湿度"
              value={humidity}
              min={20}
              max={90}
              unit="%"
              onChange={onHumidityChange}
              color="#4fc3f7"
            />
            <motion.button
              className="btn-press"
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '12px',
                background: isDrying
                  ? 'linear-gradient(145deg, #a1887f, #6d4c41)'
                  : 'linear-gradient(145deg, #8d6e63, #5d4037)',
                color: '#faf0e6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                fontFamily: 'KaiTi, STKaiti, serif',
              }}
              whileHover={{ filter: 'brightness(1.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartDrying}
              disabled={isDrying}
            >
              {isDrying ? '晾干中...' : '开始晾干'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="drying-rack-btn btn-press"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        title="晾干控制"
      >
        <DryingRackIcon />
      </motion.div>
    </div>
  );
};

export default ControlPanel;
