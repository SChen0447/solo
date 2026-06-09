export interface BeatInfo {
  time: number;
  intensity: number;
}

export interface AudioAnalysisResult {
  beats: BeatInfo[];
  duration: number;
  bpm: number;
}

export interface RealtimeAudioData {
  currentTime: number;
  rhythmIntensity: number;
  frequencyData: Uint8Array;
}

export interface TrackInfo {
  id: string;
  name: string;
  bpm: number;
  url: string;
}

export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

export type ObstacleType = 'spike' | 'bar' | 'moving';

export type PlayerState = 'running' | 'jumping' | 'sliding';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  lane: number;
  y: number;
  passed: boolean;
  movingOffset: number;
  movingDirection: number;
}

export interface Player {
  lane: number;
  state: PlayerState;
  stateTimer: number;
  hitFlash: number;
  screenShake: number;
}

export interface GameData {
  score: number;
  combo: number;
  maxCombo: number;
  lives: number;
  obstaclesPassed: number;
  speed: number;
  baseSpeed: number;
  targetSpeed: number;
  speedTransitionTimer: number;
}

export interface VisualEffect {
  id: number;
  type: 'combo15' | 'combo20' | 'heartBreak' | 'dodge';
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export interface GameStatus {
  state: GameState;
  player: Player;
  obstacles: Obstacle[];
  gameData: GameData;
  effects: VisualEffect[];
  scrollOffset: number;
}
