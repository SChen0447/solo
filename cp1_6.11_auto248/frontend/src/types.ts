export interface SoundWave {
  id: string;
  type: 'audio' | 'text';
  content: string;
  frequencies: number[];
  createdAt: number;
  authorId: string;
}

export interface Bottle {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  soundWaves: SoundWave[];
  createdAt: number;
  launchPosition: { x: number; y: number };
  authorId: string;
  rotation: number;
  waveOffset: number;
  color: string;
  playCount: number;
}

export interface OceanState {
  currentStrength: number;
  windDirection: number;
  windStrength: number;
}

export interface Ripple {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  opacity: number;
  createdAt: number;
}

export interface Spark {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}
