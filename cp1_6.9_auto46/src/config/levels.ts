export interface LevelConfig {
  id: number;
  name: string;
  speed: number;
  spawnInterval: number;
  totalNotes: number;
  matrixColor: string;
  accentColor: string;
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'INITIAL BREACH',
    speed: 100,
    spawnInterval: 800,
    totalNotes: 50,
    matrixColor: '#00ff00',
    accentColor: '#00ff00'
  },
  {
    id: 2,
    name: 'FIREWALL BYPASS',
    speed: 140,
    spawnInterval: 700,
    totalNotes: 50,
    matrixColor: '#00ffff',
    accentColor: '#00ffff'
  },
  {
    id: 3,
    name: 'ENCRYPTION CRACK',
    speed: 180,
    spawnInterval: 600,
    totalNotes: 50,
    matrixColor: '#ffaa00',
    accentColor: '#ffaa00'
  },
  {
    id: 4,
    name: 'ROOT ACCESS',
    speed: 220,
    spawnInterval: 500,
    totalNotes: 50,
    matrixColor: '#ff3333',
    accentColor: '#ff3333'
  },
  {
    id: 5,
    name: 'SYSTEM TAKEOVER',
    speed: 250,
    spawnInterval: 400,
    totalNotes: 50,
    matrixColor: '#ffffff',
    accentColor: '#ffffff'
  }
];

export const KEY_POOL: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';

export const GAME_CONFIG = {
  TOTAL_LIVES: 3,
  TOLERANCE: 30,
  NOTE_SIZE: 30,
  BAR_HEIGHT: 40,
  TARGET_ZONE_WIDTH: 40,
  BAR_BOTTOM_OFFSET: 80,
  COMBO_MILESTONE: 5,
  MAX_COMBO_DISPLAY: 50,
  PARTICLE_COUNT: 15,
  MAX_PARTICLES: 50,
  MATRIX_ROW_INTERVAL: 50,
  MATRIX_ROW_DURATION: 5000
};

export function getRandomKey(): string {
  return KEY_POOL.charAt(Math.floor(Math.random() * KEY_POOL.length));
}

export function calculateGrade(hitRate: number, maxCombo: number): string {
  if (hitRate >= 0.95 && maxCombo >= 30) return 'S';
  if (hitRate >= 0.80) return 'A';
  if (hitRate >= 0.60) return 'B';
  return 'C';
}
