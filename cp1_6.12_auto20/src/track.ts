import { FrequencyData } from './audio';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type ObstacleType = 'low' | 'high' | 'spike';

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  passed: boolean;
}

export interface TrackColor {
  r1: number;
  g1: number;
  b1: number;
  r2: number;
  g2: number;
  b2: number;
}

export interface TrackState {
  obstacles: Obstacle[];
  trackColor: TrackColor;
  scrollOffset: number;
  baseSpeed: number;
  groundY: number;
}

export class TrackManager {
  private canvasWidth: number;
  private canvasHeight: number;
  private groundY: number;
  private obstacles: Obstacle[] = [];
  private scrollOffset: number = 0;
  private baseSpeed: number = 400;
  private nextObstacleId: number = 0;
  private beatCounter: number = 0;
  private beatsSinceLastObstacle: number = 0;
  private difficulty: Difficulty = 'normal';
  private trackColor: TrackColor = {
    r1: 0, g1: 255, b1: 255,
    r2: 255, g2: 0, b2: 255
  };

  private readonly DIFFICULTY_CONFIG = {
    easy: { minBeats: 4, maxBeats: 6, speedMultiplier: 0.8, bpm: 90 },
    normal: { minBeats: 3, maxBeats: 5, speedMultiplier: 1.0, bpm: 120 },
    hard: { minBeats: 2, maxBeats: 3, speedMultiplier: 1.2, bpm: 140 }
  };

  private colorLerp: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = canvasHeight * 0.75;
  }

  init(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = canvasHeight * 0.75;
    this.obstacles = [];
    this.scrollOffset = 0;
    this.nextObstacleId = 0;
    this.beatCounter = 0;
    this.beatsSinceLastObstacle = 0;
    this.baseSpeed = 400 * this.DIFFICULTY_CONFIG[this.difficulty].speedMultiplier;
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.baseSpeed = 400 * this.DIFFICULTY_CONFIG[difficulty].speedMultiplier;
  }

  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  getBPM(): number {
    return this.DIFFICULTY_CONFIG[this.difficulty].bpm;
  }

  getDifficultyName(): string {
    const names: Record<Difficulty, string> = {
      easy: '简单',
      normal: '普通',
      hard: '困难'
    };
    return names[this.difficulty];
  }

  onBeat(beat: number, isStrong: boolean): void {
    this.beatCounter = beat;
    this.beatsSinceLastObstacle++;

    const config = this.DIFFICULTY_CONFIG[this.difficulty];
    const shouldSpawn = isStrong && this.beatsSinceLastObstacle >= config.minBeats &&
      (this.beatsSinceLastObstacle >= config.maxBeats || Math.random() > 0.4);

    if (shouldSpawn) {
      this.spawnObstacle();
      this.beatsSinceLastObstacle = 0;
    }
  }

  private spawnObstacle(): void {
    const types: ObstacleType[] = ['low', 'high', 'spike'];
    const type = types[Math.floor(Math.random() * types.length)];

    let width: number, height: number, y: number;

    switch (type) {
      case 'low':
        width = 40 + Math.random() * 30;
        height = 30 + Math.random() * 20;
        y = this.groundY - height;
        break;
      case 'high':
        width = 35 + Math.random() * 25;
        height = 60 + Math.random() * 30;
        y = this.groundY - height;
        break;
      case 'spike':
        width = 30 + Math.random() * 20;
        height = 45 + Math.random() * 25;
        y = this.groundY - height;
        break;
    }

    this.obstacles.push({
      id: this.nextObstacleId++,
      x: this.canvasWidth + 50,
      y,
      width,
      height,
      type,
      passed: false
    });
  }

  update(deltaTime: number, freqData: FrequencyData, runnerBox: { x: number; y: number; width: number; height: number }): {
    collision: boolean;
    score: number;
  } {
    this.updateTrackColor(freqData);
    this.scrollOffset += this.baseSpeed * deltaTime;

    let scoreGain = 0;
    let collision = false;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.baseSpeed * deltaTime;

      if (!obs.passed && obs.x + obs.width < runnerBox.x) {
        obs.passed = true;
        scoreGain += 10;
      }

      if (obs.x + obs.width < -100) {
        this.obstacles.splice(i, 1);
        continue;
      }

      if (!collision && this.checkCollision(obs, runnerBox)) {
        collision = true;
      }
    }

    return { collision, score: scoreGain };
  }

  private checkCollision(obs: Obstacle, box: { x: number; y: number; width: number; height: number }): boolean {
    const obsBox = {
      x: obs.x + 5,
      y: obs.y + 5,
      width: obs.width - 10,
      height: obs.height - 10
    };

    return box.x < obsBox.x + obsBox.width &&
           box.x + box.width > obsBox.x &&
           box.y < obsBox.y + obsBox.height &&
           box.y + box.height > obsBox.y;
  }

  private updateTrackColor(freqData: FrequencyData): void {
    const targetR1 = Math.floor(freqData.low * 255 * 0.8 + freqData.high * 255 * 0.2);
    const targetG1 = Math.floor(freqData.mid * 255 * 0.7 + freqData.high * 255 * 0.3);
    const targetB1 = Math.floor(freqData.high * 255 * 0.8 + freqData.mid * 255 * 0.2);

    const targetR2 = Math.floor(freqData.high * 255 * 0.7 + freqData.low * 255 * 0.3);
    const targetG2 = Math.floor(freqData.mid * 255 * 0.5 + freqData.low * 255 * 0.3);
    const targetB2 = Math.floor(freqData.low * 255 * 0.6 + freqData.high * 255 * 0.4);

    this.trackColor.r1 += (targetR1 - this.trackColor.r1) * 0.1;
    this.trackColor.g1 += (targetG1 - this.trackColor.g1) * 0.1;
    this.trackColor.b1 += (targetB1 - this.trackColor.b1) * 0.1;
    this.trackColor.r2 += (targetR2 - this.trackColor.r2) * 0.1;
    this.trackColor.g2 += (targetG2 - this.trackColor.g2) * 0.1;
    this.trackColor.b2 += (targetB2 - this.trackColor.b2) * 0.1;
  }

  getState(): TrackState {
    return {
      obstacles: [...this.obstacles],
      trackColor: { ...this.trackColor },
      scrollOffset: this.scrollOffset,
      baseSpeed: this.baseSpeed,
      groundY: this.groundY
    };
  }

  getGroundY(): number {
    return this.groundY;
  }
}
