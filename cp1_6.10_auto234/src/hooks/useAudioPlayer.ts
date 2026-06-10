import { useState, useEffect, useRef, useCallback } from 'react';
import type { TrackState } from '../types';
import { audioEngine } from '../utils/audioEngine';

export function useAudioPlayer(tracks: TrackState[], bpm: number) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number | null>(null);

  const updateTime = useCallback(() => {
    if (audioEngine.getIsPlaying()) {
      setCurrentTime(audioEngine.getCurrentPlaybackTime());
    }
    rafRef.current = requestAnimationFrame(updateTime);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateTime);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updateTime]);

  const play = useCallback((startTime?: number) => {
    const t = startTime ?? currentTime;
    audioEngine.startPlayback(tracks, bpm, t);
    setIsPlaying(true);
  }, [tracks, bpm, currentTime]);

  const pause = useCallback(() => {
    const pausedAt = audioEngine.pausePlayback();
    setCurrentTime(pausedAt);
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    audioEngine.stopPlayback();
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const seek = useCallback((time: number) => {
    const wasPlaying = audioEngine.getIsPlaying();
    audioEngine.stopPlayback();
    setCurrentTime(time);
    if (wasPlaying) {
      audioEngine.startPlayback(tracks, bpm, time);
    }
  }, [tracks, bpm]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  return {
    isPlaying,
    currentTime,
    play,
    pause,
    stop,
    seek,
    togglePlay,
  };
}
