import { Player } from './player';
import { Enemy } from './enemy';
import { Collectible, BurstParticle } from './collectible';

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  blinkPhase: number;
  blinkSpeed: number;
}

interface Tree {
  x: number;
  trunkWidth: number;
  trunkHeight: number;
  crownRadius: number;
  crownParticles: { x: number; y: number; phase: number; speed: number; size: number }[];
}

interface SkillButton {
  colorIndex: number;
  color: string;
  active: boolean;
  x: number;
  y: number;
  radius: number;
  hoverScale: number;
}

interface WaveEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  color: string;
  alpha: number;
  width: number;
}

interface FlashEffect {
  alpha: number;
  duration: number;
  timer: number;
}

interface ComboDisplay {
  count: number;
  scale: number;
  targetScale: number;
  yOffset: number;
  targetYOffset: number;
  particles: BurstParticle[];
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class GameLoop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private collectibles: Collectible[] = [];
  private burstParticles: BurstParticle[] = [];
  private floatingTexts: FloatingText[] = [];

  private stars: Star[] = [];
  private trees: Tree[] = [];

  private score: number = 0;
  private lives: number = 3;
  private maxLives: number = 5;
  private combo: number = 0;
  private comboTimer: number = 0;
  private comboTimeout: number = 5;

  private colorCounts: number[] = [0, 0, 0, 0, 0, 0];
  private skillButtons: SkillButton[] = [];
  private waveEffects: WaveEffect[] = [];

  private screenFlash: FlashEffect = { alpha: 0, duration: 0.1, timer: 0 };
  private collectCounter: number = 0;

  private gameTime: number = 0;
  private enemySpawnTimer: number = 0;
  private baseSpawnInterval: number = 2;
  private baseEnemySpeed: number = 0.8;
  private maxEnemyRadius: number = 25;

  private totalCollected: number = 0;

  private isRunning: boolean = false;
  private isGameOver: boolean = false;
  private lastTime: number = 0;
  private animationId: number = 0;

  private baseWidth: number = 800;
  private baseHeight: number = 600;
  private scale: number = 1;
  private scaledWidth: number = 800;
  private scaledHeight: number = 600;
  private offsetX: number = 0;
  private offsetY: number = 0;

  private mouseX: number = 0;
  private mouseY: number = 0;

  private readonly colors = [
    '#ff6b6b',
    '#feca57',
    '#48dbfb',
    '#ff9ff3',
    '#a29bfe',
    '#55efc4'
  ];

  private readonly maxParticles: number = 500;
  private readonly maxEnemies: number = 30;
  private readonly maxCollectibles: number = 40;

  private comboDisplay: ComboDisplay = {
    count: 0,
    scale: 1,
    targetScale: 1,
    yOffset: 0,
    targetYOffset: 0,
    particles: []
  };

  private invincibleTimer: number = 0;
  private invincibleDuration: number = 1.5;

  private restartButtonRect = { x: 0, y: 0, w: 120, h: 45 };
  private restartHovered: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    this.ctx = ctx;

    this.resize();
    this.player = new Player(this.scaledWidth / 2, this.scaledHeight / 2, this.scale);

    this.initStars();
    this.initTrees();
    this.initCollectibles();
    this.initSkillButtons();

    this.setupEventListeners();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';

    this.ctx.scale(dpr, dpr);

    const scaleX = w / this.baseWidth;
    const scaleY = h / this.baseHeight;
    this.scale = Math.min(scaleX, scaleY);

    this.scaledWidth = this.baseWidth * this.scale;
    this.scaledHeight = this.baseHeight * this.scale;
    this.offsetX = (w - this.scaledWidth) / 2;
    this.offsetY = (h - this.scaledHeight) / 2;

