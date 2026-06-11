import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from './store';
import { InteractionPanel } from './InteractionPanel';
import { InfoPanel } from './InfoPanel';
import * as AudioEngine from './AudioEngine';
import { recordingController, createTouchEvent } from './RecordingController';
import type { CellPosition, PlaybackSpeed } from './types';

function useBreakpoint(): 'desktop' | 'tablet' | 'mobile' {
  const [bp, setBp] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w < 640) setBp('mobile');
      else if (w < 1024) setBp('tablet');
      else setBp('desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return bp;
}

export default function App() {
  const breakpoint = useBreakpoint();
  const [activeCells, setActiveCells] = useState<Set<string>>(new Set());
  const [audioReady, setAudioReady] = useState(false);
  const cellTimersRef = useRef<Map<string, number>>(new Map());

  const {
    currentNote,
    currentVelocity,
    recentNotes,
    recording,
    setNote,
    startRecording,
    stopRecording,
    addEvent,
    setPlaybackSpeed,
    setPlaying,
  } = useAppStore();

  useEffect(() => {
    AudioEngine.init().then(() => setAudioReady(true));
    return () => {
      AudioEngine.dispose();
      recordingController.stopPlayback();
    };
  }, []);

  const activateCell = useCallback((key: string) => {
    setActiveCells((prev) => new Set(prev).add(key));
    const existing = cellTimersRef.current.get(key);
    if (existing) clearTimeout(existing);
    const timer = window.setTimeout(() => {
      setActiveCells((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      cellTimersRef.current.delete(key);
    }, 500);
    cellTimersRef.current.set(key, timer);
  }, []);

  const handleCellTrigger = useCallback(
    (position: CellPosition, velocity: number, type: 'click' | 'drag') => {
      if (!audioReady) return;

      const key = `${position.row}-${position.col}`;
      activateCell(key);

      const noteInfo = AudioEngine.getNoteInfo(position.row, position.col);
      AudioEngine.playNote(position.row, position.col, velocity);
      setNote(noteInfo, velocity);

      if (recording.isRecording) {
        const event = createTouchEvent(position, velocity, type);
        addEvent(event);
      }
    },
    [audioReady, activateCell, setNote, recording.isRecording, addEvent]
  );

  const handleStartRecording = useCallback(() => {
    recordingController.start();
    startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(() => {
    recordingController.stop();
    stopRecording();
  }, [stopRecording]);

  const handlePlayback = useCallback(() => {
    if (recording.events.length === 0) return;
    setPlaying(true);
    recordingController.playback(
      recording.events,
      recording.playbackSpeed as PlaybackSpeed,
      (event) => {
        const key = `${event.position.row}-${event.position.col}`;
        activateCell(key);
        const noteInfo = AudioEngine.getNoteInfo(event.position.row, event.position.col);
        setNote(noteInfo, event.velocity);
      },
      () => {
        setPlaying(false);
      }
    );
  }, [recording.events, recording.playbackSpeed, activateCell, setNote, setPlaying]);

  const handleStopPlayback = useCallback(() => {
    recordingController.stopPlayback();
    setPlaying(false);
  }, [setPlaying]);

  const speedOptions: PlaybackSpeed[] = [0.5, 1, 2];

  return (
    <div className="app-root">
      <div className="app-bg" />

      <div className="recording-controls">
        {!recording.isRecording && !recording.isPlaying && (
          <motion.button
            className="rec-btn"
            whileTap={{ scale: 0.95 }}
            onClick={handleStartRecording}
            title="录音"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8" fill="currentColor" />
            </svg>
          </motion.button>
        )}

        {recording.isRecording && (
          <motion.button
            className="rec-btn rec-btn-stop"
            whileTap={{ scale: 0.95 }}
            onClick={handleStopRecording}
            title="停止"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
            </svg>
          </motion.button>
        )}

        {!recording.isRecording && recording.events.length > 0 && !recording.isPlaying && (
          <motion.button
            className="rec-btn"
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayback}
            title="回放"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          </motion.button>
        )}

        {recording.isPlaying && (
          <motion.button
            className="rec-btn rec-btn-stop"
            whileTap={{ scale: 0.95 }}
            onClick={handleStopPlayback}
            title="停止回放"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
            </svg>
          </motion.button>
        )}

        {!recording.isRecording && recording.events.length > 0 && (
          <div className="speed-selector">
            {speedOptions.map((s) => (
              <button
                key={s}
                className={`speed-btn ${recording.playbackSpeed === s ? 'speed-btn-active' : ''}`}
                onClick={() => setPlaybackSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="main-content">
        <div className="panel-area">
          <InteractionPanel
            onCellTrigger={handleCellTrigger}
            activeCells={activeCells}
            breakpoint={breakpoint}
          />
        </div>

        <div className="info-area">
          <InfoPanel
            currentNote={currentNote}
            currentVelocity={currentVelocity}
            recentNotes={recentNotes}
          />
        </div>
      </div>

      <div className="app-title">
        <h1>光影音疗</h1>
        <p>轻触网格，聆听内心的回响</p>
      </div>
    </div>
  );
}
