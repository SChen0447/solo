import React, { memo } from 'react';
import { Play, Square } from 'lucide-react';

interface PlaybackBarProps {
  isPlaying: boolean;
  bpm: number;
  currentStep: number;
  totalSteps: number;
  onPlayToggle: () => void;
  onBpmChange: (bpm: number) => void;
}

const PlaybackBar = memo(function PlaybackBar({
  isPlaying,
  bpm,
  currentStep,
  totalSteps,
  onPlayToggle,
  onBpmChange,
}: PlaybackBarProps) {
  const displayStep = isPlaying ? currentStep + 1 : 0;

  return (
    <div className="playback-bar">
      <button
        className="play-btn"
        onClick={onPlayToggle}
        aria-label={isPlaying ? '停止' : '播放'}
      >
        {isPlaying ? (
          <Square size={22} fill="currentColor" />
        ) : (
          <Play size={24} fill="currentColor" style={{ marginLeft: 4 }} />
        )}
      </button>

      <div className="bpm-control">
        <span className="bpm-label">Tempo</span>
        <span className="bpm-value">{bpm}</span>
        <input
          type="range"
          className="bpm-slider"
          min={60}
          max={180}
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
        />
      </div>

      <div className="beat-counter">
        {displayStep} / {totalSteps}
      </div>
    </div>
  );
});

export default PlaybackBar;
