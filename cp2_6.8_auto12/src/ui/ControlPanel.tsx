import React from 'react';
import type { GameState } from '../game/types';
import './ControlPanel.css';

interface ControlPanelProps {
  gameState: GameState;
  onSpeedToggle: () => void;
  onReset: () => void;
  speedPulse: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  gameState,
  onSpeedToggle,
  onReset,
  speedPulse,
}) => {
  const curvaturePercent = Math.round(gameState.currentCurvature * 100);
  const damageBonus = Math.round(gameState.currentCurvature * 50);

  const getCurvatureColor = (curvature: number): string => {
    if (curvature < 0.33) {
      return `rgb(${Math.floor(0 + curvature * 3 * 255)}, 255, 0)`;
    } else if (curvature < 0.66) {
      const t = (curvature - 0.33) / 0.33;
      return `255, ${Math.floor(255 - t * 200)}, 0`;
    } else {
      const t = (curvature - 0.66) / 0.34;
      return `255, ${Math.floor(55 - t * 55)}, ${Math.floor(0 + t * 50)}`;
    }
  };

  const curvatureColor = getCurvatureColor(gameState.currentCurvature);

  const arcSize = 60;
  const strokeWidth = 6;
  const radius = (arcSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = gameState.currentCurvature;
  const dashOffset = circumference * (1 - progress * 0.5);

  return (
    <div className={`control-panel ${speedPulse ? 'pulse' : ''}`}>
      <div className="panel-section stats-section">
        <div className="stat-item">
          <span className="stat-label">分数</span>
          <span className="stat-value score">{gameState.score}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">生命</span>
          <span className="stat-value lives">
            <span className="heart">❤</span> {gameState.lives}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">波数</span>
          <span className="stat-value wave">{gameState.wave}</span>
        </div>
      </div>

      <div className="panel-section curvature-section">
        <div className="curvature-label">路径曲率 / 伤害加成</div>
        <div className="curvature-indicator">
          <svg width={arcSize} height={arcSize} className="curvature-arc">
            <circle
              cx={arcSize / 2}
              cy={arcSize / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={arcSize / 2}
              cy={arcSize / 2}
              r={radius}
              fill="none"
              stroke={`rgb(${curvatureColor})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference * 0.5}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${arcSize / 2} ${arcSize / 2})`}
              style={{ transition: 'stroke-dashoffset 0.2s ease, stroke 0.2s ease' }}
            />
          </svg>
          <div className="curvature-value">
            <span className="bonus-percent">+{damageBonus}%</span>
          </div>
        </div>
      </div>

      <div className="panel-section buttons-section">
        <button
          className={`control-btn speed-btn ${gameState.speed === 2 ? 'active' : ''}`}
          onClick={onSpeedToggle}
        >
          {gameState.speed === 2 ? '2x 加速' : '1x 正常'}
        </button>
        <button className="control-btn reset-btn" onClick={onReset}>
          重置
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
