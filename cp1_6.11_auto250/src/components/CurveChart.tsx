import React, { useRef, useEffect } from 'react';

interface CurveDataPoint {
  time: number;
  infectionRate: number;
}

interface CurveChartProps {
  noDrugData: CurveDataPoint[];
  withDrugData: CurveDataPoint[];
  maxTime?: number;
  height?: number;
}

const CurveChart: React.FC<CurveChartProps> = ({
  noDrugData,
  withDrugData,
  maxTime = 60,
  height = 200,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#eeeeee';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#bdbdbd';
    ctx.lineWidth = 0.5;

    const xSteps = 6;
    for (let i = 0; i <= xSteps; i++) {
      const x = padding.left + (chartWidth * i) / xSteps;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + (chartHeight * i) / ySteps;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#666';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i <= xSteps; i++) {
      const x = padding.left + (chartWidth * i) / xSteps;
      const time = (maxTime * i) / xSteps;
      ctx.fillText(`${time}s`, x, padding.top + chartHeight + 6);
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + (chartHeight * i) / ySteps;
      const value = 1 - i / ySteps;
      ctx.fillText(`${Math.round(value * 100)}%`, padding.left - 8, y);
    }

    ctx.fillStyle = '#666';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(12, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('感染面积占比', 0, 0);
    ctx.restore();

    const xScale = (time: number) => padding.left + (time / maxTime) * chartWidth;
    const yScale = (rate: number) => padding.top + (1 - rate) * chartHeight;

    const drawCurve = (data: CurveDataPoint[], color: string, lineWidth: number = 2) => {
      if (data.length < 2) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(xScale(data[0].time), yScale(data[0].infectionRate));

      for (let i = 1; i < data.length; i++) {
        const x0 = xScale(data[i - 1].time);
        const y0 = yScale(data[i - 1].infectionRate);
        const x1 = xScale(data[i].time);
        const y1 = yScale(data[i].infectionRate);

        const xc = (x0 + x1) / 2;
        const yc = (y0 + y1) / 2;
        ctx.quadraticCurveTo(x0, y0, xc, yc);
      }

      const lastPoint = data[data.length - 1];
      ctx.lineTo(xScale(lastPoint.time), yScale(lastPoint.infectionRate));
      ctx.stroke();
    };

    drawCurve(noDrugData, '#d32f2f', 2);
    drawCurve(withDrugData, '#388e3c', 2.5);

    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const legendY = padding.top - 6;
    const legendX = padding.left + chartWidth - 180;

    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(legendX, legendY - 6, 16, 3);
    ctx.fillStyle = '#666';
    ctx.fillText('未干预', legendX + 22, legendY - 4);

    ctx.fillStyle = '#388e3c';
    ctx.fillRect(legendX + 80, legendY - 6, 16, 3);
    ctx.fillStyle = '#666';
    ctx.fillText('干预中', legendX + 102, legendY - 4);

  }, [noDrugData, withDrugData, maxTime, height]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        background: '#eeeeee',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
};

export default CurveChart;
