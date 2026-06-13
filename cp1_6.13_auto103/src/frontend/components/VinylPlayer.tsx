import React, { useEffect, useRef, useState } from 'react';
import '../styles/vinyl-player.scss';

interface Props {
  audioUrl: string;
  duration: number;
  colors: [string, string, string];
  playing: boolean;
  onFinished: () => void;
}

function VinylPlayer({ audioUrl, duration, colors, playing, onFinished }: Props): JSX.Element {
  const [progress, setProgress] = useState(0);
  const [localPlaying, setLocalPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startProgressRef = useRef<number>(0);
  const finishedRef = useRef(false);

  const tick = React.useCallback(
    (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000;
      const current = Math.min(duration, startProgressRef.current + elapsed);
      setProgress(current);
      if (current >= duration) {
        if (!finishedRef.current) {
          finishedRef.current = true;
          onFinished();
        }
        setLocalPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [duration, onFinished]
  );

  useEffect(() => {
    if (playing && !localPlaying) {
      finishedRef.current = false;
      setLocalPlaying(true);
      startTimeRef.current = performance.now();
      startProgressRef.current = progress;
      rafRef.current = requestAnimationFrame(tick);
    }
    if (!playing && localPlaying && progress < duration) {
      setLocalPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const handleToggle = () => {
    if (localPlaying) {
      setLocalPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } else if (progress < duration) {
      finishedRef.current = false;
      setLocalPlaying(true);
      startTimeRef.current = performance.now();
      startProgressRef.current = progress;
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const percent = Math.min(100, (progress / duration) * 100);
  const rotationDeg = (progress / duration) * 360 * 4;

  return (
    <div className="vinyl-player">
      <div
        className={`vinyl-disc ${localPlaying ? 'is-spinning' : ''}`}
        style={{ transform: `rotate(${rotationDeg}deg)` }}
      >
        <div className="vinyl-disc__grooves">
          <div className="groove groove-1" />
          <div className="groove groove-2" />
          <div className="groove groove-3" />
          <div className="groove groove-4" />
        </div>
        <div
          className="vinyl-disc__label"
          style={{ background: `radial-gradient(circle, ${colors[2]} 0%, ${colors[0]} 100%)` }}
        >
          <div className="label-title">声色</div>
          <div className="label-hole" />
        </div>
        <div className="vinyl-disc__progress-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
            <circle
              cx="50"
              cy="50"
              r="47"
              fill="none"
              stroke={colors[2]}
              strokeWidth="1.5"
              strokeDasharray={`${(percent / 100) * 295.31} 295.31`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ filter: `drop-shadow(0 0 4px ${colors[2]}cc)` }}
            />
          </svg>
        </div>
      </div>

      <div className="vinyl-player__controls">
        <button
          type="button"
          className="play-btn"
          onClick={handleToggle}
          aria-label={localPlaying ? '暂停' : '播放'}
        >
          {localPlaying ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.25-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z" />
            </svg>
          )}
        </button>

        <div className="progress-wrapper">
          <div className="progress-track">
            <div className="track-grooves">
              {Array.from({ length: 36 }).map((_, i) => (
                <div
                  key={i}
                  className="groove-mark"
                  style={{
                    background: i < Math.floor((percent / 100) * 36) ? colors[2] : 'rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>
            <div
              className="progress-fill"
              style={{
                width: `${percent}%`,
                background: `linear-gradient(90deg, ${colors[0]}, ${colors[2]})`,
              }}
            />
          </div>
          <div className="progress-waveform">
            <img src={audioUrl} alt="" draggable={false} style={{ opacity: 0.35 }} />
            <div
              className="waveform-mask"
              style={{
                clipPath: `inset(0 ${100 - percent}% 0 0)`,
              }}
            >
              <img src={audioUrl} alt="" draggable={false} />
            </div>
          </div>
          <div className="time-display">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default VinylPlayer;
