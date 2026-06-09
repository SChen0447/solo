import Matter from 'matter-js';
import { LevelManager, LevelBodies, PlatformData, CheckPoint } from './LevelManager';
import {
  PlayerController,
  RewindRequest,
  PlayerSnapshot,
  PLAYER_SPEED,
  JUMP_VELOCITY,
  REWIND_SPEED_MULTIPLIER
} from './PlayerController';

const { Engine, Render, Runner, Bodies, Composite, Body, Events, Query } = Matter;

type GameState = 'playing' | 'dying' | 'rewinding' | 'levelComplete' | 'gameComplete';

const DEATH_ANIMATION_DURATION = 500;
const LEVEL_COMPLETE_DELAY = 2000;
const MAX_DEBRIS = 30;
const FALL_SPEED_THRESHOLD = 8;
const BRICK_DEBRIS_COUNT_MIN = 2;
const BRICK_DEBRIS_COUNT_MAX = 4;

interface DebrisInfo {
  body: Matter.Body;
  createdAt: number;
}

interface PlatformRuntimeInfo {
  body: Matter.Body;
  data: PlatformData;
  originX: number;
  originY: number;
  offset: number;
  direction: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: Matter.Engine;
  private runner: Matter.Runner;
  private levelManager: LevelManager;
  private playerController: PlayerController;

  private player: Matter.Body | null = null;
  private levelBodies: LevelBodies | null = null;
  private platformRuntimes: PlatformRuntimeInfo[] = [];
  private debris: DebrisInfo[] = [];

  private gameState: GameState = 'playing';
  private currentLevelId: number = 1;
  private deathCount: number = 0;
  private totalRewindCount: number = 0;
  private rewindRemaining: number = 3;

  private rewindSnapshots: PlayerSnapshot[] = [];
  private rewindIndex: number = 0;
  private rewindAccumulator: number = 0;

  private deathAnimationStart: number = 0;
  private levelCompleteStart: number = 0;
  private isDead: boolean = false;
  private playerVisible: boolean = true;

  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly FIXED_DT: number = 1000 / 60;
  private readonly MAX_FRAME_TIME: number = 250;

  private checkpoints: CheckPoint[] = [];
  private lastCheckpoint: CheckPoint = { x: 60, y: 500 };

