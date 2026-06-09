import React, { useRef, useEffect, useCallback } from 'react';
import { EasingConfig, BEZIER_MAP } from '../types';

interface CurveGridProps {
  easings: EasingConfig[];
  progress?: number;
  activeEasingId?: string;
  width?: number;
  height?: number;
}

const PADDING = 50;

function cubicBezier(t: number, p1x: number, p1y: number, p2x: number, p2y: number): number {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  const sampleCurveX = (t2: number) => ((ax * t2 + bx) * t2 + cx) * t2;
  const sampleCurveY = (t2: number) => ((ay * t2 + by) * t2 + cy) * t2;
  const sampleCurveDerivativeX = (t2: number) => (3 * ax * t2 + 2 * bx) * t2 + cx;

  let x = t;
  for (let i = 0; i < 8; i++) {
    const currentX = sampleCurveX(x) - t;
    if (Math.abs(currentX) < 1e-6) break;
    const derivative = sampleCurveDerivativeX(x);
    if (Math.abs(derivative) < 1e-6) break;
    x = x - currentX / derivative;
  }

  return sampleCurveY(x);
}

function stepsEasing(t: number, stepCount: number, position: 'start' | 'end'): number {
  if (position === 'start') {
    return Math.min(1, Math.floor(t * stepCount + 1) / stepCount);
  }
  return Math.min(1, Math.floor(t * stepCount) / stepCount);
}

function getEasingValue(easing: EasingConfig, t: number): number {
  if (easing.type === 'steps') {
    return stepsEasing(t, easing.steps || 4, easing.stepPosition || 'end');
  }

  if (easing.type === 'step-start') {
    return stepsEasing(t, 1, 'start');
  }

  if (easing.type === 'step-end') {
    return stepsEasing(t, 1, 'end');
  }

  let bezierParams;
  if (easing.type === 'cubic-bezier' || easing.type === 'linear' || easing.type === 'ease' ||
      easing.type === 'ease-in' || easing.type === 'ease-out' || easing.type === 'ease-in-out') {
    if (easing.type === 'cubic-bezier') {
      bezierParams = { p1x: easing.p1x!, p1y: easing.p1y!, p2x: easing.p2x!, p2y: easing.p2y! };
    } else {
      bezierParams = BEZIER_MAP[easing.type];
    }
  } else {
    bezierParams = BEZIER_MAP['ease'];
  }

  return cubicBezier(t, bezierParams.p1x, bezierParams.p1y, bezierParams.p2x, bezierParams.p2y);
}

const CurveGrid: React.FC<CurveGridProps> = ({
  easings,
  progress = 0,
  activeEasingId,
  width = 600,
  height = 400,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const chartWidth = width - PADDING * 2;
    const chartHeight = height - PADDING * 2;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(68, 68, 68, 0.5)';
    ctx.lineWidth = 1;

    const gridSteps = 10;
    for (let i = 0; i <= gridSteps; i++) {
      const x = PADDING + (chartWidth * i) / gridSteps;
      ctx.beginPath();
      ctx.moveTo(x, PADDING);
      ctx.lineTo(x, PADDING + chartHeight);
      ctx.stroke();

      const y = PADDING + (chartHeight * i) / gridSteps;
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(PADDING + chartWidth, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    for (let i = 0; i <= gridSteps; i++) {
      const x = PADDING + (chartWidth * i) / gridSteps;
      ctx.fillText((i / gridSteps).toFixed(1), x, PADDING + chartHeight + 20);
    }

    ctx.textAlign = 'right';
    for (let i = 0; i <= gridSteps; i++) {
      const y = PADDING + (chartHeight * (10 - i)) / gridSteps;
      ctx.fillText((i / gridSteps).toFixed(1), PADDING - 10, y + 4);
    }

    easings.forEach((easing) => {
      ctx.strokeStyle = easing.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const steps = easing.type === 'steps' || easing.type === 'step-start' || easing.type === 'step-end';
      if (steps) {
        let prevY = null;
        const stepCount = easing.steps || 1;

        for (let i = 0; i <= stepCount * 2; i++) {
          const t = Math.min(1, i / (stepCount * 2));
          const y = getEasingValue(easing, t);
          const canvasX = PADDING + t * chartWidth;
          const canvasY = PADDING + chartHeight - y * chartHeight;

          if (prevY === null) {
            ctx.moveTo(canvasX, canvasY);
          } else {
            ctx.lineTo(canvasX, canvasY);
          }
          prevY = y;
        }
      } else {
        for (let i = 0; i <= 100; i++) {
          const t = i / 100;
          const y = getEasingValue(easing, t);
          const canvasX = PADDING + t * chartWidth;
          const canvasY = PADDING + chartHeight - y * chartHeight;

          if (i === 0) {
            ctx.moveTo(canvasX, canvasY);
          } else {
            ctx.lineTo(canvasX, canvasY);
          }
        }
      }
      ctx.stroke();

      ctx.fillStyle = easing.color;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      const labelX = PADDING + chartWidth / 2;
      const labelY = height - 15;
      ctx.fillText(easing.name, labelX, labelY + (easings.indexOf(easing) - easings.length / 2 + 0.5) * 16);
    });

    if (activeEasingId && progress > 0) {
      const activeEasing = easings.find((e) => e.id === activeEasingId);
      if (activeEasing) {
        const y = getEasingValue(activeEasing, progressRef.current);
        const canvasX = PADDING + progressRef.current * chartWidth;
        const canvasY = PADDING + chartHeight - y * chartHeight;

        ctx.fillStyle = '#e94560';
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [easings, activeEasingId, width, height]);

  useEffect(() => {
    const render = () => {
      draw();
      animationRef.current = requestAnimationFrame(render);
    };
    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        borderRadius: '8px',
        transition: 'all 0.3s ease',
      }}
    />
  );
};

export default CurveGrid;
