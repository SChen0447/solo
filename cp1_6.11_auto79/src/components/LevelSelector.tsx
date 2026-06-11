import { useGame } from '../context/GameContext';
import './LevelSelector.css';

export default function LevelSelector() {
  const { state, setLevel } = useGame();
  const { levels, currentLevelId } = state;

  const renderMiniMaze = (level: typeof levels[0]) => {
    const cellSize = Math.min(40 / level.size, 8);
    return (
      <div className="mini-maze" style={{ width: level.size * cellSize, height: level.size * cellSize }}>
        {level.grid.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              className={`mini-cell mini-${cell}`}
              style={{
                width: cellSize,
                height: cellSize,
                left: x * cellSize,
                top: y * cellSize,
              }}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <div className="level-selector">
      <h3>选择关卡</h3>
      <div className="levels-grid">
        {levels.map(level => (
          <div
            key={level.id}
            className={`level-card ${currentLevelId === level.id ? 'active' : ''}`}
            onClick={() => setLevel(level.id)}
          >
            <div className="level-preview">
              {renderMiniMaze(level)}
            </div>
            <div className="level-info">
              <span className="level-name">{level.name}</span>
              <span className="level-stats">
                {level.size}×{level.size} · {level.fragments.length}碎片
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
