import type { LevelData, PolarType } from './levels';
import { LEVELS } from './levels';
import type { BallState, MagnetState } from './physics';

export type GameState = 'playing' | 'paused' | 'won' | 'lost';

export interface MagnetRuntime extends MagnetState {
  rotation: number;
  polarityTimer: number;
  hitByLightning: boolean;
  lightningCooldown: number;
}

export interface LightningEvent {
  active: boolean;
  targetMagnetId: string | null;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export class GameEngine {
  private currentLevelIndex: number = 0;
  private currentLevel: LevelData;
  private lives: number = 3;
  private maxLives: number = 3;
  private elapsedTime: number = 0;
  private gameState: GameState = 'playing';
  private ball: BallState;
  private magnets: Map<string, MagnetRuntime> = new Map();
  private lightningTimer: number = 0;
  private lightningEvent: LightningEvent = {
    active: false,
    targetMagnetId: null,
    fromX: 0,
    fromY: 0,
    toX: 0,
    toY: 0
  };
  private lastSafePosition: { x: number; y: number };
  private lastPortalId: string | null = null;
  private portalCooldown: number = 0;
  private respawning: boolean = false;
  private respawnTimer: number = 0;
  private onMagnetPolarityChange: ((id: string, x: number, y: number, polarity: PolarType) => void) | null = null;
  private onLightning: ((fromX: number, fromY: number, toX: number, toY: number, magnetId: string) => void) | null = null;
  private onShockwave: ((x: number, y: number) => void) | null = null;
  private onLifeLost: ((x: number, y: number) => void) | null = null;
  private onRespawn: () => void = null;
  private onLevelComplete: (time: number, grade: string) => void = null;

  constructor() {
    this.currentLevel = LEVELS[0];
    this.ball = {
      x: this.currentLevel.startX,
      y: this.currentLevel.startY,
      vx: 0,
      vy: 0,
      radius: 18
    };
    this.lastSafePosition = { x: this.currentLevel.startX, y: this.currentLevel.startY };
    this.initializeMagnets();
  }

  private initializeMagnets(): void {
    this.magnets.clear();
    for (const m of this.currentLevel.magnets) {
      this.magnets.set(m.id, {
        id: m.id,
        x: m.x,
        y: m.y,
        polarity: m.initialPolarity,
        rotation: 0,
        polarityTimer: 0,
        hitByLightning: false,
        lightningCooldown: 0
      });
    }
  }

  public loadLevel(index: number): void {
    if (index < 0 || index >= LEVELS.length) return;
    this.currentLevelIndex = index;
    this.currentLevel = LEVELS[index];
    this.lives = this.maxLives;
    this.elapsedTime = 0;
    this.gameState = 'playing';
    this.lightningTimer = 0;
    this.respawning = false;
    this.respawnTimer = 0;
    this.ball.x = this.currentLevel.startX;
    this.ball.y = this.currentLevel.startY;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.lastSafePosition = { x: this.currentLevel.startX, y: this.currentLevel.startY };
    this.lastPortalId = null;
    this.portalCooldown = 0;
    this.initializeMagnets();
  }

  public resetBall(): void {
    this.ball.x = this.lastSafePosition.x;
    this.ball.y = this.lastSafePosition.y;
    this.ball.vx = 0;
    this.ball.vy = 0;
  }

  public update(
    deltaTime: number,
    playerInput: { up: boolean; down: boolean; left: boolean; right: boolean },
    physicsUpdate: (ball: BallState, magnets: MagnetState[], input: typeof playerInput, dt: number) => any,
    wallCollision: (ball: BallState, walls: any) => { collided: boolean; hitX: number; hitY: number },
    spikeCheck: (ball: BallState, spikes: any) => boolean,
    goalCheck: (ball: BallState, gx: number, gy: number) => boolean,
    portalCheck: (ball: BallState, portals: any, lastId: string | null) => { id: string; targetId: string } | null
  ): void {
    if (this.gameState !== 'playing') return;

    if (this.respawning) {
      this.respawnTimer -= deltaTime;
      if (this.respawnTimer <= 0) {
        this.respawning = false;
        this.resetBall();
        if (this.onRespawn) this.onRespawn();
      }
      return;
    }

    this.elapsedTime += deltaTime;

    const magnetStates = Array.from(this.magnets.values());
    physicsUpdate(this.ball, magnetStates, playerInput, deltaTime);

    const wallResult = wallCollision(this.ball, this.currentLevel.walls);
    if (wallResult.collided && this.onShockwave) {
      this.onShockwave = this.onShockwave;
    }

    if (!this.isNearDanger()) {
      this.lastSafePosition = { x: this.ball.x, y: this.ball.y };
    }

    if (this.portalCooldown > 0) {
      this.portalCooldown -= deltaTime;
      if (this.portalCooldown <= 0) {
        this.lastPortalId = null;
      }
    }

    const portalHit = portalCheck(this.ball, this.currentLevel.portals, this.lastPortalId);
    if (portalHit) {
      const target = this.currentLevel.portals.find(p => p.id === portalHit.targetId);
      if (target) {
        this.ball.x = target.x;
        this.ball.y = target.y;
        this.ball.vx *= 0.5;
        this.ball.vy *= 0.5;
        this.lastPortalId = portalHit.targetId;
        this.portalCooldown = 1.5;
      }
    }

    if (spikeCheck(this.ball, this.currentLevel.spikes)) {
      this.loseLife();
      return;
    }

    if (goalCheck(this.ball, this.currentLevel.goalX, this.currentLevel.goalY)) {
      this.completeLevel();
      return;
    }

    this.updateMagnets(deltaTime);
    this.updateLightning(deltaTime);
  }

  private isNearDanger(): boolean {
    for (const spike of this.currentLevel.spikes) {
      const dx = this.ball.x - (spike.x + spike.width / 2);
      const dy = this.ball.y - (spike.y + spike.height / 2);
      if (dx * dx + dy * dy < 10000) return true;
    }
    return false;
  }

  private updateMagnets(deltaTime: number): void {
    for (const magnet of this.magnets.values()) {
      magnet.rotation += deltaTime * 0.5;
      magnet.polarityTimer += deltaTime;
      if (magnet.lightningCooldown > 0) magnet.lightningCooldown -= deltaTime;

      if (magnet.polarityTimer >= 8) {
        magnet.polarityTimer = 0;
        magnet.polarity = magnet.polarity === 'N' ? 'S' : 'N';
        if (this.onMagnetPolarityChange) {
          this.onMagnetPolarityChange(magnet.id, magnet.x, magnet.y, magnet.polarity);
        }
      }
    }
  }

  private updateLightning(deltaTime: number): void {
    this.lightningTimer += deltaTime;
    if (this.lightningEvent.active) {
      this.lightningEvent.active = false;
    }

    if (this.lightningTimer >= 15) {
      this.lightningTimer = 0;
      this.triggerLightning();
    }
  }

  private triggerLightning(): void {
    const availableMagnets = Array.from(this.magnets.values()).filter(m => m.lightningCooldown <= 0);
    if (availableMagnets.length === 0) return;

    const target = availableMagnets[Math.floor(Math.random() * availableMagnets.length)];
    const fromX = target.x + (Math.random() - 0.5) * 50;
    const fromY = target.y - 400;

    this.lightningEvent = {
      active: true,
      targetMagnetId: target.id,
      fromX,
      fromY,
      toX: target.x,
      toY: target.y
    };

    target.polarity = target.polarity === 'N' ? 'S' : 'N';
    target.lightningCooldown = 5;

    const shockRadius = 60;
    const dx = this.ball.x - target.x;
    const dy = this.ball.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < shockRadius && dist > 0) {
      const force = (shockRadius - dist) * 15;
      this.ball.vx += (dx / dist) * force;
      this.ball.vy += (dy / dist) * force;
    }

    if (this.onLightning) {
      this.onLightning(fromX, fromY, target.x, target.y, target.id);
    }
  }

