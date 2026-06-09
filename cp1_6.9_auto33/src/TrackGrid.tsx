import React, { memo, useState, useCallback } from 'react';

export const TRACK_NAMES = [
  'Kick', 'Snare', 'HiHat', 'Clap',
  'Tom', 'Cymbal', 'Bass', 'FX'
];

export const TRACK_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#3498db', '#9b59b6', '#e91e63', '#00bcd4'
];

interface TrackGridProps {
  grid: boolean[][];
  currentStep: number;
  isPlaying: boolean;
  onPadClick: (row: number, col: number) => void;
}

interface PadProps {
  active: boolean;
  color: string;
  onClick: () => void;
}

const Pad = memo(function Pad({ active, color, onClick }: PadProps) {
  const [pressed, setPressed] = useState(false);

  const handleClick = useCallback(() => {
    setPressed(true);
    onClick();
    setTimeout(() => setPressed(false), 150);
  }, [onClick]);

  const style: React.CSSProperties = active
    ? { backgroundColor: color, color: color }
    : {};

  return (
    <button
      className={`pad ${active ? 'active' : ''} ${pressed ? 'pressed' : ''}`}
      style={style}
      onClick={handleClick}
      aria-label={`Pad ${active ? 'active' : 'inactive'}`}
    />
  );
});

const TrackGrid = memo(function TrackGrid({
  grid,
  currentStep,
  isPlaying,
  onPadClick,
}: TrackGridProps) {
  const cols = grid[0]?.length || 16;
  const padWidth = 50;
  const gap = 4;
  const indicatorLeft = isPlaying ? currentStep * (padWidth + gap) : -9999;

  return (
    <div className="grid-wrapper">
      {TRACK_NAMES.map((name, row) => (
        <div key={name} className="track-row">
          <div
            className="track-label"
            style={{ color: TRACK_COLORS[row] }}
          >
            {name}
          </div>
          <div className="pads-container">
            {row === 0 && (
              <div
                className="step-indicator"
                style={{ left: indicatorLeft }}
              />
            )}
            {grid[row]?.map((active, col) => (
              <Pad
                key={col}
                active={active}
                color={TRACK_COLORS[row]}
                onClick={() => onPadClick(row, col)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

export default TrackGrid;
