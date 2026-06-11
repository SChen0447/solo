import React, { useEffect, useRef } from 'react';
import type { KLineData } from '../types';

interface KLineChartProps {
  data: KLineData[];
  height?: number;
  stockCode?: string;
}

const KLineChart: React.FC<KLineChartProps> = ({
  data,
  height = 320,
  stockCode = 'NVDA',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const dataRef = useRef<KLineData[]>(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = () => {
      const currentData = dataRef.current;
      if (!currentData || currentData.length === 0) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const padding = { top: 25, right: 60, bottom: 40, left: 10 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(45, 58, 82, 0.4)';
      ctx.lineWidth = 0.5;

      const gridLines = 6;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
      }

      const verticalLines = 8;
      for (let i = 0; i <= verticalLines; i++) {
        const x = padding.left + (chartWidth / verticalLines) * i;
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
      }
      ctx.stroke();
      ctx.restore();

      const allHighs = currentData.map(d => d.high);
      const allLows = currentData.map(d => d.low);
      const maxPrice = Math.max(...allHighs) * 1.01;
      const minPrice = Math.min(...allLows) * 0.99;
      const priceRange = maxPrice - minPrice;

      const candleWidth = Math.max(3, (chartWidth / currentData.length) * 0.7);
      const candleGap = chartWidth / currentData.length;

      const priceToY = (price: number) => {
        return padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
      };

      ctx.save();
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = '#6b7280';
      for (let i = 0; i <= gridLines; i++) {
        const price = maxPrice - (priceRange / gridLines) * i;
        const y = padding.top + (chartHeight / gridLines) * i;
        ctx.textAlign = 'left';
        ctx.fillText(price.toFixed(2), width - padding.right + 5, y + 3);
      }
      ctx.restore();

      for (let i = 0; i < currentData.length; i++) {
        const candle = currentData[i];
        const x = padding.left + candleGap * i + candleGap / 2;
        const isUp = candle.close >= candle.open;

        const highY = priceToY(candle.high);
        const lowY = priceToY(candle.low);
        const openY = priceToY(candle.open);
        const closeY = priceToY(candle.close);

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = isUp ? '#00ff88' : '#ff4757';
        ctx.lineWidth = 1;
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();
        ctx.restore();

        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(1, Math.abs(closeY - openY));

        ctx.save();
        const gradient = ctx.createLinearGradient(x, bodyTop, x, bodyTop + bodyHeight);
        if (isUp) {
          gradient.addColorStop(0, 'rgba(0, 255, 136, 0.9)');
          gradient.addColorStop(1, 'rgba(0, 200, 100, 0.7)');
        } else {
          gradient.addColorStop(0, 'rgba(255, 71, 87, 0.9)');
          gradient.addColorStop(1, 'rgba(220, 40, 60, 0.7)');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
        ctx.restore();
      }

      const ma5Data: number[] = [];
      for (let i = 0; i < currentData.length; i++) {
        if (i < 4) {
          ma5Data.push(NaN);
        } else {
          const sum = currentData.slice(i - 4, i + 1).reduce((s, d) => s + d.close, 0);
          ma5Data.push(sum / 5);
        }
      }

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      let started = false;
      for (let i = 0; i < ma5Data.length; i++) {
        if (isNaN(ma5Data[i])) continue;
        const x = padding.left + candleGap * i + candleGap / 2;
        const y = priceToY(ma5Data[i]);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillStyle = '#e6edf3';
      ctx.textAlign = 'left';
      ctx.fillText(stockCode, padding.left, 18);

      const lastCandle = currentData[currentData.length - 1];
      const prevCandle = currentData[currentData.length - 2];
      const lastChange = prevCandle
        ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100
        : 0;
      ctx.font = '13px Inter, sans-serif';
      ctx.fillStyle = lastChange >= 0 ? '#00ff88' : '#ff4757';
      ctx.fillText(
        `$${lastCandle.close.toFixed(2)}  ${lastChange >= 0 ? '+' : ''}${lastChange.toFixed(2)}%`,
        padding.left + 70,
        18
      );

      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'right';
      ctx.fillText('MA5', width - 10, 18);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(width - 40, 13);
      ctx.lineTo(width - 12, 13);
      ctx.stroke();
      ctx.restore();

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [height, stockCode]);

  return (
    <div ref={containerRef} className="kline-chart-container">
      <canvas ref={canvasRef} />
      <style>{`
        .kline-chart-container {
          position: relative;
          width: 100%;
          border-radius: var(--radius-lg);
          background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-secondary) 100%);
          border: 1px solid var(--border-color);
          overflow: hidden;
          box-shadow: var(--shadow-card);
        }
      `}</style>
    </div>
  );
};

export default KLineChart;
