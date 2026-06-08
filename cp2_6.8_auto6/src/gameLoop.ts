import {
  GameStatus,
  GameState,
  Player,
  Obstacle,
  GameData,
  VisualEffect,
  BeatInfo,
  ObstacleType,
} from './types';

const LANES = 3;
const JUMP_DURATION = 0.5;
const SLIDE_DURATION = 0.3;
const BASE_SPEED = 300;
const SPEED_TRANSITION_TIME = 1;
const BEATS_PER_SEGMENT = 8;

export class GameLoop {
  private status: GameStatus;
  private beatSchedule: BeatInfo[] = [];
  private nextBeatIndex: number = 0;
  private obstacleIdCounter: number = 0;
  private effectIdCounter: number = 0;
  private lastTime: number = 0;
  private segmentBeatCount: number = 0;
  private segmentIntensitySum: number = 0;
  private onStatusChange: ((status: GameStatus) => void) | null = null;
  private onGameOver: ((score: number, passed: number) => void) | null = null;

  constructor() {
    this.status = this.createInitialStatus();
  }

  private createInitialStatus(): GameStatus {
    return {
      state: 'menu',
      player: {
        lane: 1,
        state: 'running',
        stateTimer: 0,
        hitFlash: 0,
        screenShake: 0,
      },
      obstacles: [],
      gameData: {
        score: 0,
        combo: 0,
        maxCombo: 0,
        lives: 3,
        obstaclesPassed: 0,
        speed: BASE_SPEED,
        baseSpeed: BASE_SPEED,
        targetSpeed: BASE_SPEED,
        speedTransitionTimer: 0,
      },
      effects: [],
      scrollOffset: 0,
    };
  }

  setBeatSchedule(beats: BeatInfo[]): void {
    this.beatSchedule = beats;
    this.nextBeatIndex = 0;
  }

  start(): void {
    this.status = this.createInitialStatus();
    this.status.state = 'playing';
    this.nextBeatIndex = 0;
    this.obstacleIdCounter = 0;
    this.effectIdCounter = 0;
    this.segmentBeatCount = 0;
    this.segmentIntensitySum = 0;
    this.lastTime = 0;
    this.notifyChange();
  }

  pause(): void {
    if (this.status.state === 'playing') {
      this.status.state = 'paused';
      this.notifyChange();
    }
  }

  resume(): void {
    if (this.status.state === 'paused') {
      this.status.state = 'playing';
      this.lastTime = 0;
      this.notifyChange();
    }
  }

  gameOver(): void {
    this.status.state = 'gameover';
    if (this.onGameOver) {
      this.onGameOver(this.status.gameData.score, this.status.gameData.obstaclesPassed);
    }
    this.notifyChange();
  }

  reset(): void {
    this.status = this.createInitialStatus();
    this.nextBeatIndex = 0;
    this.obstacleIdCounter = 0;
    this.effectIdCounter = 0;
    this.segmentBeatCount = 0;
    this.segmentIntensitySum = 0;
    this.notifyChange();
  }

  update(deltaTime: number, audioTime: number, rhythmIntensity: number): void {
    if (this.status.state !== 'playing') return;

    const dt = Math.min(deltaTime, 0.05);

    this.updateSpeed(dt);

    this.status.scrollOffset += this.status.gameData.speed * dt;

    this.spawnObstacles(audioTime);

    this.updateObstacles(dt);

    this.updatePlayer(dt);

    this.checkCollisions();

    this.updateEffects(dt);

    this.notifyChange();
  }

  private updateSpeed(dt: number): void {
    const data = this.status.gameData;

    if (data.speedTransitionTimer > 0) {
      data.speedTransitionTimer -= dt;
      const t = 1 - data.speedTransitionTimer / SPEED_TRANSITION_TIME;
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const startSpeed = data.speed;
      data.speed = startSpeed + (data.targetSpeed - startSpeed) * easeT;

      if (data.speedTransitionTimer <= 0) {
        data.speed = data.targetSpeed;
        data.speedTransitionTimer = 0;
      }
    }
  }

