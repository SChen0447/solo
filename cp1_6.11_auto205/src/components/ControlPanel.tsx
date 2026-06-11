import { useState } from 'react';
import { motion } from 'framer-motion';
import type { EnvironmentParams } from '@/utils/snowflakeAlgorithm';

interface ControlPanelProps {
  params: EnvironmentParams;
  onChange: (params: EnvironmentParams) => void;
  disabled?: boolean;
}

interface SliderConfig {
  key: keyof EnvironmentParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  icon: string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  {
    key: 'temperature',
    label: '温度',
    min: -30,
    max: 0,
    step: 1,
    unit: '°C',
    icon: '❄',
  },
  {
    key: 'humidity',
    label: '湿度',
    min: 30,
    max: 90,
    step: 1,
    unit: '%',
    icon: '💧',
  },
  {
    key: 'windSpeed',
    label: '风速',
    min: 0,
    max: 5,
    step: 0.1,
    unit: 'm/s',
    icon: '🌬',
  },
];

export default function ControlPanel({
  params,
  onChange,
  disabled = false,
}: ControlPanelProps) {
  const [localParams, setLocalParams] = useState<EnvironmentParams>(params);

  const handleSliderChange = (key: keyof EnvironmentParams, value: number) => {
    const newParams = { ...localParams, [key]: value };
    setLocalParams(newParams);
    onChange(newParams);
  };

  return (
    <div
      className="control-panel"
      style={{
        width: '260px',
        height: '100%',
        padding: '24px 20px',
        background: 'rgba(26, 26, 62, 0.3)',
        backdropFilter: 'blur(10px)',
        borderRight: '1px solid rgba(176, 224, 230, 0.2)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontFamily: 'Consolas, Monaco, monospace',
          color: '#a0d8ef',
          opacity: 0.7,
          letterSpacing: '1px',
          marginBottom: '8px',
        }}
      >
        环境参数
      </div>

      {SLIDER_CONFIGS.map((config) => (
        <SliderControl
          key={config.key}
          config={config}
          value={localParams[config.key]}
          onChange={(value) => handleSliderChange(config.key, value)}
          disabled={disabled}
        />
      ))}

      <div
        style={{
          marginTop: 'auto',
          padding: '16px',
          background: 'rgba(176, 224, 230, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(176, 224, 230, 0.1)',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            fontFamily: 'Consolas, Monaco, monospace',
            color: '#a0d8ef',
            opacity: 0.6,
            marginBottom: '8px',
            letterSpacing: '1px',
          }}
        >
          生长提示
        </div>
        <div
          style={{
            fontSize: '11px',
            fontFamily: 'Consolas, Monaco, monospace',
            color: '#c0e8f0',
            lineHeight: '1.6',
            opacity: 0.8,
          }}
        >
          点击冰核或按空格键开始生长
        </div>
      </div>
    </div>
  );
}

interface SliderControlProps {
  config: SliderConfig;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function SliderControl({ config, value, onChange, disabled }: SliderControlProps) {
  const percentage =
    ((value - config.min) / (config.max - config.min)) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontFamily: 'Consolas, Monaco, monospace',
            color: '#b0e0e6',
            letterSpacing: '1px',
          }}
        >
          <span
            style={{
              fontSize: '16px',
              filter: 'drop-shadow(0 0 4px rgba(176, 224, 230, 0.5))',
            }}
          >
            {config.icon}
          </span>
          {config.label}
        </div>
        <motion.div
          initial={false}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          key={value}
          style={{
            fontSize: '16px',
            fontFamily: 'Consolas, Monaco, monospace',
            color: '#e8f8ff',
            fontWeight: '300',
            textShadow: '0 0 8px rgba(176, 224, 230, 0.5)',
            minWidth: '60px',
            textAlign: 'right',
          }}
        >
          {config.key === 'windSpeed' ? value.toFixed(1) : value}
          <span
            style={{
              fontSize: '11px',
              color: '#a0d8ef',
              marginLeft: '2px',
            }}
          >
            {config.unit}
          </span>
        </motion.div>
      </div>

      <div style={{ position: 'relative', height: '6px' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(176, 224, 230, 0.1)',
            borderRadius: '3px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #4a90d9, #b0e0e6)',
            borderRadius: '3px',
            transition: 'width 0.1s ease-out',
            boxShadow: '0 0 8px rgba(176, 224, 230, 0.4)',
          }}
        />
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            opacity: 0,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        />
        <motion.div
          className="slider-thumb"
          animate={{
            x: `calc(${percentage}% - 8px)`,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          whileHover={{ scale: disabled ? 1 : 1.2 }}
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '16px',
            height: '16px',
            background: 'linear-gradient(135deg, #e8f8ff, #c0e8f0)',
            borderRadius: '50%',
            boxShadow: '0 0 12px rgba(176, 224, 230, 0.8)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          fontFamily: 'Consolas, Monaco, monospace',
          color: '#a0d8ef',
          opacity: 0.5,
        }}
      >
        <span>
          {config.key === 'windSpeed'
            ? config.min.toFixed(1)
            : config.min}
          {config.unit}
        </span>
        <span>
          {config.key === 'windSpeed'
            ? config.max.toFixed(1)
            : config.max}
          {config.unit}
        </span>
      </div>
    </div>
  );
}
