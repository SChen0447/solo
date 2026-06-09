import React, { useState } from 'react';
import { User, LIGHT_PRESETS, BUILDING_CONFIG, BuildingType } from './types';

interface ControlPanelProps {
  currentHour: number;
  onHourChange: (hour: number) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  users: User[];
  currentUserId?: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentHour,
  onHourChange,
  selectedColor,
  onColorChange,
  users,
  currentUserId,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const formatHour = (hour: number): string => {
    const h = Math.floor(hour);
    const m = Math.floor((hour - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`control-panel ${collapsed ? 'collapsed' : ''}`}>
      <button
        className="panel-toggle"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? '☰' : '×'}
      </button>

      <div className="panel-content">
        <div className="panel-title">城市沙盘控制</div>

        <div className="control-group">
          <label className="control-label">时间 (0-24)</label>
          <input
            type="range"
            min="0"
            max="24"
            step="0.5"
            value={currentHour}
            onChange={(e) => onHourChange(parseFloat(e.target.value))}
            className="time-slider"
          />
          <span className="time-value">{formatHour(currentHour)}</span>
        </div>

        <div className="control-group">
          <label className="control-label">光照色相</label>
          <div className="color-presets">
            {LIGHT_PRESETS.map((color) => (
              <button
                key={color}
                className={`color-preset ${selectedColor === color ? 'active' : ''}`}
                style={{ background: color }}
                onClick={() => onColorChange(color)}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">建筑类型</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(Object.entries(BUILDING_CONFIG) as [BuildingType, typeof BUILDING_CONFIG[BuildingType]][]).map(
              ([type, config]) => (
                <button key={type} className="building-btn" disabled style={{ cursor: 'default', opacity: 0.8 }}>
                  <span className="color-swatch" style={{ background: config.color }} />
                  {config.label} (高{config.height})
                </button>
              )
            )}
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">提示</label>
          <div style={{ fontSize: '11px', color: '#95a5a6', lineHeight: 1.6 }}>
            点击空白格子放置建筑<br />
            拖动滑块调节时间光照<br />
            红色按钮显示热力图
          </div>
        </div>
      </div>
    </div>
  );
};
