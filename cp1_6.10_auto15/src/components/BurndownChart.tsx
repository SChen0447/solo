import React, { useRef, useEffect } from 'react';
import { useStore } from '../store';

export const BurndownChart: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const project = useStore((s) => s.getCurrentProject());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 30, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const totalTasks = project.burndownHistory[0]?.remaining ?? Object.values(project.tasks).filter((t) => t.columnId !== 'done').length;
    const sprintDays = project.sprintDays;

    const idealStart = { x: padding.left, y: padding.top };
    const idealEnd = {
      x: padding.left + chartWidth,
      y: padding.top + chartHeight,
    };

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(idealStart.x, idealStart.y);
    ctx.lineTo(idealEnd.x, idealEnd.y);
    ctx.stroke();
    ctx.restore();

    if (project.burndownHistory.length > 0 && totalTasks > 0) {
      const xStep = chartWidth / (sprintDays - 1);
      const yScale = chartHeight / totalTasks;

      const actualPoints = project.burndownHistory.map((point, index) => {
        const daysDiff = Math.min(
          Math.floor(
            (new Date(point.date).getTime() - new Date(project.sprintStartDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ),
          sprintDays - 1
        );
        return {
          x: padding.left + daysDiff * xStep,
          y: padding.top + point.remaining * yScale,
          remaining: point.remaining,
        };
      });

      if (actualPoints.length >= 2) {
        ctx.save();
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
        gradient.addColorStop(0, 'rgba(0, 180, 216, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 180, 216, 0.02)');

        ctx.beginPath();
        ctx.moveTo(actualPoints[0].x, padding.top + chartHeight);
        actualPoints.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.lineTo(actualPoints[actualPoints.length - 1].x, padding.top + chartHeight);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = '#00B4D8';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0, 180, 216, 0.4)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      actualPoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();

      ctx.save();
      actualPoints.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#00B4D8';
        ctx.fill();
        ctx.strokeStyle = '#1E2A38';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      const value = Math.round(totalTasks - (totalTasks / 5) * i);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(value), padding.left - 10, y + 4);
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < sprintDays; i++) {
      const x = padding.left + (chartWidth / (sprintDays - 1)) * i;
      ctx.fillText(`D${i + 1}`, x, padding.top + chartHeight + 20);
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('剩余任务数', 10, 18);
    ctx.restore();

    ctx.save();
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
    ctx.fillRect(width - 140, 10, 10, 10);
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(width - 140, 15);
    ctx.lineTo(width - 130, 15);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText('理想线', width - 135, 20);

    ctx.fillStyle = '#00B4D8';
    ctx.fillRect(width - 140, 26, 10, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('实际', width - 135, 36);
    ctx.restore();
  }, [project]);

  return (
    <div className="burndown-chart">
      <div className="burndown-chart__header">
        <h3>🔥 冲刺燃尽图</h3>
        <span className="burndown-chart__subtitle">
          {project ? `第 ${project.sprintDays} 天冲刺` : ''}
        </span>
      </div>
      <canvas ref={canvasRef} className="burndown-chart__canvas" />
    </div>
  );
};
