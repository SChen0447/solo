export interface Sample {
  id: string;
  name: string;
  category: 'drum' | 'bass' | 'melody';
  duration: number;
  color: string;
}

export interface Clip {
  id: string;
  sampleId: string;
  trackId: number;
  startTime: number;
  duration: number;
}

export interface TrackState {
  id: number;
  volume: number;
  muted: boolean;
  clips: Clip[];
}

export interface ProjectState {
  bpm: number;
  tracks: TrackState[];
  isPlaying: boolean;
  currentTime: number;
}
