import type { Point, GameState, Bullet, PathData, Tower, Enemy } from './types';
import { PathManager } from './PathManager';
import { TowerManager } from './Tower';
import { EnemyManager } from './Enemy';
import { Renderer } from './Renderer';

export interface GameEngineCallbacks {
  onStateChange?: (state: GameState) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private pathManager: PathManager;
  private towerManager: TowerManager;
  private enemyManager: EnemyManager;
  private bullets: Bullet[] = [];

  private gameState: GameState;
  private initialState: GameState;

  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private fixedTimeStep: number = 1000 / 60;

  private speedMultiplier: number = 1;

  private isDraggingTower: boolean = false;

  private callbacks: GameEngineCallbacks;

  private initialLives = 20;

  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;
  private boundHandleMouseLeave: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks = {}) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.pathManager = new PathManager();
    this.towerManager = new TowerManager();
    this.enemyManager = new EnemyManager();
    this.callbacks = callbacks;

    this.initialState = {
      score: 0,
      lives: this.initialLives,
      wave: 0,
      isPlaying: false,
      isGameOver: false,
      speed: 1,
      totalKills: 0,
      highestDamage: 0,
      currentCurvature: 0,
    };

    this.gameState = { ...this.initialState };

    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
    window.addEventListener('mouseup', this.boundHandleMouseUp);
    this.canvas.addEventListener('mouseleave', this.boundHandleMouseLeave);
  }

  private getCanvasPosition(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    if (this.gameState.isGameOver) return;
    if (e.button !== 0) return;

    const pos = this.getCanvasPosition(e);

    const clickedTower = this.towerManager.findTowerAtPoint(pos, 20);

    if (clickedTower) {
      this.towerManager.selectTower(clickedTower.id);
      this.isDraggingTower = true;
      this.gameState.currentCurvature = clickedTower.curvature;
      this.updateState();
      return;
    }

    this.towerManager.selectTower(null);
    this.pathManager.startDrawing(pos);
    this.gameState.currentCurvature = 0;
    this.updateState();
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPosition(e);

    if (this.isDraggingTower) {
      const selectedTower = this.towerManager.getSelectedTower();
      if (selectedTower) {
        const nearest = this.pathManager.findNearestPointOnPath(pos, selectedTower.pathId);
        if (nearest && nearest.distance < 80) {
          const curvature = this.pathManager.getCurvatureAtDistance(
            selectedTower.pathId,
            nearest.pathDistance,
            50
          );
          this.towerManager.moveTowerToPathDistance(
            selectedTower.id,
            nearest.pathDistance,
            nearest.point,
            curvature
          );
          this.gameState.currentCurvature = curvature;
          this.updateState();
        }
      }
      return;
    }

    if (this.pathManager.getIsDrawing()) {
      this.pathManager.addPoint(pos);

      const points = this.pathManager.getCurrentDrawingPoints();
      if (points.length >= 3) {
        const lastIdx = points.length - 1;
        const startIdx = Math.max(0, lastIdx - 10);
        const midIdx = Math.floor((startIdx + lastIdx) / 2);
        const curvature = this.calculateSimpleCurvature(
          points[startIdx],
          points[midIdx],
          points[lastIdx]
        );
        this.gameState.currentCurvature = Math.min(curvature * 30, 1);
        this.updateState();
      }
    }
  }

  private handleMouseUp(_e: MouseEvent): void {
    if (this.isDraggingTower) {
      this.isDraggingTower = false;
      return;
    }

    if (this.pathManager.getIsDrawing()) {
      const pathData = this.pathManager.finishDrawing();

      if (pathData && pathData.length > 100) {
        this.createTowersOnPath(pathData);
        this.spawnEnemyWave(pathData.id);
        this.gameState.wave++;
        this.gameState.isPlaying = true;
      }

      const selectedTower = this.towerManager.getSelectedTower();
      if (selectedTower) {
        this.gameState.currentCurvature = selectedTower.curvature;
      } else {
        this.gameState.currentCurvature = 0;
      }
      this.updateState();
    }
  }

  private handleMouseLeave(_e: MouseEvent): void {
    if (this.isDraggingTower) {
      this.isDraggingTower = false;
    }
  }

  private calculateSimpleCurvature(p0: Point, p1: Point, p2: Point): number {
    const dx1 = p1.x - p0.x;
    const dy1 = p1.y - p0.y;
    const dx2 = p2.x - p1.x;
    const dy2 = p2.y - p1.y;

    const cross = dx1 * dy2 - dy1 * dx2;
    const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    if (d1 === 0 || d2 === 0) return 0;

    return Math.abs(cross) / (d1 * d2);
  }

  private createTowersOnPath(pathData: PathData): void {
    const positions = this.pathManager.generateTowerPositions(pathData.id, 50);

    for (const dist of positions) {
      const point = this.pathManager.getPointAtDistance(pathData.id, dist);
      const curvature = this.pathManager.getCurvatureAtDistance(pathData.id, dist, 50);

      if (point) {
        this.towerManager.createTower(pathData.id, point, dist, curvature);
      }
    }
  }

  private spawnEnemyWave(pathId: string): void {
    const waveNum = this.gameState.wave + 1;
    const hpMultiplier = 1 + (waveNum - 1) * 0.15;
    this.enemyManager.spawnWave(pathId, 10, hpMultiplier);
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    let deltaTime = now - this.lastTime;
    this.lastTime = now;

    if (deltaTime > 250) deltaTime = 250;

    const effectiveDelta = deltaTime * this.speedMultiplier;
    this.accumulator += effectiveDelta;

    const stepDt = this.fixedTimeStep;
    const maxSteps = this.speedMultiplier > 1 ? 10 : 5;

    let steps = 0;
    while (this.accumulator >= stepDt && steps < maxSteps) {
      this.update(stepDt);
      this.accumulator -= stepDt;
      steps++;
    }

    this.render();

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    if (this.gameState.isGameOver) return;

    const pathsMap = this.getPathsMap();

    const { reachedEnd } = this.enemyManager.update(deltaTime, pathsMap);

    let newKills = 0;
    for (const enemy of reachedEnd) {
      this.gameState.lives--;
      if (this.gameState.lives <= 0) {
        this.gameState.lives = 0;
        this.gameState.isGameOver = true;
        this.gameState.isPlaying = false;
      }
    }

    const aliveBefore = this.enemyManager.getAliveCount();

    const enemies = this.enemyManager.getAllEnemies();

    const newBullets = this.towerManager.update(
      performance.now(),
      enemies,
      (tower: Tower, target: Enemy) => this.createBullet(tower, target)
    );

    this.bullets.push(...newBullets);

    this.updateBullets(deltaTime);

    const aliveAfter = this.enemyManager.getAliveCount();
    newKills = aliveBefore - aliveAfter;

    if (newKills > 0) {
      this.gameState.score += newKills * 10;
      this.gameState.totalKills += newKills;
    }

    this.updateState();
  }

  private createBullet(tower: Tower, target: Enemy): Bullet | null {
    const dx = target.position.x - tower.position.x;
    const dy = target.position.y - tower.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return null;

    const speed = 500;

    return {
      id: `bullet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: { ...tower.position },
      velocity: {
        x: (dx / dist) * speed,
        y: (dy / dist) * speed,
      },
      damage: tower.damage,
      targetId: target.id,
      towerId: tower.id,
      isActive: true,
    };
  }

  private updateBullets(deltaTime: number): void {
    const dt = deltaTime / 1000;

    for (const bullet of this.bullets) {
      if (!bullet.isActive) continue;

      bullet.position.x += bullet.velocity.x * dt;
      bullet.position.y += bullet.velocity.y * dt;

      if (
        bullet.position.x < -50 ||
        bullet.position.x > this.renderer.getWidth() + 50 ||
        bullet.position.y < -50 ||
        bullet.position.y > this.renderer.getHeight() + 50
      ) {
        bullet.isActive = false;
        continue;
      }

      const target = this.enemyManager.getEnemy(bullet.targetId);
      if (target && target.isAlive) {
        const dx = target.position.x - bullet.position.x;
        const dy = target.position.y - bullet.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 12) {
          this.enemyManager.damageEnemy(bullet.targetId, bullet.damage);

          if (bullet.damage > this.gameState.highestDamage) {
            this.gameState.highestDamage = Math.round(bullet.damage);
          }

          bullet.isActive = false;
        }
      } else {
        bullet.isActive = false;
      }
    }

    this.bullets = this.bullets.filter(b => b.isActive);
  }

  private getPathsMap(): Map<string, PathData> {
    const map = new Map<string, PathData>();
    for (const path of this.pathManager.getAllPaths()) {
      map.set(path.id, path);
    }
    return map;
  }

  private render(): void {
    this.renderer.render(
      this.pathManager.getAllPaths(),
      this.pathManager.getCurrentDrawingPoints(),
      this.pathManager.getIsDrawing(),
      this.towerManager.getAllTowers(),
      this.enemyManager.getAllEnemies(),
      this.bullets,
      this.enemyManager.getDamageNumbers(),
      this.gameState
    );
  }

  setSpeed(speed: number): void {
    this.speedMultiplier = speed;
    this.gameState.speed = speed;
    this.updateState();
  }

  getSpeed(): number {
    return this.speedMultiplier;
  }

  reset(): void {
    this.pathManager.clearAllPaths();
    this.towerManager.clearAll();
    this.enemyManager.clearAll();
    this.bullets = [];
    this.gameState = { ...this.initialState };
    this.speedMultiplier = 1;
    this.isDraggingTower = false;
    this.accumulator = 0;
    this.updateState();
  }

  getState(): GameState {
    return { ...this.gameState };
  }

  private updateState(): void {
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange({ ...this.gameState });
    }
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }

  destroy(): void {
    this.stop();

    this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
    window.removeEventListener('mouseup', this.boundHandleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.boundHandleMouseLeave);
  }
}
