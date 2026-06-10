import { useRef, useEffect, useState, useCallback } from 'react';
import type { EasingPreset } from '@/utils/easingPresets';
import { cubicBezier } from '@/utils/easingPresets';

interface EasingCardProps {
  preset: EasingPreset;
  globalSignal: number;
  isMatched: boolean;
  onEdit: (preset: EasingPreset) => void;
}

const ANIMATION_DURATION = 2000;
const TRAIL_COUNT = 5;

export default function EasingCard({ preset, globalSignal, isMatched, onEdit }: EasingCardProps) {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trails, setTrails] = useState<Array<{ id: number; progress: number; opacity: number }>>([]);

  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const localPlayingRef = useRef(false);
  const trailIdRef = useRef(0);
  const bezierRef = useRef(preset.bezier);

  bezierRef.current = preset.bezier;

  const animate = useCallback((timestamp: number) => {
    if (!localPlayingRef.current) return;

    if (startTimeRef.current === null) {
      startTimeRef.current = timestamp - pausedAtRef.current;
    }

    const elapsed = timestamp - startTimeRef.current;
    const rawProgress = Math.min(elapsed / ANIMATION_DURATION, 1);
    const easedProgress = cubicBezier(rawProgress, ...bezierRef.current);

    setProgress(easedProgress);

    trailIdRef.current += 1;
    setTrails((prev) => {
      const next = [
        ...prev,
        { id: trailIdRef.current, progress: easedProgress, opacity: 1 },
      ].slice(-TRAIL_COUNT);
      return next.map((t, i) => ({
        ...t,
        opacity: (i + 1) / next.length * 0.6,
      }));
    });

    if (rawProgress >= 1) {
      localPlayingRef.current = false;
      setIsPlaying(false);
      startTimeRef.current = null;
      pausedAtRef.current = 0;
      setTrails([]);
      return;
    }

    rafIdRef.current = requestAnimationFrame(animate);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (localPlayingRef.current) {
      localPlayingRef.current = false;
      setIsPlaying(false);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (startTimeRef.current !== null) {
        pausedAtRef.current = performance.now() - startTimeRef.current;
      }
    } else {
      localPlayingRef.current = true;
      setIsPlaying(true);
      rafIdRef.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  const handleReset = useCallback(() => {
    localPlayingRef.current = false;
    setIsPlaying(false);
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    startTimeRef.current = null;
    pausedAtRef.current = 0;
    setProgress(0);
    setTrails([]);
  }, []);

  useEffect(() => {
    if (globalSignal > 0) {
      localPlayingRef.current = true;
      setIsPlaying(true);
      startTimeRef.current = null;
      pausedAtRef.current = 0;
      setProgress(0);
      setTrails([]);
      rafIdRef.current = requestAnimationFrame(animate);
    } else if (globalSignal === 0) {
      handleReset();
    }
  }, [globalSignal, animate, handleReset]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const ballLeft = `calc(${progress * 100}% * 0.85 + 15px + 8px)`;

  return (
    <div className={`easing-card${isMatched ? ' matched' : ''}`}>
      <div className="card-header">
        <div>
          <div className="card-title">{preset.name}</div>
          <span className={`card-category ${preset.category}`}>{preset.category}</span>
        </div>
        <div className="card-actions">
          <button className="btn-icon" onClick={() => onEdit(preset)} title="编辑贝塞尔曲线">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="track-container">
        <div className="track" />
        <div className="ball-wrapper">
          {trails.map((trail) => (
            <div
              key={trail.id}
              className="trail"
              style={{
                left: `calc(${trail.progress * 100}% * 0.85 + 15px + 8px)`,
                opacity: trail.opacity,
              }}
            />
          ))}
          <div className="ball" style={{ left: ballLeft }} />
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="css-expression">{preset.cssValue}</div>

      <div className="card-controls">
        <button className={`card-btn ${isPlaying ? '' : 'primary'}`} onClick={handlePlayPause}>
          {isPlaying ? '暂停' : '播放'}
        </button>
        <button className="card-btn" onClick={handleReset}>重置</button>
      </div>
    </div>
  );
}
