import type { BeatPhase } from './core';

export type ObstacleType = 'spike' | 'low_block';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  y: number;
  passed: boolean;
  judged: boolean;
}

export type JudgementType = 'perfect' | 'good' | 'miss' | null;

export interface JudgementResult {
  type: JudgementType;
  timing: number;
}

export interface ComboPopup {
  id: number;
  combo: number;
  startTime: number;
  duration: number;
}

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  baseHeight: number;
  velocityY: number;
  isJumping: boolean;
  jumpCount: number;
  isSliding: boolean;
  slideTimer: number;
  canInteract: boolean;
  speedMultiplier: number;
  speedDebuffTimer: number;
}

export interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  missCount: number;
  isGameOver: boolean;
  isPaused: boolean;
}

export const GAME_CONFIG = {
  CANVAS_WIDTH: 360,
  CANVAS_HEIGHT: 640,
  TRACK_WIDTH: 200,
  TRACK_LEFT: 80,
  GROUND_Y: 560,
  BASE_SPEED: 300,
  GRAVITY: 1500,
  JUMP_VELOCITY: -600,
  MAX_JUMP_HEIGHT: 120,
  PLAYER_WIDTH: 32,
  PLAYER_HEIGHT: 48,
  SLIDE_HEIGHT: 16,
  SLIDE_DURATION: 0.8,
  MAX_JUMPS: 2,
  PERFECT_WINDOW: 0.15,
  GOOD_WINDOW: 0.3,
  OBSTACLES_PER_BEATS: 2,
  SPEED_DEBUFF: 0.2,
  SPEED_DEBUFF_DURATION: 2,
  MAX_MISSES: 5,
  COMBO_MILESTONES: [10, 20, 30],
};

export class GameLogic {
  private player: PlayerState;
  private obstacles: Obstacle[] = [];
  private gameState: GameState;
  private lastObstacleBeat: number = -1;
  private lastObstacleType: ObstacleType | null = null;
  private obstacleIdCounter: number = 0;
  private comboPopupIdCounter: number = 0;
  private comboPopups: ComboPopup[] = [];
  private trackOffset: number = 0;
  private scrollSpeed: number = GAME_CONFIG.BASE_SPEED;

  private keys = {
    space: false,
    down: false,
  };

  private lastJudgement: JudgementResult = { type: null, timing: 0 };
  private lastJudgementTime: number = 0;
  private readonly JUDGEMENT_DISPLAY_TIME = 500;

  constructor() {
    this.player = this.createInitialPlayer();
    this.gameState = this.createInitialGameState();
  }

  private createInitialPlayer(): PlayerState {
    return {
      x: GAME_CONFIG.TRACK_LEFT + GAME_CONFIG.TRACK_WIDTH * 0.33 - GAME_CONFIG.PLAYER_WIDTH / 2,
      y: GAME_CONFIG.GROUND_Y - GAME_CONFIG.PLAYER_HEIGHT,
      width: GAME_CONFIG.PLAYER_WIDTH,
      height: GAME_CONFIG.PLAYER_HEIGHT,
      baseHeight: GAME_CONFIG.PLAYER_HEIGHT,
      velocityY: 0,
      isJumping: false,
      jumpCount: 0,
      isSliding: false,
      slideTimer: 0,
      canInteract: true,
      speedMultiplier: 1,
      speedDebuffTimer: 0,
    };
  }

  private createInitialGameState(): GameState {
    return {
      score: 0,
      combo: 0,
      maxCombo: 0,
      missCount: 0,
      isGameOver: false,
      isPaused: false,
    };
  }

  reset(): void {
    this.player = this.createInitialPlayer();
    this.gameState = this.createInitialGameState();
    this.obstacles = [];
    this.lastObstacleBeat = -1;
    this.lastObstacleType = null;
    this.obstacleIdCounter = 0;
    this.comboPopupIdCounter = 0;
    this.comboPopups = [];
    this.trackOffset = 0;
    this.scrollSpeed = GAME_CONFIG.BASE_SPEED;
    this.lastJudgement = { type: null, timing: 0 };
    this.lastJudgementTime = 0;
  }

  getPlayer(): PlayerState {
    return { ...this.player };
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }

  getObstacles(): Obstacle[] {
    return [...this.obstacles];
  }

  getTrackOffset(): number {
    return this.trackOffset;
  }

  getScrollSpeed(): number {
    return this.scrollSpeed;
  }

  getComboPopups(): ComboPopup[] {
    return [...this.comboPopups];
  }

  getLastJudgement(): JudgementResult {
    const elapsed = performance.now() - this.lastJudgementTime;
    if (elapsed > this.JUDGEMENT_DISPLAY_TIME) {
      return { type: null, timing: 0 };
    }
    return this.lastJudgement;
  }

