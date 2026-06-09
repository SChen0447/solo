import React, { useRef, useState, useCallback } from 'react';
import { BoardCard } from '../types';

interface CardProps {
  card: BoardCard;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<BoardCard>) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const GRID_SIZE = 20;

const Card: React.FC<CardProps> = ({
  card,
  isSelected,
  onSelect,
  onUpdate,
  onDoubleClick,
  onContextMenu,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSnapAnim, setShowSnapAnim] = useState(false);
  const dragState = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    shiftPressed: false,
    rafId: 0,
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect();

      const el = cardRef.current;
      if (!el) return;

      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: card.x,
        originY: card.y,
        shiftPressed: e.shiftKey,
        rafId: 0,
      };

      setIsDragging(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - dragState.current.startX;
        const dy = moveEvent.clientY - dragState.current.startY;
        dragState.current.shiftPressed = moveEvent.shiftKey;

        if (dragState.current.rafId) {
          cancelAnimationFrame(dragState.current.rafId);
        }

        dragState.current.rafId = requestAnimationFrame(() => {
          if (el) {
            el.style.transform = `translate(${dx}px, ${dy}px)`;
          }
        });
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        if (dragState.current.rafId) {
          cancelAnimationFrame(dragState.current.rafId);
        }

        const dx = upEvent.clientX - dragState.current.startX;
        const dy = upEvent.clientY - dragState.current.startY;
        let newX = dragState.current.originX + dx;
        let newY = dragState.current.originY + dy;

        if (!dragState.current.shiftPressed) {
          newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
          newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
          setShowSnapAnim(true);
          setTimeout(() => setShowSnapAnim(false), 180);
        }

        newX = Math.max(0, Math.min(newX, 1000 - card.width));
        newY = Math.max(0, Math.min(newY, 700 - card.height));

        if (el) {
          el.style.transform = '';
        }

        onUpdate({ x: newX, y: newY });
        setIsDragging(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [card, onSelect, onUpdate]
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick();
  };

  const handleContextMenuLocal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e);
  };

  const cardClasses = [
    'card',
    `card-${card.type}`,
    isSelected ? 'selected' : '',
    isDragging ? 'dragging' : '',
    showSnapAnim ? 'snap-animation' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = {
    left: card.x,
    top: card.y,
    width: card.width,
    height: card.height,
    zIndex: isSelected ? 200 : isDragging ? 100 : card.zIndex,
  };

  const renderContent = () => {
    switch (card.type) {
      case 'image':
        return (
          <img
            src={card.content}
            alt=""
            className="card-image"
            draggable={false}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="120"><rect fill="%23eee" width="150" height="120"/><text fill="%23999" font-family="sans-serif" font-size="12" x="50%25" y="50%25" text-anchor="middle" dy=".3em">图片加载失败</text></svg>';
            }}
          />
        );
      case 'color':
        return (
          <div
            className="card-color"
            style={{ backgroundColor: card.content }}
          />
        );
      case 'text':
      default:
        return <div className="card-text">{card.content}</div>;
    }
  };

  return (
    <div
      ref={cardRef}
      className={cardClasses}
      style={style}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenuLocal}
    >
      {renderContent()}
    </div>
  );
};

export default Card;
