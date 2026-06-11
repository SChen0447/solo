import { Link, Image } from 'lucide-react';
import type { Card as CardType } from '../types';
import { getDarkerColor, getTransparentColor } from '../utils/colors';
import { useBoardStore } from '../store/useBoardStore';
import './Card.css';

interface CardProps {
  card: CardType;
  viewMode: 'grid' | 'list';
  isNew?: boolean;
  isFiltered?: boolean;
}

export default function Card({ card, viewMode, isNew = false, isFiltered = false }: CardProps) {
  const { openEditor } = useBoardStore();
  const darkerColor = getDarkerColor(card.color);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openEditor(card);
  };

  if (viewMode === 'list') {
    return (
      <div
        className={`card card-list ${isNew ? 'animate-pop-in' : ''} ${isFiltered ? 'animate-fade-out' : 'animate-fade-in'}`}
        style={{
          backgroundColor: card.color,
          borderColor: getTransparentColor(darkerColor, 0.2),
        }}
        onClick={handleClick}
      >
        {card.imageUrl && (
          <div className="card-list-image">
            <img src={card.imageUrl} alt={card.title} />
          </div>
        )}
        
        {!card.imageUrl && card.linkUrl && (
          <div className="card-list-icon" style={{ color: darkerColor }}>
            <Link size={24} />
          </div>
        )}

        <div className="card-list-content">
          <h3 className="card-title" style={{ color: darkerColor }}>{card.title}</h3>
          {card.description && (
            <p className="card-description">{card.description}</p>
          )}
          
          {card.tags.length > 0 && (
            <div className="card-tags">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="card-tag"
                  style={{
                    backgroundColor: getTransparentColor(card.color, 0.5),
                    color: darkerColor,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card card-grid ${isNew ? 'animate-pop-in' : ''} ${isFiltered ? 'animate-fade-out' : 'animate-fade-in'}`}
      style={{
        backgroundColor: card.color,
        borderColor: getTransparentColor(darkerColor, 0.2),
      }}
      onClick={handleClick}
    >
      {card.imageUrl && (
        <div className="card-image">
          <img src={card.imageUrl} alt={card.title} />
        </div>
      )}
      
      <div className="card-content">
        <h3 className="card-title" style={{ color: darkerColor }}>{card.title}</h3>
        {card.description && (
          <p className="card-description">{card.description}</p>
        )}
      </div>

      {card.linkUrl && !card.imageUrl && (
        <div className="card-link-preview">
          <Link size={14} style={{ color: darkerColor }} />
          <span style={{ color: darkerColor }}>{card.linkUrl}</span>
        </div>
      )}
      
      {card.tags.length > 0 && (
        <div className="card-tags">
          {card.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="card-tag"
              style={{
                backgroundColor: getTransparentColor(card.color, 0.5),
                color: darkerColor,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
