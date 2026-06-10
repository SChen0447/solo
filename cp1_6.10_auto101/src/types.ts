export interface LyricLine {
  time: number;
  text: string;
  pitch?: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics: LyricLine[];
  duration: number;
}

export interface PitchData {
  pitch: number;
  volume: number;
  timestamp: number;
}

export interface ScoreReport {
  accuracy: number;
  highestPitch: number;
  lowestPitch: number;
  comment: string;
}
