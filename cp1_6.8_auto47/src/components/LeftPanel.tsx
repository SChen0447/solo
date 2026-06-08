import React from 'react';
import { WaveformType, FilterType, ParticleConfig } from '../types';
import { waveformTypes, filterTypes } from '../utils';

interface LeftPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  waveformType: WaveformType;
  filterType: FilterType;
  onWaveformTypeChange: (type: WaveformType) => void;
  onFilterTypeChange: (type: FilterType) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  isOpen,
  onToggle,
  waveformType,
  filterType,
  onWaveformTypeChange,
  onFilterTypeChange,
}) => {
  return (
    <div className={`left-panel ${isOpen ? 'open' : 'closed'}`}>
      <button className="panel-toggle" onClick={onToggle}>
        {isOpen ? '◀' : '▶'}
      </button>

      <div className="panel-content">
        <div className="panel-section">
          <h4 className="section-title">波形样式</h4>
          <div className="waveform-options">
            {waveformTypes.map(wt => (
              <button
                key={wt.type}
                className={`waveform-option ${waveformType === wt.type ? 'active' : ''}`}
                onClick={() => onWaveformTypeChange(wt.type)}
              >
                <span className="waveform-icon">{wt.icon}</span>
                <span className="waveform-label">{wt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h4 className="section-title">滤镜效果</h4>
          <div className="filter-options">
            {filterTypes.map(ft => (
              <button
                key={ft.type}
                className={`filter-option ${filterType === ft.type ? 'active' : ''}`}
                onClick={() => onFilterTypeChange(ft.type)}
              >
                {ft.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-collapsed-label">
        <span>波形/滤镜</span>
      </div>

      <style>{`
        .left-panel {
          position: relative;
          height: 100%;
          background: rgba(26, 26, 46, 0.95);
          border-right: 1px solid #333;
          transition: width 0.3s cubic-bezier(0.33, 1, 0.68, 1);
          overflow: hidden;
          backdrop-filter: blur(12px);
        }

        .left-panel.open {
          width: 240px;
        }

        .left-panel.closed {
          width: 48px;
        }

        .panel-toggle {
          position: absolute;
          top: 12px;
          right: 8px;
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

        .left-panel.closed .panel-toggle {
          right: auto;
          left: 10px;
        }

        .panel-toggle:hover {
          background: #3a3a5e;
          color: #00ffaa;
          transform: scale(1.1);
        }

        .panel-content {
          padding: 50px 16px 16px 16px;
          opacity: 1;
          transition: opacity 0.2s ease;
        }

        .left-panel.closed .panel-content {
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

        .waveform-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .waveform-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: #2a2a4e;
          border: 1px solid #333;
          border-radius: 8px;
          color: #aaa;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .waveform-option:hover {
          background: #3a3a5e;
          border-color: #00ffaa44;
          transform: scale(1.02);
        }

        .waveform-option.active {
          background: linear-gradient(135deg, rgba(0, 255, 170, 0.2), rgba(255, 0, 170, 0.2));
          border-color: #00ffaa;
          color: #00ffaa;
        }

        .waveform-icon {
          font-size: 20px;
          width: 30px;
          text-align: center;
        }

        .waveform-label {
          font-size: 14px;
        }

        .filter-options {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .filter-option {
          padding: 6px 12px;
          background: #2a2a4e;
          border: 1px solid #333;
          border-radius: 6px;
          color: #aaa;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .filter-option:hover {
          background: #3a3a5e;
          border-color: #ff00aa44;
          transform: scale(1.05);
        }

        .filter-option.active {
          background: linear-gradient(135deg, rgba(255, 0, 170, 0.3), rgba(0, 255, 170, 0.3));
          border-color: #ff00aa;
          color: #ff00aa;
        }

        .panel-collapsed-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-90deg);
          white-space: nowrap;
          color: #666;
          font-size: 12px;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .left-panel.closed .panel-collapsed-label {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .left-panel {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default LeftPanel;
