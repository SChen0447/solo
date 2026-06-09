import { useState, useCallback, useEffect, useMemo } from 'react';
import HexGrid from './components/HexGrid';
import BeamRenderer from './components/BeamRenderer';
import { PathSolver } from './core/PathSolver';
import type { CellType, HexCoord, PathNode } from './types';
import './App.css';

const GRID_WIDTH = 12;
const GRID_HEIGHT = 10;

function App() {
  const [grid, setGrid] = useState<CellType[][]>(() =>
    PathSolver.generateGrid(GRID_WIDTH, GRID_HEIGHT, 0.2)
  );
  const [start, setStart] = useState<HexCoord | null>(null);
  const [end, setEnd] = useState<HexCoord | null>(null);
  const [path, setPath] = useState<PathNode[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const hexSize = useMemo(() => {
    if (windowWidth < 768) {
      return 22;
    }
    return 32;
  }, [windowWidth]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const recalculatePath = useCallback(
    (currentGrid: CellType[][], currentStart: HexCoord | null, currentEnd: HexCoord | null) => {
      if (currentStart && currentEnd) {
        const solver = new PathSolver(currentGrid);
        const result = solver.findPath(currentStart, currentEnd);
        if (result) {
          setPath(result);
          setIsAnimating(true);
          setError(null);
        } else {
          setPath([]);
          setError('无法找到路径！');
          setTimeout(() => setError(null), 2000);
        }
      }
    },
    []
  );

  const handleHexClick = useCallback(
    (coord: HexCoord) => {
      if (isAnimating) return;

      if (editMode) {
        setGrid((prev) => {
          const newGrid = prev.map((row) => [...row]);
          if (newGrid[coord.y][coord.x] === 'obstacle') {
            newGrid[coord.y][coord.x] = 'grass';
          } else {
            newGrid[coord.y][coord.x] = 'obstacle';
          }

          if (start && start.x === coord.x && start.y === coord.y) {
            setStart(null);
            setPath([]);
          }
          if (end && end.x === coord.x && end.y === coord.y) {
            setEnd(null);
            setPath([]);
          }

          setTimeout(() => {
            recalculatePath(newGrid, start, end);
          }, 0);

          return newGrid;
        });
        return;
      }

      if (grid[coord.y][coord.x] === 'obstacle') return;

      if (!start) {
        setStart(coord);
        setPath([]);
      } else if (!end) {
        setEnd(coord);
      } else {
        setStart(coord);
        setEnd(null);
        setPath([]);
      }
    },
    [grid, start, end, isAnimating, editMode, recalculatePath]
  );

  const handleGenerateBridge = useCallback(() => {
    if (!start || !end) {
      setError('请先设置起点和终点！');
      setTimeout(() => setError(null), 2000);
      return;
    }

    recalculatePath(grid, start, end);
  }, [start, end, grid, recalculatePath]);

  const handleReset = useCallback(() => {
    setGrid(PathSolver.generateGrid(GRID_WIDTH, GRID_HEIGHT, 0.2));
    setStart(null);
    setEnd(null);
    setPath([]);
    setIsAnimating(false);
    setError(null);
  }, []);

  const handleToggleEditMode = useCallback(() => {
    setEditMode((prev) => !prev);
    setPath([]);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const getHintText = (): string => {
    if (error) return error;
    if (editMode) return '编辑模式：点击地块切换障碍物';
    if (isAnimating) return '光桥生成中...';
    if (path.length > 0) return `光桥已生成，共 ${path.length} 个节点`;
    if (!start) return '请点击设置起点';
    if (!end) return '请点击设置终点';
    return '点击"生成光桥"按钮开始';
  };

  return (
    <div className="app-container">
      <div className="bg-grid" />

      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">⚡</span>
          六边形光桥生成器
          <span className="title-icon">⚡</span>
        </h1>
        <p className="app-subtitle">HEX LIGHT BRIDGE GENERATOR</p>
      </header>

      <div className="control-bar">
        <button
          className={`control-btn ${path.length > 0 ? 'active' : ''}`}
          onClick={handleGenerateBridge}
          disabled={isAnimating}
        >
          <span className="btn-icon">✨</span>
          生成光桥
        </button>

        <button
          className={`control-btn ${editMode ? 'edit-active' : ''}`}
          onClick={handleToggleEditMode}
        >
          <span className="btn-icon">🔧</span>
          编辑模式
        </button>

        <button className="control-btn reset-btn" onClick={handleReset}>
          <span className="btn-icon">🔄</span>
          重置
        </button>
      </div>

      <div className="grid-wrapper">
        <div className="grid-container">
          <div className="grid-inner">
            <HexGrid
              grid={grid}
              start={start}
              end={end}
              hexSize={hexSize}
              onHexClick={handleHexClick}
            />
            {path.length > 0 && (
              <BeamRenderer
                path={path}
                hexSize={hexSize}
                gridWidth={GRID_WIDTH}
                gridHeight={GRID_HEIGHT}
                isAnimating={isAnimating}
                onAnimationComplete={handleAnimationComplete}
              />
            )}
          </div>
        </div>
      </div>

      <div className={`hint-bar ${error ? 'error' : ''} ${isAnimating ? 'animating' : ''}`}>
        <span className="hint-icon">
          {error ? '⚠️' : isAnimating ? '⚡' : '💡'}
        </span>
        <span className="hint-text">{getHintText()}</span>
      </div>

      <div className="legend">
        <div className="legend-item">
          <div className="legend-color start-color" />
          <span>起点</span>
        </div>
        <div className="legend-item">
          <div className="legend-color end-color" />
          <span>终点</span>
        </div>
        <div className="legend-item">
          <div className="legend-color obstacle-color" />
          <span>障碍物</span>
        </div>
        <div className="legend-item">
          <div className="legend-color grass-color" />
          <span>可通行</span>
        </div>
      </div>
    </div>
  );
}

export default App;