  private loseLife(): void {
    this.lives--;
    if (this.onLifeLost) {
      this.onLifeLost(this.ball.x, this.ball.y);
    }

    if (this.lives <= 0) {
      this.gameState = 'lost';
    } else {
      this.respawning = true;
      this.respawnTimer = 1.0;
    }
  }

  private completeLevel(): void {
    this.gameState = 'won';
    const grade = this.calculateGrade();
    if (this.onLevelComplete) {
      this.onLevelComplete(this.elapsedTime, grade);
    }
  }

  public calculateGrade(): string {
    const t = this.gradeThresholds;
    if (this.elapsedTime <= t.S) return 'S';
    if (this.elapsedTime <= t.A) return 'A';
    if (this.elapsedTime <= t.B) return 'B';
    return 'C';
  }

  public get gradeThresholds(): { S: number; A: number; B: number } {
    return this.currentLevel.gradeThresholds;
  }

  public getBall(): BallState {
    return this.ball;
  }

  public getMagnets(): MagnetRuntime[] {
    return Array.from(this.magnets.values());
  }

  public getMagnet(id: string): MagnetRuntime | undefined {
    return this.magnets.get(id);
  }

  public getCurrentLevel(): LevelData {
    return this.currentLevel;
  }

  public getCurrentLevelIndex(): number {
    return this.currentLevelIndex;
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  public getLives(): number {
    return this.lives;
  }

  public getMaxLives(): number {
    return this.maxLives;
  }

  public getElapsedTime(): number {
    return this.elapsedTime;
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public isRespawning(): boolean {
    return this.respawning;
  }

  public getLightningEvent(): LightningEvent {
    return this.lightningEvent;
  }

  public setOnMagnetPolarityChange(cb: (id: string, x: number, y: number, polarity: PolarType) => void): void {
    this.onMagnetPolarityChange = cb;
  }

  public setOnLightning(cb: (fromX: number, fromY: number, toX: number, toY: number, magnetId: string) => void): void {
    this.onLightning = cb;
  }

  public setOnLifeLost(cb: (x: number, y: number) => void): void {
    this.onLifeLost = cb;
  }

  public setOnRespawn(cb: () => void): void {
    this.onRespawn = cb;
  }

  public setOnLevelComplete(cb: (time: number, grade: string) => void): void {
    this.onLevelComplete = cb;
  }

  public setGameState(state: GameState): void {
    this.gameState = state;
  }

  public static run: () => void;
}
