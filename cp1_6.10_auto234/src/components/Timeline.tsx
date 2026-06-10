import { useCallback } from 'react';
import type { Clip, Sample, TrackState } from '../types';
import { Track } from './Track';

interface TimelineProps {
  tracks: TrackState[];
  samples: Sample[];
  bpm: number;
  currentTime: number;
  onVolumeChange: (trackId: number, volume: number) => void;
  onMuteToggle: (trackId: number) => void;
  onClipMove: (clipId: string, newTrackId: number, newStartTime: number) => void;
  onSampleDrop: (sampleId: string, trackId: number, startTime: number) => void;
}

const BEATS_PER_BAR = 4;
const BASE_PIXELS_PER_BEAT = 60;

export function Timeline({
  tracks,
  samples,
  bpm,
  currentTime,
  onVolumeChange,
  onMuteToggle,
  onClipMove,
  onSampleDrop,
}: TimelineProps) {
  const secondsPerBeat = 60 / bpm;
  const pixelsPerSecond = BASE_PIXELS_PER_BEAT / secondsPerBeat;
  const pixelsPerBeat = BASE_PIXELS_PER_BEAT;
  const pixelsPerBar = pixelsPerBeat * BEATS_PER_BAR;

  const totalBars = 16;
  const timelineWidth = pixelsPerBar * totalBars;

  const renderGrid = useCallback(() => {
    const bars = [];
    for (let i = 0; i <= totalBars; i++) {
      bars.push(
        <div
          key={`bar-${i}`}
          className={`grid-line ${i % 4 === 0 ? 'major' : 'minor'}`}
          style={{ left: `${i * pixelsPerBar}px` }}
        >
          {i % 4 === 0 && <span className="bar-label">{i / 4 + 1}</span>}
        </div>
      );
    }
    return bars;
  }, [pixelsPerBar]);

  const handleClipDragStart = (e: React.DragEvent, clip: Clip) => {
    e.dataTransfer.setData('application/clip', JSON.stringify(clip));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/clip') ? 'move' : 'copy';
  };

  const handleDrop = (e: React.DragEvent, trackId: number, x: number) => {
    e.preventDefault();
    const startTime = Math.max(0, x / pixelsPerSecond);
    const snappedTime = Math.round(startTime / secondsPerBeat * 4) * secondsPerBeat / 4;

    const clipData = e.dataTransfer.getData('application/clip');
    if (clipData) {
      const clip = JSON.parse(clipData) as Clip;
      onClipMove(clip.id, trackId, snappedTime);
      return;
    }

    const sampleId = e.dataTransfer.getData('text/plain');
    if (sampleId) {
      onSampleDrop(sampleId, trackId, snappedTime);
    }
  };

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <div className="timeline-controls-spacer" />
        <div className="timeline-ruler" style={{ width: `${timelineWidth}px` }}>
          {renderGrid()}
          <div
            className="playhead"
            style={{ left: `${currentTime * pixelsPerSecond}px` }}
          />
        </div>
      </div>
      <div className="timeline-tracks">
        {tracks.map((track, idx) => (
          <Track
            key={track.id}
            track={track}
            samples={samples}
            bpm={bpm}
            pixelsPerSecond={pixelsPerSecond}
            trackIndex={idx}
            onVolumeChange={onVolumeChange}
            onMuteToggle={onMuteToggle}
            onClipDragStart={handleClipDragStart}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClipDrop={handleDrop}
            currentTime={currentTime}
          />
        ))}
      </div>
    </div>
  );
}
