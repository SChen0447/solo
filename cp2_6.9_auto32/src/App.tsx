import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import DiceRoller from './components/DiceRoller';
import CharGenerator from './components/CharGenerator';
import {
  RollResult,
  DICE_COLORS,
  formatTime,
} from './utils/diceLogic';
import './styles.css';

function App() {
  const [rollHistory, setRollHistory] = useState<RollResult[]>([]);
  const [rollCount, setRollCount] = useState(0);

  const handleRollComplete = (result: RollResult) => {
    setRollHistory((prev) => {
      const newHistory = [result, ...prev];
      return newHistory.slice(0, 20);
    });
    setRollCount((prev) => prev + 1);
  };

  const handleDeleteRecord = (id: string) => {
    setRollHistory((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="app-wrapper">
      <div className="parchment">
        <header className="app-header">
          <h1 className="app-title">🎲 命运骰子 · D&D 角色生成器</h1>
          <div className="roll-counter">
            <span className="counter-label">已投掷</span>
            <span className="counter-value">{rollCount}</span>
            <span className="counter-label">次</span>
          </div>
        </header>

        <div className="divider" />

        <main className="main-content">
          <section className="left-panel">
            <DiceRoller onRollComplete={handleRollComplete} />
          </section>

          <section className="right-panel">
            <CharGenerator />
          </section>
        </main>

        <div className="divider" />

        <footer className="history-section">
          <h2 className="section-title">📜 投掷历史记录</h2>
          <div className="history-panel">
            {rollHistory.length === 0 ? (
              <div className="empty-history">暂无记录，开始投掷骰子吧！</div>
            ) : (
              <ul className="history-list">
                {rollHistory.map((record) => (
                  <li key={record.id} className="history-item">
                    <div
                      className="history-dice-icon"
                      style={{ backgroundColor: DICE_COLORS[record.type] }}
                    >
                      {record.type.replace('d', '')}
                    </div>
                    <div className="history-info">
                      <div className="history-meta">
                        <span className="history-time">{formatTime(record.timestamp)}</span>
                        <span className="history-type">
                          {record.count}{record.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="history-detail">
                        {record.count > 1 ? (
                          <>
                            <span className="history-values">
                              [{record.rolls.map((r) => r.value).join(', ')}]
                            </span>
                            <span className="history-total">= {record.total}</span>
                          </>
                        ) : (
                          <span className="history-single">结果: {record.total}</span>
                        )}
                      </div>
                    </div>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteRecord(record.id)}
                      title="删除记录"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
