import React, { useRef, useState, useEffect, useCallback } from 'react';
import { InspirationCard } from '../types';
import Card from './Card';

interface CanvasBoardProps {
  cards: InspirationCard[];
  onDeleteCard: (id: string) => void;
  onArchiveCard: (id: string) => void;
  onAddTag: (cardId: string, tag: string) => void;
  onPlaceOnCanvas: (id: string, x: number, y: number) => void;
  onUpdateCanvasPosition: (id: string, x: number, y: number) => void;
  selectedCardId: string | null;
  onSelectCard: (id: string | null) => void;
  draggingCardFromPanel: InspirationCard | null;
}

interface DragState {
  cardId: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
}

const CanvasBoard: React.FC<CanvasBoardProps> = ({
  cards,
  onDeleteCard,
  onArchiveCard,
  onAddTag,
  onPlaceOnCanvas,
  onUpdateCanvasPosition,
  selectedCardId,
  onSelectCard,
  draggingCardFromPanel,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const canvasCards = cards.filter(c => c.placedOnCanvas && !c.archived);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!draggingCardFromPanel) return;
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    onPlaceOnCanvas(draggingCardFromPanel.id, x - 110, y - 80);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent | React.TouchEvent, card: InspirationCard) => {
    if (isMobile) return;
    e.preventDefault();
    e.stopPropagation();
    onSelectCard(card.id);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCanvasCoords(clientX, clientY);

    setDragState({
      cardId: card.id,
      startX: card.x || 0,
      startY: card.y || 0,
      offsetX: x - (card.x || 0),
      offsetY: y - (card.y || 0),
      currentX: card.x || 0,
      currentY: card.y || 0,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragState) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCanvasCoords(clientX, clientY);
    const newX = x - dragState.offsetX;
    const newY = y - dragState.offsetY;
    setDragState(prev => prev ? { ...prev, currentX: newX, currentY: newY } : null);
  }, [dragState, getCanvasCoords]);

  const handleMouseUp = useCallback(() => {
    if (!dragState) return;
    onUpdateCanvasPosition(dragState.cardId, dragState.currentX, dragState.currentY);
    setDragState(null);
  }, [dragState, onUpdateCanvasPosition]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isMobile && selectedCardId) {
      const card = cards.find(c => c.id === selectedCardId);
      if (card && !card.placedOnCanvas) {
        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        onPlaceOnCanvas(selectedCardId, x - 110, y - 80);
        onSelectCard(null);
        return;
      }
    }
    if ((e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-empty'))) {
      onSelectCard(null);
    }
  };

  const isDraggingThisCard = (cardId: string) => dragState?.cardId === cardId;

  return (
    <div
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#faf6ef',
        overflow: 'auto',
        transition: 'background 0.3s ease',
        cursor: isMobile && selectedCardId ? 'crosshair' : 'default',
        WebkitOverflowScrolling: 'touch',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
    >
      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            right: 20,
            bottom: 20,
            border: '3px dashed #c9a96e',
            borderRadius: 20,
            background: 'rgba(232,220,200,0.5)',
            pointerEvents: 'none',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'modalFadeIn 0.2s ease',
          }}
        >
          <span style={{ color: '#8a7a62', fontSize: 16, fontWeight: 600 }}>
            松开以放置卡片
          </span>
        </div>
      )}

      {canvasCards.length === 0 && !isDragOver && (
        <div
          className="canvas-empty"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#c0b8a8',
            pointerEvents: 'none',
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            style={{ marginBottom: 16, opacity: 0.5 }}
          >
            <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          <p style={{ fontSize: 14, textAlign: 'center', lineHeight: 1.8 }}>
            从左侧拖拽卡片到这里<br />
            {isMobile ? '或先选中卡片再点击画布放置' : '开始组织你的灵感'}
          </p>
        </div>
      )}

      {canvasCards.map((card, index) => {
        const isDragging = isDraggingThisCard(card.id);
        const displayX = isDragging && dragState ? dragState.currentX : (card.x || 0);
        const displayY = isDragging && dragState ? dragState.currentY : (card.y || 0);

        return (
          <div
            key={card.id}
            style={{
              position: 'absolute',
              left: displayX,
              top: displayY,
              zIndex: isDragging ? 100 : (card.id === selectedCardId ? 50 : 1),
              transition: isDragging ? 'none' : 'left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <Card
              card={card}
              index={index}
              onDelete={onDeleteCard}
              onArchive={onArchiveCard}
              onAddTag={onAddTag}
              onMouseDown={(e) => handleCanvasMouseDown(e, card)}
              isOnCanvas={true}
              isSelected={card.id === selectedCardId}
              style={isDragging ? {
                boxShadow: '2px 2px 20px rgba(0,0,0,0.15), 0 8px 30px rgba(0,0,0,0.1)',
                cursor: 'grabbing',
              } : undefined}
            />
          </div>
        );
      })}
    </div>
  );
};

export default CanvasBoard;
