import { create } from 'zustand';
import type { TouchEvent, PlaybackSpeed, RecordingState, NoteInfo } from './types';

interface AppState {
  currentNote: NoteInfo | null;
  currentVelocity: number;
  recentNotes: NoteInfo[];
  recording: RecordingState;
  setNote: (note: NoteInfo, velocity: number) => void;
  startRecording: () => void;
  stopRecording: () => void;
  addEvent: (event: TouchEvent) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setPlaying: (playing: boolean) => void;
  setRecordingEvents: (events: TouchEvent[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentNote: null,
  currentVelocity: 0,
  recentNotes: [],
  recording: {
    isRecording: false,
    isPlaying: false,
    events: [],
    playbackSpeed: 1,
    recordingStartTime: 0,
  },

  setNote: (note, velocity) =>
    set((state) => ({
      currentNote: note,
      currentVelocity: velocity,
      recentNotes: [...state.recentNotes.slice(-4), note],
    })),

  startRecording: () =>
    set((state) => ({
      recording: {
        ...state.recording,
        isRecording: true,
        events: [],
        recordingStartTime: performance.now(),
      },
    })),

  stopRecording: () =>
    set((state) => ({
      recording: {
        ...state.recording,
        isRecording: false,
      },
    })),

  addEvent: (event) =>
    set((state) => {
      const elapsed = event.timestamp - state.recording.recordingStartTime;
      if (elapsed > 15000) {
        return {
          recording: { ...state.recording, isRecording: false },
        };
      }
      return {
        recording: {
          ...state.recording,
          events: [...state.recording.events, event],
        },
      };
    }),

  setPlaybackSpeed: (speed) =>
    set((state) => ({
      recording: { ...state.recording, playbackSpeed: speed },
    })),

  setPlaying: (playing) =>
    set((state) => ({
      recording: { ...state.recording, isPlaying: playing },
    })),

  setRecordingEvents: (events) =>
    set((state) => ({
      recording: { ...state.recording, events },
    })),
}));
