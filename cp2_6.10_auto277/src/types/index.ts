export interface Track {
  id: string;
  number: number;
  title: string;
  duration: string;
  durationSeconds: number;
  audioUrl: string;
}

export interface Record {
  id: string;
  artist: string;
  album: string;
  coverImage: string;
  discImage: string;
  tracks: Track[];
}

export interface PlayerState {
  currentTrackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}
