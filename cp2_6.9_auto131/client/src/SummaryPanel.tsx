import { useState, useMemo } from 'react';
import type { SummaryCard, StyleType } from '../../shared/types';
import './SummaryPanel.css';

interface SummaryPanelProps {
  summaries: SummaryCard[];
  currentStyle: StyleType;
  onStyleChange: (style: StyleType) => void;
  onCardClick: (index: number) => void;
  onExport: () => void;
  hasSummaries: boolean;
  onNewDocument: () => void;
}

const styleLabels: Record<StyleType, string> = {
  formal: '正式',
  concise: '简洁',
  vivid: '生动'
};

function SummaryPanel({
  summaries,
  currentStyle,
  onStyleChange,
  onCardClick,
  onExport,
  hasSummaries,
  onNewDocument
}: SummaryPanelProps) {
  const [styleTransition, setStyleTransition] = useState(false);

  const sliderValue = useMemo(() => {
    switch (currentStyle) {
      case 'formal': return 0;
      case 'concise': return 1;
      case 'vivid': return 2;
      default: return 1;
    }
  }, [currentStyle]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    let newStyle: StyleType;
    if (value <= 0) newStyle = 'formal';
    else if (value >= 2) newStyle = 'vivid';
    else newStyle = 'concise';

    if (newStyle !== currentStyle) {
      setStyleTransition(true);
      onStyleChange(newStyle);
      setTimeout(() => setStyleTransition(false), 200);
    }
  };

  return (
    <div className="summary-panel">
      <div className="summary-header">
        <div className="header-top">
          <h2 className="panel-title">✨ 智能摘要</h2>
          <button className="new-doc-btn" onClick={onNewDocument}>
            📝 新文档
          </button>
        </div>

        <div className="style-control">
          <div className="style-labels">
            <span className={`style-label ${currentStyle === 'formal' ? 'active' : ''}`}>
              正式
            </span>
            <span className={`style-label ${currentStyle === 'concise' ? 'active' : ''}`}>
              简洁
            </span>
            <span className={`style-label ${currentStyle === 'vivid' ? 'active' : ''}`}>
              生动
            </span>
          </div>
          <div className="slider-container">
            <div className="slider-track">
              <div className="slider-fill" style={{ width: `${(sliderValue / 2) * 100}%` }} />
              <div
                className="slider-thumb"
                style={{ left: `calc(${(sliderValue / 2) * 100}% - 12px)` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="1"
              value={sliderValue}
              onChange={handleSliderChange}
              className="slider-input"
            />
            <div className="slider-marks">
              <span className="mark" />
              <span className="mark" />
              <span className="mark" />
            </div>
          </div>
          <div className="current-style-badge">
            当前风格: <strong>{styleLabels[currentStyle]}</strong>
          </div>
        </div>
      </div>

      <div className="summary-content">
        {!hasSummaries ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p className="empty-text">正在等待文档分析...</p>
          </div>
        ) : (
          <div className={`summary-cards ${styleTransition ? 'fading' : ''}`}>
            {summaries.map((card, i) => (
              <div
                key={`${card.index}-${i}`}
                className="summary-card"
                onClick={() => onCardClick(card.index)}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="card-index">
                  <span className="index-number">#{card.index + 1}</span>
                </div>
                <div className="card-content">
                  <p className="card-sentence">
                    {card.styledSentence || card.sentence}
                  </p>
                  <div className="card-meta">
                    <span className="score-label">TF-IDF</span>
                    <div className="score-bar">
                      <div
                        className="score-fill"
                        style={{ width: `${card.score * 100}%` }}
                      />
                    </div>
                    <span className="score-value">{card.score.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="summary-footer">
        <button
          className="export-btn"
          onClick={onExport}
          disabled={!hasSummaries}
        >
          📥 导出摘要
        </button>
      </div>
    </div>
  );
}

export default SummaryPanel;
