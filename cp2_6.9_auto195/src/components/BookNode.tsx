import React, { useRef, useCallback, useState, useEffect } from 'react';
import type { Book } from '../types';

interface BookNodeProps {
  book: Book;
  x: number;
  y: number;
  minSize: number;
  maxSize: number;
  highlightSize: number;
  isHighlighted: boolean;
  isRelated: boolean;
  isDimmed: boolean;
  isSearchAmplified: boolean;
  isDragging: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

const getLuminance = (r: number, g: number, b: number) => {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

const shortenTitle = (title: string): string => {
  if (title.length <= 4) return title;
  return title.slice(0, 4) + '...';
};

const BookNode: React.FC<BookNodeProps> = ({
  book,
  x,
  y,
  minSize,
  maxSize,
  highlightSize,
  isHighlighted,
  isRelated,
  isDimmed,
  isSearchAmplified,
  isDragging,
  onClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  canvasRef,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    active: boolean;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    moved: boolean;
  }>({ active: false, offsetX: 0, offsetY: 0, startX: 0, startY: 0, moved: false });
  const [hovered, setHovered] = useState(false);

  const progressRatio = book.progress / 100;
  let size = minSize + (maxSize - minSize) * progressRatio;
  if (isHighlighted) size = highlightSize;
  if (isSearchAmplified && !isHighlighted) size = size * 1.2;
  if (hovered && !isHighlighted) size = size * 1.05;

  const rgb = hexToRgb(book.color);
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  const textColor = luminance > 0.5 ? '#2C2C2C' : '#FFFFFF';

  const isUnread = book.progress === 0;
  const isCompleted = book.progress === 100;

  let opacity = 1;
  if (isUnread && !isHighlighted) opacity = 0.6;
  if (isDimmed) opacity = isHighlighted ? 1 : 0.2;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isDimmed && !isHighlighted) return;
      e.stopPropagation();
      const rect = nodeRef.current?.getBoundingClientRect();
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!rect || !canvasRect) return;

      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      dragState.current = {
        active: true,
        offsetX: clientX - rect.left - rect.width / 2,
        offsetY: clientY - rect.top - rect.height / 2,
        startX: clientX,
        startY: clientY,
        moved: false,
      };
      onDragStart();
    },
    [isDimmed, isHighlighted, onDragStart, canvasRef]
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragState.current.active) return;
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const dx = clientX - dragState.current.startX;
      const dy = clientY - dragState.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragState.current.moved = true;
      }

      const localX = clientX - canvasRect.left - dragState.current.offsetX;
      const localY = clientY - canvasRect.top - dragState.current.offsetY;
      onDragMove(localX, localY);
    };

    const handleUp = () => {
      if (!dragState.current.active) return;
      const wasMoved = dragState.current.moved;
      dragState.current.active = false;
      onDragEnd();
      if (!wasMoved) {
        onClick();
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [onDragMove, onDragEnd, onClick, canvasRef]);

  return (
    <div
      ref={nodeRef}
      className={`book-node ${isHighlighted ? 'node-highlighted' : ''} ${
        isDragging ? 'node-dragging' : ''
      } ${isCompleted ? 'node-completed' : ''}`}
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        backgroundColor: book.color,
        color: textColor,
        opacity,
        pointerEvents: isDimmed && !isHighlighted ? 'none' : 'auto',
        cursor: isDimmed && !isHighlighted ? 'default' : isDragging ? 'grabbing' : 'grab',
        transition: isDragging
          ? 'none'
          : 'left 0.3s ease-out, top 0.3s ease-out, width 0.2s ease, height 0.2s ease, box-shadow 0.3s ease-out, opacity 0.3s ease-out',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isHighlighted && <div className="pulse-ring" />}
      {isRelated && !isHighlighted && <div className="related-ring" />}
      <span className="node-title">{shortenTitle(book.title)}</span>
    </div>
  );
};

export default BookNode;
