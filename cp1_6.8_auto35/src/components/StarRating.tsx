import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
}

export default function StarRating({
  rating,
  onRatingChange,
  readonly = false,
  size = 18,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = hoverRating || rating;

  return (
    <div
      className="star-rating"
      style={{ display: 'flex', gap: '2px', cursor: readonly ? 'default' : 'pointer' }}
      onMouseLeave={() => !readonly && setHoverRating(0)}
    >
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onClick={() => {
            if (!readonly && onRatingChange) {
              onRatingChange(star);
            }
          }}
          style={{
            display: 'inline-flex',
            transition: 'transform 0.15s ease',
            transform: !readonly && hoverRating >= star ? 'scale(1.2)' : 'scale(1)',
          }}
        >
          <Star
            size={size}
            fill={star <= displayRating ? '#ffd700' : 'transparent'}
            stroke={star <= displayRating ? '#ffd700' : '#555'}
            strokeWidth={1.5}
            style={{ transition: 'all 0.2s ease' }}
          />
        </span>
      ))}
    </div>
  );
}
