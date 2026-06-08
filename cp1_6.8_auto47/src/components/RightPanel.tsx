import React from 'react';
import { ParticleConfig } from '../types';

interface RightPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  particleConfig: ParticleConfig;
  onParticleConfigChange: (config: ParticleConfig) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  onToggle,
  particleConfig,
  onParticleConfigChange,
}) => {
  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onParticleConfigChange({
      ...particleConfig,
      count: parseInt(e.target.value),
    });
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onParticleConfigChange({
      ...particleConfig,
      size: parseFloat(e.target.value),
    });
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onParticleConfigChange({
      ...particleConfig,
      speed: parseFloat(e.target.value),
    });
  };

  return (
    <div className={`right-panel ${isOpen ? 'open' : 'closed'}`}>
      <button className="panel-toggle" onClick={onToggle}>
        {isOpen ? '▶' : '◀'}
      </button>

      <div className="panel-content">
        <div className="panel-section">
          <h4 className="section-title">粒子参数</h4>

          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">粒子数量</span>
              <span className="slider-value">{particleConfig.count}</span>
            </div>
            <input
              type="range"
              min="20"
              max="200"
              value={particleConfig.count}
              onChange={handleCountChange}
              className="custom-slider"
            />
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">粒子大小</span>
              <span className="slider-value">{particleConfig.size.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={particleConfig.size}
              onChange={handleSizeChange}
              className="custom-slider"
            />
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">粒子速度</span>
              <span className="slider-value">{particleConfig.speed.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={particleConfig.speed}
              onChange={handleSpeedChange}
              className="custom-slider"
            />
          </div>
        </div>

        <div className="panel-section">
          <h4 className="section-title">预设</h4>
          <div className="preset-buttons">
            <button
              className="preset-btn"
              onClick={() => onParticleConfigChange({ count: 30, size: 2, speed: 1 })}
            >
              轻柔
            </button>
            <button
              className="preset-btn"
              onClick={() => onParticleConfigChange({ count: 80, size: 3, speed: 3 })}
            >
              标准
            </button>
            <button
              className="preset-btn"
              onClick={() => onParticleConfigChange({ count: 150, size: 4, speed: 5 })}
            >
              动感
            </button>
            <button
              className="preset-btn"
              onClick={() => onParticleConfigChange({ count: 200, size: 6, speed: 8 })}
            >
              爆炸
            </button>
          </div>
        </div>

        <div className="panel-section">
          <div className="particle-preview">
            <div className="particle-color-bar">
              <div className="color-low" title="低频 - 红紫色" />
              <div className="color-mid" title="中频 - 蓝绿色" />
              <div className="color-high" title="高频 - 金黄色" />
            </div>
            <span className="color-hint">粒子颜色随频率联动</span>
          </div>
        </div>
      </div>

      <div className="panel-collapsed-label">
        <span>粒子参数</span>
      </div>

      <style>{`
        .right-panel {
          position: relative;
          height: 100%;
          background: rgba(26, 26, 46, 0.95);
          border-left: 1px solid #333;
          transition: width 0.3s cubic-bezier(0.33, 1, 0.68, 1);
          overflow: hidden;
          backdrop-filter: blur(12px);
        }

        .right-panel.open {
          width: 240px;
        }

        .right-panel.closed {
          width: 48px;
        }

        .panel-toggle {
          position: absolute;
          top: 12px;
          left: 8px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #2a2a4e;
          border: 1px solid #333;
          color: #888;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: all 0.2s ease;
        }

        .right-panel.closed .panel-toggle {
          left: auto;
          right: 10px;
        }

        .panel-toggle:hover {
          background: #3a3a5e;
          color: #ff00aa;
          transform: scale(1.1);
        }

        .panel-content {
          padding: 50px 16px 16px 16px;
          opacity: 1;
          transition: opacity 0.2s ease;
        }

        .right-panel.closed .panel-content {
          opacity: 0;
          pointer-events: none;
        }

        .panel-section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 13px;
          color: #888;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .slider-group {
          margin-bottom: 16px;
        }

        .slider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .slider-label {
          font-size: 13px;
          color: #aaa;
        }

        .slider-value {
          font-size: 13px;
          color: #ff00aa;
          font-weight: 500;
          font-family: 'Courier New', monospace;
        }

        .custom-slider {
          width: 100%;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: #2a2a4e;
          border-radius: 3px;
          outline: none;
          cursor: pointer;
        }

        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00ffaa, #ff00aa);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .custom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 10px rgba(0, 255, 170, 0.5);
        }

        .custom-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00ffaa, #ff00aa);
          cursor: pointer;
          border: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .custom-slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 10px rgba(0, 255, 170, 0.5);
        }

        .preset-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }

        .preset-btn {
          padding: 8px 12px;
          background: #2a2a4e;
          border: 1px solid #333;
          border-radius: 6px;
          color: #aaa;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .preset-btn:hover {
          background: #3a3a5e;
          border-color: #ff00aa44;
          color: #ff00aa;
          transform: scale(1.05);
        }

        .particle-preview {
          text-align: center;
        }

        .particle-color-bar {
          display: flex;
          height: 24px;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .color-low {
          flex: 1;
          background: linear-gradient(90deg, #9b59b6, #8e44ad);
        }

        .color-mid {
          flex: 1;
          background: linear-gradient(90deg, #00ffaa, #00cc88);
        }

        .color-high {
          flex: 1;
          background: linear-gradient(90deg, #ffd700, #ffaa00);
        }

        .color-hint {
          font-size: 11px;
          color: #666;
        }

        .panel-collapsed-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(90deg);
          white-space: nowrap;
          color: #666;
          font-size: 12px;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .right-panel.closed .panel-collapsed-label {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .right-panel {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default RightPanel;
