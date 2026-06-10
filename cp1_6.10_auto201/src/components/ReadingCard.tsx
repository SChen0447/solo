import React from 'react';
import { ReadingPlan } from '../types';

interface Props {
  plan: ReadingPlan;
  onClick: () => void;
  index: number;
}

const ReadingCard = React.memo(function ReadingCard({ plan, onClick }: Props) {
  return (
    <div className="reading-card" onClick={onClick}>
      <div className="book-cover">
        <span>{plan.bookTitle}</span>
      </div>
      <div className="book-title">{plan.bookTitle}</div>
      <div className="book-author">{plan.bookAuthor}</div>
      <div className="card-meta">
        <span>{plan.startDate.slice(5)}</span>
        <span>{plan.members.length} 人共读</span>
      </div>
      <div className="progress-bar-wrapper">
        <div
          className="progress-bar-fill"
          style={{ '--progress': `${plan.progress}%`, width: `${plan.progress}%` } as React.CSSProperties}
        />
      </div>
      <div className="card-meta" style={{ marginTop: 8 }}>
        <span style={{ color: 'var(--color-secondary)', fontWeight: 500 }}>
          进度 {plan.progress}%
        </span>
      </div>
    </div>
  );
});

export default ReadingCard;
