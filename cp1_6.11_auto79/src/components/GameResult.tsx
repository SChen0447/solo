import { useGame } from '../context/GameContext';
import './GameResult.css';

type Grade = 'S' | 'A' | 'B' | 'C';

function calculateGrade(collected: number, total: number, steps: number): Grade {
  const collectionRate = collected / total;
  if (collectionRate === 1 && steps < 8) return 'S';
  if (collectionRate >= 0.8 && steps < 12) return 'A';
  if (collectionRate >= 0.5) return 'B';
  return 'C';
}

export default function GameResult() {
  const { state, currentLevel, resetGame } = useGame();
  const { gameStatus, robot } = state;

  if (gameStatus !== 'success' && gameStatus !== 'failed') {
    return null;
  }

  const grade = calculateGrade(
    robot.collectedFragments.length,
    currentLevel.fragments.length,
    robot.steps
  );

  const gradeInfo: Record<Grade, { label: string; description: string }> = {
    S: { label: 'S级 - 完美通关！', description: '你是编程大师！' },
    A: { label: 'A级 - 优秀！', description: '非常棒的表现！' },
    B: { label: 'B级 - 良好', description: '继续加油！' },
    C: { label: 'C级 - 通过', description: '还可以做得更好！' },
  };

  return (
    <div className="result-overlay">
      <div className={`result-modal grade-${grade} ${gameStatus}`}>
        {gameStatus === 'success' ? (
          <>
            <div className="result-grade">
              <span className="grade-letter">{grade}</span>
            </div>
            <h2 className="result-title">{gradeInfo[grade].label}</h2>
            <p className="result-desc">{gradeInfo[grade].description}</p>

            <div className="result-stats">
              <div className="result-stat">
                <span className="stat-icon">⭐</span>
                <span className="stat-value">
                  {robot.collectedFragments.length}/{currentLevel.fragments.length}
                </span>
                <span className="stat-label">代码碎片</span>
              </div>
              <div className="result-stat">
                <span className="stat-icon">👣</span>
                <span className="stat-value">{robot.steps}</span>
                <span className="stat-label">执行步数</span>
              </div>
            </div>

            <button className="result-btn" onClick={resetGame}>
              再玩一次
            </button>
          </>
        ) : (
          <>
            <div className="error-icon">⚠️</div>
            <h2 className="result-title error-title">代码错误</h2>
            <p className="result-desc">机器人撞到墙了！检查你的指令序列。</p>
            <p className="result-hint">角色将在0.5秒后返回起点</p>
          </>
        )}
      </div>
    </div>
  );
}