    if (this.player) {
      this.player.setScale(this.scale);
    }
  }

  private initStars(): void {
    this.stars = [];
    const count = 40;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.scaledWidth,
        y: Math.random() * this.scaledHeight,
        size: (1 + Math.random() * 2) * this.scale,
        alpha: 0.2 + Math.random() * 0.3,
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: (3 + Math.random() * 4) / 3
      });
    }
  }

  private initTrees(): void {
    this.trees = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const x = (i + 0.5) * (this.scaledWidth / count);
      const trunkWidth = (10 + Math.random() * 5) * this.scale;
      const trunkHeight = (120 + Math.random() * 60) * this.scale;
      const crownRadius = (40 + Math.random() * 20) * this.scale;

      const crownParticles: { x: number; y: number; phase: number; speed: number; size: number }[] = [];
      const particleCount = 20;
      for (let j = 0; j < particleCount; j++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * crownRadius;
        crownParticles.push({
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r * 0.7,
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 0.5,
          size: (2 + Math.random() * 2) * this.scale
        });
      }

      this.trees.push({
        x,
        trunkWidth,
        trunkHeight,
        crownRadius,
        crownParticles
      });
    }
  }

  private initCollectibles(): void {
    this.collectibles = [];
    const count = 30;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.scaledWidth;
      const y = Math.random() * this.scaledHeight;
      this.collectibles.push(new Collectible(x, y, undefined, this.scale));
    }
  }

  private initSkillButtons(): void {
    this.skillButtons = [];
    for (let i = 0; i < 6; i++) {
      this.skillButtons.push({
        colorIndex: i,
        color: this.colors[i],
        active: false,
        x: 0,
        y: 0,
        radius: 25 * this.scale,
        hoverScale: 1
      });
    }
    this.updateSkillButtonPositions();
  }

  private updateSkillButtonPositions(): void {
    const startX = this.scaledWidth - 30 * this.scale;
    const startY = this.scaledHeight - 30 * this.scale;
    const spacing = 60 * this.scale;

    for (let i = 0; i < 6; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      this.skillButtons[i].x = startX - col * spacing - 60 * this.scale;
      this.skillButtons[i].y = startY - row * spacing - 30 * this.scale;
      this.skillButtons[i].radius = 25 * this.scale;
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.resize();
      this.initStars();
      this.initTrees();
      this.updateSkillButtonPositions();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left - this.offsetX;
      this.mouseY = e.clientY - rect.top - this.offsetY;
      this.player.setTarget(this.mouseX, this.mouseY);

      this.checkSkillButtonHover(e.clientX - rect.left, e.clientY - rect.top);
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      if (this.isGameOver) {
        if (this.checkRestartButton(clickX, clickY)) {
          this.restart();
        }
      } else {
        this.checkSkillButtonClick(clickX, clickY);
      }
    });
  }

  private checkSkillButtonHover(mouseX: number, mouseY: number): void {
    for (const btn of this.skillButtons) {
      if (!btn.active) {
        btn.hoverScale = 1;
        continue;
      }
      const dx = mouseX - (btn.x + this.offsetX);
      const dy = mouseY - (btn.y + this.offsetY);
      const dist = Math.sqrt(dx * dx + dy * dy);
      btn.hoverScale = dist < btn.radius * 1.2 ? 1.2 : 1;
    }

    if (this.isGameOver) {
      const rect = this.restartButtonRect;
      this.restartHovered =
        mouseX >= rect.x &&
        mouseX <= rect.x + rect.w &&
        mouseY >= rect.y &&
        mouseY <= rect.y + rect.h;
    }
  }

  private checkSkillButtonClick(mouseX: number, mouseY: number): void {
    for (const btn of this.skillButtons) {
      if (!btn.active) continue;
      const dx = mouseX - (btn.x + this.offsetX);
      const dy = mouseY - (btn.y + this.offsetY);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < btn.radius * btn.hoverScale) {
        this.activateSkill(btn.colorIndex);
        return;
      }
    }
  }

  private checkRestartButton(mouseX: number, mouseY: number): boolean {
    const rect = this.restartButtonRect;
    return (
      mouseX >= rect.x &&
      mouseX <= rect.x + rect.w &&
      mouseY >= rect.y &&
      mouseY <= rect.y + rect.h
    );
  }

  private activateSkill(colorIndex: number): void {
    const btn = this.skillButtons[colorIndex];
    if (!btn.active) return;

    btn.active = false;
    this.colorCounts[colorIndex] = 0;

    this.waveEffects.push({
      x: this.player.x,
      y: this.player.y,
      radius: 0,
      maxRadius: 400 * this.scale,
      speed: 8 * this.scale,
      color: this.colors[colorIndex],
      alpha: 1,
      width: 10 * this.scale
    });

    this.addCombo();
  }

  private addCombo(): void {
    this.combo++;
    this.comboTimer = this.comboTimeout;

    this.comboDisplay.count = this.combo;
    this.comboDisplay.targetScale = 1.3;
    this.comboDisplay.targetYOffset = -20 * this.scale;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = (2 + Math.random() * 2) * this.scale;
      this.comboDisplay.particles.push({
        x: this.scaledWidth / 2,
        y: 60 * this.scale,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (3 + Math.random() * 2) * this.scale,
        color: '#feca57',
        alpha: 1,
        life: 0.5,
        maxLife: 0.5
      });
    }

    if (this.combo > 0 && this.combo % 10 === 0 && this.lives < this.maxLives) {
      this.lives++;
      this.addFloatingText(
        this.scaledWidth / 2,
        100 * this.scale,
        '+1 生命',
        '#55efc4'
      );
    }
  }

  private addFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.5 * this.scale,
      life: 1,
      maxLife: 1,
      size: 16 * this.scale
    });
  }

  private spawnEnemy(): void {
    if (this.enemies.length >= this.maxEnemies) return;

    const side = Math.floor(Math.random() * 3);
    let x: number, y: number;

    const margin = 50 * this.scale;

    if (side === 0) {
      x = Math.random() * this.scaledWidth;
      y = -margin;
    } else if (side === 1) {
      x = -margin;
      y = Math.random() * this.scaledHeight;
    } else {
      x = this.scaledWidth + margin;
      y = Math.random() * this.scaledHeight;
    }

    const speed = this.baseEnemySpeed * (0.7 + Math.random() * 0.6);
    const enemy = new Enemy(x, y, this.player.x, this.player.y, speed, this.scale);
    enemy.radius = Math.min(enemy.radius, this.maxEnemyRadius * this.scale);
    this.enemies.push(enemy);
  }

  private spawnCollectible(): void {
    if (this.collectibles.length >= this.maxCollectibles) return;

    const x = Math.random() * this.scaledWidth;
    const y = Math.random() * this.scaledHeight;
    this.collectibles.push(new Collectible(x, y, undefined, this.scale));
  }

  private updateDifficulty(): void {
    const level = Math.floor(this.gameTime / 30);
    this.baseSpawnInterval = 2 / Math.pow(1.1, level);
    this.baseEnemySpeed = 0.8 + level * 0.2;
    this.maxEnemyRadius = Math.min(25 + level * 2, 40);
  }

  private checkCollisions(): void {
    const px = this.player.x;
    const py = this.player.y;
    const pr = this.player.getRadius();

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      if (c.checkCollision(px, py, pr)) {
        const colorIndex = c.colorIndex;
        this.colorCounts[colorIndex]++;
        if (this.colorCounts[colorIndex] >= 10) {
          this.skillButtons[colorIndex].active = true;
        }

        const burst = c.createBurst();
        this.burstParticles.push(...burst);

        this.score += 10;
        this.totalCollected++;
        this.collectCounter++;

        if (this.collectCounter % 10 === 0) {
          this.screenFlash.alpha = 0.15;
          this.screenFlash.timer = this.screenFlash.duration;
        }

        this.collectibles.splice(i, 1);

        setTimeout(() => {
          this.spawnCollectible();
        }, 2000);
      }
    }

    if (this.invincibleTimer <= 0) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.checkCollision(px, py, pr)) {
          this.enemies.splice(i, 1);
          this.lives--;
          this.invincibleTimer = this.invincibleDuration;
          this.combo = 0;
          this.comboDisplay.count = 0;

          if (this.lives <= 0) {
            this.gameOver();
          }
          break;
        }
      }
    }

    for (let i = this.waveEffects.length - 1; i >= 0; i--) {
      const wave = this.waveEffects[i];
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const dx = e.x - wave.x;
        const dy = e.y - wave.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(dist - wave.radius) < e.radius + wave.width) {
          this.enemies.splice(j, 1);
          this.score += 20;

          for (let k = 0; k < 10; k++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (1 + Math.random() * 1) * this.scale;
            const colorIdx = Math.floor(Math.random() * 6);
            const newC = new Collectible(e.x, e.y, colorIdx, this.scale);
            newC.vx = Math.cos(angle) * speed;
            newC.vy = Math.sin(angle) * speed;
            this.collectibles.push(newC);
            if (this.collectibles.length > this.maxCollectibles) {
              this.collectibles.shift();
            }
          }
        }
      }
    }
  }

  private update(deltaTime: number): void {
    if (this.isGameOver) return;

    this.gameTime += deltaTime;
    this.updateDifficulty();

    this.enemySpawnTimer += deltaTime;
    if (this.enemySpawnTimer >= this.baseSpawnInterval) {
      this.enemySpawnTimer = 0;
      this.spawnEnemy();
    }

    this.player.update(deltaTime);

    for (const e of this.enemies) {
      e.update(this.player.x, this.player.y, deltaTime);
    }

    const difficultyMult = 1 + Math.floor(this.gameTime / 30) * 0.5;
    for (const c of this.collectibles) {
      c.update(deltaTime, difficultyMult);
      c.wrapBounds(this.scaledWidth, this.scaledHeight);
    }

    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;
      p.life -= deltaTime;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.burstParticles.splice(i, 1);
      }
    }

    if (this.burstParticles.length > this.maxParticles) {
      this.burstParticles.splice(0, this.burstParticles.length - this.maxParticles);
    }

    for (let i = this.waveEffects.length - 1; i >= 0; i--) {
      const w = this.waveEffects[i];
      w.radius += w.speed * deltaTime * 60;
      w.alpha = 1 - w.radius / w.maxRadius;
      w.width = 10 * this.scale * (1 - w.radius / w.maxRadius);
      if (w.radius >= w.maxRadius) {
        this.waveEffects.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * deltaTime * 60;
      ft.life -= deltaTime;
      ft.alpha = ft.life / ft.maxLife;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    if (this.screenFlash.timer > 0) {
      this.screenFlash.timer -= deltaTime;
      this.screenFlash.alpha = 0.15 * (this.screenFlash.timer / this.screenFlash.duration);
    }

    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= deltaTime;
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= deltaTime;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboDisplay.count = 0;
      }
    }

    this.comboDisplay.scale += (this.comboDisplay.targetScale - this.comboDisplay.scale) * 0.15;
    if (Math.abs(this.comboDisplay.scale - this.comboDisplay.targetScale) < 0.02) {
      this.comboDisplay.targetScale = 1;
    }

    this.comboDisplay.yOffset += (this.comboDisplay.targetYOffset - this.comboDisplay.yOffset) * 0.15;
    if (Math.abs(this.comboDisplay.yOffset - this.comboDisplay.targetYOffset) < 1) {
      this.comboDisplay.targetYOffset = 0;
    }

    for (let i = this.comboDisplay.particles.length - 1; i >= 0; i--) {
      const p = this.comboDisplay.particles[i];
      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;
      p.vy += 0.1 * this.scale;
      p.life -= deltaTime;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.comboDisplay.particles.splice(i, 1);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].isOutOfBounds(this.scaledWidth, this.scaledHeight)) {
        this.enemies.splice(i, 1);
      }
    }

    this.checkCollisions();
  }

  private renderBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.scaledWidth / 2,
      this.scaledHeight / 2,
      0,
      this.scaledWidth / 2,
      this.scaledHeight / 2,
      Math.max(this.scaledWidth, this.scaledHeight) / 1.5
    );
    gradient.addColorStop(0, '#0b0e27');
    gradient.addColorStop(1, '#1f1042');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.scaledWidth, this.scaledHeight);

    for (const star of this.stars) {
      star.blinkPhase += 0.016 * star.blinkSpeed;
      const blinkAlpha = star.alpha * (0.5 + 0.5 * Math.sin(star.blinkPhase));

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = blinkAlpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const tree of this.trees) {
      const trunkX = tree.x;
      const trunkTop = this.scaledHeight - tree.trunkHeight;

      const trunkGrad = ctx.createLinearGradient(
        trunkX - tree.trunkWidth / 2, 0,
        trunkX + tree.trunkWidth / 2, 0
      );
      trunkGrad.addColorStop(0, '#2d5a27');
      trunkGrad.addColorStop(0.5, '#4a8c3f');
      trunkGrad.addColorStop(1, '#2d5a27');

      ctx.fillStyle = trunkGrad;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(
        trunkX - tree.trunkWidth / 2,
        trunkTop,
        tree.trunkWidth,
        tree.trunkHeight
      );
      ctx.globalAlpha = 1;

      const crownY = trunkTop - tree.crownRadius * 0.3;
      for (const p of tree.crownParticles) {
        p.phase += 0.016 * p.speed;
        const floatY = Math.sin(p.phase) * 5 * this.scale;

        ctx.beginPath();
        ctx.arc(trunkX + p.x, crownY + p.y + floatY, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#55efc4';
        ctx.globalAlpha = 0.4;
        ctx.shadowBlur = 8 * this.scale;
        ctx.shadowColor = '#55efc4';
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  }

  private renderCollectibles(): void {
    for (const c of this.collectibles) {
      c.render(this.ctx);
    }
  }

  private renderEnemies(): void {
    for (const e of this.enemies) {
      e.render(this.ctx);
    }
  }

  private renderPlayer(): void {
    if (this.invincibleTimer > 0) {
      const blink = Math.sin(this.invincibleTimer * 20) > 0;
      if (blink) {
        this.player.render(this.ctx);
      }
    } else {
      this.player.render(this.ctx);
    }
  }

  private renderBurstParticles(): void {
    const ctx = this.ctx;
    for (const p of this.burstParticles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 10 * this.scale;
      ctx.shadowColor = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private renderWaveEffects(): void {
    const ctx = this.ctx;
    for (const w of this.waveEffects) {
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.strokeStyle = w.color;
      ctx.globalAlpha = w.alpha;
      ctx.lineWidth = Math.max(1, w.width);
      ctx.shadowBlur = 20 * this.scale;
      ctx.shadowColor = w.color;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private renderUI(): void {
    const ctx = this.ctx;

    const heartX = this.scaledWidth - 30 * this.scale;
    const heartY = 30 * this.scale;
    const heartSize = 20 * this.scale;
    const spacing = 35 * this.scale;

    for (let i = 0; i < this.maxLives; i++) {
      const x = heartX - i * spacing;
      const y = heartY;
      const active = i < this.lives;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(heartSize / 20, heartSize / 20);

      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(-10, -5, -15, 10, 0, 15);
      ctx.bezierCurveTo(15, 10, 10, -5, 0, 5);
      ctx.closePath();

      if (active) {
        ctx.fillStyle = '#ff6b6b';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff6b6b';
      } else {
        ctx.fillStyle = '#555555';
        ctx.globalAlpha = 0.3;
      }
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    const scoreText = `分数: ${this.score}`;
    ctx.font = `bold ${18 * this.scale}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 5 * this.scale;
    ctx.shadowColor = '#48dbfb';
    ctx.fillText(scoreText, 20 * this.scale, 35 * this.scale);
    ctx.shadowBlur = 0;

    if (this.comboDisplay.count > 1) {
      const comboY = 60 * this.scale + this.comboDisplay.yOffset;
      ctx.save();
      ctx.translate(this.scaledWidth / 2, comboY);
      ctx.scale(this.comboDisplay.scale, this.comboDisplay.scale);

      ctx.font = `bold ${36 * this.scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 15 * this.scale;
      ctx.shadowColor = '#feca57';
      ctx.fillText(`${this.comboDisplay.count} 连击!`, 0, 0);
      ctx.restore();
      ctx.shadowBlur = 0;

      for (const p of this.comboDisplay.particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8 * this.scale;
        ctx.shadowColor = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    for (const btn of this.skillButtons) {
      const scale = btn.active ? btn.hoverScale : 0.6;
      const r = btn.radius * scale;

      ctx.save();
      ctx.translate(btn.x, btn.y);

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);

      if (btn.active) {
        ctx.fillStyle = btn.color;
        ctx.globalAlpha = 0.9;
        ctx.shadowBlur = 20 * this.scale;
        ctx.shadowColor = btn.color;
      } else {
        ctx.fillStyle = '#333333';
        ctx.globalAlpha = 0.4;
      }
      ctx.fill();

      if (btn.active) {
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.3;
        ctx.fill();
      }

      const count = this.colorCounts[btn.colorIndex];
      ctx.font = `bold ${12 * this.scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = btn.active ? '#ffffff' : '#888888';
      ctx.globalAlpha = btn.active ? 1 : 0.6;
      ctx.shadowBlur = 0;
      ctx.fillText(`${count}/10`, 0, 0);

      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    for (const ft of this.floatingTexts) {
      ctx.font = `bold ${ft.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = ft.alpha;
      ctx.shadowBlur = 8 * this.scale;
      ctx.shadowColor = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private renderScreenFlash(): void {
    if (this.screenFlash.alpha > 0) {
      const ctx = this.ctx;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = this.screenFlash.alpha;
      ctx.fillRect(0, 0, this.scaledWidth, this.scaledHeight);
      ctx.globalAlpha = 1;
    }
  }

  private renderGameOver(): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.scaledWidth, this.scaledHeight);

    const centerX = this.scaledWidth / 2;
    const centerY = this.scaledHeight / 2;

    ctx.font = `bold ${48 * this.scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 20 * this.scale;
    ctx.shadowColor = '#ff6b6b';
    ctx.fillText('游戏结束', centerX, centerY - 80 * this.scale);
    ctx.shadowBlur = 0;

    ctx.font = `${24 * this.scale}px sans-serif`;
    ctx.fillStyle = '#feca57';
    ctx.shadowBlur = 10 * this.scale;
    ctx.shadowColor = '#feca57';
    ctx.fillText(`最终得分: ${this.score}`, centerX, centerY - 20 * this.scale);
    ctx.shadowBlur = 0;

    ctx.font = `${18 * this.scale}px sans-serif`;
    ctx.fillStyle = '#48dbfb';
    ctx.fillText(`收集光尘: ${this.totalCollected} 个`, centerX, centerY + 20 * this.scale);

    const btnW = 120 * this.scale;
    const btnH = 45 * this.scale;
    const btnX = centerX - btnW / 2;
    const btnY = centerY + 60 * this.scale;

    this.restartButtonRect = {
      x: btnX + this.offsetX,
      y: btnY + this.offsetY,
      w: btnW,
      h: btnH
    };

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGrad.addColorStop(0, '#667eea');
    btnGrad.addColorStop(1, '#764ba2');

    const hoverOffset = this.restartHovered ? 3 * this.scale : 0;

    ctx.save();
    if (this.restartHovered) {
      ctx.shadowBlur = 15 * this.scale;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
      ctx.filter = 'brightness(1.15)';
    }

    ctx.beginPath();
    const radius = 10 * this.scale;
    ctx.roundRect(
      btnX - hoverOffset,
      btnY - hoverOffset,
      btnW + hoverOffset * 2,
      btnH + hoverOffset * 2,
      radius
    );
    ctx.fillStyle = btnGrad;
    ctx.fill();

    ctx.filter = 'none';
    ctx.restore();

    ctx.font = `bold ${16 * this.scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 5 * this.scale;
    ctx.shadowColor = '#667eea';
    ctx.fillText('再玩一次', centerX, btnY + btnH / 2);
    ctx.shadowBlur = 0;
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);

    this.renderBackground();
    this.renderCollectibles();
    this.renderEnemies();
    this.renderPlayer();
    this.renderBurstParticles();
    this.renderWaveEffects();
    this.renderUI();
    this.renderScreenFlash();

    if (this.isGameOver) {
      this.renderGameOver();
    }

    ctx.restore();
  }

  private gameLoop = (timestamp: number): void => {
    if (!this.isRunning) return;

    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private gameOver(): void {
    this.isGameOver = true;
  }

  private restart(): void {
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.comboTimer = 0;
    this.totalCollected = 0;
    this.gameTime = 0;
    this.enemySpawnTimer = 0;
    this.collectCounter = 0;
    this.invincibleTimer = 0;
    this.isGameOver = false;
    this.baseSpawnInterval = 2;
    this.baseEnemySpeed = 0.8;
    this.maxEnemyRadius = 25;

    this.colorCounts = [0, 0, 0, 0, 0, 0];
    for (const btn of this.skillButtons) {
      btn.active = false;
    }

    this.enemies = [];
    this.burstParticles = [];
    this.waveEffects = [];
    this.floatingTexts = [];
    this.comboDisplay.particles = [];
    this.comboDisplay.count = 0;

    this.player.x = this.scaledWidth / 2;
    this.player.y = this.scaledHeight / 2;

    this.initCollectibles();
  }
}
