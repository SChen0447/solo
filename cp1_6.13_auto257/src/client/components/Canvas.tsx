import { useRef, useEffect, useState, useCallback } from 'react';
import type { PathSegment, PathPoint } from '../types';

interface CanvasProps {
  width: number;
  height: number;
  brushWidth: number;
  brushColor: string;
  onPathsChange?: (paths: PathSegment[]) => void;
  readOnly?: boolean;
  animate?: boolean;
  paths?: PathSegment[];
  onAnimationComplete?: () => void;
  backgroundGradient?: { top: string; bottom: string };
}

function Canvas({
  width,
  height,
  brushWidth,
  brushColor,
  onPathsChange,
  readOnly = false,
  animate = false,
  paths: externalPaths,
  onAnimationComplete,
  backgroundGradient,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<PathPoint[]>([]);
  const [paths, setPaths] = useState<PathSegment[]>([]);
  const animationRef = useRef<number | null>(null);
  const animationCompleteRef = useRef(false);
  const glowPulsesRef = useRef<
    Array<{
      x: number;
      y: number;
      maxRadius: number;
      color: string;
      startTime: number;
    }>
  >([]);

  useEffect(() => {
    if (externalPaths && !animate) {
      setPaths(externalPaths);
    }
  }, [externalPaths, animate]);

  const getCanvasPoint = useCallback(
    (
      e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent
    ): PathPoint | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX: number, clientY: number;

      if ('touches' in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (readOnly || animate) return;

      const point = getCanvasPoint(e);
      if (!point) return;

      setIsDrawing(true);
      setCurrentPath([point]);
    },
    [readOnly, animate, getCanvasPoint]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || readOnly || animate) return;

      const point = getCanvasPoint(e);
      if (!point) return;

      setCurrentPath((prev) => [...prev, point]);
    },
    [isDrawing, readOnly, animate, getCanvasPoint]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing || readOnly) return;

    if (currentPath.length > 1) {
      const newSegment: PathSegment = {
        points: currentPath,
        color: brushColor,
        width: brushWidth,
      };
      const newPaths = [...paths, newSegment];
      setPaths(newPaths);
      onPathsChange?.(newPaths);
    }

    setIsDrawing(false);
    setCurrentPath([]);
  }, [isDrawing, readOnly, currentPath, brushColor, brushWidth, paths, onPathsChange]);

  const drawBackground = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (backgroundGradient) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, backgroundGradient.top);
        gradient.addColorStop(1, backgroundGradient.bottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
    },
    [backgroundGradient, width, height]
  );

  const drawSegment = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      segment: PathSegment,
      progress: number = 1,
      glow: boolean = false
    ) => {
      if (segment.points.length < 2) return;

      const totalPoints = segment.points.length;
      const endIndex = Math.floor((totalPoints - 1) * progress) + 1;
      const pointsToDraw = Math.min(Math.ceil(endIndex), totalPoints);

      if (pointsToDraw < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = segment.color;
      ctx.lineWidth = segment.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (glow) {
        ctx.shadowColor = segment.color;
        ctx.shadowBlur = 12;
      }

      ctx.moveTo(segment.points[0].x, segment.points[0].y);

      for (let i = 1; i < pointsToDraw - 1; i++) {
        const xc = (segment.points[i].x + segment.points[i - 1].x) / 2;
        const yc = (segment.points[i].y + segment.points[i - 1].y) / 2;
        ctx.quadraticCurveTo(segment.points[i - 1].x, segment.points[i - 1].y, xc, yc);
      }

      if (pointsToDraw >= 2) {
        const lastIdx = pointsToDraw - 1;
        const prevIdx = pointsToDraw - 2;
        const xc = (segment.points[lastIdx].x + segment.points[prevIdx].x) / 2;
        const yc = (segment.points[lastIdx].y + segment.points[prevIdx].y) / 2;
        ctx.quadraticCurveTo(segment.points[prevIdx].x, segment.points[prevIdx].y, xc, yc);

        if (progress >= 1) {
          ctx.lineTo(segment.points[lastIdx].x, segment.points[lastIdx].y);
        }
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
    },
    []
  );

  const drawAllPaths = useCallback(
    (ctx: CanvasRenderingContext2D, pathsToDraw: PathSegment[]) => {
      pathsToDraw.forEach((segment) => {
        drawSegment(ctx, segment, 1, true);
      });
    },
    [drawSegment]
  );

  const drawGlowPulses = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    glowPulsesRef.current = glowPulsesRef.current.filter((pulse) => {
      const elapsed = now - pulse.startTime;
      const duration = 800;
      if (elapsed > duration) return false;

      const progress = elapsed / duration;
      const radius = pulse.maxRadius * (1 - Math.pow(1 - progress, 2));
      const alpha = 1 - progress;

      ctx.save();
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = pulse.color;
      ctx.globalAlpha = alpha * 0.6;
      ctx.shadowColor = pulse.color;
      ctx.shadowBlur = 25;
      ctx.fill();
      ctx.restore();

      return true;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animState = {
      startTime: 0,
      segmentDuration: 500,
    };

    animationCompleteRef.current = false;

    const render = (timestamp: number) => {
      ctx.clearRect(0, 0, width, height);
      drawBackground(ctx);

      if (animate && externalPaths && externalPaths.length > 0) {
        if (animState.startTime === 0) {
          animState.startTime = timestamp;
        }

        const elapsed = timestamp - animState.startTime;
        const totalDuration = externalPaths.length * animState.segmentDuration;
        const overallProgress = Math.min(elapsed / totalDuration, 1);

        const currentSegIndex = Math.min(
          Math.floor(elapsed / animState.segmentDuration),
          externalPaths.length - 1
        );
        const currentSegProgress = Math.min(
          (elapsed % animState.segmentDuration) / animState.segmentDuration,
          1
        );

        for (let i = 0; i < currentSegIndex; i++) {
          drawSegment(ctx, externalPaths[i], 1, true);

          if (
            i === currentSegIndex - 1 &&
            currentSegProgress === 0 &&
            elapsed > 0
          ) {
            const seg = externalPaths[i];
            const lastPoint = seg.points[seg.points.length - 1];
            const pulseExists = glowPulsesRef.current.some(
              (p) =>
                p.x === lastPoint.x &&
                p.y === lastPoint.y &&
                Math.abs(p.startTime - timestamp) < 100
            );
            if (!pulseExists && elapsed > animState.segmentDuration * i) {
              glowPulsesRef.current.push({
                x: lastPoint.x,
                y: lastPoint.y,
                maxRadius: 20,
                color: seg.color,
                startTime: timestamp - 100,
              });
            }
          }
        }

        if (currentSegIndex < externalPaths.length) {
          const seg = externalPaths[currentSegIndex];

          if (currentSegProgress > 0 && currentSegProgress < 0.05) {
            const firstPoint = seg.points[0];
            const pulseExists = glowPulsesRef.current.some(
              (p) =>
                p.x === firstPoint.x &&
                p.y === firstPoint.y &&
                Math.abs(p.startTime - timestamp) < 200
            );
            if (!pulseExists) {
              glowPulsesRef.current.push({
                x: firstPoint.x,
                y: firstPoint.y,
                maxRadius: 20,
                color: seg.color,
                startTime: timestamp,
              });
            }
          }

          drawSegment(ctx, seg, currentSegProgress, true);

          if (currentSegProgress >= 1 && currentSegIndex === externalPaths.length - 1) {
            const lastPoint = seg.points[seg.points.length - 1];
            const pulseExists = glowPulsesRef.current.some(
              (p) =>
                p.x === lastPoint.x &&
                p.y === lastPoint.y &&
                Math.abs(p.startTime - timestamp) < 200
            );
            if (!pulseExists) {
              glowPulsesRef.current.push({
                x: lastPoint.x,
                y: lastPoint.y,
                maxRadius: 20,
                color: seg.color,
                startTime: timestamp,
              });
            }
          }
        }

        drawGlowPulses(ctx, timestamp);

        if (overallProgress >= 1 && !animationCompleteRef.current) {
          animationCompleteRef.current = true;
          onAnimationComplete?.();
        }

        animationRef.current = requestAnimationFrame(render);
      } else {
        drawAllPaths(ctx, paths);

        if (currentPath.length > 1) {
          const tempSegment: PathSegment = {
            points: currentPath,
            color: brushColor,
            width: brushWidth,
          };
          drawSegment(ctx, tempSegment, 1, true);
        }

        if (animate) {
          animationRef.current = requestAnimationFrame(render);
        }
      }
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    paths,
    currentPath,
    brushColor,
    brushWidth,
    width,
    height,
    animate,
    externalPaths,
    drawBackground,
    drawSegment,
    drawAllPaths,
    drawGlowPulses,
    onAnimationComplete,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      style={{
        width: '100%',
        height: '100%',
        cursor: readOnly ? 'default' : 'crosshair',
        borderRadius: '12px',
        touchAction: 'none',
      }}
    />
  );
}

export default Canvas;
