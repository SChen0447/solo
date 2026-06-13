import { UnitManager, UnitData } from './UnitManager';
import { PaintManager } from './PaintManager';
import { ParticleManager } from './ParticleManager';

type InteractionMode = 'idle' | 'painting' | 'selecting' | 'boxSelecting' | 'commanding';

export class GameManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private unitManager: UnitManager;
  private paintManager: PaintManager;
  private particleManager: ParticleManager;

  private mode: InteractionMode = 'idle';
  private mouseX = 0;
  private mouseY = 0;
  private mouseDown = false;
  private mouseDownX = 0;
  private mouseDownY = 0;
  private boxSelectStart: { x: number; y: number } | null = null;

  private selectedUnits: UnitData[] = [];
  private gameStartTime: number = 0;
  private lastEnemySpawn: number = 0;
  private nextSpawnInterval: number = 3;
  private bgCanvas: HTMLCanvasElement | null = null;

  private stampHover: boolean = false;
  private stampY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.particleManager = new ParticleManager();
    this.unitManager = new UnitManager(this.particleManager);
    this.paintManager = new PaintManager(this.unitManager);
    this.gameStartTime = performance.now() / 1000;
    this.lastEnemySpawn = this.gameStartTime;
    this.stampY = 0;

    this.generateBackground();
    this.bindEvents();
  }

  private generateBackground(): void {
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = this.canvas.width;
    this.bgCanvas.height = this.canvas.height;
    const bgCtx = this.bgCanvas.getContext('2d')!;

    bgCtx.fillStyle = '#F5F0E8';
    bgCtx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);

    const imageData = bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < 0.3) {
        const noise = (Math.random() - 0.5) * 30;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
    }

    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < 0.08) {
        const fiberLen = Math.random() < 0.5 ? 1 : 2;
        const px: number = (i / 4) % this.bgCanvas.width;
        const py: number = Math.floor((i / 4) / this.bgCanvas.width);
        for (let f = 0; f < fiberLen; f++) {
          const idx = ((py) * this.bgCanvas.width + (px + f)) * 4;
          if (idx < data.length) {
            data[idx] = Math.max(0, data[idx] - 15);
            data[idx + 1] = Math.max(0, data[idx + 1] - 15);
            data[idx + 2] = Math.max(0, data[idx + 2] - 10);
          }
        }
      }
    }
    bgCtx.putImageData(imageData, 0, 0);

    const w = this.bgCanvas.width;
    const h = this.bgCanvas.height;
    const edgeSize = 15;
    bgCtx.save();
    for (let i = 0; i < 200; i++) {
      const side = Math.floor(Math.random() * 4);
      let ex, ey;
      if (side === 0) {
        ex = Math.random() * w;
        ey = Math.random() * edgeSize;
      } else if (side === 1) {
        ex = Math.random() * w;
        ey = h - Math.random() * edgeSize;
      } else if (side === 2) {
        ex = Math.random() * edgeSize;
        ey = Math.random() * h;
      } else {
        ex = w - Math.random() * edgeSize;
        ey = Math.random() * h;
      }
      const r = 1 + Math.random() * 3;
      bgCtx.beginPath();
      bgCtx.arc(ex, ey, r, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(210, 200, 185, ${0.3 + Math.random() * 0.4})`;
      bgCtx.fill();
    }
    bgCtx.restore();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
    window.addEventListener('resize', () => this.onResize());
  }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  private isOnStamp(x: number, y: number): boolean {
    const sw = 70;
    const sh = 36;
    const sx = this.canvas.width - sw - 15;
    const sy = this.canvas.height - sh - 15 + this.stampY;
    return x >= sx && x <= sx + sw && y >= sy && y <= sy + sh;
  }

  private isPlayerSide(x: number): boolean {
    return x < this.canvas.width / 2;
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;
    this.mouseDown = true;
    this.mouseDownX = pos.x;
    this.mouseDownY = pos.y;

    if (this.isOnStamp(pos.x, pos.y)) {
      this.stampHover = true;
      return;
    }
    this.stampHover = false;

    if (this.selectedUnits.length > 0 && !this.isPlayerSide(pos.x)) {
      for (const u of this.selectedUnits) {
        if (u.state !== 'dying') {
          u.state = 'moving';
          u.targetX = pos.x;
          u.targetY = pos.y;
          u.targetUnit = null;
        }
      }
      this.deselectAll();
      this.mode = 'idle';
      return;
    }

    const clickedUnit = this.unitManager.getUnitAt(pos.x, pos.y, 'player');
    if (clickedUnit) {
      this.deselectAll();
      clickedUnit.selected = true;
      this.selectedUnits = [clickedUnit];
      this.mode = 'selecting';
      return;
    }

    if (this.isPlayerSide(pos.x)) {
      this.mode = 'painting';
      this.paintManager.startStroke(pos.x, pos.y);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (this.isOnStamp(pos.x, pos.y)) {
      this.stampHover = true;
    } else if (this.mouseDown) {
      // keep current stampHover state during drag
    } else {
      this.stampHover = false;
    }

    if (this.mode === 'painting') {
      if (this.isPlayerSide(pos.x)) {
        this.paintManager.continueStroke(pos.x, pos.y);
      } else {
        this.paintManager.continueStroke(
          Math.min(pos.x, this.canvas.width / 2 - 1),
          pos.y
        );
      }
    } else if (this.mouseDown && this.mode !== 'selecting' && this.mode !== 'commanding') {
      const dx = pos.x - this.mouseDownX;
      const dy = pos.y - this.mouseDownY;
      if (Math.sqrt(dx * dx + dy * dy) > 10 && this.isPlayerSide(this.mouseDownX)) {
        if (this.mode !== 'boxSelecting') {
          this.mode = 'boxSelecting';
          this.boxSelectStart = { x: this.mouseDownX, y: this.mouseDownY };
          this.deselectAll();
        }
      }
    }
  }

  private onMouseUp(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;
    this.mouseDown = false;

    if (this.mode === 'painting') {
      this.paintManager.endStroke();
      this.mode = 'idle';
    } else if (this.mode === 'boxSelecting' && this.boxSelectStart) {
      const selected = this.unitManager.getUnitsInRect(
        this.boxSelectStart.x,
        this.boxSelectStart.y,
        pos.x,
        pos.y,
        'player'
      );
      this.deselectAll();
      for (const u of selected) {
        u.selected = true;
      }
      this.selectedUnits = selected;
      this.boxSelectStart = null;
      this.mode = 'idle';
    } else if (this.mode === 'selecting') {
      this.mode = 'idle';
    }

    this.stampHover = this.isOnStamp(pos.x, pos.y);
  }

  private deselectAll(): void {
    for (const u of this.selectedUnits) {
      u.selected = false;
    }
    this.selectedUnits = [];
  }

  private onResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.generateBackground();
  }

  private spawnEnemy(now: number): void {
    const elapsed = now - this.gameStartTime;
    const minutesElapsed = elapsed / 60;
    const hpMultiplier = 1 + 0.1 * minutesElapsed;
    const atkMultiplier = 1 + 0.05 * minutesElapsed;
    const baseHp = 60 + Math.random() * 40;
    const baseAtk = 20;
    const hp = baseHp * hpMultiplier;
    const atk = baseAtk * atkMultiplier;

    const halfW = this.canvas.width / 2;
    const h = this.canvas.height;
    const margin = 40;
    const x = halfW + margin + Math.random() * (halfW - margin * 2);
    const y = margin + Math.random() * (h - margin * 2);

    this.unitManager.spawn(x, y, 'enemy', hp, atk);
  }

  update(dt: number): void {
    const now = performance.now() / 1000;

    if (now - this.lastEnemySpawn >= this.nextSpawnInterval) {
      this.spawnEnemy(now);
      this.lastEnemySpawn = now;
      this.nextSpawnInterval = 2 + Math.random() * 2;
    }

    this.unitManager.update(dt, now);
    this.particleManager.update(dt);

    if (this.stampHover && this.stampY > -3) {
      this.stampY += (-3 - this.stampY) * 0.15;
    } else if (!this.stampHover && this.stampY < 0) {
      this.stampY += (0 - this.stampY) * 0.15;
    }

    this.selectedUnits = this.selectedUnits.filter(u => u.state !== 'dying' && u.selected);
  }

  draw(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const now = performance.now() / 1000;

    ctx.clearRect(0, 0, w, h);

    if (this.bgCanvas) {
      ctx.drawImage(this.bgCanvas, 0, 0);
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.strokeStyle = 'rgba(44, 44, 44, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (this.mode === 'boxSelecting' && this.boxSelectStart) {
      const x1 = this.boxSelectStart.x;
      const y1 = this.boxSelectStart.y;
      const x2 = this.mouseX;
      const y2 = this.mouseY;
      ctx.save();
      ctx.fillStyle = 'rgba(44, 44, 44, 0.08)';
      ctx.fillRect(
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.abs(x2 - x1),
        Math.abs(y2 - y1)
      );
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = 'rgba(44, 44, 44, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.abs(x2 - x1),
        Math.abs(y2 - y1)
      );
      ctx.setLineDash([]);
      ctx.restore();
    }

    this.paintManager.drawCurrentStroke(ctx);

    this.unitManager.drawTrails(ctx);
    this.unitManager.drawUnits(ctx, now);
    this.particleManager.draw(ctx);

    this.drawHUD(ctx, w, h, now);
    this.drawStamp(ctx, w, h);
  }

  private drawHUD(ctx: CanvasRenderingContext2D, w: number, h: number, now: number): void {
    const playerCount = this.unitManager.getPlayerCount();
    const enemyCount = this.unitManager.getEnemyCount();
    const elapsed = now - this.gameStartTime;
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    ctx.save();
    ctx.font = '24px "SimSun", "STSong", serif';
    ctx.fillStyle = 'rgba(44, 44, 44, 0.85)';
    ctx.textBaseline = 'top';

    ctx.fillText(`${playerCount}`, 20, 20);

    ctx.textAlign = 'right';
    ctx.fillText(`${enemyCount}`, w - 20, 20);

    ctx.font = '16px "SimSun", "STSong", serif';
    ctx.fillStyle = 'rgba(44, 44, 44, 0.6)';
    ctx.fillText(timeStr, w - 20, 48);

    ctx.restore();
  }

  private drawStamp(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const sw = 70;
    const sh = 36;
    const sx = w - sw - 15;
    const sy = h - sh - 15 + this.stampY;
    const darkFactor = this.stampHover ? 1 : 0.75;

    ctx.save();
    ctx.fillStyle = `rgba(${Math.floor(44 * darkFactor)}, ${Math.floor(44 * darkFactor)}, ${Math.floor(44 * darkFactor)}, 0.9)`;

    const r = 3;
    ctx.beginPath();
    ctx.moveTo(sx + r, sy);
    ctx.lineTo(sx + sw - r, sy);
    ctx.quadraticCurveTo(sx + sw, sy, sx + sw, sy + r);
    ctx.lineTo(sx + sw, sy + sh - r);
    ctx.quadraticCurveTo(sx + sw, sy + sh, sx + sw - r, sy + sh);
    ctx.lineTo(sx + r, sy + sh);
    ctx.quadraticCurveTo(sx, sy + sh, sx, sy + sh - r);
    ctx.lineTo(sx, sy + r);
    ctx.quadraticCurveTo(sx, sy, sx + r, sy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(220, 210, 190, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.font = '9px "SimSun", "STSong", serif';
    ctx.fillStyle = 'rgba(220, 210, 190, 0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('墨韵·演武 1.0', sx + sw / 2, sy + sh / 2);
    ctx.restore();
  }

  run(): void {
    let lastTime = performance.now();

    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      this.update(dt);
      this.draw();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}
