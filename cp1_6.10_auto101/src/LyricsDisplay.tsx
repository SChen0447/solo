import { useRef, useEffect, useMemo } from 'react';
import type { LyricLine } from './types';

interface LyricsDisplayProps {
  lyrics: LyricLine[];
  currentTime: number;
}

function LyricsDisplay({ lyrics, currentTime }: LyricsDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  const currentIndex = useMemo(() => {
    if (lyrics.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [lyrics, currentTime]);

  useEffect(() => {
    if (currentIndex >= 0 && lineRefs.current[currentIndex] && containerRef.current) {
      const line = lineRefs.current[currentIndex];
      const container = containerRef.current;
      const lineTop = line.offsetTop;
      const lineHeight = line.offsetHeight;
      const containerHeight = container.offsetHeight;
      const scrollTo = lineTop - containerHeight / 2 + lineHeight / 2;
      
      container.scrollTo({
        top: scrollTo,
        behavior: 'smooth',
      });
    }
  }, [currentIndex]);

  if (lyrics.length === 0) {
    return (
      <div className="lyrics-container empty" ref={containerRef}>
        <div className="empty-hint">
          <p>🎵 请上传LRC歌词文件或选择一首内置歌曲</p>
          <p className="hint-sub">支持标准LRC格式，带时间戳的歌词文件</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lyrics-container" ref={containerRef}>
      <div className="lyrics-padding-top" />
      {lyrics.map((line, index) => {
        const isCurrent = index === currentIndex;
        const isPast = index < currentIndex;
        
        return (
          <div
            key={index}
            ref={el => lineRefs.current[index] = el}
            className={`lyric-line ${isCurrent ? 'current' : ''} ${isPast ? 'past' : 'future'}`}
          >
            {line.text}
          </div>
        );
      })}
      <div className="lyrics-padding-bottom" />
    </div>
  );
}

export default LyricsDisplay;
