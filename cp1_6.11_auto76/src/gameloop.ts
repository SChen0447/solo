import { Player, Debris, Meteor, Crystal, Star } from './entities';

export type GameState = 'playing' | 'gameover';

export class GameLoop {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Player;
  debris: Debris[];
  meteors: Meteor[];
  crystals: Crystal[];
  stars: Star[];
  score: number;
  collectedCount: number;
  highScore: number;
  state: GameState;
  lastSpawnTime: number;
  lastCrystalSpawnTime: number;
  debrisCollectedForMeteor: number;
  crystalsCollectedForClear: number;
  keys: Set<string>;
  scale: number;
  orbitRotation: number;
  gameOverAnimationStart: number;
  totalObjects: number;
  maxObjects: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.scale = 1;
    this.totalObjects = 0;
    this.maxObjects = 150;
    this.keys = new Set();
    this.stars = [];
    this.debris = [];
    this.meteors = [];
    this.crystals = [];
    this.score = 0;
    this.collectedCount = 0;
    this.debrisCollectedForMeteor = 0;
    this.crystalsCollectedForClear = 0;
    this.state = 'playing';
    this.lastSpawnTime = 0;
    this.lastCrystalSpawnTime = 0;
    this.orbitRotation = 0;
    this.gameOverAnimationStart = 0;

    const saved = localStorage.getItem('spaceDebrisHighScore');
    this.highScore = saved ? parseInt(saved, 10) : 0;

