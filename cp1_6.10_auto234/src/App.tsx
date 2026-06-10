import { useState, useEffect, useCallback } from 'react';
import type { Clip, Sample, TrackState } from './types';
import samplesData from './data/samples.json';
import { SoundPalette } from './components/SoundPalette';
import { Timeline } from './components/Timeline';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { audioEngine } from './utils/audioEngine';
import './styles.css';

const samples = samplesData as Sample[];
const STORAGE_KEY = 'rhythm-workshop-state';

const createInitialTracks = (): TrackState[] => [
  { id: 0, volume: 80, muted: false, clips: [] },
  { id: 1, volume: 80, muted: false, clips: [] },
  { id: 2, volume: 70, muted: false, clips: [] },
  { id: 3, volume: 75, muted: false, clips: [] },
];

interface SavedState {
  bpm: number;
  tracks: TrackState[];
}

function App() {
  const [bpm, setBpm] = useState(120);
  const [tracks, setTracks] = useState<TrackState[]>(createInitialTracks());
  const [isExporting, setIsExporting] = useState(false);

  const { isPlaying, currentTime, play, pause, stop, togglePlay } = useAudioPlayer(tracks, bpm);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedState = JSON.parse(saved);
        if (parsed.bpm) setBpm(parsed.bpm);
        if (parsed.tracks && Array.isArray(parsed.tracks) && parsed.tracks.length === 4) {
          setTracks(parsed.tracks);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const state: SavedState = { bpm, tracks };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [bpm, tracks]);

  const handleVolumeChange = useCallback((trackId: number, volume: number) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, volume } : t
    ));
    audioEngine.setTrackVolume(trackId, volume);
  }, []);

  const handleMuteToggle = useCallback((trackId: number) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, muted: !t.muted } : t
    ));
    setTracks(prev => {
      const track = prev.find(t => t.id === trackId);
      if (track) {
        audioEngine.setTrackMute(trackId, !track.muted);
      }
      return prev;
    });
  }, []);

  const handleClipMove = useCallback((clipId: string, newTrackId: number, newStartTime: number) => {
    setTracks(prev => {
      let movedClip: Clip | null = null;
      const withoutClip = prev.map(track => ({
        ...track,
        clips: track.clips.filter(c => {
          if (c.id === clipId) {
            movedClip = c;
            return false;
          }
          return true;
        })
      }));
      if (!movedClip) return prev;
      return withoutClip.map(track =>
        track.id === newTrackId
          ? { ...track, clips: [...track.clips, { ...movedClip!, trackId: newTrackId, startTime: newStartTime }] }
          : track
      );
    });
  }, []);

  const handleSampleDrop = useCallback((sampleId: string, trackId: number, startTime: number) => {
    const sample = samples.find(s => s.id === sampleId);
    if (!sample) return;
    const newClip: Clip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sampleId,
      trackId,
      startTime,
      duration: sample.duration,
    };
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, clips: [...track.clips, newClip] }
        : track
    ));
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      const blob = await audioEngine.exportWAV(tracks, bpm);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rhythm-workshop-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="app">
      <header className="top-nav">
        <div className="logo">
          <span className="logo-icon">🎵</span>
          <span className="logo-text">律动工坊</span>
        </div>
        <div className="nav-controls">
          <div className="transport-controls">
            <button className={`transport-btn ${isPlaying ? 'active' : ''}`} onClick={togglePlay}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="transport-btn" onClick={stop}>⏹</button>
          </div>
          <div className="bpm-control">
            <span className="bpm-label">BPM</span>
            <input
              type="range"
              min="60"
              max="180"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value))}
              className="bpm-slider"
            />
            <span className="bpm-value">{bpm}</span>
          </div>
          <button
            className="export-btn"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <span className="spinner" />
                导出中...
              </>
            ) : (
              '📤 导出 WAV'
            )}
          </button>
        </div>
      </header>
      <main className="main-content">
        <aside className="palette-panel">
          <SoundPalette />
        </aside>
        <section className="timeline-panel">
          <Timeline
            tracks={tracks}
            samples={samples}
            bpm={bpm}
            currentTime={currentTime}
            onVolumeChange={handleVolumeChange}
            onMuteToggle={handleMuteToggle}
            onClipMove={handleClipMove}
            onSampleDrop={handleSampleDrop}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
