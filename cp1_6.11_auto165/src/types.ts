export interface LightParams {
  preset: 'warm' | 'cool' | 'disco';
  mainColor: string;
  mainIntensity: number;
  mainPosition: [number, number, number];
  ambientColor: string;
  ambientIntensity: number;
  spotAngle: number;
}

export interface DanceParams {
  wave: number;
  spin: number;
  jump: number;
  lean: number;
}

export interface AudioParams {
  volume: number;
  bpm: number;
  masterVolume: number;
}

export interface RecordingState {
  isRecording: boolean;
  duration: number;
}

export type PresetName = 'lyrical' | 'dance' | 'electronic';

export interface GlobalState {
  lights: LightParams;
  dance: DanceParams;
  audio: AudioParams;
  recording: RecordingState;
  currentPreset: PresetName | null;
  beatTime: number;
}

export interface PresetConfig {
  name: string;
  lights: Partial<LightParams>;
  dance: Partial<DanceParams>;
  audio: Partial<AudioParams>;
}

export const LIGHT_PRESETS: Record<string, Partial<LightParams>> = {
  warm: {
    preset: 'warm',
    mainColor: '#ffaa44',
    mainIntensity: 2.0,
    mainPosition: [0, 5, 5],
    ambientColor: '#ff6600',
    ambientIntensity: 0.4,
    spotAngle: 0.5,
  },
  cool: {
    preset: 'cool',
    mainColor: '#44aaff',
    mainIntensity: 1.8,
    mainPosition: [0, 5, 5],
    ambientColor: '#0066ff',
    ambientIntensity: 0.5,
    spotAngle: 0.4,
  },
  disco: {
    preset: 'disco',
    mainColor: '#ff44aa',
    mainIntensity: 2.5,
    mainPosition: [0, 5, 5],
    ambientColor: '#44ffaa',
    ambientIntensity: 0.6,
    spotAngle: 0.6,
  },
};

export const PERFORMANCE_PRESETS: Record<PresetName, PresetConfig> = {
  lyrical: {
    name: '舒缓抒情',
    lights: { ...LIGHT_PRESETS.warm, mainIntensity: 1.5, ambientIntensity: 0.3 },
    dance: { wave: 0.6, spin: 0.1, jump: 0.2, lean: 0.3 },
    audio: { volume: 0.7, bpm: 90, masterVolume: 0.8 },
  },
  dance: {
    name: '劲爆舞曲',
    lights: { ...LIGHT_PRESETS.disco, mainIntensity: 2.8, ambientIntensity: 0.7 },
    dance: { wave: 0.3, spin: 0.8, jump: 0.9, lean: 0.5 },
    audio: { volume: 0.9, bpm: 140, masterVolume: 0.9 },
  },
  electronic: {
    name: '梦幻电子',
    lights: { ...LIGHT_PRESETS.cool, mainIntensity: 2.0, ambientIntensity: 0.6 },
    dance: { wave: 0.5, spin: 0.6, jump: 0.4, lean: 0.7 },
    audio: { volume: 0.8, bpm: 120, masterVolume: 0.85 },
  },
};

export const DEFAULT_STATE: GlobalState = {
  lights: { ...LIGHT_PRESETS.warm } as LightParams,
  dance: { wave: 0.5, spin: 0.0, jump: 0.3, lean: 0.2 },
  audio: { volume: 0.7, bpm: 120, masterVolume: 0.8 },
  recording: { isRecording: false, duration: 0 },
  currentPreset: null,
  beatTime: 0,
};
