import { TimeManager } from './TimeManager';
import {
  WorldManager,
  GRID_COLS, GRID_ROWS, TILE_SIZE,
  PLAYER_SIZE, BOX_SIZE, SHARD_SIZE, BUTTON_SIZE, DOOR_SIZE,
  WORLD_WIDTH, WORLD_HEIGHT, COLORS
} from './WorldManager';

interface Star {
  x: number;
  y: number;
  size: number;
  visible: boolean;
  life: number;
}

const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: WorldManager;
  private timeManager: TimeManager;
  private keys: Set<string> = new Set();
  private stars: Star[] = [];
  private camera = { x: 0, y: 0 };
  private lastTime = 0;
  private spacePressed = false;
  private titlePhase = true;
  private titleTimer = 0;
  private timelineFill!: HTMLDivElement;
  private timelineHandle!: HTMLDivElement;
  private dpr = 1;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.world = new WorldManager();
    this.timeManager = new TimeManager();

    this.initStars();
    this.bindEvents();
    this.resizeCanvas();
  }

  private initStars(): void {
    const starCount = 80;
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 1 + Math.floor(Math.random() * 2),
        visible: Math.random() > 0.5,
        life: Math.random()
      });
    }
  }

  private bindEvents(): void {
    this.timelineFill = document.getElementById('timeline-fill') as HTMLDivElement;
    this.timelineHandle = document.getElementById('timeline-handle') as HTMLDivElement;

    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      this.keys.add(key);
      if (key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!this.spacePressed) {
          this.spacePressed = true;
          this.toggleRewind();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.keys.delete(key);
      if (key === ' ' || e.code === 'Space') {
        this.spacePressed = false;
      }
    });

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    this.dpr = window.devicePixelRatio || 1;
    const w = Math.max(MIN_WIDTH, window.innerWidth);
    const h = Math.max(MIN_HEIGHT, window.innerHeight);
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  private toggleRewind(): void {
    if (this.titlePhase) return;
    const currentMode = this.timeManager.getMode();
    if (currentMode === 'rewind') {
      const snap = this.timeManager.stopRewind();
      if (snap) this.world.restoreFromSnapshot(snap);
    } else if (currentMode === 'normal') {
      this.timeManager.setMode('rewind');
    }
  }

  private updateCamera(): void {
    const viewW = this.canvas.width / this.dpr;
    const viewH = this.canvas.height / this.dpr;
    const targetX = this.world.player.x + PLAYER_SIZE / 2 - viewW / 2;
    const targetY = this.world.player.y + PLAYER_SIZE / 2 - viewH / 2;
    this.camera.x = Math.max(0, Math.min(WORLD_WIDTH - viewW, targetX));
    this.camera.y = Math.max(0, Math.min(WORLD_HEIGHT - viewH, targetY));
  }

  private update(dt: number): void {
    if (this.titlePhase) {
      this.titleTimer += dt;
      if (this.titleTimer >= 2) {
        this.titlePhase = false;
        this.timeManager.pushFrame(this.world.snapshot());
      }
      return;
    }

    const mode = this.timeManager.getMode();

    if (mode === 'normal') {
      const speed = 2;
      let dx = 0, dy = 0;
      if (this.keys.has('w') || this.keys.has('arrowup')) dy -= speed;
      if (this.keys.has('s') || this.keys.has('arrowdown')) dy += speed;
      if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= speed;
      if (this.keys.has('d') || this.keys.has('arrowright')) dx += speed;

      if (dx !== 0 || dy !== 0) {
        this.world.movePlayer(dx, dy);
      }

      this.world.checkShardCollection();
      this.world.updatePortal(dt);
      this.updateStars(dt);
      this.timeManager.pushFrame(this.world.snapshot());

    } else if (mode === 'rewind') {
      const snap = this.timeManager.rewindStep();
      if (snap) {
        this.world.restoreFromSnapshot(snap);
      }
      this.world.updatePortal(dt);
      this.updateStars(dt);
    }

    this.updateCamera();
    this.updateTimelineUI();
  }

  private updateStars(dt: number): void {
    for (const star of this.stars) {
      star.life += dt * (0.8 + Math.random() * 1.2);
      if (star.life >= 1) {
        star.life = 0;
        star.visible = !star.visible;
      }
    }
  }

  private updateTimelineUI(): void {
    const usage = this.timeManager.getCapacityUsage();
    const progress = this.timeManager.getProgress();
    this.timelineFill.style.width = (usage * 100) + '%';
    this.timelineHandle.style.left = (progress * 150) + 'px';
  }

  private render(): void {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    this.renderBackground(w, h);
    this.renderStars(w, h);

    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);
    this.renderMap();
    this.renderInteractiveObjects();
    this.renderEntities();
    this.ctx.restore();

    this.renderTimeRing(w, h);
    this.renderHUD(w, h);

    if (this.titlePhase) {
      this.renderTitle(w, h);
    }
  }

  private renderBackground(w: number, h: number): void {
    const grad = this.ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, COLORS.bg1);
    grad.addColorStop(1, COLORS.bg2);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);
  }

  private renderStars(w: number, h: number): void {
    const worldViewL = this.camera.x > 0;
    const worldViewR = this.camera.x + w < WORLD_WIDTH;
    const worldViewT = this.camera.y > 0;
    const worldViewB = this.camera.y + h < WORLD_HEIGHT;

    if (!worldViewL || !worldViewR || !worldViewT || !worldViewB) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      for (const star of this.stars) {
        if (!star.visible) continue;
        const sx = star.x * w;
        const sy = star.y * h;
        const edgeZone = sx < 40 || sx > w - 40 || sy < 40 || sy > h - 40;
        if (!edgeZone) continue;
        this.ctx.fillRect(Math.floor(sx), Math.floor(sy), star.size, star.size);
      }
    }
  }

  private renderMap(): void {
    this.ctx.fillStyle = COLORS.mapBg;
    this.ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.ctx.strokeStyle = COLORS.gridLine;
    this.ctx.lineWidth = 1;
    for (let c = 0; c <= GRID_COLS; c++) {
      const x = c * TILE_SIZE;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, WORLD_HEIGHT);
      this.ctx.stroke();
    }
    for (let r = 0; r <= GRID_ROWS; r++) {
      const y = r * TILE_SIZE;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(WORLD_WIDTH, y);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = COLORS.obstacle;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if ((this.world as any).obstacles[r][c]) {
          this.ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  private renderInteractiveObjects(): void {
    const blink = (Math.sin(performance.now() * 0.001 * Math.PI * 2 * 0.5) + 1) / 2;

    for (const shard of this.world.shards) {
      if (shard.collected) continue;
      const cx = shard.x + SHARD_SIZE / 2;
      const cy = shard.y + SHARD_SIZE / 2;
      const alpha = 0.5 + blink * 0.5;
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(Math.PI / 4);
      this.ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      this.ctx.fillRect(-SHARD_SIZE / 2, -SHARD_SIZE / 2, SHARD_SIZE, SHARD_SIZE);
      this.ctx.strokeStyle = '#FFF8DC';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(-SHARD_SIZE / 2, -SHARD_SIZE / 2, SHARD_SIZE, SHARD_SIZE);
      this.ctx.restore();
    }

    this.ctx.fillStyle = this.world.button.pressed ? '#CC3333' : COLORS.button;
    this.ctx.fillRect(this.world.button.x, this.world.button.y, BUTTON_SIZE, BUTTON_SIZE);
    this.ctx.strokeStyle = '#6A6A8A';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(this.world.button.x, this.world.button.y, BUTTON_SIZE, BUTTON_SIZE);

    if (this.world.door.open) {
      this.ctx.fillStyle = 'rgba(139, 0, 0, 0.3)';
    } else {
      this.ctx.fillStyle = COLORS.door;
    }
    this.ctx.fillRect(this.world.door.x, this.world.door.y, DOOR_SIZE, DOOR_SIZE);
    this.ctx.strokeStyle = '#6A6A8A';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(this.world.door.x, this.world.door.y, DOOR_SIZE, DOOR_SIZE);

    this.ctx.fillStyle = COLORS.box;
    this.ctx.fillRect(this.world.box.x, this.world.box.y, BOX_SIZE, BOX_SIZE);
    this.ctx.strokeStyle = '#6A4028';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(this.world.box.x, this.world.box.y, BOX_SIZE, BOX_SIZE);
  }

  private renderEntities(): void {
    this.ctx.fillStyle = COLORS.player;
    this.ctx.fillRect(
      Math.floor(this.world.player.x),
      Math.floor(this.world.player.y),
      PLAYER_SIZE,
      PLAYER_SIZE
    );

    if (this.world.portal.active) {
      this.ctx.save();
      this.ctx.translate(this.world.portal.x, this.world.portal.y);

      const t = performance.now() / 1000;
      for (let i = 0; i < 3; i++) {
        const r = this.world.portal.scale * (0.5 + i * 0.25);
        const hue = (t * 60 + i * 120) % 360;
        this.ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${0.8 - i * 0.2})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      for (const p of this.world.portal.particles) {
        const alpha = 1 - p.life / p.maxLife;
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = alpha;
        this.ctx.fillRect(
          Math.floor(p.x - this.world.portal.x - 1),
          Math.floor(p.y - this.world.portal.y - 1),
          2, 2
        );
      }
      this.ctx.globalAlpha = 1;
      this.ctx.restore();
    }
  }

  private renderTimeRing(w: number, h: number): void {
    const mode = this.timeManager.getMode();
    if (mode !== 'rewind') return;

    const speed = this.timeManager.getRewindSpeed();
    const alpha = Math.min(0.8, 0.2 + speed * 0.06);
    const ringWidth = 20;

    const gradient = this.ctx.createLinearGradient(0, 0, w, h);
    const colors = [
      `rgba(255, 0, 0, ${alpha})`,
      `rgba(255, 165, 0, ${alpha})`,
      `rgba(255, 255, 0, ${alpha})`,
      `rgba(0, 255, 0, ${alpha})`,
      `rgba(0, 0, 255, ${alpha})`,
      `rgba(75, 0, 130, ${alpha})`,
      `rgba(238, 130, 238, ${alpha})`
    ];
    colors.forEach((c, i) => gradient.addColorStop(i / (colors.length - 1), c));

    this.ctx.save();
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = ringWidth;
    this.ctx.strokeRect(ringWidth / 2, ringWidth / 2, w - ringWidth, h - ringWidth);
    this.ctx.restore();
  }

  private renderHUD(w: number, _h: number): void {
    const mode = this.timeManager.getMode();
    let modeText = '时间模式：正常';
    if (mode === 'rewind') modeText = '时间模式：倒流';
    if (mode === 'forward') modeText = '时间模式：快进';

    this.ctx.font = '12px monospace';
    this.ctx.textBaseline = 'top';

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(26, 26, 46, 0.85)';
    this.ctx.fillRect(8, 8, 180, 52);
    this.ctx.strokeStyle = '#6A6A8A';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(8, 8, 180, 52);

    this.ctx.fillStyle = '#E0E0E0';
    this.ctx.fillText(modeText, 16, 16);
    this.ctx.fillText(`碎片：${this.world.collectedCount}/${this.world.totalShards}`, 16, 36);
    this.ctx.restore();

    this.ctx.save();
    const boxW = 150;
    const boxH = 30;
    const bx = w - boxW - 16;
    const by = _h - boxH - 80;
    this.ctx.fillStyle = 'rgba(26, 26, 46, 0.85)';
    this.ctx.fillRect(bx, by, boxW, boxH);
    this.ctx.strokeStyle = '#6A6A8A';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(bx, by, boxW, boxH);
    this.ctx.fillStyle = '#8A8AAA';
    this.ctx.fillText('帧: ' + this.timeManager.getCurrentIndex() + '/' + this.timeManager.getHistoryLength(), bx + 8, by + 8);
    this.ctx.restore();
  }

  private renderTitle(w: number, h: number): void {
    const alpha = Math.min(1, this.titleTimer / 1.5);
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.font = 'bold 64px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const grad = this.ctx.createLinearGradient(w / 2 - 200, h / 2, w / 2 + 200, h / 2);
    grad.addColorStop(0, '#FF6B6B');
    grad.addColorStop(0.5, '#4ECDC4');
    grad.addColorStop(1, '#9B59B6');
    this.ctx.fillStyle = grad;
    this.ctx.fillText('时间之环', w / 2, h / 2);

    this.ctx.font = '16px monospace';
    this.ctx.fillStyle = '#8A8AAA';
    this.ctx.fillText('Time Loop Puzzle', w / 2, h / 2 + 60);
    this.ctx.restore();
  }

  public start(): void {
    const loop = (timestamp: number) => {
      if (!this.lastTime) this.lastTime = timestamp;
      const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
      this.lastTime = timestamp;

      this.update(dt);
      this.render();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
