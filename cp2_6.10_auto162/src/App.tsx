import React, { useState, useRef, useCallback, useEffect } from 'react';
import MazeCanvas, { type EditMode } from './components/MazeCanvas';
import SpritePanel from './components/SpritePanel';
import { generateMaze, type MazeGrid } from './utils/mazeGenerator';
import { exportMazeData, type CharacterType } from './utils/exportUtils';
import './index.css';

const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 10;

const App: React.FC = () => {
  const [maze, setMaze] = useState<MazeGrid>(() => generateMaze(DEFAULT_ROWS, DEFAULT_COLS));
  const [characterType, setCharacterType] = useState<CharacterType>('knight');
  const [frameDelays, setFrameDelays] = useState<number[]>(() => new Array(16).fill(100));
  const [editMode, setEditMode] = useState<EditMode>('wall');
  const [mazeRows, setMazeRows] = useState(DEFAULT_ROWS);
  const [mazeCols, setMazeCols] = useState(DEFAULT_COLS);
  const [isDragging, setIsDragging] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(340);
  const [exportPressed, setExportPressed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const handleRegenerate = useCallback(() => {
    setMaze(generateMaze(mazeRows, mazeCols));
  }, [mazeRows, mazeCols]);

  const handleExport = useCallback(() => {
    setExportPressed(true);
    setTimeout(() => setExportPressed(false), 100);
    exportMazeData(maze, characterType, frameDelays);
  }, [maze, characterType, frameDelays]);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = rightPanelWidth;
    e.preventDefault();
  }, [rightPanelWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = dragStartX.current - e.clientX;
      const newWidth = Math.max(280, Math.min(500, dragStartWidth.current + delta));
      setRightPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="app-container" ref={containerRef}>
      <div className="top-bar">
        <button
          className={`export-btn ${exportPressed ? 'pressed' : ''}`}
          onClick={handleExport}
        >
          导出
        </button>
        <div className="toolbar-section">
          <label className="toolbar-label">
            行:
            <input
              type="number"
              className="toolbar-input"
              min={5}
              max={30}
              value={mazeRows}
              onChange={(e) => setMazeRows(Math.max(5, Math.min(30, Number(e.target.value))))}
            />
          </label>
          <label className="toolbar-label">
            列:
            <input
              type="number"
              className="toolbar-input"
              min={5}
              max={30}
              value={mazeCols}
              onChange={(e) => setMazeCols(Math.max(5, Math.min(30, Number(e.target.value))))}
            />
          </label>
          <button className="toolbar-btn" onClick={handleRegenerate}>
            重新生成
          </button>
        </div>
        <div className="toolbar-section">
          <button
            className={`tool-btn ${editMode === 'wall' ? 'active' : ''}`}
            onClick={() => setEditMode('wall')}
          >
            墙壁绘制
          </button>
          <button
            className={`tool-btn ${editMode === 'erase' ? 'active' : ''}`}
            onClick={() => setEditMode('erase')}
          >
            擦除
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="maze-area">
          <MazeCanvas
            maze={maze}
            onMazeChange={setMaze}
            characterType={characterType}
            frameDelays={frameDelays}
            currentFrame={0}
            editMode={editMode}
          />
          <div className="maze-hint">
            使用 WASD 键移动角色 · 鼠标点击/拖拽编辑迷宫
          </div>
        </div>

        <div
          className={`divider ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleDividerMouseDown}
        />

        <div
          className="right-panel"
          style={{ width: `${rightPanelWidth}px` }}
        >
          <SpritePanel
            characterType={characterType}
            onCharacterChange={setCharacterType}
            frameDelays={frameDelays}
            onFrameDelaysChange={setFrameDelays}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
