import React, { useState, useCallback, useRef, useEffect } from 'react';
import PeriodicTable from './components/PeriodicTable';
import ElementDetail from './components/ElementDetail';
import EquationChallenge from './components/EquationChallenge';
import { type Element } from './data/elements';
import './App.css';

type ViewMode = 'table' | 'list';

const App: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [splitRatio, setSplitRatio] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startRatioRef = useRef(0);

  const handleSelectElement = useCallback((element: Element) => {
    setSelectedElement(element);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedElement(null);
  }, []);

  const handleScoreUpdate = useCallback((newScore: number, correct: number, total: number) => {
    setScore(newScore);
    setCorrectCount(correct);
    setTotalAnswered(total);
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startRatioRef.current = splitRatio;
  }, [splitRatio]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const deltaY = startYRef.current - e.clientY;
      const deltaRatio = (deltaY / rect.height) * 100;
      const newRatio = Math.min(80, Math.max(30, startRatioRef.current + deltaRatio));
      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const correctRate = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;

  const getProgressGradient = () => {
    if (correctRate >= 80) return 'linear-gradient(90deg, #2ed573, #7bed9f)';
    if (correctRate >= 60) return 'linear-gradient(90deg, #2ed573, #ffa502)';
    return 'linear-gradient(90deg, #ffa502, #ff4757)';
  };

  return (
    <div className="app-container" ref={containerRef}>
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">⚗️ 化学元素周期表</h1>
          <p className="app-subtitle">探索元素奥秘 · 挑战方程式配平</p>
        </div>
        
        <div className="header-center">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
            >
              📊 周期表
            </button>
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
            >
              📋 列表
            </button>
          </div>
        </div>

        <div className="header-right">
          <div className="score-display">
            <div className="score-info">
              <span className="score-value">{score}</span>
              <span className="score-label">分 / 100</span>
            </div>
            <div className="score-stats">
              <span>已答: {totalAnswered}/10</span>
              <span>正确率: {totalAnswered > 0 ? Math.round(correctRate) : 0}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(score / 100) * 100}%`,
                  background: getProgressGradient(),
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="main-content" style={{ gridTemplateRows: `${splitRatio}% 6px ${100 - splitRatio}%` }}>
        <div className="top-panel">
          <PeriodicTable
            onSelectElement={handleSelectElement}
            viewMode={viewMode}
          />
        </div>

        <div
          className={`split-handle ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleDragStart}
          role="separator"
          aria-orientation="horizontal"
          aria-label="拖拽调整面板大小"
          tabIndex={0}
        >
          <div className="handle-line" />
          <div className="handle-line" />
          <div className="handle-line" />
        </div>

        <div className="bottom-panel">
          <EquationChallenge onScoreUpdate={handleScoreUpdate} />
        </div>
      </div>

      <ElementDetail element={selectedElement} onClose={handleCloseDetail} />

      {correctRate > 0 && correctRate < 60 && totalAnswered >= 3 && (
        <div className="study-tip-banner">
          💡 正确率低于60%，建议多复习元素规律哦！
        </div>
      )}
    </div>
  );
};

export default App;
