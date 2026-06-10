export interface Fragment {
  id: string;
  title: string;
  content: string;
  hue: number;
  position: { x: number; y: number; z: number };
  collected: boolean;
  audioData: number[];
}

export interface CameraState {
  azimuth: number;
  polar: number;
  distance: number;
}

export interface AppState {
  fragments: Fragment[];
  camera: CameraState;
  isPlayingMix: boolean;
  activeFragmentId: string | null;
}

export type AppAction =
  | { type: 'COLLECT_FRAGMENT'; payload: string }
  | { type: 'SET_CAMERA'; payload: Partial<CameraState> }
  | { type: 'START_MIX' }
  | { type: 'END_MIX' }
  | { type: 'SET_ACTIVE_FRAGMENT'; payload: string | null }
  | { type: 'RESET_STATE' };
