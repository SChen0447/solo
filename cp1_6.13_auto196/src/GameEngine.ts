import { ParticleSystem, Particle } from './ParticleSystem';
import { Stage, StageMetrics } from './Stage';
import { Dancer } from './Dancer';
import * as Tone from 'tone';

export interface EnemyShadow {
  x: number;
  y: number;
  active: boolean;
  spawnTime: number;
  speed: number;
}

export interface GameState {
  combo: number;
  energy: number;
  defeatedEnemies: number;
  running: boolean;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: ParticleSystem;
  private stage: Stage;
  private dancer: Dancer;

  private lastTime = 0;
  private animationId = 0;
  private running = false;

  private beatInterval = 2;
  private beatTime = 0;
  private beatCount = 0;

  private combo = 0;
  private maxCombo = 0;
  private defeatedEnemies = 0;
  private lastBeatHit = -10;

  private enemies: EnemyShadow[] = [];
  private enemySpawnTimer = 0;
  private readonly enemySpawnInterval = 3;

  private whiteFlashTime = 0;
  private ultimateActive = false;

  private audioSynth?: Tone.PolySynth;
  private audioKick?: Tone.MembraneSynth;
  private audioStarted = false;

  private comboEl?: HTMLElement;
  private energyBarEl?: HTMLElement;
  private beatIndicatorEl?: HTMLElement;
  private beatContainerEl?: HTMLElement;
  private startBtn?: HTMLElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.particles = new ParticleSystem();
    this.stage = new Stage(canvas, this.ctx);
    this.dancer = new Dancer(canvas, this.ctx, this.particles, this.stage);