  private spawnObstacles(audioTime: number): void {
    const spawnAheadTime = 2.5;
    const spawnY = -100;

    while (
      this.nextBeatIndex < this.beatSchedule.length &&
      this.beatSchedule[this.nextBeatIndex].time <= audioTime + spawnAheadTime
    ) {
      const beat = this.beatSchedule[this.nextBeatIndex];
      const beatOffset = beat.time - audioTime;
      const y = spawnY - beatOffset * this.status.gameData.speed;

      const numObstacles = this.getNumObstaclesForBeat(beat.intensity);
      const usedLanes = new Set<number>();

      for (let i = 0; i < numObstacles; i++) {
        let lane: number;
        let attempts = 0;
        do {
          lane = Math.floor(Math.random() * LANES);
          attempts++;
        } while (usedLanes.has(lane) && attempts < 10);

        if (usedLanes.has(lane)) continue;
        usedLanes.add(lane);

        const type = this.getObstacleType(beat.intensity);

        const obstacle: Obstacle = {
          id: this.obstacleIdCounter++,
          type,
          lane,
          y,
          passed: false,
          movingOffset: 0,
          movingDirection: type === 'moving' ? (Math.random() > 0.5 ? 1 : -1) : 0,
        };

        this.status.obstacles.push(obstacle);
      }

      this.segmentBeatCount++;
      this.segmentIntensitySum += beat.intensity;

      if (this.segmentBeatCount >= BEATS_PER_SEGMENT) {
        this.adjustSpeedForSegment();
      }

      this.nextBeatIndex++;
    }
  }

  private getNumObstaclesForBeat(intensity: number): number {
    if (intensity >= 0.85) return 2 + (Math.random() > 0.5 ? 1 : 0);
    if (intensity >= 0.7) return 2;
    if (intensity >= 0.5) return 1 + (Math.random() > 0.6 ? 1 : 0);
    return 1;
  }

  private getObstacleType(intensity: number): ObstacleType {
    const rand = Math.random();
    if (intensity >= 0.8) {
      if (rand < 0.4) return 'spike';
      if (rand < 0.75) return 'bar';
      return 'moving';
    } else if (intensity >= 0.6) {
      if (rand < 0.5) return 'spike';
      if (rand < 0.85) return 'bar';
      return 'moving';
    } else {
      if (rand < 0.6) return 'spike';
      if (rand < 0.9) return 'bar';
      return 'moving';
    }
  }

  private adjustSpeedForSegment(): void {
    const avgIntensity = this.segmentIntensitySum / this.segmentBeatCount;
    const data = this.status.gameData;

    const speedFactor = 0.7 + avgIntensity * 0.6;
    data.targetSpeed = data.baseSpeed * speedFactor;
    data.speedTransitionTimer = SPEED_TRANSITION_TIME;

    this.segmentBeatCount = 0;
    this.segmentIntensitySum = 0;
  }

  private updateObstacles(dt: number): void {
    const speed = this.status.gameData.speed;
    const playerY = 500;

    for (let i = this.status.obstacles.length - 1; i >= 0; i--) {
      const obs = this.status.obstacles[i];
      obs.y += speed * dt;

      if (obs.type === 'moving') {
        obs.movingOffset += obs.movingDirection * 80 * dt;
        if (Math.abs(obs.movingOffset) > 50) {
          obs.movingDirection *= -1;
        }
      }

      if (!obs.passed && obs.y > playerY + 50) {
        obs.passed = true;
        this.onObstaclePassed();
      }

      if (obs.y > 900) {
        this.status.obstacles.splice(i, 1);
      }
    }
  }

  private updatePlayer(dt: number): void {
    const player = this.status.player;

    if (player.stateTimer > 0) {
      player.stateTimer -= dt;
      if (player.stateTimer <= 0) {
        player.state = 'running';
        player.stateTimer = 0;
      }
    }

    if (player.hitFlash > 0) {
      player.hitFlash -= dt;
    }

    if (player.screenShake > 0) {
      player.screenShake -= dt;
    }
  }

  private checkCollisions(): void {
    const player = this.status.player;
    const playerLane = player.lane;
    const playerY = 500;
    const playerWidth = 50;
    const playerHeight = player.state === 'sliding' ? 25 : 50;

    for (let i = this.status.obstacles.length - 1; i >= 0; i--) {
      const obs = this.status.obstacles[i];

      if (obs.passed) continue;

      const obsLane = obs.type === 'moving' ? this.getMovingObstacleLane(obs) : obs.lane;

      if (obsLane !== playerLane) continue;

      const obsHeight = this.getObstacleHeight(obs.type);
      const obsTop = obs.y - obsHeight / 2;
      const obsBottom = obs.y + obsHeight / 2;

      const playerTop = playerY - playerHeight / 2;
      const playerBottom = playerY + playerHeight / 2;

      const obsWidth = 50;
      const playerLeft = -playerWidth / 2;
      const playerRight = playerWidth / 2;
      const obsLeft = -obsWidth / 2;
      const obsRight = obsWidth / 2;

      const collision =
        playerRight > obsLeft &&
        playerLeft < obsRight &&
        playerBottom > obsTop &&
        playerTop < obsBottom;

      if (collision) {
        const canDodge = this.canPlayerDodge(player.state, obs.type);

        if (!canDodge) {
          this.onPlayerHit();
          this.status.obstacles.splice(i, 1);
          break;
        }
      }
    }
  }

