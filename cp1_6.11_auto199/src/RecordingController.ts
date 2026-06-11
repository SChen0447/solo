import { v4 as uuidv4 } from 'uuid';
import type { TouchEvent, PlaybackSpeed } from './types';
import * as AudioEngine from './AudioEngine';

interface RecordingController {
  start: () => void;
  stop: () => void;
  playback: (
    events: TouchEvent[],
    speed: PlaybackSpeed,
    onEvent: (event: TouchEvent) => void,
    onDone: () => void
  ) => void;
  stopPlayback: () => void;
}

let playbackTimers: number[] = [];
let isPlaying = false;

export const recordingController: RecordingController = {
  start() {
    isPlaying = false;
    playbackTimers.forEach(clearTimeout);
    playbackTimers = [];
  },

  stop() {
    isPlaying = false;
    playbackTimers.forEach(clearTimeout);
    playbackTimers = [];
  },

  playback(events, speed, onEvent, onDone) {
    if (events.length === 0) {
      onDone();
      return;
    }

    isPlaying = true;
    playbackTimers.forEach(clearTimeout);
    playbackTimers = [];

    const startTime = events[0].timestamp;

    events.forEach((event, index) => {
      const delay = (event.timestamp - startTime) / speed;
      const timer = window.setTimeout(() => {
        if (!isPlaying) return;
        onEvent(event);
        if (event.type === 'click' || event.type === 'drag') {
          AudioEngine.playNote(event.position.row, event.position.col, event.velocity);
        }
        if (index === events.length - 1) {
          isPlaying = false;
          onDone();
        }
      }, delay);
      playbackTimers.push(timer);
    });
  },

  stopPlayback() {
    isPlaying = false;
    playbackTimers.forEach(clearTimeout);
    playbackTimers = [];
  },
};

export function createTouchEvent(
  position: { row: number; col: number },
  velocity: number,
  type: 'click' | 'drag'
): TouchEvent {
  return {
    id: uuidv4(),
    position,
    timestamp: performance.now(),
    velocity,
    type,
  };
}
