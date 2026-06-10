export interface VoiceprintPoint {
  time: number;
  frequency: number;
  energy: number;
  formant1: number;
  formant2: number;
  formant3: number;
}

export interface VoiceprintData {
  sampleRate: number;
  duration: number;
  points: VoiceprintPoint[];
  fundamentalFrequencies: number[];
  energyDistribution: number[];
}

export interface RecordingRecord {
  id: string;
  title: string;
  transcription: string;
  tags: string[];
  latitude?: number;
  longitude?: number;
  createdAt: number;
  duration: number;
  audioUrl?: string;
  audioBlob?: Blob;
  voiceprint: VoiceprintData;
}

export type ViewMode = 'single' | 'compare';
