import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Point2D, Crease, PAPER_SIZE, DragState } from '../types';
import {
  getCorners,
  getCreaseLine,
  lerpPoint,
  createReflectionMatrix,
  transformPoint,
  distance,
  computeFoldedVertices,
} from '../utils/paperMath';

interface PaperCanvasProps {
  paperColor: string;
  creases: Crease[];
  currentCrease: Crease | null;
  foldProgress: number;
  isFolding: boolean;
  dragState: DragState;
  isAnimating: boolean;
  autoRotation: number;
  breathScale: number;
  onCornerMouseDown: (cornerIndex: number, e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
}

const CANVAS_SIZE = 520;
const HANDLE_RADIUS = 8;

const PaperCanvas: React.FC<PaperCanvasProps> = ({
  paperColor,
  creases,
  currentCrease,
  foldProgress,
  isFolding,
  dragState,
  isAnimating,
  autoRotation,
  breathScale,
  onCornerMouseDown,
  onMouseMove,
  onMouseUp,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();

  const baseCorners = useMemo(() => getCorners(), []);

  const getDisplayCorners = useCallback((): Point2D[] => {
    let corners = [...baseCorners];

    for (const crease of creases) {
      const reflection = createReflectionMatrix(crease.start, crease.end);
      const creaseAngle = Math.atan2(
        crease.end.y - crease.start.y,
        crease.end.x - crease.start.x
      );

      corners = corners.map((v, i) => {
        const toV = { x: v.x - crease.start.x, y: v.y - crease.start.y };
        const rotatedX = toV.x * Math.cos(-creaseAngle) - toV.y * Math.sin(-creaseAngle);
        if (rotatedX < 0 && crease.cornerIndex !== undefined && i === crease.cornerIndex) {
          return transformPoint(v, reflection);
        }
        return v;
      });
    }

    if (currentCrease && isFolding && foldProgress > 0) {
      const folded = computeFoldedVertices(currentCrease, foldProgress);
      corners = corners.map((v, i) => {
        if (currentCrease.cornerIndex !== undefined && i === currentCrease.cornerIndex) {
          return folded[i];
        }
        return v;
      });
    }

    if (dragState.isDragging && dragState.cornerIndex !== null && dragState.currentPoint) {
      const offset = CANVAS_SIZE / 2 - PAPER_SIZE / 2;
      const p = {
        x: dragState.currentPoint.x - offset,
        y: dragState.currentPoint.y - offset,
      };
      corners[dragState.cornerIndex] = p;
    }

    return corners;
  }, [baseCorners, creases, currentCrease, foldProgress, isFolding, dragState]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.save();
    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((autoRotation * Math.PI) / 180);
    ctx.scale(breathScale, breathScale);
    ctx.translate(-PAPER_SIZE / 2, -PAPER_SIZE / 2);

    const displayCorners = getDisplayCorners();

    ctx.beginPath();
    ctx.moveTo(displayCorners[0].x, displayCorners[0].y);
    for (let i = 1; i < displayCorners.length; i++) {
      ctx.lineTo(displayCorners[i].x, displayCorners[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = paperColor;
    ctx.fill();

    ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(baseCorners[0].x, baseCorners[0].y);
    for (let i = 1; i < baseCorners.length; i++) {
      ctx.lineTo(baseCorners[i].x, baseCorners[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(80, 80, 80, 0.9)';
    ctx.lineWidth = 2;
    for (const crease of creases) {
      ctx.beginPath();
      ctx.moveTo(crease.start.x, crease.start.y);
      ctx.lineTo(crease.end.x, crease.end.y);
      ctx.stroke();
    }

    if (currentCrease && (isFolding || dragState.isDragging)) {
      ctx.strokeStyle = 'rgba(60, 60, 60, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentCrease.start.x, currentCrease.start.y);
      ctx.lineTo(currentCrease.end.x, currentCrease.end.y);
      ctx.stroke();
    }

    if (dragState.isDragging && dragState.cornerIndex !== null) {
      const creaseLine = getCreaseLine(dragState.cornerIndex);
      ctx.strokeStyle = 'rgba(80, 80, 80, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(creaseLine.start.x, creaseLine.start.y);
      ctx.lineTo(creaseLine.end.x, creaseLine.end.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    const offsetX = centerX - PAPER_SIZE / 2;
    const offsetY = centerY - PAPER_SIZE / 2;

    if (!isAnimating) {
      for (let i = 0; i < displayCorners.length; i++) {
        const cx = displayCorners[i].x + offsetX;
        const cy = displayCorners[i].y + offsetY;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((autoRotation * Math.PI) / 180);
        ctx.scale(breathScale, breathScale);
        ctx.translate(-centerX, -centerY);

        ctx.beginPath();
        ctx.arc(cx, cy, HANDLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#8d6e63';
        ctx.fill();
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }
    }
  }, [getDisplayCorners, paperColor, baseCorners, creases, currentCrease, isFolding, dragState, isAnimating, autoRotation, breathScale]);

  useEffect(() => {
    const animate = () => {
      draw();
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnimating) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;
    const cos = Math.cos((-autoRotation * Math.PI) / 180);
    const sin = Math.sin((-autoRotation * Math.PI) / 180);
    const dx = mx - centerX;
    const dy = my - centerY;
    const rotatedX = (dx * cos - dy * sin) / breathScale + centerX;
    const rotatedY = (dx * sin + dy * cos) / breathScale + centerY;

    const offsetX = centerX - PAPER_SIZE / 2;
    const offsetY = centerY - PAPER_SIZE / 2;

    const corners = getDisplayCorners();
    for (let i = 0; i < corners.length; i++) {
      const hx = corners[i].x + offsetX;
      const hy = corners[i].y + offsetY;
      if (distance({ x: rotatedX, y: rotatedY }, { x: hx, y: hy }) <= HANDLE_RADIUS + 6) {
        onCornerMouseDown(i, e);
        return;
      }
    }
  };

  return (
    <motion.canvas
      ref={canvasRef}
      className="paper-canvas"
      style={{
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        maxWidth: '90vw',
        maxHeight: '80vh',
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      onMouseDown={handleMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    />
  );
};

export default PaperCanvas;
