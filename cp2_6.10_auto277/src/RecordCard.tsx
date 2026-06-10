import { useState, useRef, useEffect, useCallback } from 'react';
import type { Record, Track } from './types';

interface RecordCardProps {
  record: Record;
}

export default function RecordCard({ record }: RecordCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const isFlippedRef = useRef(isFlipped);

  useEffect(() => {
    isFlippedRef.current = isFlipped;
  }, [isFlipped]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.track-row') || target.closest('.play-button')) {
      return;
    }
    setIsFlipped(prev => !prev);
  }, []);

  const initAudioContext = useCallback(() => {
    if (!audioRef.current) return;

    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationIdRef.current = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (!isPlaying || !isFlippedRef.current) {
        const barCount = 20;
        const barWidth = (width - (barCount - 1) * 3) / barCount;
        for (let i = 0; i < barCount; i++) {
          const barHeight = 4;
          const x = i * (barWidth + 3);
          const y = (height - barHeight) / 2;
          ctx.fillStyle = 'rgba(200, 169, 110, 0.3)';
          ctx.fillRect(x, y, barWidth, barHeight);
        }
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      const barCount = Math.min(20, bufferLength);
      const step = Math.floor(bufferLength / barCount);
      const barWidth = (width - (barCount - 1) * 3) / barCount;

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step];
        const barHeight = Math.max(4, (value / 255) * height * 0.9);
        const x = i * (barWidth + 3);
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#e0c98f');
        gradient.addColorStop(0.5, '#c8a96e');
        gradient.addColorStop(1, '#a08550');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };

    draw();
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [record.id]);

  useEffect(() => {
    drawVisualizer();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [drawVisualizer]);

  const handlePlayToggle = useCallback(async (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!audioRef.current) return;

    initAudioContext();

    if (currentTrackId === track.id && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (currentTrackId !== track.id) {
      audioRef.current.src = track.audioUrl;
      setCurrentTrackId(track.id);
      setCurrentTime(0);
      setDuration(track.durationSeconds);
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Play failed:', error);
    }
  }, [currentTrackId, isPlaying, initAudioContext]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  useEffect(() => {
    setIsFlipped(false);
    setCurrentTrackId(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, [record.id]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (trackId: string): number => {
    if (currentTrackId !== trackId || duration === 0) return 0;
    return (currentTime / duration) * 100;
  };

  return (
    <>
      <div className="visualizer-container">
        <canvas ref={canvasRef} className="visualizer-canvas" />
      </div>

      <div className="card-wrapper">
        <div
          className={`record-card ${isFlipped ? 'flipped' : ''}`}
          onClick={handleCardClick}
        >
          <div className="card-face card-front">
            <img src={record.coverImage} alt={record.album} />
            <div className="flip-hint">↻</div>
            <div className="card-front-overlay">
              <div className="card-front-title">{record.album}</div>
              <div className="card-front-artist">{record.artist}</div>
            </div>
          </div>

          <div className="card-face card-back">
            <div className="card-back-header">
              <div className="card-back-title">{record.album}</div>
              <div className="card-back-artist">{record.artist}</div>
            </div>

            <div className="track-list" onClick={(e) => e.stopPropagation()}>
              {record.tracks.map((track) => (
                <div
                  key={track.id}
                  className={`track-row ${currentTrackId === track.id && isPlaying ? 'playing' : ''}`}
                >
                  <span className="track-number">{track.number.toString().padStart(2, '0')}</span>

                  <div className="track-info">
                    <div className="track-title">{track.title}</div>
                    <div className="track-progress-container">
                      <div
                        className="track-progress"
                        style={{ width: `${getProgress(track.id)}%` }}
                      />
                    </div>
                  </div>

                  <div className="track-right">
                    <span className="track-duration">
                      {currentTrackId === track.id && isPlaying
                        ? formatTime(currentTime)
                        : track.duration}
                    </span>
                    <button
                      className="play-button"
                      onClick={(e) => handlePlayToggle(track, e)}
                      aria-label={currentTrackId === track.id && isPlaying ? 'Pause' : 'Play'}
                    >
                      {currentTrackId === track.id && isPlaying ? (
                        <svg className="pause-icon" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg className="play-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        crossOrigin="anonymous"
      />
    </>
  );
}
