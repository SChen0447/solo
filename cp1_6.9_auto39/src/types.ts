export interface Song {
  songId: string;
  libraryId: string | null;
  title: string;
  artist: string;
  duration: number;
  coverColor: string;
  lyric: string;
  votes: number;
  requestedBy: string;
  requestedAt: number;
  voters: string[];
}

export interface Bullet {
  id: string;
  content: string;
  nickname: string;
  timestamp: number;
  type: 'normal' | 'announcement';
}

export interface PlayerState {
  currentSong: Song | null;
  currentProgress: number;
  isPlaying: boolean;
}

export interface QueueState {
  queue: Song[];
  history: Song[];
}