  setKeyState(key: 'space' | 'down', pressed: boolean): void {
    if (this.gameState.isGameOver || this.gameState.isPaused) return;

    const wasPressed = this.keys[key];
    this.keys[key] = pressed;

    if (!wasPressed && pressed) {
      if (key === 'space') {
        this.tryJump();
      } else if (key === 'down') {
        this.trySlide();
      }
    }

    if (wasPressed && !pressed && key === 'down' && this.player.isSliding) {
    }
  }

  private tryJump(): void {
    if (!this.player.canInteract) return;
    if (this.player.isSliding) return;
    if (this.player.jumpCount >= GAME_CONFIG.MAX_JUMPS) return;

    this.player.velocityY = GAME_CONFIG.JUMP_VELOCITY;
    this.player.isJumping = true;
    this.player.jumpCount++;
    this.player.canInteract = false;

    setTimeout(() => {
      this.player.canInteract = true;
    }, 100);
  }

  private trySlide(): void {
    if (!this.player.canInteract) return;
    if (this.player.isJumping) return;
    if (this.player.isSliding) return;

    this.player.isSliding = true;
    this.player.slideTimer = GAME_CONFIG.SLIDE_DURATION;
    this.player.height = GAME_CONFIG.SLIDE_HEIGHT;
    this.player.y = GAME_CONFIG.GROUND_Y - GAME_CONFIG.SLIDE_HEIGHT;
    this.player.canInteract = false;
  }

  update(deltaTime: number, phase: BeatPhase, beatTimes: number[]): void {
    if (this.gameState.isGameOver || this.gameState.isPaused) return;

    this.updateScrollSpeed(phase);
    this.updatePlayer(deltaTime);
    this.updateObstacles(deltaTime);
    this.checkCollisions();
    this.updateComboPopups(deltaTime);
    this.updateSpeedDebuff(deltaTime);
    this.trackOffset = (this.trackOffset + this.scrollSpeed * deltaTime) % 80;
  }

  private updateScrollSpeed(phase: BeatPhase): void {
    const bpm = phase.bpm;
    const beatInterval = 60 / bpm;
    const pixelsPerBeat = 120;
    this.scrollSpeed = pixelsPerBeat / beatInterval * this.player.speedMultiplier;
  }

  private updatePlayer(deltaTime: number): void {
    if (this.player.isJumping) {
      this.player.velocityY += GAME_CONFIG.GRAVITY * deltaTime;
      this.player.y += this.player.velocityY * deltaTime;

      if (this.player.y >= GAME_CONFIG.GROUND_Y - this.player.height) {
        this.player.y = GAME_CONFIG.GROUND_Y - this.player.height;
        this.player.velocityY = 0;
        this.player.isJumping = false;
        this.player.jumpCount = 0;
      }

      const maxY = GAME_CONFIG.GROUND_Y - GAME_CONFIG.MAX_JUMP_HEIGHT;
      if (this.player.y < maxY) {
        this.player.y = maxY;
        if (this.player.velocityY < 0) {
          this.player.velocityY = 0;
        }
      }
    }

    if (this.player.isSliding) {
      this.player.slideTimer -= deltaTime;
      if (this.player.slideTimer <= 0) {
        this.player.isSliding = false;
        this.player.height = this.player.baseHeight;
        this.player.y = GAME_CONFIG.GROUND_Y - this.player.baseHeight;
        this.player.canInteract = true;
      }
    }
  }

  private updateObstacles(deltaTime: number): void {
    for (const obstacle of this.obstacles) {
      obstacle.y += this.scrollSpeed * deltaTime;
    }

    this.obstacles = this.obstacles.filter((o) => o.y < GAME_CONFIG.CANVAS_HEIGHT + 100);
  }

  spawnObstacleIfNeeded(beatIndex: number, beatTimes: number[]): void {
    if (this.gameState.isGameOver || this.gameState.isPaused) return;
    if (beatTimes.length === 0) return;

    const beatsSinceLast = beatIndex - this.lastObstacleBeat;
    if (beatsSinceLast < GAME_CONFIG.OBSTACLES_PER_BEATS) return;

    let type: ObstacleType;
    if (this.lastObstacleType === null) {
      type = Math.random() < 0.5 ? 'spike' : 'low_block';
    } else {
      if (this.lastObstacleType === this.lastObstacleType) {
        type = this.lastObstacleType === 'spike' ? 'low_block' : 'spike';
      } else {
        type = Math.random() < 0.5 ? 'spike' : 'low_block';
      }
    }

    if (this.lastObstacleType !== null && this.lastObstacleType === type) {
      type = type === 'spike' ? 'low_block' : 'spike';
    }

    this.obstacles.push({
      id: this.obstacleIdCounter++,
      type,
      y: -40,
      passed: false,
      judged: false,
    });

    this.lastObstacleBeat = beatIndex;
    this.lastObstacleType = type;
  }

