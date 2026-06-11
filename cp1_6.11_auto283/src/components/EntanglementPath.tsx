import { useEffect, useRef } from 'react';
import { generateScatterData, theoreticalCorrelation } from '../utils/quantumLogic';
import type { MeasurementRecord } from '../utils/quantumLogic';

interface EntanglementPathProps {
  angleDiff: number;
  rippleTrigger: number;
  records: MeasurementRecord[];
}

interface Ripple {
  x: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  colorProgress: number;
}

export default function EntanglementPath({
  angleDiff,
  rippleTrigger,
  records,
}: EntanglementPathProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const flowOffsetRef = useRef(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (rippleTrigger > 0) {
      ripplesRef.current.push({
        x: 0,
        radius: 0,
        maxRadius: 30,
        alpha: 1,
        colorProgress: 0,
      });
    }
  }, [rippleTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    const totalTwists = (Math.abs(angleDiff % 180) / 90) * 3 + 0.5;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      flowOffsetRef.current += 0.02;
      if (flowOffsetRef.current > 1) {
        flowOffsetRef.current = 0;
      }

      const margin = 30;
      const pathStart = margin;
      const pathEnd = width - margin;

      drawSpiralPath(
        ctx,
        pathStart,
        pathEnd,
        centerY,
        totalTwists,
        flowOffsetRef.current
      );

      ripplesRef.current = ripplesRef.current
        .map((ripple) => ({
          ...ripple,
          x: ripple.x + 3,
          radius: ripple.radius + 1.5,
          alpha: ripple.alpha - 0.015,
          colorProgress: ripple.colorProgress + 0.02,
        }))
        .filter((ripple) => ripple.alpha > 0 && ripple.x < pathEnd);

      ripplesRef.current.forEach((ripple) => {
        const r = Math.min(ripple.radius, ripple.maxRadius);
        const gradient = ctx.createRadialGradient(
          ripple.x,
          centerY,
          0,
          ripple.x,
          centerY,
          r
        );

        const pink = { r: 233, g: 30, b: 99 };
        const cyan = { r: 0, g: 188, b: 212 };
        const progress = Math.min(ripple.colorProgress, 1);
        const colorR = Math.round(pink.r + (cyan.r - pink.r) * progress);
        const colorG = Math.round(pink.g + (cyan.g - pink.g) * progress);
        const colorB = Math.round(pink.b + (cyan.b - pink.b) * progress);

        gradient.addColorStop(0, `rgba(${colorR}, ${colorG}, ${colorB}, ${ripple.alpha * 0.6})`);
        gradient.addColorStop(1, `rgba(${colorR}, ${colorG}, ${colorB}, 0)`);

        ctx.beginPath();
        ctx.arc(ripple.x, centerY, r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      if (records.length >= 50) {
        drawScatterPlot(ctx, width, height, records);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [angleDiff, records]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={300}
      style={{ display: 'block' }}
    />
  );
}

function drawSpiralPath(
  ctx: CanvasRenderingContext2D,
  startX: number,
  endX: number,
  centerY: number,
  totalTwists: number,
  flowOffset: number
) {
  const amplitude = 25;
  const segments = 200;

  for (let strand = 0; strand < 2; strand++) {
    ctx.beginPath();

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = startX + (endX - startX) * t;
      const phaseOffset = strand * Math.PI + flowOffset * Math.PI * 2;
      const y = centerY + Math.sin(t * totalTwists * Math.PI * 2 + phaseOffset) * amplitude;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    const gradient = ctx.createLinearGradient(startX, 0, endX, 0);
    gradient.addColorStop(0, 'rgba(233, 30, 99, 0.8)');
    gradient.addColorStop(0.5, 'rgba(156, 39, 176, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 188, 212, 0.8)');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = strand === 0 ? '#e91e63' : '#00bcd4';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  for (let i = 0; i <= segments; i += 10) {
    const t = i / segments;
    const x = startX + (endX - startX) * t;
    const phaseOffset = flowOffset * Math.PI * 2;
    const y1 = centerY + Math.sin(t * totalTwists * Math.PI * 2 + phaseOffset) * amplitude;
    const y2 = centerY + Math.sin(t * totalTwists * Math.PI * 2 + phaseOffset + Math.PI) * amplitude;

    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawScatterPlot(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  records: Array<{
    id: string;
    aliceAngle: number;
    bobAngle: number;
    aliceResult: number;
    bobResult: number;
    timestamp: number;
  }>
) {
  const plotX = 20;
  const plotY = 30;
  const plotWidth = width - 40;
  const plotHeight = height - 60;

  ctx.fillStyle = 'rgba(10, 11, 28, 0.7)';
  ctx.fillRect(plotX - 5, plotY - 5, plotWidth + 10, plotHeight + 10);
  ctx.strokeStyle = 'rgba(0, 188, 212, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(plotX - 5, plotY - 5, plotWidth + 10, plotHeight + 10);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = plotY + (plotHeight * i) / 5;
    ctx.beginPath();
    ctx.moveTo(plotX, y);
    ctx.lineTo(plotX + plotWidth, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plotX, plotY + plotHeight / 2);
  ctx.lineTo(plotX + plotWidth, plotY + plotHeight / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = '#ff9800';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 180; i++) {
    const x = plotX + (i / 180) * plotWidth;
    const correlation = theoreticalCorrelation(i);
    const y = plotY + plotHeight / 2 - (correlation * plotHeight) / 2;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);

  const scatterData = generateScatterData(records);
  scatterData.forEach((point) => {
    const x = plotX + (point.x / 180) * plotWidth;
    const y = plotY + plotHeight / 2 - (point.y * plotHeight) / 2;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 188, 212, 0.8)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  ctx.font = '12px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('角度差 (°)', plotX + plotWidth / 2, plotY + plotHeight + 20);

  ctx.save();
  ctx.translate(plotX - 15, plotY + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('关联度 E', 0, 0);
  ctx.restore();

  ctx.font = '11px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.textAlign = 'right';
  ctx.fillText('1', plotX - 8, plotY + 4);
  ctx.fillText('-1', plotX - 8, plotY + plotHeight - 4);
  ctx.fillText('0', plotX - 8, plotY + plotHeight / 2 + 4);
}
