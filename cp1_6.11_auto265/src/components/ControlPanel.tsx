import React from 'react';
import { motion } from 'framer-motion';
import { EnvironmentParams, ENV_RANGES, COLORS } from '../utils/constants';

interface ControlPanelProps {
  params: EnvironmentParams;
  onChange: (params: EnvironmentParams) => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  color: string;
}

const GlowSlider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  color,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span
          style={{
            color: COLORS.textGray,
            fontSize: 13,
            fontFamily: "'Courier New', monospace",
            letterSpacing: 1,
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: color,
            fontSize: 14,
            fontFamily: "'Courier New', monospace",
            fontWeight: 'bold',
            textShadow: `0 0 8px ${color}`,
          }}
        >
          {value.toFixed(step < 1 ? 1 : 0)} {unit}
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          height: 24,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: 6,
            borderRadius: 3,
            backgroundColor: COLORS.sliderTrack,
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            height: 6,
            borderRadius: 3,
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color}40, ${color})`,
            boxShadow: `0 0 10px ${color}80`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            width: '100%',
            height: 24,
            margin: 0,
            appearance: 'none',
            WebkitAppearance: 'none',
            background: 'transparent',
            cursor: 'pointer',
            zIndex: 2,
          }}
        />
        <motion.div
          style={{
            position: 'absolute',
            left: `calc(${percentage}% - 10px)`,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}, ${color}80)`,
            boxShadow: `0 0 12px ${color}, 0 0 20px ${color}60`,
            pointerEvents: 'none',
            zIndex: 1,
          }}
          whileHover={{ scale: 1.2 }}
        />
      </div>
    </div>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({ params, onChange }) => {
  const handleTempChange = (value: number) => {
    onChange({ ...params, temperature: value });
  };

  const handlePhChange = (value: number) => {
    onChange({ ...params, ph: value });
  };

  const handleSulfideChange = (value: number) => {
    onChange({ ...params, sulfide: value });
  };

  return (
    <motion.div
      initial={{ x: -250, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
      style={{
        position: 'absolute',
        left: 20,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 200,
        padding: 20,
        backgroundColor: COLORS.panelBg,
        backdropFilter: 'blur(10px)',
        borderRadius: 12,
        border: `2px solid ${COLORS.glowCyan}40`,
        boxShadow: `0 0 20px ${COLORS.glowCyan}30, inset 0 0 20px rgba(0,0,0,0.3)`,
        zIndex: 10,
      }}
    >
      <h2
        style={{
          color: COLORS.glowCyan,
          fontSize: 16,
          fontFamily: "'Courier New', monospace",
          marginBottom: 20,
          textAlign: 'center',
          textShadow: `0 0 10px ${COLORS.glowCyan}`,
          letterSpacing: 2,
        }}
      >
        环境参数
      </h2>

      <GlowSlider
        label="温度"
        value={params.temperature}
        min={ENV_RANGES.temperature.min}
        max={ENV_RANGES.temperature.max}
        step={1}
        unit="°C"
        onChange={handleTempChange}
        color="#ff5722"
      />

      <GlowSlider
        label="pH 值"
        value={params.ph}
        min={ENV_RANGES.ph.min}
        max={ENV_RANGES.ph.max}
        step={0.1}
        unit=""
        onChange={handlePhChange}
        color="#00bcd4"
      />

      <GlowSlider
        label="硫化物浓度"
        value={params.sulfide}
        min={ENV_RANGES.sulfide.min}
        max={ENV_RANGES.sulfide.max}
        step={0.1}
        unit="mmol/L"
        onChange={handleSulfideChange}
        color="#9c27b0"
      />

      <div
        style={{
          marginTop: 20,
          paddingTop: 15,
          borderTop: `1px solid ${COLORS.glowCyan}30`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: COLORS.textGray,
            fontFamily: "'Courier New', monospace",
            lineHeight: 1.6,
            opacity: 0.7,
          }}
        >
          <p style={{ margin: '4px 0' }}>💡 操作提示</p>
          <p style={{ margin: '2px 0', fontSize: 10 }}>• 滚轮缩放视角</p>
          <p style={{ margin: '2px 0', fontSize: 10 }}>• 拖拽平移画面</p>
          <p style={{ margin: '2px 0', fontSize: 10 }}>• 点击盲虾标记</p>
        </div>
      </div>
    </motion.div>
  );
};
