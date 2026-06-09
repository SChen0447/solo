import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tour, Song } from '../types';
import { AudioPlayer } from '../utils/audioPlayer';

interface MiniPlayerProps {
  tour: Tour;
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const MiniPlayer: React.FC<MiniPlayerProps> = ({ tour }) => {
  const sortedSongs = useCallback(
    () => [...tour.songs].sort((a, b) => a.order - b.order),
    [tour.songs]
  );

  const [songs] = useState<Song[]>(sortedSongs());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<AudioPlayer | null>(null);

  const currentSong = songs[currentIndex] || songs[0];

  useEffect(() => {
    playerRef.current = new AudioPlayer();
    playerRef.current.setOnProgress((p, t) => {
      setProgress(p);
      setCurrentTime(t);
    });
    playerRef.current.setOnSongEnd(() => {
      handleNext();
    });

    return () => {
      playerRef.current?.destroy();
    };
     
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
  }, [tour.id]);

  const handlePlayPause = () => {
    if (!currentSong || !playerRef.current) return;
    playerRef.current.toggle(currentSong);
    setIsPlaying(playerRef.current.getIsPlaying());
  };

  const handlePrev = () => {
    if (!playerRef.current) return;
    const newIndex = currentIndex > 0 ? currentIndex - 1 : songs.length - 1;
    setCurrentIndex(newIndex);
    setProgress(0);
    setCurrentTime(0);
    setIsPlaying(false);
    playerRef.current.stop();
  };

  const handleNext = () => {
    if (!playerRef.current) return;
    const newIndex = (currentIndex + 1) % songs.length;
    setCurrentIndex(newIndex);
    setProgress(0);
    setCurrentTime(0);
    setIsPlaying(true);
    setTimeout(() => {
      playerRef.current?.play(songs[newIndex]);
    }, 50);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !currentSong) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = (e.clientX - rect.left) / rect.width;
    setProgress(p);
    setCurrentTime(p * currentSong.duration);
    playerRef.current.seek(p);
  };

  if (!currentSong) return null;

  return (
    <div className="mini-player">
      <div className="player-info">
        <div className="player-song-title">{currentSong.name}</div>
        <div className="player-song-meta">
          {currentSong.bpm} BPM · {currentSong.key}调
        </div>
      </div>

      <div className="player-progress-container" onClick={handleSeek}>
        <div className="player-progress-bar">
          <div
            className="player-progress-fill"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="player-time">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(currentSong.duration)}</span>
        </div>
      </div>

      <div className="player-controls">
        <button className="player-btn" onClick={handlePrev} title="上一首">
          ⏮
        </button>
        <button className="player-btn player-btn-primary" onClick={handlePlayPause} title={isPlaying ? '暂停' : '播放'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="player-btn" onClick={handleNext} title="下一首">
          ⏭
        </button>
      </div>
    </div>
  );
};

export default MiniPlayer;
