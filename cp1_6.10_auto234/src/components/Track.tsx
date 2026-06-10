import { useMemo } from 'react';
import type { Clip, Sample, TrackState } from '../types';
import { audioEngine } from '../utils/audioEngine';

interface TrackProps {
  track: TrackState;
  samples: Sample[];
  bpm: number;
  pixelsPerSecond: number;
  trackIndex: number;
  onVolumeChange: (trackId: number, volume: number) => void;
  onMuteToggle: (trackId: number) => void;
  onClipDragStart: (e: React.DragEvent, clip: Clip) => void;
  onDrop: (e: React.DragEvent, trackId: number, x: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onClipDrop: (e: React.DragEvent, trackId: number, x: number) => void;
  currentTime: number;
}

export function Track({
  track,
  samples,
  pixelsPerSecond,
  trackIndex,
  onVolumeChange,
  onMuteToggle,
  onClipDragStart,
  onDrop,
  onDragOver,
  currentTime,
}: TrackProps) {
  const waveformCache = useMemo(() => new Map<string, number[]>(), []);

  const getSample = (sampleId: string) => samples.find(s => s.id === sampleId);

  const getWaveform = (sampleId: string) => {
    if (!waveformCache.has(sampleId)) {
      waveformCache.set(sampleId, audioEngine.generateWaveform(sampleId, 50));
    }
    return waveformCache.get(sampleId)!;
  };

  const bgColor = trackIndex % 2 === 0 ? '#1a1a2e' : '#16213e';

  return (
    <div className="track-wrapper">
      <div className="track-controls">
        <div className="track-name">轨道 {track.id + 1}</div>
        <div className="track-volume">
          <input
            type="range"
            min="0"
            max="100"
            value={track.volume}
            onChange={(e) => onVolumeChange(track.id, parseInt(e.target.value))}
            className="volume-slider"
          />
          <span className="volume-value">{track.volume}</span>
        </div>
        <button
          className={`mute-btn ${track.muted ? 'muted' : ''}`}
          onClick={() => onMuteToggle(track.id)}
        >
          {track.muted ? '🔇' : '🔊'}
        </button>
      </div>
      <div
        className="track-timeline"
        style={{ backgroundColor: bgColor }}
        onDragOver={onDragOver}
        onDrop={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          onDrop(e, track.id, x);
        }}
      >
        {track.clips.map(clip => {
          const sample = getSample(clip.sampleId);
          if (!sample) return null;
          const waveform = getWaveform(clip.sampleId);
          const left = clip.startTime * pixelsPerSecond;
          const width = clip.duration * pixelsPerSecond;

          return (
            <div
              key={clip.id}
              className="clip-block"
              draggable
              onDragStart={(e) => onClipDragStart(e, clip)}
              onDragOver={onDragOver}
              onDrop={(e) => {
                e.stopPropagation();
                const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                onDrop(e, track.id, x);
              }}
              style={{
                left: `${left}px`,
                width: `${width}px`,
                backgroundColor: sample.color,
              }}
            >
              <div className="clip-name">{sample.name}</div>
              <div className="clip-waveform">
                {waveform.map((v, i) => (
                  <div
                    key={i}
                    className="waveform-bar"
                    style={{ height: `${Math.max(v * 100, 4)}%` }}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {currentTime > 0 && (
          <div
            className="playhead-indicator"
            style={{ left: `${currentTime * pixelsPerSecond}px` }}
          />
        )}
      </div>
    </div>
  );
}
