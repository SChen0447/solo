import { useState } from 'react';
import { GameState } from '../types';

interface ControlPanelProps {
  gameState: GameState;
  speed: number;
  killedCount: number;
  totalMonsters: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onDeployTowers: () => void;
  towersDeployed: boolean;
}

export function ControlPanel({
  gameState,
  speed,
  killedCount,
  totalMonsters,
  onStart,
  onPause,
  onResume,
  onReset,
  onSpeedChange,
  onDeployTowers,
  towersDeployed
}: ControlPanelProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  return (
    <div className={`control-panel ${isPanelOpen ? 'open' : 'collapsed'}`}>
      <button
        className="panel-toggle"
        onClick={() => setIsPanelOpen(!isPanelOpen)}
      >
        {isPanelOpen ? '收起' : '展开'}
      </button>

      <div className="panel-content">
        <h2 className="panel-title">战略指挥台</h2>

        <div className="stat-card">
          <div className="stat-item">
            <span className="stat-label">击杀数</span>
            <span className="stat-value">{killedCount} / {totalMonsters}</span>
          </div>
        </div>

        <div className="button-group">
          {gameState === 'idle' && (
            <button className="btn btn-primary" onClick={onStart}>
              开始进攻
            </button>
          )}

          {gameState === 'playing' && (
            <button className="btn btn-warning" onClick={onPause}>
              暂停
            </button>
          )}

          {gameState === 'paused' && (
            <button className="btn btn-success" onClick={onResume}>
              继续
            </button>
          )}

          <button className="btn btn-danger" onClick={onReset}>
            重置
          </button>
        </div>

        <div className="deploy-section">
          <button
            className={`btn btn-deploy ${towersDeployed ? 'disabled' : ''}`}
            onClick={onDeployTowers}
            disabled={towersDeployed || gameState !== 'idle'}
          >
            {towersDeployed ? '炮塔已部署' : '部署炮塔'}
          </button>
          <p className="deploy-hint">
            {towersDeployed
              ? '拖拽炮塔到战略位置'
              : '点击部署三个可移动炮塔'}
          </p>
        </div>

        <div className="speed-control">
          <label className="speed-label">
            游戏速度: {speed.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="speed-slider"
          />
          <div className="speed-marks">
            <span>0.5x</span>
            <span>1x</span>
            <span>1.5x</span>
            <span>2x</span>
          </div>
        </div>

        <div className="instructions">
          <h3>操作说明</h3>
          <ul>
            <li>点击"部署炮塔"放置炮塔</li>
            <li>拖拽炮塔调整位置</li>
            <li>点击"开始进攻"开始游戏</li>
            <li>消灭所有怪物获得胜利</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
