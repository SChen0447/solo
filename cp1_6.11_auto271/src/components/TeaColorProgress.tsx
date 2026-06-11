import React from 'react';
import { TeaState, TeaVarietyConfig } from '../FermentationEngine';

interface TeaColorProgressProps {
  state: TeaState;
  config: TeaVarietyConfig;
}

const TeaColorProgress: React.FC<TeaColorProgressProps> = ({ state, config }) => {
  const gradientStyle = {
    background: `linear-gradient(to right, rgb(${config.initialColor.r}, ${config.initialColor.g}, ${config.initialColor.b}), rgb(${config.finalColor.r}, ${config.finalColor.g}, ${config.finalColor.b}))`
  };

  return (
    <div className="color-progress-section">
      <div className="color-progress-label">
        <span>🍂 茶叶色泽变化</span>
        <span>进度: {Math.round(state.progress * 100)}%</span>
      </div>
      <div className="color-gradient-bar" style={gradientStyle}>
        <div
          className="color-indicator"
          style={{ left: `${state.progress * 100}%` }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--color-text-light)' }}>
        <span>初始色</span>
        <span>当前: {state.colorHex}</span>
        <span>最终色</span>
      </div>
    </div>
  );
};

export default TeaColorProgress;
