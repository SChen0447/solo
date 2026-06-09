import { useRef, useEffect, useState, useCallback } from 'react';
import { VideoSegment, FILTER_OPTIONS } from '../types';

interface PreviewPanelProps {
  videoUrl: string;
  currentSegment: VideoSegment | null;
  videoDuration: number;
}

const PreviewPanel = ({ videoUrl, currentSegment, videoDuration }: PreviewPanelProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const filterCss = currentSegment
    ? FILTER_OPTIONS.find(f => f.value === currentSegment.filter)?.css || 'none'
    : 'none';

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const t = videoRef.current.currentTime;
      setCurrentTime(t);

      if (currentSegment) {
        if (t < currentSegment.startTime) {
          videoRef.current.currentTime = currentSegment.startTime;
        } else if (t >= currentSegment.endTime) {
          videoRef.current.currentTime = currentSegment.startTime;
        }
      }
    }
  }, [currentSegment]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current || !videoUrl) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (currentSegment) {
        videoRef.current.currentTime = currentSegment.startTime;
      }
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    }
  }, [isPlaying, videoUrl, currentSegment]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !videoUrl || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    let newTime = ratio * duration;

    if (currentSegment) {
      newTime = Math.max(currentSegment.startTime, Math.min(currentSegment.endTime, newTime));
    }

    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [videoUrl, duration, currentSegment]);

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [videoUrl]);

  useEffect(() => {
    if (videoRef.current && currentSegment && videoUrl) {
      videoRef.current.currentTime = currentSegment.startTime;
      setCurrentTime(currentSegment.startTime);
    }
  }, [currentSegment?.id, videoUrl]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayTime = currentSegment ? currentSegment.startTime : 0;
  const displayDuration = currentSegment ? currentSegment.endTime - currentSegment.startTime : duration;

  return (
    <div style={styles.container}>
      <div style={styles.videoWrapper}>
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              style={{ ...styles.video, filter: filterCss }}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              muted
              playsInline
            />
            {currentSegment && currentSegment.title && (
              <div style={styles.subtitleOverlay}>
                {currentSegment.title}
              </div>
            )}
          </>
        ) : (
          <div style={styles.placeholder}>
            <div style={styles.placeholderIcon}>🎥</div>
            <p style={styles.placeholderText}>上传视频后在此预览</p>
          </div>
        )}
      </div>

      <div style={styles.controls}>
        <button
          style={{
            ...styles.playButton,
            boxShadow: isPlaying ? '0 4px 12px rgba(255,111,0,0.3)' : 'none'
          }}
          onClick={togglePlay}
          disabled={!videoUrl}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={styles.progressWrapper}>
          <div style={styles.progressBar} onClick={handleProgressClick}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progressPercent}%`
              }}
            />
          </div>
          <span style={styles.timeLabel}>
            {formatTime(currentTime - displayTime)} / {formatTime(Math.max(0, displayDuration))}
          </span>
        </div>
      </div>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    overflow: 'hidden'
  },
  videoWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    transition: 'filter 0.3s ease'
  },
  subtitleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '16px 24px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 500,
    textAlign: 'center',
    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
    pointerEvents: 'none'
  },
  placeholder: {
    textAlign: 'center',
    color: '#666'
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  placeholderText: {
    fontSize: 14
  },
  controls: {
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F0F1F',
    borderTop: '1px solid rgba(255,255,255,0.05)'
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: '#FF6F00',
    color: '#fff',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0
  },
  progressWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6F00',
    borderRadius: 2,
    transition: 'width 0.1s linear'
  },
  timeLabel: {
    fontSize: 12,
    color: '#888',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0
  }
};

export default PreviewPanel;