  private getMovingObstacleLane(obs: Obstacle): number {
    const laneWidth = 120;
    const centerX = (obs.lane - 1) * laneWidth;
    const actualX = centerX + obs.movingOffset;

    if (actualX < -laneWidth / 2) return 0;
    if (actualX > laneWidth / 2) return 2;
    return obs.lane;
  }

  private getObstacleHeight(type: ObstacleType): number {
    switch (type) {
      case 'spike':
        return 40;
      case 'bar':
        return 20;
      case 'moving':
        return 35;
      default:
        return 40;
    }
  }

  private canPlayerDodge(playerState: string, obstacleType: ObstacleType): boolean {
    if (playerState === 'jumping') {
      return obstacleType === 'bar' || obstacleType === 'moving';
    }
    if (playerState === 'sliding') {
      return obstacleType === 'spike' || obstacleType === 'moving';
    }
    return false;
  }

  private onObstaclePassed(): void {
    const data = this.status.gameData;
    data.combo++;
    data.obstaclesPassed++;

    if (data.combo > data.maxCombo) {
      data.maxCombo = data.combo;
    }

    let multiplier = 1;
    if (data.combo >= 10) {
      multiplier = 2;
      if (data.combo === 10) {
        this.addEffect('combo20', 0, 300, 0.5);
      }
    } else if (data.combo >= 5) {
      multiplier = 1.5;
      if (data.combo === 5) {
        this.addEffect('combo15', 0, 300, 0.5);
      }
    }

    data.score += Math.floor(10 * multiplier);

    this.status.player.hitFlash = 0.2;
  }

  private onPlayerHit(): void {
    const data = this.status.gameData;
    data.lives--;
    data.combo = 0;

    this.status.player.hitFlash = 0.3;
    this.status.player.screenShake = 0.2;

    this.addEffect('heartBreak', 0, 0, 0.5);

    if (data.lives <= 0) {
      this.gameOver();
    }
  }

  private addEffect(type: VisualEffect['type'], x: number, y: number, duration: number): void {
    this.status.effects.push({
      id: this.effectIdCounter++,
      type,
      x,
      y,
      life: duration,
      maxLife: duration,
    });
  }

  private updateEffects(dt: number): void {
    for (let i = this.status.effects.length - 1; i >= 0; i--) {
      this.status.effects[i].life -= dt;
      if (this.status.effects[i].life <= 0) {
        this.status.effects.splice(i, 1);
      }
    }
  }

  moveLeft(): void {
    if (this.status.state !== 'playing') return;
    if (this.status.player.lane > 0) {
      this.status.player.lane--;
      this.notifyChange();
    }
  }

  moveRight(): void {
    if (this.status.state !== 'playing') return;
    if (this.status.player.lane < LANES - 1) {
      this.status.player.lane++;
      this.notifyChange();
    }
  }

  jump(): void {
    if (this.status.state !== 'playing') return;
    if (this.status.player.state === 'running') {
      this.status.player.state = 'jumping';
      this.status.player.stateTimer = JUMP_DURATION;
      this.notifyChange();
    }
  }

  slide(): void {
    if (this.status.state !== 'playing') return;
    if (this.status.player.state === 'running') {
      this.status.player.state = 'sliding';
      this.status.player.stateTimer = SLIDE_DURATION;
      this.notifyChange();
    }
  }

  getStatus(): GameStatus {
    return this.status;
  }

  setOnStatusChange(callback: (status: GameStatus) => void): void {
    this.onStatusChange = callback;
  }

  setOnGameOver(callback: (score: number, passed: number) => void): void {
    this.onGameOver = callback;
  }

  private notifyChange(): void {
    if (this.onStatusChange) {
      this.onStatusChange({ ...this.status });
    }
  }
}
