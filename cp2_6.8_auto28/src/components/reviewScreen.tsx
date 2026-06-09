import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardDeck, ReviewGrade } from '../types';
import { schedule, getDueCards } from '../srsEngine';

interface ReviewScreenProps {
  deck: CardDeck;
  cards: Card[];
  onGradeCard: (card: Card, grade: ReviewGrade) => void;
  onBack: () => void;
}

const ReviewScreen: React.FC<ReviewScreenProps> = ({
  deck,
  cards,
  onGradeCard,
  onBack
}) => {
  const dueCards = useMemo(() => getDueCards(cards), [cards]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setReviewedCount(0);
    setIsComplete(dueCards.length === 0);
  }, [deck.id]);

  const currentCard = dueCards[currentIndex];
  const totalDue = dueCards.length;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleGrade = (grade: ReviewGrade) => {
    if (!currentCard) return;
    
    const updatedCard = schedule(currentCard, grade);
    onGradeCard(updatedCard, grade);
    
    setReviewedCount(prev => prev + 1);
    
    if (currentIndex >= dueCards.length - 1) {
      setIsComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  if (cards.length === 0) {
    return (
      <div className="review-screen fade-in">
        <div className="review-header">
          <button className="btn-back" onClick={onBack}>
            ← 返回
          </button>
          <h2>{deck.title}</h2>
        </div>
        <div className="empty-review">
          <p>这个卡包还没有卡片</p>
          <button className="btn-primary" onClick={onBack}>
            去添加卡片
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="review-screen fade-in">
        <div className="review-header">
          <button className="btn-back" onClick={onBack}>
            ← 返回
          </button>
          <h2>{deck.title}</h2>
        </div>
        <div className="review-complete">
          <h3>🎉 复习完成！</h3>
          <p>今天你复习了 {reviewedCount} 张卡片</p>
          <button className="btn-primary" onClick={onBack}>
            返回卡包列表
          </button>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return null;
  }

  const progress = totalDue > 0 ? ((currentIndex) / totalDue) * 100 : 0;

  return (
    <div className="review-screen fade-in">
      <div className="review-header">
        <button className="btn-back" onClick={onBack}>
          ← 返回
        </button>
        <h2>{deck.title}</h2>
        <div className="review-progress-text">
          {currentIndex + 1} / {totalDue}
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="card-container" onClick={handleFlip}>
        <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
          <div className="card-face card-front">
            <div className="card-label">正面</div>
            <div className="card-content">{currentCard.front}</div>
            <div className="card-hint">点击卡片翻转</div>
          </div>
          <div className="card-face card-back">
            <div className="card-label">背面</div>
            <div className="card-content">{currentCard.back}</div>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="grade-buttons fade-in">
          <button className="grade-btn hard" onClick={() => handleGrade('hard')}>
            困难
            <span className="grade-hint">1天后复习</span>
          </button>
          <button className="grade-btn normal" onClick={() => handleGrade('normal')}>
            一般
            <span className="grade-hint">正常间隔</span>
          </button>
          <button className="grade-btn easy" onClick={() => handleGrade('easy')}>
            容易
            <span className="grade-hint">更长间隔</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewScreen;
