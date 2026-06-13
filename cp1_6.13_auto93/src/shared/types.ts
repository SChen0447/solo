export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export type GestureType = 'index_finger' | 'fist' | 'palm' | 'none';

export interface HandData {
  landmarks: HandLandmark[];
  gestureType: GestureType;
  timestamp: number;
}

export interface TrackPoint {
  x: number;
  y: number;
  z: number;
  color: string;
  velocity: number;
  timestamp: number;
}

export type InstrumentType = 'piano' | 'violin' | 'flute' | 'harp';

export interface Track {
  id: string;
  points: TrackPoint[];
  instrument: InstrumentType;
  color: string;
  locked: boolean;
}

export interface SequenceData {
  tracks: Track[];
  bpm: number;
  duration: number;
}

export interface ExportRequest {
  sequence: SequenceData;
  format: 'midi' | 'wav' | 'webm';
}

export interface ExportResponse {
  success: boolean;
  downloadUrl: string;
  shareId: string;
  fileSize: number;
}
