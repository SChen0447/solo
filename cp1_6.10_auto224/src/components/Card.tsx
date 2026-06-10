import React, { useState, useRef } from 'react';
import { InspirationCard } from '../types';

interface CardProps {
  card: InspirationCard;
  index?: number;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onAddTag: (cardId: string, tag: string) => void;
  onDragStart?: (e: React.DragEvent, card: InspirationCard) => void;
  onMouseDown?: (e: React.MouseEvent | React.TouchEvent, card: InspirationCard) => void;
  style?: React.CSSProperties;
  isOnCanvas?: boolean;
  isSelected?: boolean;
}

const Card: React.FC<CardProps> = ({
  card,
  index = 0,
  onDelete,
  onArchive,
  onAddTag,
  onDragStart,
  onMouseDown,
  style,
  isOnCanvas = false,
  isSelected = false,
}) => {
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagValue, setTagValue] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [bounceKey, setBounceKey] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const rotation = card.rotation;

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(card.id);
    }, 300);
  };

  const handleAddTag = () => {
    const trimmed = tagValue.trim();
    if (trimmed && card.tags.length < 3) {
      onAddTag(card.id, trimmed);
    }
    setTagValue('');
    setShowTagInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    } else if (e.key === 'Escape') {
      setShowTagInput(false);
      setTagValue('');
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.card-actions') || (e.target as HTMLElement).closest('.tag-input-wrapper')) {
      return;
    }
    setBounceKey(prev => prev + 1);
    if (onMouseDown) {
      onMouseDown(e, card);
    }
  };

  const baseCardStyle: React.CSSProperties = {
    width: isOnCanvas ? 220 : 220,
    borderRadius: 16,
    background: card.archived ? '#d4cdbe' : '#fffdf8',
    padding: '16px 14px',
    boxShadow: isSelected
      ? '0 8px 30px rgba(0,0,0,0.2), 0 0 0 2px #c9a96e'
      : '0 4px 16px rgba(74,61,43,0.12)',
    cursor: isOnCanvas ? 'grab' : 'grab',
    userSelect: 'none',
    transition: 'box-shadow 0.2s ease, opacity 0.2s ease, filter 0.2s ease',
    ['--rotation' as any]: `${rotation}deg`,
    transform: `rotate(${rotation}deg)`,
    opacity: card.archived ? 0.5 : 1,
    filter: card.archived ? 'grayscale(50%)' : 'none',
    animation: isDeleting
      ? 'cardShrink 0.3s ease-in forwards'
      : `cardPopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.05}s both`,
    position: isOnCanvas ? 'absolute' : 'relative',
    ...style,
  };

  return (
    <div
      ref={cardRef}
      key={bounceKey}
      style={baseCardStyle}
      draggable={!isOnCanvas && !card.archived}
      onDragStart={(e) => {
        if (!isOnCanvas && !card.archived && onDragStart) {
          onDragStart(e, card);
        }
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      className="inspiration-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            backgroundColor: card.color,
            flexShrink: 0,
            boxShadow: `0 0 6px ${card.color}40`,
          }}
        />
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#4a3d2b',
            lineHeight: 1.3,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {card.keyword}
        </span>
      </div>

      <p
        style={{
          fontSize: 12,
          fontStyle: 'italic',
          color: '#8a7a62',
          lineHeight: 1.5,
          marginBottom: 12,
          minHeight: 18,
        }}
      >
        {card.phrase}
      </p>

      {card.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {card.tags.map((tag, i) => (
            <span
              key={i}
              style={{
                background: '#e0d5c1',
                color: '#4a3d2b',
                fontSize: 12,
                padding: '3px 10px',
                borderRadius: 20,
                lineHeight: 1.4,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {showTagInput && (
        <div className="tag-input-wrapper" style={{ marginBottom: 10 }}>
          <input
            type="text"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleAddTag}
            placeholder="输入标签..."
            autoFocus
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: 12,
              border: '1px solid #e0d5c1',
              borderRadius: 8,
              outline: 'none',
              background: '#faf6ef',
              color: '#4a3d2b',
            }}
          />
        </div>
      )}

      <div className="card-actions" style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <button
          onClick={() => {
            if (card.tags.length < 3) {
              setShowTagInput(!showTagInput);
            }
          }}
          disabled={card.tags.length >= 3}
          title={card.tags.length >= 3 ? '最多3个标签' : '添加标签'}
          style={iconButtonStyle(card.tags.length >= 3)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        </button>
        <button
          onClick={() => onArchive(card.id)}
          title={card.archived ? '已归档' : '归档'}
          style={iconButtonStyle(card.archived)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          title="删除"
          style={iconButtonStyle(false, true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
};

function iconButtonStyle(disabled: boolean = false, danger: boolean = false): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    border: 'none',
    background: 'transparent',
    color: disabled ? '#c0b8a8' : (danger ? '#a06358' : '#8a7a62'),
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.5 : 1,
    padding: 0,
  };
}

export default Card;
