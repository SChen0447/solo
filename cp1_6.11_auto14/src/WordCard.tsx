import type { WordData } from './App';

interface WordCardProps {
  card: WordData;
  onFlip: () => void;
  onMastered: () => void;
  onReview: () => void;
}

const WordCard = ({ card, onFlip, onMastered, onReview }: WordCardProps) => {
  return (
    <div className={`card-wrapper ${card.isFlyingOut ? 'fly-out' : ''}`}>
      <div
        className={`card ${card.isFlipped ? 'flipped' : ''}`}
        onClick={onFlip}
      >
        <div className="card-face card-front">
          <div className="card-hint">点击翻转查看释义</div>
          <h2 className="card-word">{card.word}</h2>
          <div className="card-speaker">🔊</div>
        </div>
        <div className="card-face card-back">
          <h3 className="card-meaning">{card.meaning}</h3>
          <div className="card-example-label">例句：</div>
          <p className="card-example">"{card.example}"</p>
          <div className="card-hint-small">点击翻回正面</div>
        </div>
      </div>

      <div className="card-actions">
        <button
          className="btn-review"
          onClick={onReview}
        >
          ↻ 需复习
        </button>
        <button
          className="btn-mastered"
          onClick={onMastered}
        >
          ✓ 已掌握
        </button>
      </div>
    </div>
  );
};

export default WordCard;
