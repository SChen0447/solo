import { useEffect, useRef, useState } from 'react';
import type { EmotionRecord } from './types';
import { format } from 'date-fns';

interface EmotionCardProps {
  record: EmotionRecord;
  onClick: (record: EmotionRecord) => void;
  index: number;
}

export default function EmotionCard({ record, onClick, index }: EmotionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 30);
    return () => clearTimeout(timer);
  }, [index]);

  const gradientStyle = {
    background: `linear-gradient(135deg, ${record.gradientStart}, ${record.gradientEnd})`,
    animationDelay: `${index * 0.03}s`,
  };

  const formattedDate = format(new Date(record.date), 'MM/dd');
  const isToday = record.date === new Date().toISOString().split('T')[0];

  return (
    <div className="card-slot">
      <div
        ref={cardRef}
        className="emotion-card"
        style={gradientStyle}
        onClick={() => onClick(record)}
      >
        {record.image ? (
          <img src={record.image} alt="" className="card-thumbnail" />
        ) : (
          <div className="card-thumbnail-placeholder">🎨</div>
        )}

        {record.emotionLabel && (
          <span className="card-emotion-label">{record.emotionLabel}</span>
        )}

        <div className="card-diary-preview">
          {record.diary || '今天没有记录文字...'}
        </div>

        <div className="card-meta">
          <span className="card-date">
            {isToday ? '今天' : formattedDate}
          </span>
          <span className="card-likes">
            ❤ {record.likes}
          </span>
        </div>
      </div>
    </div>
  );
}