  private hudLevel: HTMLElement;
  private hudDeaths: HTMLElement;
  private hudRewinds: HTMLElement;
  private levelCompleteEl: HTMLElement;
  private gameCompleteEl: HTMLElement;
  private rewindHintEl: HTMLElement;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) throw new Error(`Canvas with id ${canvasId} not found`);

    const ctx = this.canvas.getContext('2d', { antialias: true });
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.hudLevel = document.getElementById('hud-level')!;
    this.hudDeaths = document.getElementById('hud-deaths')!;
    this.hudRewinds = document.getElementById('hud-rewinds')!;
    this.levelCompleteEl = document.getElementById('level-complete')!;
    this.gameCompleteEl = document.getElementById('game-complete')!;
    this.rewindHintEl = document.getElementById('rewind-hint')!;

    this.engine = Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 }
    });
    this.engine.positionIterations = 5;
    this.engine.velocityIterations = 3;

    this.runner = Runner.create();

    this.levelManager = new LevelManager();
    this.playerController = new PlayerController();
    this.playerController.setRewindCallback(this.handleRewindRequest.bind(this));

    this.setupCollisionEvents();
    this.loadLevel(1);
  }

  private setupCollisionEvents(): void {
    Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      for (const pair of pairs) {
        const { bodyA, bodyB } = pair;
        this.checkSpikeCollision(bodyA, bodyB);
        this.checkGoalCollision(bodyA, bodyB);
        this.checkBrickCollision(bodyA, bodyB);
      }
    });
  }

  private checkSpikeCollision(a: Matter.Body, b: Matter.Body): void {
    if (this.gameState !== 'playing') return;
    const playerBody = this.player;
    if (!playerBody) return;

    const isPlayerA = a === playerBody;
    const isPlayerB = b === playerBody;
    const isSpikeA = a.label === 'spike';
    const isSpikeB = b.label === 'spike';

    if ((isPlayerA && isSpikeB) || (isPlayerB && isSpikeA)) {
      this.triggerDeath();
    }
  }

  private checkGoalCollision(a: Matter.Body, b: Matter.Body): void {
    if (this.gameState !== 'playing') return;
    const playerBody = this.player;
    if (!playerBody) return;

    const isPlayerA = a === playerBody;
    const isPlayerB = b === playerBody;
    const isGoalA = a.label === 'goal';
    const isGoalB = b.label === 'goal';

    if ((isPlayerA && isGoalB) || (isPlayerB && isGoalA)) {
      this.completeLevel();
    }
  }

  private checkBrickCollision(a: Matter.Body, b: Matter.Body): void {
    if (this.gameState !== 'playing') return;
    const playerBody = this.player;
    if (!playerBody) return;

    let brick: Matter.Body | null = null;
    if (a.label === 'brick' && b === playerBody) brick = a;
    if (b.label === 'brick' && a === playerBody) brick = b;
    if (!brick) return;

    const playerSpeed = Math.abs(playerBody.velocity.y);
    if (playerSpeed > FALL_SPEED_THRESHOLD || playerBody.velocity.y < -2) {
      this.shatterBrick(brick);
    }
  }

  private shatterBrick(brick: Matter.Body): void {
    if (!this.levelBodies) return;

    const idx = this.levelBodies.bricks.indexOf(brick);
    if (idx !== -1) {
      this.levelBodies.bricks.splice(idx, 1);
    }
    Composite.remove(this.engine.world, brick);

    const debrisCount = Math.floor(
      Math.random() * (BRICK_DEBRIS_COUNT_MAX - BRICK_DEBRIS_COUNT_MIN + 1)
    ) + BRICK_DEBRIS_COUNT_MIN;

    for (let i = 0; i < debrisCount; i++) {
      const size = 6 + Math.random() * 6;
      const debrisBody = Bodies.rectangle(
        brick.position.x + (Math.random() - 0.5) * 10,
        brick.position.y + (Math.random() - 0.5) * 10,
        size,
        size,
        {
          mass: 0.1,
          friction: 0.5,
          restitution: 0.3,
          label: 'debris',
          render: { fillStyle: '#555555' }
        }
      );
      Body.setVelocity(debrisBody, {
        x: (Math.random() - 0.5) * 8,
        y: -Math.random() * 6 - 2
      });
      Body.setAngularVelocity(debrisBody, (Math.random() - 0.5) * 0.3);
      Composite.add(this.engine.world, debrisBody);
      this.debris.push({ body: debrisBody, createdAt: performance.now() });
    }

    this.trimDebris();
  }

  private trimDebris(): void {
    const now = performance.now();
    this.debris = this.debris.filter(d => now - d.createdAt < 3000);
    while (this.debris.length > MAX_DEBRIS) {
      const oldest = this.debris.shift();
      if (oldest) {
        Composite.remove(this.engine.world, oldest.body);
      }
    }
  }

  private triggerDeath(): void {
    if (this.gameState !== 'playing') return;
    this.gameState = 'dying';
    this.isDead = true;
    this.deathCount++;
    this.deathAnimationStart = performance.now();
    this.updateHUD();
    this.showRewindHint();
  }

  private showRewindHint(): void {
    this.rewindHintEl.classList.add('visible');
  }

  private hideRewindHint(): void {
    this.rewindHintEl.classList.remove('visible');
  }

  private respawnPlayer(): void {
    if (!this.player || !this.levelBodies) return;

    Body.setPosition(this.player, { x: this.lastCheckpoint.x, y: this.lastCheckpoint.y });
    Body.setVelocity(this.player, { x: 0, y: 0 });
    Body.setAngle(this.player, 0);
    Body.setAngularVelocity(this.player, 0);

    this.gameState = 'playing';
    this.isDead = false;
    this.playerVisible = true;
    this.playerController.clearSnapshots();
    this.hideRewindHint();
  }

  private handleRewindRequest(request: RewindRequest): void {
    if (this.rewindRemaining <= 0) return;
    if (request.snapshots.length === 0) return;

    this.gameState = 'rewinding';
    this.rewindSnapshots = [...request.snapshots];
    this.rewindIndex = this.rewindSnapshots.length - 1;
    this.rewindAccumulator = 0;
    this.rewindRemaining--;
    this.totalRewindCount++;
    this.playerController.setRewinding(true);
    this.isDead = false;
    this.playerVisible = true;
    this.hideRewindHint();
    this.updateHUD();
  }

  private finishRewind(): void {
    this.gameState = 'playing';
    this.playerController.setRewinding(false);
    this.playerController.clearSnapshots();
  }

  private completeLevel(): void {
    if (this.gameState !== 'playing') return;
    this.gameState = 'levelComplete';
    this.levelCompleteStart = performance.now();
    this.levelCompleteEl.classList.add('visible');
  }

  private loadLevel(levelId: number): void {
    const totalLevels = this.levelManager.getTotalLevels();
    if (levelId > totalLevels) {
      this.showGameComplete();
      return;
    }

    this.currentLevelId = levelId;
    this.levelCompleteEl.classList.remove('visible');
    this.gameCompleteEl.classList.remove('visible');

    if (this.levelBodies) {
      Composite.clear(this.engine.world, false);
    }
    this.debris = [];

    const levelBodies = this.levelManager.buildLevel(levelId);
    if (!levelBodies) return;

    this.levelBodies = levelBodies;
    this.checkpoints = this.levelManager.getCheckPoints(levelId);

    const levelData = this.levelManager.getCurrentLevelData();
    if (levelData) {
      this.rewindRemaining = levelData.rewindCount;
      this.lastCheckpoint = levelData.playerStart;
    }

    this.platformRuntimes = levelBodies.platforms.map((p, i) => ({
      body: p,
      data: levelBodies!.platformData[i],
      originX: p.position.x,
      originY: p.position.y,
      offset: 0,
      direction: 1
    }));

    const playerSize = 24;
    const startX = levelData ? levelData.playerStart.x : 60;
    const startY = levelData ? levelData.playerStart.y : 500;
    this.player = Bodies.rectangle(startX, startY, playerSize, playerSize, {
      density: 0.002,
      friction: 0.1,
      frictionAir: 0.01,
      restitution: 0,
      label: 'player',
      render: { fillStyle: '#FFFFFF' }
    });

    const allBodies = [
      ...levelBodies.walls,
      ...levelBodies.spikes,
      ...levelBodies.platforms,
      ...levelBodies.bricks,
      levelBodies.goal,
      this.player
    ];

    Composite.add(this.engine.world, allBodies);

    this.gameState = 'playing';
    this.isDead = false;
    this.playerVisible = true;
    this.playerController.clearSnapshots();
    this.hideRewindHint();
    this.updateHUD();
  }

  private showGameComplete(): void {
    this.gameState = 'gameComplete';
    const score = Math.min(999, this.deathCount * 10 + this.totalRewindCount * 5);
    this.gameCompleteEl.innerHTML = `通关成功!<br>最终得分: ${score}<br>死亡: ${this.deathCount} | 回溯: ${this.totalRewindCount}`;
    this.gameCompleteEl.classList.add('visible');
  }

  private updateHUD(): void {
    this.hudLevel.textContent = String(this.currentLevelId);
    this.hudDeaths.textContent = String(this.deathCount);
    this.hudRewinds.textContent = String(this.rewindRemaining);
  }

  private updatePlayerMovement(): void {
    if (!this.player || this.gameState !== 'playing') return;

    const input = this.playerController.getInputState();
    let vx = 0;

    if (input.left) vx -= PLAYER_SPEED;
    if (input.right) vx += PLAYER_SPEED;

    if (vx !== 0) {
      Body.setVelocity(this.player, { x: vx, y: this.player.velocity.y });
    }

    if (this.playerController.consumeJump()) {
      Body.setVelocity(this.player, { x: this.player.velocity.x, y: JUMP_VELOCITY });
      this.playerController.setCanJump(false);
    }

    this.checkGrounded();
    this.updateCheckpoint();
  }

  private checkGrounded(): void {
    if (!this.player || !this.levelBodies) return;

    const playerSize = 24;
    const feetY = this.player.position.y + playerSize / 2 + 2;
    const leftX = this.player.position.x - playerSize / 2 + 2;
    const rightX = this.player.position.x + playerSize / 2 - 2;

    const bodies = [
      ...this.levelBodies.walls,
      ...this.levelBodies.platforms,
      ...this.levelBodies.bricks
    ];

    let grounded = false;
    for (const body of bodies) {
      const bx = body.position.x;
      const by = body.position.y;
      const bw = (body as any).width || 40;
      const bh = (body as any).height || 20;

      if (
        feetY >= by - bh / 2 - 1 &&
        feetY <= by - bh / 2 + 4 &&
        rightX >= bx - bw / 2 &&
        leftX <= bx + bw / 2
      ) {
        grounded = true;
        break;
      }
    }

    if (this.player.position.y > 560) grounded = true;

    if (grounded) {
      this.playerController.setCanJump(true);
    }
  }

  private updateCheckpoint(): void {
    if (!this.player) return;
    const px = this.player.position.x;
    const py = this.player.position.y;

    for (const cp of this.checkpoints) {
      const dist = Math.hypot(px - cp.x, py - cp.y);
      if (dist < 50) {
        if (cp.x > this.lastCheckpoint.x) {
          this.lastCheckpoint = { ...cp };
        }
      }
    }
  }

  private updatePlatforms(): void {
    if (this.gameState === 'rewinding') return;

    for (const pr of this.platformRuntimes) {
      const speed = pr.data.speed;
      pr.offset += speed * pr.direction;

      if (Math.abs(pr.offset) >= pr.data.range) {
        pr.direction *= -1;
        pr.offset = Math.sign(pr.offset) * pr.data.range;
      }

      if (pr.data.direction === 'horizontal') {
        Body.setPosition(pr.body, {
          x: pr.originX + pr.offset,
          y: pr.originY
        });
      } else {
        Body.setPosition(pr.body, {
          x: pr.originX,
          y: pr.originY + pr.offset
        });
      }
    }
  }

  private updateRewind(deltaMs: number): void {
    if (this.gameState !== 'rewinding' || !this.player) return;

    this.rewindAccumulator += deltaMs * REWIND_SPEED_MULTIPLIER;
    const frameMs = 1000 / 60;

    while (this.rewindAccumulator >= frameMs && this.rewindIndex > 0) {
      this.rewindIndex--;
      this.rewindAccumulator -= frameMs;
    }

    if (this.rewindIndex < this.rewindSnapshots.length) {
      const snap = this.rewindSnapshots[this.rewindIndex];
      Body.setPosition(this.player, { x: snap.x, y: snap.y });
      Body.setVelocity(this.player, { x: snap.vx, y: snap.vy });
      Body.setAngle(this.player, 0);
      Body.setAngularVelocity(this.player, 0);
    }

    if (this.rewindIndex <= 0) {
      this.finishRewind();
    }
  }

  private updateDeathAnimation(now: number): void {
    if (this.gameState !== 'dying') return;
    const elapsed = now - this.deathAnimationStart;

    this.playerVisible = Math.floor(elapsed / 80) % 2 === 0;

    if (elapsed >= DEATH_ANIMATION_DURATION) {
      if (this.rewindRemaining <= 0) {
        this.respawnPlayer();
      } else {
        this.playerVisible = false;
      }
    }
  }

  private updateLevelComplete(now: number): void {
    if (this.gameState !== 'levelComplete') return;
    const elapsed = now - this.levelCompleteStart;
    if (elapsed >= LEVEL_COMPLETE_DELAY) {
      this.loadLevel(this.currentLevelId + 1);
    }
  }

  private recordPlayerSnapshot(): void {
    if (!this.player || this.gameState !== 'playing') return;
    this.playerController.recordSnapshot(
      this.player.position.x,
      this.player.position.y,
      this.player.velocity.x,
      this.player.velocity.y
    );
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#1E1E2E';
    ctx.fillRect(0, 0, w, h);

    if (!this.levelBodies) return;

    for (const wall of this.levelBodies.walls) {
      this.drawBody(wall, '#888888');
    }

    for (const spike of this.levelBodies.spikes) {
      this.drawBody(spike, '#FF5555');
    }

    for (const platform of this.levelBodies.platforms) {
      this.drawBody(platform, '#CCAA66');
    }

    for (const brick of this.levelBodies.bricks) {
      this.drawBody(brick, '#AA7744');
    }

    for (const d of this.debris) {
      this.drawBody(d.body, '#555555');
    }

    this.drawGoal(this.levelBodies.goal);

    if (this.playerVisible && this.player) {
      this.drawPlayer();
    }
  }

  private drawBody(body: Matter.Body, color: string): void {
    const ctx = this.ctx;
    const w = (body as any).width || 20;
    const h = (body as any).height || 20;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  private drawGoal(goal: Matter.Body): void {
    const ctx = this.ctx;
    const w = (goal as any).width || 30;
    const h = (goal as any).height || 40;
    const x = goal.position.x;
    const y = goal.position.y;

    const gradient = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.1)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 136, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0.1)');

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    ctx.restore();
  }

  private drawPlayer(): void {
    if (!this.player) return;
    const ctx = this.ctx;
    const size = 24;
    const x = this.player.position.x;
    const y = this.player.position.y;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.player.angle);

    let color = '#FFFFFF';
    let alpha = 1;

    if (this.gameState === 'rewinding') {
      color = '#00BFFF';
      alpha = 0.5;
    } else if (this.gameState === 'dying') {
      color = '#FF5555';
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(-size / 2, -size / 2, size, size);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }

  private gameLoop = (timestamp: number): void => {
    if (!this.lastTime) this.lastTime = timestamp;
    let deltaMs = timestamp - this.lastTime;
    this.lastTime = timestamp;

    if (deltaMs > this.MAX_FRAME_TIME) deltaMs = this.MAX_FRAME_TIME;

    this.accumulator += deltaMs;

    let steps = 0;
    const maxSteps = 5;

    while (this.accumulator >= this.FIXED_DT && steps < maxSteps) {
      this.update(this.FIXED_DT);
      this.accumulator -= this.FIXED_DT;
      steps++;
    }

    if (steps > 0) {
      this.render();
    }

    requestAnimationFrame(this.gameLoop);
  };

  private update(deltaMs: number): void {
    const now = performance.now();

    this.updateDeathAnimation(now);
    this.updateLevelComplete(now);

    if (this.gameState === 'rewinding') {
      this.updateRewind(deltaMs);
      this.updatePlatforms();
      Runner.update(this.runner, this.engine, deltaMs);
      return;
    }

    if (this.gameState === 'playing') {
      this.updatePlayerMovement();
      this.recordPlayerSnapshot();
    }

    this.updatePlatforms();
    Runner.update(this.runner, this.engine, deltaMs);
    this.trimDebris();
  }

  start(): void {
    this.lastTime = 0;
    this.accumulator = 0;
    requestAnimationFrame(this.gameLoop);
  }
}
