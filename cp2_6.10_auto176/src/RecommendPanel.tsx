import React from 'react';
import type { RecommendedBook } from './types';

interface RecommendPanelProps {
  recommendations: RecommendedBook[];
  onRecommendClick: (book: RecommendedBook) => void;
}

const RecommendPanel: React.FC<RecommendPanelProps> = ({ recommendations, onRecommendClick }) => {
  return (
    <div className="recommend-panel">
      <h3 className="recommend-title">为你推荐</h3>
      <div className="recommend-list">
        {recommendations.map(book => (
          <div
            key={book.id}
            className="recommend-item"
            onClick={() => onRecommendClick(book)}
          >
            <img src={book.cover} alt={book.title} className="recommend-cover" />
            <div className="recommend-info">
              <div className="recommend-book-title">{book.title}</div>
              <div className="recommend-author">{book.author}</div>
              <div className="match-bar-container">
                <div
                  className="match-bar-fill"
                  style={{ width: `${book.matchScore}%` }}
                />
              </div>
              <div className="match-score-text">匹配度 {book.matchScore}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendPanel;