    this.resize();
    this.initStars();
    this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, this.scale);
    this.spawnInitialObjects();
  }

  resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (width < 768) {
      this.scale = 0.7;
    } else if (width >= 1200) {
      this.scale = 1;
    } else {
      this.scale = 0.85;
    }

    this.initStars();
  }

  initStars(): void {
    this.stars = [];
    const count = 200;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.clientWidth,
        y: Math.random() * this.canvas.clientHeight,
        size: Math.random() * 1.5 + 0.5,
        baseAlpha: 0.2 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        frequency: 1 / (1 + Math.random() * 2)
      });
    }
  }

  spawnInitialObjects(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const initialDebris = 9;
    const initialMeteors = 3;

    for (let i = 0; i < initialDebris; i++) {
      this.debris.push(new Debris(w, h, this.scale));
    }
    for (let i = 0; i < initialMeteors; i++) {
      this.meteors.push(new Meteor(w, h, this.scale));
    }
    this.totalObjects = initialDebris + initialMeteors;
  }

  spawnObjects(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const now = performance.now();

    if (now - this.lastSpawnTime > 2000) {
      this.lastSpawnTime = now;

      if (this.totalObjects < this.maxObjects) {
        const debrisCount = 3;
        const meteorCount = 1;

        for (let i = 0; i < debrisCount; i++) {
          if (this.totalObjects < this.maxObjects) {
            this.debris.push(new Debris(w, h, this.scale));
            this.totalObjects++;
          }
        }
        for (let i = 0; i < meteorCount; i++) {
          if (this.totalObjects < this.maxObjects) {
            this.meteors.push(new Meteor(w, h, this.scale));
            this.totalObjects++;
          }
        }
      }
    }

    if (now - this.lastCrystalSpawnTime > 12000 && this.crystals.length < 2) {
      this.lastCrystalSpawnTime = now;
      this.crystals.push(new Crystal(w, h, this.scale));
    }
  }

  removeOldObjects(): void {
    while (this.totalObjects > this.maxObjects) {
      let oldestIndex = -1;
      let oldestTime = Infinity;
      let isDebris = true;

      for (let i = 0; i < this.debris.length; i++) {
        if (this.debris[i].lastCollisionTime < oldestTime) {
          oldestTime = this.debris[i].lastCollisionTime;
          oldestIndex = i;
          isDebris = true;
        }
      }
      for (let i = 0; i < this.meteors.length; i++) {
        if (this.meteors[i].lastCollisionTime < oldestTime) {
          oldestTime = this.meteors[i].lastCollisionTime;
          oldestIndex = i;
          isDebris = false;
        }
      }

      if (oldestIndex >= 0) {
        if (isDebris) {
          this.debris.splice(oldestIndex, 1);
        } else {
          this.meteors.splice(oldestIndex, 1);
        }
        this.totalObjects--;
      }
    }
  }

  update(dt: number): void {
    if (this.state !== 'playing') return;

    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    this.orbitRotation += dt * 0.05;

    this.player.update(dt, w, h, this.keys, this.scale);

    for (const d of this.debris) d.update(dt, w, h);
    for (const m of this.meteors) m.update(dt, w, h);
    for (const c of this.crystals) c.update(dt, w, h);

    this.crystals = this.crystals.filter(c => !c.isExpired());

    this.spawnObjects();
    this.removeOldObjects();
    this.checkCollisions();

    for (const s of this.stars) {
      s.phase += dt * s.frequency;
    }
  }

  checkCollisions(): void {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      if (this.player.collidesWith(this.debris[i])) {
        this.score += 10;
        this.collectedCount++;
        this.debrisCollectedForMeteor++;
        this.debris.splice(i, 1);
        this.totalObjects--;

        if (this.debrisCollectedForMeteor >= 10) {
          this.debrisCollectedForMeteor = 0;
          if (this.totalObjects < this.maxObjects) {
            const w = this.canvas.clientWidth;
            const h = this.canvas.clientHeight;
            this.meteors.push(new Meteor(w, h, this.scale));
            this.totalObjects++;
          }
        }
      }
    }

    const now = performance.now();
    const invulnerablePeriod = 1500;
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      if (this.player.collidesWith(this.meteors[i])) {
        if (now - this.player.lastCollisionTime > invulnerablePeriod) {
          this.player.damage();
          this.meteors.splice(i, 1);
          this.totalObjects--;

          if (this.player.health <= 0) {
            this.state = 'gameover';
            this.gameOverAnimationStart = now;
            if (this.score > this.highScore) {
              this.highScore = this.score;
              localStorage.setItem('spaceDebrisHighScore', this.highScore.toString());
            }
          }
        }
      }
    }

    for (let i = this.crystals.length - 1; i >= 0; i--) {
      if (this.player.collidesWith(this.crystals[i])) {
        this.player.heal(2);
        this.crystalsCollectedForClear++;
        this.crystals.splice(i, 1);

        const sorted = this.debris
          .map((d, idx) => {
            const dx = d.x - this.player.x;
            const dy = d.y - this.player.y;
            return { idx, dist: Math.sqrt(dx * dx + dy * dy) };
          })
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 5);

        const indicesToRemove = sorted.map(s => s.idx).sort((a, b) => b - a);
        for (const idx of indicesToRemove) {
          if (idx < this.debris.length) {
            this.debris.splice(idx, 1);
            this.totalObjects--;
          }
        }

        if (this.crystalsCollectedForClear >= 3) {
          this.crystalsCollectedForClear = 0;
          const removeCount = Math.ceil(this.meteors.length / 2);
          this.meteors.splice(0, removeCount);
          this.totalObjects -= removeCount;
        }
      }
    }
  }

  draw(): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    this.drawStars();
    this.drawOrbitRing();

    for (const d of this.debris) d.draw(ctx);
    for (const c of this.crystals) c.draw(ctx);
    for (const m of this.meteors) m.draw(ctx);

    this.player.draw(ctx);

    this.drawHUD();

    if (this.state === 'gameover') {
      this.drawGameOver();
    }
  }

  drawStars(): void {
    const ctx = this.ctx;
    for (const s of this.stars) {
      const blink = (Math.sin(s.phase) + 1) / 2;
      const alpha = s.baseAlpha * (0.5 + blink * 0.5);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }

  drawOrbitRing(): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const cx = w / 2;
    const cy = h / 2;
    const rx = Math.min(w, h) * 0.42;
    const ry = rx * 0.6;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.orbitRotation);

    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = Math.cos(a) * rx;
      const py = Math.sin(a) * ry;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100, 180, 255, 0.2)';
      ctx.fill();
    }

    ctx.restore();
  }

  drawHUD(): void {
    const ctx = this.ctx;
    const padding = 20;

    ctx.font = '22px "Courier New", monospace';
    ctx.fillStyle = '#b8f0ff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(100, 200, 255, 0.5)';
    ctx.shadowBlur = 8;

    ctx.fillText(`得分: ${this.score}`, padding, padding);

    for (let i = 0; i < this.player.maxHealth; i++) {
      const x = padding + i * (12 + 4);
      const y = padding + 40;
      ctx.beginPath();
      ctx.arc(x + 6, y + 6, 6, 0, Math.PI * 2);

      if (i < this.player.health) {
        ctx.fillStyle = '#4fc3f7';
        ctx.shadowColor = 'rgba(79, 195, 247, 0.8)';
        ctx.shadowBlur = 12;
        ctx.fill();
      } else {
        ctx.fillStyle = 'transparent';
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;

    ctx.textAlign = 'right';
    ctx.fillStyle = '#b8f0ff';
    ctx.shadowColor = 'rgba(100, 200, 255, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText(`回收: ${this.collectedCount}`, this.canvas.clientWidth - padding, padding);
    ctx.shadowBlur = 0;
  }

  drawGameOver(): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const now = performance.now();
    const elapsed = now - this.gameOverAnimationStart;
    const duration = 400;
    let t = Math.min(1, elapsed / duration);
    t = 1 - Math.pow(1 - t, 3);

    ctx.fillStyle = `rgba(30, 30, 50, ${0.7 * t})`;
    ctx.fillRect(0, 0, w, h);

    const cardW = Math.min(380, w - 60);
    const cardH = 320;
    const cardX = (w - cardW) / 2;
    const baseCardY = (h - cardH) / 2;
    const startY = baseCardY - 50;
    const cardY = startY + (baseCardY - startY) * t;

    ctx.save();
    ctx.globalAlpha = t;

    const cardGradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGradient.addColorStop(0, '#2a2a4a');
    cardGradient.addColorStop(1, '#1a1a3a');

    ctx.beginPath();
    const radius = 16;
    ctx.moveTo(cardX + radius, cardY);
    ctx.lineTo(cardX + cardW - radius, cardY);
    ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
    ctx.lineTo(cardX + cardW, cardY + cardH - radius);
    ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
    ctx.lineTo(cardX + radius, cardY + cardH);
    ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
    ctx.lineTo(cardX, cardY + radius);
    ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
    ctx.closePath();

    ctx.fillStyle = cardGradient;
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(100, 200, 255, 0.5)';
    ctx.shadowBlur = 8;

    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillText('游戏结束', cardX + cardW / 2, cardY + 40);

    ctx.font = '20px "Courier New", monospace';
    ctx.fillStyle = '#b8f0ff';
    ctx.fillText(`总分: ${this.score}`, cardX + cardW / 2, cardY + 100);
    ctx.fillText(`回收数: ${this.collectedCount}`, cardX + cardW / 2, cardY + 140);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`最高分: ${this.highScore}`, cardX + cardW / 2, cardY + 180);

    ctx.shadowBlur = 0;

    const btnW = 160;
    const btnH = 48;
    const btnX = cardX + (cardW - btnW) / 2;
    const btnY = cardY + cardH - 80;

    const btnGradient = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    btnGradient.addColorStop(0, '#ff9933');
    btnGradient.addColorStop(1, '#ff6600');

    ctx.beginPath();
    const btnRadius = 8;
    ctx.moveTo(btnX + btnRadius, btnY);
    ctx.lineTo(btnX + btnW - btnRadius, btnY);
    ctx.quadraticCurveTo(btnX + btnW, btnY, btnX + btnW, btnY + btnRadius);
    ctx.lineTo(btnX + btnW, btnY + btnH - btnRadius);
    ctx.quadraticCurveTo(btnX + btnW, btnY + btnH, btnX + btnW - btnRadius, btnY + btnH);
    ctx.lineTo(btnX + btnRadius, btnY + btnH);
    ctx.quadraticCurveTo(btnX, btnY + btnH, btnX, btnY + btnH - btnRadius);
    ctx.lineTo(btnX, btnY + btnRadius);
    ctx.quadraticCurveTo(btnX, btnY, btnX + btnRadius, btnY);
    ctx.closePath();

    ctx.fillStyle = btnGradient;
    ctx.shadowColor = 'rgba(255, 150, 50, 0.4)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('重新开始', btnX + btnW / 2, btnY + btnH / 2);
    ctx.textBaseline = 'alphabetic';

    (this as any)._restartBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

    ctx.restore();
  }

  handleClick(x: number, y: number): void {
    if (this.state === 'gameover') {
      const btn = (this as any)._restartBtn;
      if (btn && x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.restart();
      }
    }
  }

  restart(): void {
    this.score = 0;
    this.collectedCount = 0;
    this.debrisCollectedForMeteor = 0;
    this.crystalsCollectedForClear = 0;
    this.state = 'playing';
    this.debris = [];
    this.meteors = [];
    this.crystals = [];
    this.keys.clear();
    this.player = new Player(this.canvas.clientWidth / 2, this.canvas.clientHeight / 2, this.scale);
    this.spawnInitialObjects();
    this.lastSpawnTime = performance.now();
    this.lastCrystalSpawnTime = performance.now();
  }

  setDragging(active: boolean, x?: number, y?: number): void {
    this.player.isDragging = active;
    if (active && x !== undefined && y !== undefined) {
      this.player.dragTarget = { x, y };
    } else {
      this.player.dragTarget = null;
    }
  }

  updateDragTarget(x: number, y: number): void {
    if (this.player.isDragging) {
      this.player.dragTarget = { x, y };
    }
  }

  setKey(key: string, pressed: boolean): void {
    const k = key.toLowerCase();
    if (pressed) {
      this.keys.add(k);
    } else {
      this.keys.delete(k);
    }
  }
}
