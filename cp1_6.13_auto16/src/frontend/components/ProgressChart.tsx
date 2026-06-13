import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { WorkoutRecord } from '../App';

interface ProgressChartProps {
  records: WorkoutRecord[];
  loading: boolean;
}

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function getWeekDates(): string[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function getHeatColor(duration: number, maxDuration: number): string {
  if (duration === 0) return '#2a2a2a';
  const ratio = Math.min(duration / Math.max(maxDuration, 1), 1);
  const r = Math.round(232 + (46 - 232) * ratio);
  const g = Math.round(245 + (125 - 245) * ratio);
  const b = Math.round(233 + (50 - 233) * ratio);
  return `rgb(${r},${g},${b})`;
}

function useCountUp(target: number, duration: number = 800): number {
  const [current, setCurrent] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = null;
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return current;
}

export default function ProgressChart({ records, loading }: ProgressChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 100 });

  const weekDates = getWeekDates();

  const dayData = weekDates.map((date) => {
    const dayRecords = records.filter((r) => r.date === date);
    const totalDuration = dayRecords.reduce((sum, r) => sum + r.duration, 0);
    return { date, records: dayRecords, totalDuration };
  });

  const totalDuration = dayData.reduce((sum, d) => sum + d.totalDuration, 0);
  const activeDays = dayData.filter((d) => d.totalDuration > 0).length;
  const avgDuration = activeDays > 0 ? Math.round(totalDuration / activeDays) : 0;

  const animatedTotal = useCountUp(totalDuration);
  const animatedAvg = useCountUp(avgDuration);

  const cellPositions = useRef<{ x: number; y: number; size: number }[]>([]);

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvasSize;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const maxDur = 120;
    const cellSize = Math.min((width - 48) / 7 - 8, 60);
    const gap = 8;
    const startX = (width - (cellSize * 7 + gap * 6)) / 2;
    const startY = 10;

    cellPositions.current = [];

    for (let i = 0; i < 7; i++) {
      const x = startX + i * (cellSize + gap);
      const y = startY;
      const color = getHeatColor(dayData[i].totalDuration, maxDur);

      cellPositions.current.push({ x, y, size: cellSize });

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, cellSize, cellSize, 8);
      ctx.fill();

      if (hoveredCell === i || selectedDay === i) {
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, cellSize, cellSize, 8);
        ctx.stroke();
      }

      ctx.fillStyle = dayData[i].totalDuration > 0 ? '#fff' : '#666';
      ctx.font = `600 ${Math.max(11, cellSize * 0.22)}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(DAYS[i], x + cellSize / 2, y + cellSize * 0.38);

      ctx.font = `700 ${Math.max(13, cellSize * 0.26)}px -apple-system, sans-serif`;
      ctx.fillText(
        dayData[i].totalDuration > 0 ? `${dayData[i].totalDuration}'` : '-',
        x + cellSize / 2,
        y + cellSize * 0.65
      );
    }
  }, [canvasSize, dayData, hoveredCell, selectedDay]);

  useEffect(() => {
    drawHeatmap();
  }, [drawHeatmap]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setCanvasSize({ width: Math.max(w - 48, 300), height: 90 });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = 0; i < cellPositions.current.length; i++) {
      const cell = cellPositions.current[i];
      if (x >= cell.x && x <= cell.x + cell.size && y >= cell.y && y <= cell.y + cell.size) {
        setSelectedDay(selectedDay === i ? null : i);
        return;
      }
    }
    setSelectedDay(null);
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = 0; i < cellPositions.current.length; i++) {
      const cell = cellPositions.current[i];
      if (x >= cell.x && x <= cell.x + cell.size && y >= cell.y && y <= cell.y + cell.size) {
        setHoveredCell(i);
        canvas.style.cursor = 'pointer';
        return;
      }
    }
    setHoveredCell(null);
    canvas.style.cursor = 'default';
  };

  const selectedData = selectedDay !== null ? dayData[selectedDay] : null;

  if (loading) {
    return (
      <div ref={containerRef}>
        <h2 style={{ color: '#e0e0e0', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
          我的进度
        </h2>
        <div className="skeleton" style={{ width: '100%', height: 100, marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="skeleton" style={{ width: 120, height: 60 }} />
          <div className="skeleton" style={{ width: 120, height: 60 }} />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ animation: 'fadeIn 0.4s ease' }}>
      <h2 style={{ color: '#e0e0e0', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        我的进度
      </h2>

      <div
        style={{
          background: '#1e1e1e',
          borderRadius: 16,
          padding: 24,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h3 style={{ color: '#aaa', fontSize: 14, marginBottom: 16, fontWeight: 500 }}>
          本周训练打卡
        </h3>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
          onMouseLeave={() => setHoveredCell(null)}
          style={{ width: '100%', display: 'block' }}
        />

        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: '#666' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#2a2a2a', marginRight: 4, verticalAlign: 'middle' }} />
            无记录
          </span>
          <span style={{ fontSize: 12, color: '#666' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#c8e6c9', marginRight: 4, verticalAlign: 'middle' }} />
            轻度
          </span>
          <span style={{ fontSize: 12, color: '#666' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#66bb6a', marginRight: 4, verticalAlign: 'middle' }} />
            中度
          </span>
          <span style={{ fontSize: 12, color: '#666' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#2e7d32', marginRight: 4, verticalAlign: 'middle' }} />
            高强度
          </span>
        </div>
      </div>

      {selectedData && (
        <div
          style={{
            background: '#1e1e1e',
            borderRadius: 16,
            padding: 20,
            marginTop: 16,
            border: '1px solid rgba(79, 195, 247, 0.2)',
            animation: 'slideUp 0.3s ease',
          }}
        >
          <h3 style={{ color: '#4fc3f7', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            {selectedData.date} ({DAYS[selectedDay!]})
          </h3>
          {selectedData.records.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedData.records.map((r, i) => (
                <div
                  key={r.id || i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: '#2a2a2a',
                    borderRadius: 10,
                  }}
                >
                  <span style={{ color: '#e0e0e0', fontSize: 14 }}>{r.courseName}</span>
                  <span style={{ color: '#4fc3f7', fontSize: 14, fontWeight: 600 }}>
                    {r.duration} 分钟
                  </span>
                </div>
              ))}
              <div
                style={{
                  marginTop: 8,
                  padding: '10px 14px',
                  background: 'rgba(79, 195, 247, 0.08)',
                  borderRadius: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ color: '#aaa', fontSize: 13 }}>当日合计</span>
                <span style={{ color: '#4fc3f7', fontSize: 14, fontWeight: 700 }}>
                  {selectedData.totalDuration} 分钟
                </span>
              </div>
            </div>
          ) : (
            <div style={{ color: '#666', fontSize: 14, padding: '16px 0' }}>
              当天无训练记录
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          marginTop: 16,
        }}
      >
        <div
          style={{
            background: '#1e1e1e',
            borderRadius: 16,
            padding: 20,
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>本周总时长</div>
          <div style={{ color: '#4fc3f7', fontSize: 28, fontWeight: 700 }}>
            {animatedTotal}
            <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 2 }}>分钟</span>
          </div>
        </div>
        <div
          style={{
            background: '#1e1e1e',
            borderRadius: 16,
            padding: 20,
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>日均时长</div>
          <div style={{ color: '#66bb6a', fontSize: 28, fontWeight: 700 }}>
            {animatedAvg}
            <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 2 }}>分钟</span>
          </div>
        </div>
        <div
          style={{
            background: '#1e1e1e',
            borderRadius: 16,
            padding: 20,
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>打卡天数</div>
          <div style={{ color: '#ffd54f', fontSize: 28, fontWeight: 700 }}>
            {activeDays}
            <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 2 }}>/ 7 天</span>
          </div>
        </div>
      </div>
    </div>
  );
}
