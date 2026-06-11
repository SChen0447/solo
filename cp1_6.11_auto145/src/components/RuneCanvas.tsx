import { useEffect, useRef, useState, useCallback } from 'react';
import type { Point } from '../types';

interface RuneCanvasProps {
  onConfirm: (strokes: Point[][]) => void;
  confirmedStrokes?: Point[][];
  readOnly?: boolean;
}

const CANVAS_SIZE = 400;
const MAX_UNDO = 5;
const LINE_COLOR = '#b39ddb';
const LINE_WIDTH = 3;

export default function RuneCanvas({ onConfirm, confirmedStrokes, readOnly }: RuneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [undoStack, setUndoStack] = useState<Point[][][]>([]);

  useEffect(() => {
    if (confirmedStrokes && confirmedStrokes.length > 0) {
      setStrokes(confirmedStrokes);
    }
  }, [confirmedStrokes]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawStroke = (points: Point[]) => {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = LINE_COLOR;
      ctx.lineWidth = LINE_WIDTH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = LINE_COLOR;
      ctx.shadowBlur = 12;
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    strokes.forEach(drawStroke);
    drawStroke(currentStroke);
  }, [strokes, currentStroke]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    const p = getPoint(e);
    setIsDrawing(true);
    setCurrentStroke([p]);
  };

  const moveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    const p = getPoint(e);
    setCurrentStroke(prev => [...prev, p]);
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      setUndoStack(prev => [...prev.slice(-MAX_UNDO + 1), strokes]);
      setStrokes(prev => [...prev, currentStroke]);
    }
    setCurrentStroke([]);
  };

  const handleUndo = () => {
    if (readOnly || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setStrokes(prev);
  };

  const handleClear = () => {
    if (readOnly) return;
    setUndoStack(s => [...s.slice(-MAX_UNDO + 1), strokes]);
    setStrokes([]);
  };

  const handleConfirm = () => {
    onConfirm(strokes);
  };

  const canUndo = !readOnly && undoStack.length > 0;
  const canConfirm = !readOnly && strokes.length > 0;

  return (
    <div className="rune-canvas-wrap">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="rune-canvas"
        onMouseDown={startDraw}
        onMouseMove={moveDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={moveDraw}
        onTouchEnd={endDraw}
      />
      <div className="rune-status">
        已绘制 {strokes.length} 笔，可撤销 {undoStack.length}/{MAX_UNDO}
      </div>
      {!readOnly && (
        <div className="rune-actions">
          <button className="btn" onClick={handleUndo} disabled={!canUndo}>撤销</button>
          <button className="btn" onClick={handleClear} disabled={strokes.length === 0}>清空</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!canConfirm}>确认符文</button>
        </div>
      )}
    </div>
  );
}
