import {
  GameState,
  GeneratedMap,
  TILE_SIZE,
  LEVEL_CONFIGS,
  LevelConfig,
  PulseEffect,
} from './types';
import { MapGenerator } from './MapGenerator';
import { Player } from './Player';
import { EntityManager } from './EntityManager';

export class GameManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  private mapGenerator: MapGenerator;
  private currentMap!: GeneratedMap;
  private player!: Player;
  private entityManager!: EntityManager;

  private gameState: GameState;
  private currentLevel: number;
  private elapsedTime: number;
  private lastFrameTime: number;

  private deathFlashTimer: number;
  private victoryExpandTimer: number;
  private transitionTimer: number;
  private spacePressed: boolean;

  private pulseEffects: PulseEffect[];
  private shardAnimTime: number;
  private exitAnimTime: number;
  private noiseAnimTime: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;

    this.mapGenerator = new MapGenerator();
    this.gameState = 'exploring';
    this.currentLevel = 0;
    this.elapsedTime = 0;
    this.lastFrameTime = performance.now();

    this.deathFlashTimer = 0;
    this.victoryExpandTimer = 0;
    this.transitionTimer = 0;
    this.spacePressed = false;

    this.pulseEffects = [];
    this.shardAnimTime = 0;
    this.exitAnimTime = 0;
    this.noiseAnimTime = 0;

    this.setupEventListeners();
    this.loadLevel(0);
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.gameState === 'transition' && (e.key === ' ' || e.code === 'Space')) {
      if (!this.spacePressed) {
        this.spacePressed = true;
        this.advanceToNextLevel();
      }
    } else if (this.gameState === 'exploring') {
      this.player.handleKeyDown(e);
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.key === ' ' || e.code === 'Space') {
      this.spacePressed = false;
    }
    if (this.gameState === 'exploring' && this.player) {
      this.player.handleKeyUp(e);
    }
  }

  private loadLevel(levelIndex: number): void {
    this.currentLevel = levelIndex;
    const config = LEVEL_CONFIGS[levelIndex];
    this.canvas.width = config.mapSize * TILE_SIZE;
    this.canvas.height = config.mapSize * TILE_SIZE;
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;

    this.currentMap = this.mapGenerator.generate(config);
    this.player = new Player(this.currentMap.start, config);
    this.entityManager = new EntityManager(
      this.currentMap.tiles,
      this.currentMap.size,
      this.mapGenerator
    );
    this.entityManager.reset(
      this.currentMap.tiles,
      this.currentMap.size,
      this.currentMap.monsterSpawns
    );

    this.elapsedTime = 0;
    this.gameState = 'exploring';
    this.deathFlashTimer = 0;
    this.victoryExpandTimer = 0;
    this.pulseEffects = [];
  }

  private advanceToNextLevel(): void {
    if (this.currentLevel < LEVEL_CONFIGS.length - 1) {
      this.loadLevel(this.currentLevel + 1);
    }
  }

  public start(): void {
    this.lastFrameTime = performance.now();
    requestAnimationFrame(() => this.gameLoop());
  }

  private gameLoop(): void {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    this.shardAnimTime += deltaTime;
    this.exitAnimTime += deltaTime;
    this.noiseAnimTime += deltaTime;

    if (this.gameState === 'exploring') {
      this.elapsedTime += deltaTime;
      this.player.update(deltaTime, (x, y) => this.mapGenerator.isWalkable(this.currentMap.tiles, x, y));
      this.entityManager.update(
        deltaTime,
        this.player.gridPosition,
        this.player.renderPosition,
        this.player.getLightPixelRadius()
      );

      this.checkShardCollection();
      this.checkMonsterCollision();
      this.checkExit();
      this.updatePulseEffects(deltaTime);
      this.checkMonsterPulses();

    } else if (this.gameState === 'dead') {
      this.deathFlashTimer += deltaTime;
      if (this.deathFlashTimer >= 1500) {
        this.loadLevel(this.currentLevel);
      }
    } else if (this.gameState === 'victory') {
      this.victoryExpandTimer += deltaTime;
    } else if (this.gameState === 'transition') {
      this.transitionTimer += deltaTime;
    }
  }

  private checkShardCollection(): void {
    const pos = this.player.gridPosition;
    const tile = this.currentMap.tiles[pos.y]?.[pos.x];
    if (tile === 'shard') {
      this.player.collectShard();
      this.currentMap.tiles[pos.y][pos.x] = 'floor';
      const idx = this.currentMap.shards.findIndex(s => s.x === pos.x && s.y === pos.y);
      if (idx !== -1) this.currentMap.shards.splice(idx, 1);
    }
  }

  private checkMonsterCollision(): void {
    const collision = this.entityManager.checkCollision(this.player.gridPosition);
    if (collision) {
      this.gameState = 'dead';
      this.deathFlashTimer = 0;
    }
  }

  private checkExit(): void {
    const pos = this.player.gridPosition;
    if (
      this.currentMap.tiles[pos.y]?.[pos.x] === 'exit' &&
      this.player.hasAllShards()
    ) {
      if (this.currentLevel >= LEVEL_CONFIGS.length - 1) {
        this.gameState = 'victory';
        this.victoryExpandTimer = 0;
      } else {
        this.gameState = 'transition';
        this.transitionTimer = 0;
      }
    }
  }

  private updatePulseEffects(deltaTime: number): void {
    for (let i = this.pulseEffects.length - 1; i >= 0; i--) {
      const p = this.pulseEffects[i];
      p.radius += (deltaTime / 800) * p.maxRadius;
      p.alpha -= deltaTime / 800;
      if (p.alpha <= 0 || p.radius >= p.maxRadius) {
        this.pulseEffects.splice(i, 1);
      }
    }
  }

  private checkMonsterPulses(): void {
    for (const m of this.entityManager.monsters) {
      if (m.pulseActive && m.visibility > 0.3) {
        if (!this.pulseEffects.some(p =>
          Math.abs(p.x - m.renderPosition.x) < 5 && Math.abs(p.y - m.renderPosition.y) < 5
        )) {
          this.pulseEffects.push({
            x: m.renderPosition.x,
            y: m.renderPosition.y,
            radius: TILE_SIZE * 0.5,
            maxRadius: TILE_SIZE * 2.5,
            alpha: 0.4,
          });
        }
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const offCtx = this.offscreenCtx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    offCtx.clearRect(0, 0, w, h);

    this.renderMap(offCtx);
    this.renderShards(offCtx);
    this.renderExit(offCtx);
    this.renderPlayer(offCtx);
    this.renderMonsters(offCtx);
    this.renderPulseEffects(offCtx);

    this.applyLighting(offCtx, w, h);

    ctx.drawImage(this.offscreenCanvas, 0, 0);

    this.renderHUD(ctx);
    this.renderOverlay(ctx, w, h);
  }

  private renderMap(ctx: CanvasRenderingContext2D): void {
    const tiles = this.currentMap.tiles;
    const size = this.currentMap.size;
    const px = this.player.renderPosition.x;
    const py = this.player.renderPosition.y;
    const radius = this.player.getLightPixelRadius() + TILE_SIZE * 2;

    const startGX = Math.max(0, Math.floor((px - radius) / TILE_SIZE) - 1);
    const endGX = Math.min(size - 1, Math.ceil((px + radius) / TILE_SIZE) + 1);
    const startGY = Math.max(0, Math.floor((py - radius) / TILE_SIZE) - 1);
    const endGY = Math.min(size - 1, Math.ceil((py + radius) / TILE_SIZE) + 1);

    for (let gy = startGY; gy <= endGY; gy++) {
      for (let gx = startGX; gx <= endGX; gx++) {
        const tile = tiles[gy]?.[gx];
        if (!tile) continue;
        const x = gx * TILE_SIZE;
        const y = gy * TILE_SIZE;

        if (tile === 'wall') {
          ctx.fillStyle = '#2a2a2a';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = '#000000';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  private renderShards(ctx: CanvasRenderingContext2D): void {
    const pulse = 1 + 0.5 * Math.sin((this.shardAnimTime / 600) * Math.PI * 2);
    const baseSize = TILE_SIZE * 0.4;

    for (const shard of this.currentMap.shards) {
      const x = shard.x * TILE_SIZE + TILE_SIZE / 2;
      const y = shard.y * TILE_SIZE + TILE_SIZE / 2;
      const size = baseSize * pulse;

      ctx.fillStyle = '#ffdd00';
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();

      ctx.fillStyle = 'rgba(255, 255, 150, 0.3)';
      ctx.beginPath();
      ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderExit(ctx: CanvasRenderingContext2D): void {
    const exit = this.currentMap.exit;
    const x = exit.x * TILE_SIZE;
    const y = exit.y * TILE_SIZE;
    const blink = Math.sin((this.exitAnimTime / 300) * Math.PI) > 0;

    if (blink || this.player.hasAllShards()) {
      ctx.fillStyle = '#00ff88';
    } else {
      ctx.fillStyle = '#006644';
    }

    const pad = TILE_SIZE * 0.15;
    ctx.fillRect(x + pad, y + pad, TILE_SIZE - pad * 2, TILE_SIZE - pad * 2);

    if (this.player.hasAllShards()) {
      ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    const x = this.player.renderPosition.x;
    const y = this.player.renderPosition.y;
    const s = TILE_SIZE * 0.45;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - s / 2, y - s / 4, s, s);

    ctx.fillStyle = '#ff6600';
    ctx.fillRect(x - s * 0.15, y - s / 2 - s * 0.3, s * 0.3, s * 0.35);

    ctx.fillStyle = '#ffdd66';
    ctx.beginPath();
    ctx.arc(x, y - s / 2 - s * 0.15, s * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 221, 102, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y - s / 4, s * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderMonsters(ctx: CanvasRenderingContext2D): void {
    for (const monster of this.entityManager.monsters) {
      if (monster.visibility <= 0.01) continue;

      const x = monster.renderPosition.x;
      const y = monster.renderPosition.y;
      const s = TILE_SIZE * 0.7;

      ctx.globalAlpha = monster.visibility;

      ctx.fillStyle = '#330033';
      ctx.beginPath();
      ctx.arc(x, y, s / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff0000';
      const eyeOffset = s * 0.18;
      const eyeSize = s * 0.12;
      ctx.fillRect(x - eyeOffset - eyeSize / 2, y - eyeSize / 2, eyeSize, eyeSize);
      ctx.fillRect(x + eyeOffset - eyeSize / 2, y - eyeSize / 2, eyeSize, eyeSize);

      if (monster.state === 'chase') {
        ctx.fillStyle = '#660000';
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const tx = x + Math.cos(angle) * s * 0.6;
          const ty = y + Math.sin(angle) * s * 0.6;
          ctx.beginPath();
          ctx.arc(tx, ty, s * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    }
  }

  private renderPulseEffects(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pulseEffects) {
      ctx.strokeStyle = `rgba(150, 150, 150, ${p.alpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private applyLighting(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const px = this.player.renderPosition.x;
    const py = this.player.renderPosition.y;
    const radius = this.player.getLightPixelRadius();
    const noiseAmount = 1 + Math.sin(this.noiseAnimTime / 80) * 0.08 + Math.sin(this.noiseAnimTime / 50) * 0.04;
    const flickerRadius = radius * noiseAmount;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';

    const gradient = ctx.createRadialGradient(px, py, 0, px, py, flickerRadius);
    gradient.addColorStop(0, 'rgba(255, 221, 102, 1)');
    gradient.addColorStop(0.6, 'rgba(255, 200, 80, 0.9)');
    gradient.addColorStop(0.85, 'rgba(255, 170, 50, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 150, 30, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    const config = LEVEL_CONFIGS[this.currentLevel];
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#ffdd66';
    ctx.beginPath();
    ctx.arc(20, 22, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.player.lightRadius}`, 36, 16);

    ctx.fillStyle = '#ffdd00';
    ctx.save();
    ctx.translate(70, 22);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${this.player.shardsCollected}/${config.shardCount}`, 86, 16);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`第${config.level}关`, 160, 16);

    ctx.textAlign = 'right';
    const minutes = Math.floor(this.elapsedTime / 60000);
    const seconds = Math.floor((this.elapsedTime % 60000) / 1000);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    ctx.fillText(timeStr, this.canvas.width - 16, 16);
    ctx.fillText(`${this.player.stepCount}步`, this.canvas.width - 16, 36);
  }

  private renderOverlay(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.gameState === 'dead') {
      const flashAlpha = this.deathFlashTimer < 300 ? 1 - this.deathFlashTimer / 300 : 0;
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(0, 0, w, h);

      if (this.deathFlashTimer >= 300) {
        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold 48px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('烛 火 熄 灭', w / 2, h / 2 - 20);
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '18px "Courier New", monospace';
        ctx.fillText('即将重新开始...', w / 2, h / 2 + 30);
      }
    } else if (this.gameState === 'victory') {
      const expandProgress = Math.min(this.victoryExpandTimer / 2000, 1);
      const cx = this.player.renderPosition.x;
      const cy = this.player.renderPosition.y;
      const maxRadius = Math.sqrt(w * w + h * h);
      const currentRadius = expandProgress * maxRadius;

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, currentRadius);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.9, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      if (expandProgress >= 0.4) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(expandProgress - 0.4) / 0.6})`;
        ctx.fillRect(0, 0, w, h);

        if (expandProgress >= 0.6) {
          ctx.fillStyle = `rgba(0, 0, 0, ${(expandProgress - 0.6) / 0.4})`;
          ctx.font = 'bold 44px "Courier New", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('重 见 光 明', w / 2, h / 2 - 40);

          ctx.font = '20px "Courier New", monospace';
          const minutes = Math.floor(this.elapsedTime / 60000);
          const seconds = Math.floor((this.elapsedTime % 60000) / 1000);
          ctx.fillText(
            `总用时: ${minutes}分${seconds}秒  |  总步数: ${this.player.stepCount}`,
            w / 2,
            h / 2 + 10
          );
          ctx.fillText('恭喜通关暗影蜡烛！', w / 2, h / 2 + 50);
        }
      }
    } else if (this.gameState === 'transition') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, w, h);

      const nextLevel = this.currentLevel + 1;
      const config = LEVEL_CONFIGS[nextLevel];

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`第 ${this.currentLevel + 1} 关 完成！`, w / 2, h / 2 - 100);

      ctx.font = '24px "Courier New", monospace';
      ctx.fillStyle = '#ffdd66';
      ctx.fillText(`即将进入第 ${config.level} 关`, w / 2, h / 2 - 50);

      this.renderMiniMap(ctx, w / 2, h / 2 + 30, config);

      ctx.fillStyle = '#888888';
      ctx.font = '16px "Courier New", monospace';
      const blink = Math.floor(this.transitionTimer / 400) % 2 === 0;
      if (blink) {
        ctx.fillText('按 空格键 继续', w / 2, h / 2 + 130);
      }
    }
  }

  private renderMiniMap(ctx: CanvasRenderingContext2D, cx: number, cy: number, config: LevelConfig): void {
    const previewSize = config.mapSize;
    const cellSize = Math.floor(100 / previewSize);
    const totalSize = cellSize * previewSize;
    const startX = cx - totalSize / 2;
    const startY = cy - totalSize / 2;

    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX - 4, startY - 4, totalSize + 8, totalSize + 8);

    const seed = this.currentLevel * 1000 + 500;
    const miniGen = new MapGenerator(seed);
    const miniMap = miniGen.generate(config);

    for (let y = 0; y < previewSize; y++) {
      for (let x = 0; x < previewSize; x++) {
        const tile = miniMap.tiles[y][x];
        if (tile === 'wall') {
          ctx.fillStyle = '#2a2a2a';
        } else if (tile === 'exit') {
          ctx.fillStyle = '#00ff88';
        } else if (tile === 'shard') {
          ctx.fillStyle = '#ffdd00';
        } else if (tile === 'start') {
          ctx.fillStyle = '#ffdd66';
        } else {
          ctx.fillStyle = '#0a0a0a';
        }
        ctx.fillRect(startX + x * cellSize, startY + y * cellSize, cellSize, cellSize);
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `地图 ${config.mapSize}x${config.mapSize} | 怪物 ${config.monsterCount} | 碎片 ${config.shardCount}`,
      cx,
      cy + 80
    );
  }
}
