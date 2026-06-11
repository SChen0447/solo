import React from 'react';
import { ScoreData } from './utils';

interface ScorePanelProps {
  scoreData: ScoreData | null;
  onRestart: () => void;
  onSaveScreenshot: () => void;
}

const ScorePanel: React.FC<ScorePanelProps> = ({
  scoreData,
  onRestart,
  onSaveScreenshot
}) => {
  if (!scoreData) return null;

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')} 秒`;
  };

  const getScoreGrade = (score: number): { label: string; color: string } => {
    if (score >= 90) return { label: '卓越', color: '#ffd700' };
    if (score >= 75) return { label: '优秀', color: '#c0c0c0' };
    if (score >= 60) return { label: '良好', color: '#cd7f32' };
    if (score >= 40) return { label: '合格', color: '#b87333' };
    return { label: '待改进', color: '#7a3a2a' };
  };

  const grade = getScoreGrade(scoreData.totalScore);

  return (
    <div className="score-panel-overlay">
      <style>{`
        .score-panel-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(59, 43, 26, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          backdrop-filter: blur(4px);
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .score-panel {
          background: linear-gradient(145deg, #5a3a2a, #3b2b1a);
          border: 4px solid #b87333;
          border-radius: 12px;
          padding: 30px 40px;
          min-width: 350px;
          box-shadow: 
            0 0 30px rgba(184, 115, 51, 0.3),
            inset 0 2px 4px rgba(255, 255, 255, 0.1);
          position: relative;
          animation: panelSlideIn 0.4s ease;
        }

        @keyframes panelSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .score-panel::before,
        .score-panel::after {
          content: '';
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #b87333;
          border: 2px solid #7a3a2a;
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.3);
        }

        .score-panel::before {
          top: 10px;
          left: 10px;
        }

        .score-panel::after {
          top: 10px;
          right: 10px;
        }

        .score-title {
          text-align: center;
          color: #f5deb3;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 25px;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
          letter-spacing: 3px;
          border-bottom: 2px solid #7a3a2a;
          padding-bottom: 15px;
        }

        .score-details {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-bottom: 25px;
        }

        .score-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background: rgba(59, 43, 26, 0.5);
          border: 1px solid #7a3a2a;
          border-radius: 6px;
        }

        .score-item-label {
          color: #f5deb3;
          font-size: 14px;
        }

        .score-item-value {
          color: #d4a574;
          font-size: 16px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
        }

        .total-score-section {
          text-align: center;
          margin-bottom: 25px;
          padding: 20px;
          background: linear-gradient(145deg, #8b6b4a, #6b4b2a);
          border: 3px solid #b87333;
          border-radius: 8px;
          position: relative;
        }

        .total-score-label {
          color: #f5deb3;
          font-size: 14px;
          margin-bottom: 8px;
          letter-spacing: 2px;
        }

        .total-score-value {
          font-size: 48px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          background: linear-gradient(180deg, #ffd700, #b87333);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: none;
          filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3));
          letter-spacing: 2px;
        }

        .score-grade {
          display: inline-block;
          margin-top: 10px;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
          letter-spacing: 2px;
          border: 2px solid currentColor;
        }

        .button-group {
          display: flex;
          gap: 15px;
          justify-content: center;
        }

        .steampunk-btn {
          padding: 12px 24px;
          border: 3px solid #b87333;
          border-radius: 8px;
          background: linear-gradient(145deg, #8b6b4a, #5a3a2a);
          color: #f5deb3;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 
            0 4px 8px rgba(0, 0, 0, 0.3),
            inset 0 2px 4px rgba(255, 255, 255, 0.1);
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
          letter-spacing: 1px;
          position: relative;
          font-family: 'Georgia', serif;
        }

        .steampunk-btn:hover {
          background: linear-gradient(145deg, #9b7b5a, #6a4a3a);
          border-color: #d4a574;
          transform: translateY(-2px);
          box-shadow: 
            0 6px 12px rgba(0, 0, 0, 0.4),
            inset 0 2px 4px rgba(255, 255, 255, 0.15);
        }

        .steampunk-btn:active {
          transform: translateY(0);
          box-shadow: 
            0 2px 4px rgba(0, 0, 0, 0.3),
            inset 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .steampunk-btn.primary {
          background: linear-gradient(145deg, #b87333, #7a3a2a);
          border-color: #d4a574;
        }

        .steampunk-btn.primary:hover {
          background: linear-gradient(145deg, #c88343, #8a4a3a);
        }

        .rivet {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #b87333;
          border: 1px solid #7a3a2a;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3);
        }

        .rivet.top-left { top: 5px; left: 5px; }
        .rivet.top-right { top: 5px; right: 5px; }
        .rivet.bottom-left { bottom: 5px; left: 5px; }
        .rivet.bottom-right { bottom: 5px; right: 5px; }

        @media (max-width: 768px) {
          .score-panel {
            min-width: 280px;
            padding: 20px;
            margin: 20px;
          }

          .score-title {
            font-size: 20px;
          }

          .total-score-value {
            font-size: 36px;
          }

          .button-group {
            flex-direction: column;
          }

          .steampunk-btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="score-panel">
        <div className="rivet top-left"></div>
        <div className="rivet top-right"></div>
        <div className="rivet bottom-left"></div>
        <div className="rivet bottom-right"></div>

        <h2 className="score-title">◆ 竞速成绩 ◆</h2>

        <div className="score-details">
          <div className="score-item">
            <span className="score-item-label">总时间</span>
            <span className="score-item-value">{formatTime(scoreData.totalTime)}</span>
          </div>
          <div className="score-item">
            <span className="score-item-label">碰撞次数</span>
            <span className="score-item-value">{scoreData.collisions} 次</span>
          </div>
          <div className="score-item">
            <span className="score-item-label">耐久度余量</span>
            <span className="score-item-value">{Math.round(scoreData.durability)}%</span>
          </div>
        </div>

        <div className="total-score-section">
          <div className="total-score-label">综合评分</div>
          <div className="total-score-value">{scoreData.totalScore}</div>
          <div className="score-grade" style={{ color: grade.color }}>
            {grade.label}
          </div>
        </div>

        <div className="button-group">
          <button className="steampunk-btn primary" onClick={onRestart}>
            重新组装
          </button>
          <button className="steampunk-btn" onClick={onSaveScreenshot}>
            保存截图
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScorePanel;
