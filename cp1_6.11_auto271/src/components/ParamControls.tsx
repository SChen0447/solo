import React from 'react';
import { FermentationParams, TurnFrequency } from '../FermentationEngine';

interface ParamControlsProps {
  params: FermentationParams;
  tempRange: { min: number; max: number; optimal: number };
  humidityRange: { min: number; max: number; optimal: number };
  onParamsChange: (params: Partial<FermentationParams>) => void;
  disabled?: boolean;
}

const ParamControls: React.FC<ParamControlsProps> = ({
  params,
  tempRange,
  humidityRange,
  onParamsChange,
  disabled = false
}) => {
  const turnOptions: { value: TurnFrequency; label: string; desc: string }[] = [
    { value: 2, label: '2小时', desc: '频繁翻堆' },
    { value: 4, label: '4小时', desc: '适中翻堆' },
    { value: 8, label: '8小时', desc: '轻柔翻堆' }
  ];

  return (
    <div className="panel-section">
      <h3 className="panel-title">发酵参数</h3>

      <div className="param-group">
        <div className="param-label">
          <span>🌡️ 温度</span>
          <span className="param-value">{params.temperature.toFixed(1)}°C</span>
        </div>
        <input
          type="range"
          className="param-slider"
          min={tempRange.min}
          max={tempRange.max}
          step={0.5}
          value={params.temperature}
          onChange={e => onParamsChange({ temperature: parseFloat(e.target.value) })}
          disabled={disabled}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>
          <span>{tempRange.min}°C</span>
          <span style={{ color: 'var(--color-primary)' }}>最优 {tempRange.optimal}°C</span>
          <span>{tempRange.max}°C</span>
        </div>
      </div>

      <div className="param-group">
        <div className="param-label">
          <span>💧 湿度</span>
          <span className="param-value">{params.humidity}%</span>
        </div>
        <input
          type="range"
          className="param-slider"
          min={humidityRange.min}
          max={humidityRange.max}
          step={1}
          value={params.humidity}
          onChange={e => onParamsChange({ humidity: parseInt(e.target.value) })}
          disabled={disabled}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>
          <span>{humidityRange.min}%</span>
          <span style={{ color: 'var(--color-primary)' }}>最优 {humidityRange.optimal}%</span>
          <span>{humidityRange.max}%</span>
        </div>
      </div>

      <div className="param-group">
        <div className="param-label">
          <span>🔄 翻堆频率</span>
        </div>
        <div className="turn-options">
          {turnOptions.map(option => (
            <div
              key={option.value}
              className={`turn-option ${params.turnFrequency === option.value ? 'active' : ''}`}
              onClick={() => !disabled && onParamsChange({ turnFrequency: option.value })}
              style={{ opacity: disabled ? 0.5 : 1 }}
            >
              {option.label}
              <small>{option.desc}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParamControls;