  private checkCollisions(): void {
    const playerBox = {
      left: this.player.x + 4,
      right: this.player.x + this.player.width - 4,
      top: this.player.y + 4,
      bottom: this.player.y + this.player.height,
    };

    for (const obstacle of this.obstacles) {
      if (obstacle.judged) continue;

      const obstacleBox = this.getObstacleBox(obstacle);

      const overlaps =
        playerBox.left < obstacleBox.right &&
        playerBox.right > obstacleBox.left &&
        playerBox.top < obstacleBox.bottom &&
        playerBox.bottom > obstacleBox.top;

      const nearPlayer =
        obstacle.y + obstacleBox.height >= this.player.y - 20 &&
        obstacle.y <= GAME_CONFIG.GROUND_Y + 20;

      if (nearPlayer && !obstacle.judged) {
        if (overlaps) {
          this.judgeObstacle(obstacle, false);
        } else if (obstacle.y > this.player.y + this.player.height) {
          if (this.isCorrectDodge(obstacle)) {
            this.judgeObstacle(obstacle, true);
          }
        }
      }

      if (obstacle.y > GAME_CONFIG.GROUND_Y + 50 && !obstacle.judged) {
        this.judgeObstacle(obstacle, false);
      }
    }
  }

  private getObstacleBox(obstacle: Obstacle): {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
  } {
    const trackCenter = GAME_CONFIG.TRACK_LEFT + GAME_CONFIG.TRACK_WIDTH / 2;

    if (obstacle.type === 'spike') {
      const width = 32;
      const height = 40;
      return {
        left: trackCenter - width / 2,
        right: trackCenter + width / 2,
        top: obstacle.y,
        bottom: obstacle.y + height,
        width,
        height,
      };
    } else {
      const width = 50;
      const height = 20;
      return {
        left: trackCenter - width / 2,
        right: trackCenter + width / 2,
        top: obstacle.y,
        bottom: obstacle.y + height,
        width,
        height,
      };
    }
  }

  private isCorrectDodge(obstacle: Obstacle): boolean {
    if (obstacle.type === 'spike') {
      return this.player.isJumping && this.player.y < GAME_CONFIG.GROUND_Y - 60;
    } else {
      return this.player.isSliding;
    }
  }

  private judgeObstacle(obstacle: Obstacle, success: boolean): void {
    obstacle.judged = true;
    obstacle.passed = true;

    if (success) {
      const timing = this.getTimingAccuracy(obstacle);
      this.handleJudgement(timing);
    } else {
      this.handleJudgement('miss');
      this.gameState.missCount++;
      if (this.gameState.missCount >= GAME_CONFIG.MAX_MISSES) {
        this.gameState.isGameOver = true;
      }
    }
  }

  private getTimingAccuracy(obstacle: Obstacle): 'perfect' | 'good' | 'miss' {
    const playerCenterY = this.player.y + this.player.height / 2;
    const obstacleCenterY = obstacle.y + 20;
    const distance = Math.abs(playerCenterY - obstacleCenterY);

    const perfectWindow = 30;
    const goodWindow = 60;

    if (distance <= perfectWindow) {
      return 'perfect';
    } else if (distance <= goodWindow) {
      return 'good';
    } else {
      return 'miss';
    }
  }

  private handleJudgement(judgement: 'perfect' | 'good' | 'miss'): void {
    this.lastJudgement = { type: judgement, timing: 0 };
    this.lastJudgementTime = performance.now();

    switch (judgement) {
      case 'perfect':
        this.gameState.score += 100;
        this.gameState.combo++;
        if (this.gameState.combo > this.gameState.maxCombo) {
          this.gameState.maxCombo = this.gameState.combo;
        }
        this.checkComboMilestone();
        break;
      case 'good':
        this.gameState.score += 50;
        this.gameState.combo = 0;
        break;
      case 'miss':
        this.gameState.score = Math.max(0, this.gameState.score - 20);
        this.gameState.combo = 0;
        this.player.speedMultiplier = 1 - GAME_CONFIG.SPEED_DEBUFF;
        this.player.speedDebuffTimer = GAME_CONFIG.SPEED_DEBUFF_DURATION;
        break;
    }
  }

  private checkComboMilestone(): void {
    const combo = this.gameState.combo;
    if (GAME_CONFIG.COMBO_MILESTONES.includes(combo)) {
      this.comboPopups.push({
        id: this.comboPopupIdCounter++,
        combo,
        startTime: performance.now(),
        duration: 1500,
      });
    }
  }

  private updateComboPopups(deltaTime: number): void {
    const now = performance.now();
    this.comboPopups = this.comboPopups.filter(
      (popup) => now - popup.startTime < popup.duration
    );
  }

  private updateSpeedDebuff(deltaTime: number): void {
    if (this.player.speedDebuffTimer > 0) {
      this.player.speedDebuffTimer -= deltaTime;
      if (this.player.speedDebuffTimer <= 0) {
        this.player.speedMultiplier = 1;
      }
    }
  }

  setPaused(paused: boolean): void {
    this.gameState.isPaused = paused;
  }
}