    this.resize();
    window.addEventListener('resize', this.handleResize);
  }

  setupUI(
    comboEl: HTMLElement,
    energyBarEl: HTMLElement,
    beatIndicatorEl: HTMLElement,
    beatContainerEl: HTMLElement,
    startBtn: HTMLElement
  ): void {
    this.comboEl = comboEl;
    this.energyBarEl = energyBarEl;
    this.beatIndicatorEl = beatIndicatorEl;
    this.beatContainerEl = beatContainerEl;
    this.startBtn = startBtn;

    startBtn.addEventListener('click', () => this.start());
  }

  private handleResize = (): void => {
    this.resize();
  };

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.running) {
      this.stage.update(0, 0, this.beatInterval);
      this.render();
    }
  }

  async start(): Promise<void> {
    if (this.running) return;

    if (!this.audioStarted) {
      await Tone.start();
      this.setupAudio();
      this.audioStarted = true;
    }

    this.startBtn!.style.display = 'none';
    this.dancer.setupInput();
    this.dancer.setCallbacks(
      () => this.checkBeatHit(),
      () => this.triggerUltimate()
    );
    this.dancer.resetPosition();

    this.running = true;
    this.lastTime = performance.now();
    this.combo = 0;
    this.defeatedEnemies = 0;
    this.enemies = [];
    this.enemySpawnTimer = 0;
    this.beatTime = 0;
    this.particles.clear();
    this.updateUI();

    this.loop();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationId);
    this.dancer.teardownInput();
  }

  private setupAudio(): void {
    this.audioSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 }
    }).toDestination();

    this.audioKick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4, attackCurve: 'exponential' }
    }).toDestination();
  }

  private playBeatSound(): void {
    if (this.audioKick) {
      this.audioKick.triggerAttackRelease('C2', '8n');
    }
  }

  private playHitSound(combo: number): void {
    if (this.audioSynth) {
      const notes = ['C4', 'E4', 'G4', 'C5'];
      const note = notes[Math.min(combo, notes.length - 1)];
      this.audioSynth.triggerAttackRelease([note], '8n');
    }
  }

  private playUltimateSound(): void {
    if (this.audioSynth) {
      this.audioSynth.triggerAttackRelease(['C4', 'E4', 'G4', 'C5', 'E5'], '2n');
    }
  }

  private loop = (): void => {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(this.loop);

    const now = performance.now();
    let deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    deltaTime = Math.min(deltaTime, 0.05);

    this.update(deltaTime);
    this.render();
  };

  private update(deltaTime: number): void {
    this.beatTime += deltaTime;
    if (this.beatTime >= this.beatInterval) {
      this.beatTime -= this.beatInterval;
      this.beatCount++;
      this.playBeatSound();
    }

    if (this.whiteFlashTime > 0) {
      this.whiteFlashTime -= deltaTime;
    }

    this.stage.update(deltaTime, this.beatTime, this.beatInterval);
    this.dancer.update(deltaTime);
    this.updateEnemies(deltaTime);
    this.checkEnemyCollisions();
    this.particles.update(deltaTime);
    this.updateUI();
  }

  private updateEnemies(deltaTime: number): void {
    this.enemySpawnTimer += deltaTime;
    if (this.enemySpawnTimer >= this.enemySpawnInterval) {
      this.enemySpawnTimer = 0;
      this.spawnEnemy();
    }

    const m = this.stage.getMetrics();
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const dx = m.centerX - enemy.x;
      const dy = m.centerY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        enemy.x += (dx / dist) * enemy.speed * deltaTime;
        enemy.y += (dy / dist) * enemy.speed * deltaTime;
      }
    }
  }

  private spawnEnemy(): void {
    const pos = this.stage.getRandomEdgePosition();
    this.enemies.push({
      x: pos.x,
      y: pos.y,
      active: true,
      spawnTime: performance.now() / 1000,
      speed: 20
    });
  }

  private checkEnemyCollisions(): void {
    if (this.dancer.action === 'idle') return;

    const dx = this.dancer.x;
    const dy = this.dancer.y;
    const hitRange = this.dancer.action === 'kicking' ? 70 : 55;

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const ex = enemy.x - dx;
      const ey = enemy.y - dy;
      if (ex * ex + ey * ey < hitRange * hitRange) {
        enemy.active = false;
        this.onEnemyDefeated(enemy.x, enemy.y);
      }
    }
  }

  private checkBeatHit(): void {
    const pulseInfo = this.stage.getPulseInfo();
    if (!pulseInfo.active) return;

    const hitRadius = 80;
    const centerHit = pulseInfo.radius > 80 && pulseInfo.radius < 180;

    if (centerHit || pulseInfo.alpha > 0.5) {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.dancer.addEnergy();
      this.lastBeatHit = performance.now() / 1000;
      this.playHitSound(this.combo);

      const m = this.stage.getMetrics();
      const corners = [
        { x: m.centerX - m.radius * 0.7, y: m.centerY - m.radius * 0.7 },
        { x: m.centerX + m.radius * 0.7, y: m.centerY - m.radius * 0.7 },
        { x: m.centerX - m.radius * 0.7, y: m.centerY + m.radius * 0.7 },
        { x: m.centerX + m.radius * 0.7, y: m.centerY + m.radius * 0.7 }
      ];
      for (const corner of corners) {
        this.particles.spawnHexStars(corner.x, corner.y, 4);
      }

      const starCount = 3 + Math.floor(Math.random() * 6);
      this.particles.spawnMicroStars(m.centerX, m.centerY - m.radius, starCount);
    }
  }

  private triggerUltimate(): void {
    this.ultimateActive = true;
    this.whiteFlashTime = 0.15;
    this.playUltimateSound();

    const m = this.stage.getMetrics();
    this.particles.spawnShockwave(this.dancer.x, this.dancer.y, m.radius);

    for (const enemy of this.enemies) {
      if (enemy.active) {
        this.particles.spawnHexStars(enemy.x, enemy.y, 6);
        enemy.active = false;
        this.defeatedEnemies++;
      }
    }

    setTimeout(() => {
      this.particles.spawnStarDust(m.centerX, m.centerY - m.radius * 0.8, 50);
      this.ultimateActive = false;
    }, 1000);

    this.combo += 5;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.updateUI();
  }

  private onEnemyDefeated(x: number, y: number): void {
    this.defeatedEnemies++;
    this.particles.spawnHexStars(x, y, 10);
    this.particles.spawnSparks(x, y, 15, '#ff66ff');
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    const m = this.stage.getMetrics();
    const starCount = 3 + Math.floor(Math.random() * 6);
    this.particles.spawnMicroStars(m.centerX, m.centerY - m.radius, starCount);

    if (this.defeatedEnemies % 5 === 0) {
      this.particles.spawnRainbow(m.centerX, m.centerY - m.radius * 0.5, 180);
    }

    this.playHitSound(this.combo);
    this.updateUI();
  }

  private updateUI(): void {
    if (this.comboEl) {
      this.comboEl.textContent = `COMBO: ${this.combo}`;
      if (this.combo > 10) {
        this.comboEl.classList.add('gold');
      } else {
        this.comboEl.classList.remove('gold');
      }
    }

    if (this.energyBarEl) {
      const pct = (this.dancer.energyLevel / 8) * 100;
      this.energyBarEl.style.width = pct + '%';
    }

    if (this.beatIndicatorEl && this.beatContainerEl) {
      const progress = this.beatTime / this.beatInterval;
      const containerWidth = this.beatContainerEl.offsetWidth;
      const indicatorX = progress * containerWidth;
      this.beatIndicatorEl.style.left = indicatorX + 'px';
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    this.stage.render();
    this.renderEnemies();
    this.particles.render(ctx, this.dancer.renderAfterimage);
    this.dancer.render();

    if (this.whiteFlashTime > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.whiteFlashTime / 0.15})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private renderEnemies(): void {
    const ctx = this.ctx;
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff3366';

      ctx.beginPath();
      ctx.arc(0, -15, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 51, 102, 0.3)';
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 12);
      ctx.moveTo(0, -2);
      ctx.lineTo(-12, 6);
      ctx.moveTo(0, -2);
      ctx.lineTo(12, 6);
      ctx.moveTo(0, 12);
      ctx.lineTo(-7, 25);
      ctx.moveTo(0, 12);
      ctx.lineTo(7, 25);
      ctx.stroke();

      ctx.restore();
    }
  }

  getState(): GameState {
    return {
      combo: this.combo,
      energy: this.dancer.energyLevel,
      defeatedEnemies: this.defeatedEnemies,
      running: this.running
    };
  }
}
