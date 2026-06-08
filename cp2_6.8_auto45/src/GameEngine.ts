import { GameState, GameConfig, DEFAULT_CONFIG, Vector2 } from './types';
import { MonsterManager } from './MonsterManager';
import { TowerManager, TowerFireEvent } from './TowerManager';
import { ProjectileManager, ProjectileHitEvent } from './ProjectileManager';

export interface GameEngineCallbacks {
  onStateChange?: (state: GameState) => void;
  onScoreChange?: (killed: number, total: number) => void;
  onVictory?: () => void;
  onDefeat?: () => void;
}

export class GameEngine {
  private config: GameConfig;
  private gameState: GameState = 'idle';
  private speedMultiplier: number = 1;
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private spawnTimer: number = 0;
  private spawnedCount: number = 0;
  private killedCount: number = 0;
  private hasLost: boolean = false;
  private hasWon: boolean = false;

  public monsterManager: MonsterManager;
  public towerManager: TowerManager;
  public projectileManager: ProjectileManager;

  private callbacks: GameEngineCallbacks = {};

  constructor(config: GameConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.monsterManager = new MonsterManager(config);
    this.towerManager = new TowerManager(config);
    this.projectileManager = new ProjectileManager(config);

    this.setupCallbacks();
  }

  private setupCallbacks(): void {
    this.towerManager.setOnFireCallback((event: TowerFireEvent) => {
      this.projectileManager.createProjectile(
        event.startPosition,
        event.velocity,
        event.damage
      );
    });

    this.projectileManager.setOnHitCallback((event: ProjectileHitEvent) => {
      this.monsterManager.damageMonster(event.monsterId, event.damage);
    });

    this.monsterManager.setOnMonsterKilled(() => {
      this.killedCount++;
      if (this.callbacks.onScoreChange) {
        this.callbacks.onScoreChange(this.killedCount, this.config.totalMonsters);
      }
      this.checkVictory();
    });

    this.monsterManager.setOnMonsterReachedEnd(() => {
      this.hasLost = true;
      this.setState('defeat');
      if (this.callbacks.onDefeat) {
        this.callbacks.onDefeat();
      }
    });
  }

  private setState(state: GameState): void {
    if (this.gameState === state) return;
    this.gameState = state;
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(state);
    }
  }

  private gameLoop = (currentTime: number): void => {
    if (this.gameState !== 'playing') {
      this.animationFrameId = null;
      return;
    }

    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.update(deltaTime);

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    if (this.gameState !== 'playing') return;

    this.spawnTimer += deltaTime * this.speedMultiplier;
    if (this.spawnTimer >= this.config.monsterSpawnInterval && 
        this.spawnedCount < this.config.totalMonsters) {
      this.monsterManager.spawnMonster();
      this.spawnedCount++;
      this.spawnTimer = 0;
    }

    this.monsterManager.update(deltaTime, this.speedMultiplier);

    const aliveMonsters = this.monsterManager.getAliveMonsters();
    this.towerManager.update(deltaTime, this.speedMultiplier, aliveMonsters);

    this.projectileManager.update(deltaTime, this.speedMultiplier, aliveMonsters);
  }

  private checkVictory(): void {
    if (this.hasWon || this.hasLost) return;

    if (this.spawnedCount >= this.config.totalMonsters && 
        this.monsterManager.getAliveMonsters().length === 0) {
      this.hasWon = true;
      this.setState('victory');
      if (this.callbacks.onVictory) {
        this.callbacks.onVictory();
      }
    }
  }

  public start(): void {
    if (this.gameState === 'playing') return;

    this.setState('playing');
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  public pause(): void {
    if (this.gameState !== 'playing') return;

    this.setState('paused');
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resume(): void {
    if (this.gameState !== 'paused') return;

    this.setState('playing');
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  public togglePause(): void {
    if (this.gameState === 'playing') {
      this.pause();
    } else if (this.gameState === 'paused') {
      this.resume();
    }
  }

  public reset(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.monsterManager.reset();
    this.towerManager.reset();
    this.projectileManager.reset();

    this.gameState = 'idle';
    this.spawnTimer = 0;
    this.spawnedCount = 0;
    this.killedCount = 0;
    this.hasLost = false;
    this.hasWon = false;
    this.speedMultiplier = 1;

    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange('idle');
    }
    if (this.callbacks.onScoreChange) {
      this.callbacks.onScoreChange(0, this.config.totalMonsters);
    }
  }

  public getState(): GameState {
    return this.gameState;
  }

  public getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  public setSpeedMultiplier(speed: number): void {
    this.speedMultiplier = Math.max(0.5, Math.min(2, speed));
  }

  public getKilledCount(): number {
    return this.killedCount;
  }

  public getTotalMonsters(): number {
    return this.config.totalMonsters;
  }

  public setCallbacks(callbacks: GameEngineCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public handleCanvasClick(x: number, y: number): void {
    // 可以添加点击交互逻辑
  }

  public getTowerAtPosition(x: number, y: number) {
    return this.towerManager.findTowerAtPosition(x, y);
  }

  public createTower(x: number, y: number) {
    return this.towerManager.createTower(x, y);
  }

  public placeTower(towerId: number): void {
    this.towerManager.placeTower(towerId);
  }

  public setTowerPosition(towerId: number, x: number, y: number): void {
    this.towerManager.setTowerPosition(towerId, x, y);
  }

  public setTowerDragging(towerId: number, dragging: boolean): void {
    this.towerManager.setTowerDragging(towerId, dragging);
  }
}
