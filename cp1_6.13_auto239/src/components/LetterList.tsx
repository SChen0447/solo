import type { LetterSummary } from '../types';
import './LetterList.css';

interface LetterListProps {
  letters: LetterSummary[];
  loading: boolean;
  onCreateClick: () => void;
  onLetterClick: (id: string) => void;
  onRefresh: () => void;
}

function LetterList({ letters, loading, onCreateClick, onLetterClick }: LetterListProps) {
  return (
    <div className="letter-list-container">
      <div className="header">
        <h1 className="title">
          <span className="title-glow">余音</span>
          <span className="title-divider">·</span>
          <span className="title-glow">光信笺</span>
        </h1>
        <p className="subtitle">用光影与声音，传递心底的话</p>
      </div>

      <button className="glow-button create-btn" onClick={onCreateClick}>
        ✦ 写一封光信笺
      </button>

      <div className="letters-grid">
        {loading ? (
          <div className="loading-text">加载中...</div>
        ) : letters.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✉</div>
            <p>还没有信笺，写第一封吧</p>
          </div>
        ) : (
          letters.map((letter, index) => (
            <div
              key={letter.id}
              className="letter-card"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => onLetterClick(letter.id)}
            >
              <div className="card-glow" />
              <div className="card-content">
                <div className="card-header">
                  <h3 className="card-title">{letter.title}</h3>
                  <span className="lock-icon" title="已加密">
                    {letter.hasPassword ? '🔒' : '🔓'}
                  </span>
                </div>
                <div className="card-footer">
                  <span className="remaining-badge">
                    剩余 {letter.remainingOpens} 次
                  </span>
                  {letter.isRead && <span className="read-badge">已读</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default LetterList;
