export interface AudioClip {
  id: string;
  name: string;
  buffer: AudioBuffer | null;
  waveformData: number[];
  startTime: number;
  duration: number;
  fadeIn: number;
  fadeOut: number;
}

export interface Track {
  id: string;
  index: number;
  clips: AudioClip[];
  volume: number;
  muted: boolean;
  solo: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  playbackRate: number;
  masterVolume: number;
}

export type PlaybackCallback = (time: number) => void;
export type EndCallback = () => void;
