import React from 'react';
import { WaveformType, FilterType, ParticleConfig } from '../types';
import { waveformTypes, filterTypes } from '../utils';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'waveform' | 'particles';
  waveformType: WaveformType;
  filterType: FilterType;
  particleConfig: ParticleConfig;
  onWaveformTypeChange: (type: WaveformType) => void;
  onFilterTypeChange: (type: FilterType) => void;
  onParticleConfigChange: (config: ParticleConfig) => void;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  waveformType,
  filterType,
  particleConfig,
  onWaveformTypeChange,
  onFilterTypeChange,
  onParticleConfigChange,
}) => {
  return (
    <div className={`mobile-drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div
        className={`mobile-drawer ${isOpen ? 'open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-handle" />

        <div className="drawer-content">
          {activeTab === 'waveform' && (
            <div className="drawer-section">
              <h3 className="drawer-title">波形样式</h3>
              <div className="drawer-waveform-grid">
                {waveformTypes.map(wt => (
                  <button
                    key={wt.type}
                    className={`drawer-waveform-btn ${waveformType === wt.type ? 'active' : ''}`}
                    onClick={() => onWaveformTypeChange(wt.type)}
                  >
                    <span className="waveform-icon">{wt.icon}</span>
                    <span className="waveform-label">{wt.label}</span>
                  </button>
                ))}
              </div>

              <h3 className="drawer-title" style={{ marginTop: 24 }}>滤镜效果</h3>
              <div className="drawer-filter-grid">
                {filterTypes.map(ft => (
                  <button
                    key={ft.type}
                    className={`drawer-filter-btn ${filterType === ft.type ? 'active' : ''}`}
                    onClick={() => onFilterTypeChange(ft.type)}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'particles' && (
            <div className="drawer-section">
              <h3 className="drawer-title">粒子参数</h3>

              <div className="drawer-slider-group">
                <div className="drawer-slider-header">
                  <span>粒子数量</span>
                  <span className="slider-value">{particleConfig.count}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={particleConfig.count}
                  onChange={(e) => onParticleConfigChange({
                    ...particleConfig,
                    count: parseInt(e.target.value),
                  })}
                  className="custom-slider"
                />
              </div>

              <div className="drawer-slider-group">
                <div className="drawer-slider-header">
                  <span>粒子大小</span>
                  <span className="slider-value">{particleConfig.size.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={particleConfig.size}
                  onChange={(e) => onParticleConfigChange({
                    ...particleConfig,
                    size: parseFloat(e.target.value),
                  })}
                  className="custom-slider"
                />
              </div>

              <div className="drawer-slider-group">
                <div className="drawer-slider-header">
                  <span>粒子速度</span>
                  <span className="slider-value">{particleConfig.speed.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={particleConfig.speed}
                  onChange={(e) => onParticleConfigChange({
                    ...particleConfig,
                    speed: parseFloat(e.target.value),
                  })}
                  className="custom-slider"
                />
              </div>

              <div className="drawer-preset-row">
                <button
                  className="drawer-preset-btn"
                  onClick={() => onParticleConfigChange({ count: 30, size: 2, speed: 1 })}
                >
                  轻柔
                </button>
                <button
                  className="drawer-preset-btn"
                  onClick={() => onParticleConfigChange({ count: 80, size: 3, speed: 3 })}
                >
                  标准
                </button>
                <button
                  className="drawer-preset-btn"
                  onClick={() => onParticleConfigChange({ count: 150, size: 4, speed: 5 })}
                >
                  动感
                </button>
                <button
                  className="drawer-preset-btn"
                  onClick={() => onParticleConfigChange({ count: 200, size: 6, speed: 8 })}
                >
                  爆炸
                </button>
              </div>
            </div>
          )}
        </div>

        <button className="drawer-close" onClick={onClose}>
          关闭
        </button>
      </div>

      <style>{`
        .mobile-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        .mobile-drawer-overlay.open {
          opacity: 1;
          visibility: visible;
        }

        .mobile-drawer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          max-height: 60%;
          background: #1a1a2e;
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          transform: translateY(100%);
          transition: transform 0.3s cubic-bezier(0.33, 1, 0.68, 1);
          display: flex;
          flex-direction: column;
        }

        .mobile-drawer.open {
          transform: translateY(0);
        }

        .drawer-handle {
          width: 40px;
          height: 4px;
          background: #444;
          border-radius: 2px;
          margin: 12px auto 0 auto;
        }

        .drawer-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px;
        }

        .drawer-section {
          padding-bottom: 20px;
        }

        .drawer-title {
          font-size: 16px;
          color: #fff;
          margin: 0 0 16px 0;
          font-weight: 600;
        }

        .drawer-waveform-grid {
          display: flex;
          gap: 10px;
        }

        .drawer-waveform-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 8px;
          background: #2a2a4e;
          border: 1px solid #333;
          border-radius: 12px;
          color: #aaa;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .drawer-waveform-btn.active {
          background: linear-gradient(135deg, rgba(0, 255, 170, 0.2), rgba(255, 0, 170, 0.2));
          border-color: #00ffaa;
          color: #00ffaa;
        }

        .drawer-waveform-btn .waveform-icon {
          font-size: 24px;
        }

        .drawer-waveform-btn .waveform-label {
          font-size: 12px;
        }

        .drawer-filter-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .drawer-filter-btn {
          padding: 10px 8px;
          background: #2a2a4e;
          border: 1px solid #333;
          border-radius: 8px;
          color: #aaa;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .drawer-filter-btn.active {
          background: linear-gradient(135deg, rgba(255, 0, 170, 0.3), rgba(0, 255, 170, 0.3));
          border-color: #ff00aa;
          color: #ff00aa;
        }

        .drawer-slider-group {
          margin-bottom: 20px;
        }

        .drawer-slider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          color: #aaa;
          font-size: 14px;
        }

        .drawer-slider-header .slider-value {
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
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00ffaa, #ff00aa);
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .drawer-preset-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-top: 16px;
        }

        .drawer-preset-btn {
          padding: 10px 4px;
          background: #2a2a4e;
          border: 1px solid #333;
          border-radius: 8px;
          color: #aaa;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .drawer-preset-btn:active {
          background: #3a3a5e;
          transform: scale(0.98);
        }

        .drawer-close {
          margin: 0 16px 20px 16px;
          padding: 14px;
          background: linear-gradient(135deg, #00ffaa, #00cc88);
          border: none;
          border-radius: 12px;
          color: #0a0a0f;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        @media (min-width: 769px) {
          .mobile-drawer-overlay {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default MobileDrawer;
