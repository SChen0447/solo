import React, { useMemo } from 'react';
import { HistoricalEvent } from '../data/initialEvents';

interface HeatmapProps {
  events: HistoricalEvent[];
  viewStart: number;
  viewEnd: number;
  onJump: (year: number) => void;
}

const Heatmap: React.FC<HeatmapProps> = ({ events, viewStart, viewEnd, onJump }) => {
  const decadeData = useMemo(() => {
    const totalRange = viewEnd - viewStart;
    const numDecades = Math.max(20, Math.ceil(totalRange / 10));
    const decadeSpan = totalRange / numDecades;

    const data: { start: number; end: number; count: number }[] = [];

    for (let i = 0; i < numDecades; i++) {
      const start = viewStart + i * decadeSpan;
      const end = start + decadeSpan;
      const count = events.filter((e) => e.date >= start && e.date < end).length;
      data.push({ start, end, count });
    }

    return data;
  }, [events, viewStart, viewEnd]);

  const maxCount = useMemo(() => {
    return Math.max(...decadeData.map((d) => d.count), 1);
  }, [decadeData]);

  const getColor = (count: number): string => {
    if (count === 0) {
      return 'rgba(61, 41, 20, 0.1)';
    }
    const ratio = count / maxCount;
    const hue = 200 - ratio * 180;
    const saturation = 60 + ratio * 20;
    const lightness = 70 - ratio * 20;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    const targetYear = viewStart + ratio * (viewEnd - viewStart);
    onJump(targetYear);
  };

  const currentViewPosition = useMemo(() => {
    return {
      left: 0,
      width: '100%',
    };
  }, []);

  return (
    <div className="heatmap-container">
      <div className="heatmap-label">事件密度热图</div>
      <div className="heatmap-bar" onClick={handleClick}>
        {decadeData.map((d, i) => (
          <div
            key={i}
            className="heatmap-segment"
            style={{
              backgroundColor: getColor(d.count),
              flex: 1,
              transition: 'background-color 0.3s ease',
            }}
            title={`${d.start < 0 ? '公元前 ' + Math.abs(Math.round(d.start)) : '公元 ' + Math.round(d.start)} 年: ${d.count} 个事件`}
          />
        ))}
        <div
          className="heatmap-view-indicator"
          style={{
            left: `${currentViewPosition.left}%`,
            width: currentViewPosition.width,
          }}
        />
      </div>
      <div className="heatmap-legend">
        <span>稀疏</span>
        <div className="heatmap-legend-bar" />
        <span>密集</span>
      </div>
    </div>
  );
};

export default Heatmap;
