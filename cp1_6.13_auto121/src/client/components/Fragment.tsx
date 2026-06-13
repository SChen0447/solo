import React, { useRef, useEffect } from 'react';
import { FragmentData } from '../../types/scroll';
import './Fragment.scss';

interface FragmentProps {
  fragment: FragmentData;
  onDragStart: (e: React.DragEvent, fragment: FragmentData) => void;
  isDragging?: boolean;
  isPlaced?: boolean;
  size?: number;
}

const Fragment: React.FC<FragmentProps> = ({
  fragment,
  onDragStart,
  isDragging = false,
  isPlaced = false,
  size = 40
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = size / 40;
    canvas.width = size;
    canvas.height = size;
    ctx.scale(scale, scale);

    ctx.clearRect(0, 0, 40, 40);

    ctx.strokeStyle = isPlaced ? '#1a1a1a' : '#3d2b1f';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isPlaced) {
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 1;
    }

    fragment.strokes.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0][0], stroke[0][1]);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i][0], stroke[i][1]);
      }
      ctx.stroke();
    });
  }, [fragment, size, isPlaced]);

  return (
    <div
      className={`fragment ${isDragging ? 'fragment--dragging' : ''} ${isPlaced ? 'fragment--placed' : ''}`}
      draggable={!isPlaced}
      onDragStart={(e) => !isPlaced && onDragStart(e, fragment)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transform: `rotate(${fragment.rotation}deg)`,
        clipPath: fragment.clipPath,
        WebkitClipPath: fragment.clipPath
      }}
      data-fragment-id={fragment.id}
    >
      <canvas
        ref={canvasRef}
        className="fragment__canvas"
      />
    </div>
  );
};

export default Fragment;
