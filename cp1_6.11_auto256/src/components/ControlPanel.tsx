import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ControlPanelProps {
  geomagneticIndex: number;
  solarWindSpeed: number;
  onGeomagneticChange: (value: number) => void;
  onSolarWindChange: (value: number) => void;
  onReset: () => void;
}

function getThumbColor(geoIndex: number): string {
  if (geoIndex <= 3) return '#00ff66';
  if (geoIndex <= 6) return '#8e2de2';
  return '#ff0066';
}

function getThumbShadow(geoIndex: number): string {
  const color = getThumbColor(geoIndex);
  return `0 0 10px ${color}99, 0 0 20px ${color}4D`;
}

export default function ControlPanel({
  geomagneticIndex,
  solarWindSpeed,
  onGeomagneticChange,
  onSolarWindChange,
  onReset,
}: ControlPanelProps) {
  const [geoPulse, setGeoPulse] = useState(false);
  const [windPulse, setWindPulse] = useState(false);
  const thumbColor = getThumbColor(geomagneticIndex);
  const thumbShadow = getThumbShadow(geomagneticIndex);
  const geoTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const windTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleGeoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      onGeomagneticChange(val);
      setGeoPulse(true);
      if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);
      geoTimeoutRef.current = setTimeout(() => setGeoPulse(false), 200);
    },
    [onGeomagneticChange],
  );

  const handleWindChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      onSolarWindChange(val);
      setWindPulse(true);
      if (windTimeoutRef.current) clearTimeout(windTimeoutRef.current);
      windTimeoutRef.current = setTimeout(() => setWindPulse(false), 200);
    },
    [onSolarWindChange],
  );

  useEffect(() => {
    return () => {
      if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);
      if (windTimeoutRef.current) clearTimeout(windTimeoutRef.current);
    };
  }, []);

  return (
    <motion.div
      className="control-panel"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="panel-title">极光观测台</div>

      <div className="control-group">
        <div className="control-label">
          <span>地磁指数</span>
          <motion.span
            className={`control-value ${geoPulse ? 'pulse' : ''}`}
            animate={{ scale: geoPulse ? 1.05 : 1 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ color: thumbColor }}
          >
            {geomagneticIndex}
          </motion.span>
        </div>
        <div className="slider-wrapper">
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={geomagneticIndex}
            onChange={handleGeoChange}
            style={
              {
                '--thumb-color': thumbColor,
                '--thumb-shadow': thumbShadow,
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      <div className="control-group">
        <div className="control-label">
          <span>太阳风速度</span>
          <motion.span
            className={`control-value ${windPulse ? 'pulse' : ''}`}
            animate={{ scale: windPulse ? 1.05 : 1 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {solarWindSpeed}
          </motion.span>
        </div>
        <div className="slider-wrapper">
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={solarWindSpeed}
            onChange={handleWindChange}
            style={
              {
                '--thumb-color': '#4fc3f7',
                '--thumb-shadow': '0 0 10px #4fc3f799, 0 0 20px #4fc3f74D',
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      <button className="reset-btn" onClick={onReset}>
        重置参数
      </button>
    </motion.div>
  );
}
