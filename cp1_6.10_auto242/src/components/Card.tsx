import React, { useEffect, useRef, useState } from 'react';
import { CardData, drawCard } from '../utils/cardEngine';

interface CardProps {
  card: CardData;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onClick: (id: string, e: React.MouseEvent) => void;
  enterAnimation?: boolean;
  isMobile?: boolean;
}

const Card: React.FC<CardProps> = ({ card, onDragStart, onClick, enterAnimation, isMobile }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animating, setAnimating] = useState(!!enterAnimation);

  const width = isMobile ? 240 : card.width;
  const height = isMobile ? 180 : card.height;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawCard(ctx, card, width, height);
  }, [card, width, height]);

  useEffect(() => {
    if (animating) {
      const t = setTimeout(() => setAnimating(false), 400);
      return () => clearTimeout(t);
    }
  }, [animating]);

  const style: React.CSSProperties = {
    left: card.x,
    top: card.y,
    width,
    height,
    opacity: card.opacity,
    transform: `scale(${card.scale})`,
    transformOrigin: 'top left',
  };

  return (
    <div
      className={`card ${card.selected ? 'selected' : ''} ${animating ? 'enter-animation' : ''}`}
      style={style}
      onMouseDown={(e) => {
        e.stopPropagation();
        onClick(card.id, e);
        onDragStart(card.id, e);
      }}
    >
      <canvas ref={canvasRef} style={{ width, height }} />
    </div>
  );
};

export default Card;
