import React from 'react';
import { Position, GameStatus, PATH_COOLDOWN } from '../utils/gameTypes';

interface StatusPanelProps {
  health: number;
  position: Position;
  elapsedTime: number;
  pathCooldown: number;
  gameStatus: GameStatus;
  isSlowed: boolean;
  onRestart: () => void;
}

const StatusPanel: React.FC<StatusPanelProps> = ({
  health,
  position,
  elapsedTime,
  pathCooldown,
  gameStatus,
  isSlowed,
  onRestart,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const cooldownPercent = Math.max(0, Math.min(100, (pathCooldown / PATH_COOLDOWN) * 100));
  const canUsePath = pathCooldown <= 0;

  return (
    <div className="status-panel">
      <h2 className="status-title">玩家状态</h2>

      <div className="status-item">
        <span className="status-label">生命值</span>
        <div className="health-bar">
          <div
            className="health-fill"
            style={{ width: `${health}%` }}
          />
          <span className="health-text">{health}%</span>
        </div>
      </div>

      <div className="status-item">
        <span className="status-label">位置</span>
        <span className="status-value">
          ({position.x}, {position.y})
        </span>
      </div>

      <div className="status-item">
        <span className="status-label">已用时间</span>
        <span className="status-value time-value">{formatTime(elapsedTime)}</span>
      </div>

      <div className="status-item">
        <span className="status-label">路径辅助</span>
        <div className="cooldown-container">
          <div className="cooldown-bar">
            <div
              className="cooldown-fill"
              style={{ width: `${100 - cooldownPercent}%` }}
            />
          </div>
          <span className={`cooldown-status ${canUsePath ? 'ready' : 'cooling'}`}>
            {canUsePath ? '按空格使用' : `${(pathCooldown / 1000).toFixed(1)}s`}
          </span>
        </div>
      </div>

      {isSlowed && (
        <div className="debuff-indicator">
          <span className="debuff-icon">⚠</span>
          <span className="debuff-text">陷阱减速中</span>
        </div>
      )}

      {gameStatus !== 'playing' && (
        <div className={`game-result ${gameStatus}`}>
          <h3>{gameStatus === 'won' ? '🎉 胜利！' : '💀 游戏结束'}</h3>
          <p>用时: {formatTime(elapsedTime)}</p>
        </div>
      )}

      <button className="restart-button" onClick={onRestart}>
        重新开始
      </button>

      <div className="controls-hint">
        <p className="hint-title">操作说明</p>
        <p>方向键 / WASD: 移动</p>
        <p>空格: 显示路径</p>
        <p>R: 重新开始</p>
      </div>
    </div>
  );
};

export default StatusPanel;
