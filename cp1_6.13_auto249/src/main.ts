import { Note, ParticleSystem } from './note';
import { CatPaw } from './catpaw';
import { audioManager } from './audio';
import { UIManager } from './ui';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private notes: Note[] = [];
  private catPaw: CatPaw;
  private particleSystem: ParticleSystem;
  private uiManager: UIManager;

  private score: number = 0;
  private combo: number = 0;
  private lives: number = 5;
  private maxLives: number = 5;
  private gameOver: boolean = false;

  private noteSpeed: number = 250;
  private noteSpawnTimer: number = 0;
  private noteSpawnInterval: number = 0.8;

  private columns: number = 4;
  private columnWidth: number = 0;
  private noteWidth: number = 60;
  private noteHeight: number = 60;

  private hitLineY: number = 0;
  private hitTolerance: number = 50;

  private lastTime: number = 0;
  private animationId: number = 0;

  private fps: number = 60;
  private fpsHistory: number[] = [];
  private lowFpsDuration: number = 0;
  private performanceMode: boolean = false;

  private keys: Record<string, boolean> = {};
  private keyMap: Record<string, number> = {
    'a': 0,
    's': 1,
    'd': 2,
    'f': 3
  };

  private bgColorTop: string = '#0b0e14';
  private bgColorBottom: string = '#141829';

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.catPaw = new CatPaw();
    this.particleSystem = new ParticleSystem();
    this.uiManager = new UIManager(this.canvas, this.ctx);

    this.resize();
    this.setupEventListeners();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';

    this.ctx.scale(dpr, dpr);

    this.columnWidth = Math.min(120, (this.width * 0.6) / this.columns);
    this.hitLineY = this.height - 120;

    const totalColumnsWidth = this.columnWidth * this.columns;
    const startX = (this.width - totalColumnsWidth) / 2;

    const pawX = startX + totalColumnsWidth / 2;
    const pawY = this.hitLineY + 30;
    this.catPaw.setPosition(pawX, pawY);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (this.keyMap.hasOwnProperty(key) && !this.keys[key]) {
        this.keys[key] = true;
        this.handleKeyPress(this.keyMap[key]);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (this.keyMap.hasOwnProperty(key)) {
        this.keys[key] = false;
      }
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.gameOver && this.uiManager.isRestartButtonClicked(x, y)) {
        this.restartGame();
      }
    });

    window.addEventListener('click', () => {
      audioManager.init();
      audioManager.resume();
    });
  }

  private handleKeyPress(column: number): void {
    if (this.gameOver) return;

    audioManager.resume();

    let hitNote: Note | null = null;
    let closestDistance = Infinity;

    for (const note of this.notes) {
      if (!note.active || note.hit || note.column !== column) continue;

      const noteCenterY = note.y + this.noteHeight / 2;
      const distance = Math.abs(noteCenterY - this.hitLineY);

      if (distance < this.hitTolerance && distance < closestDistance) {
        closestDistance = distance;
        hitNote = note;
      }
    }

    if (hitNote) {
      this.onNoteHit(hitNote, column);
    } else {
      this.onMiss();
    }

    this.catPaw.slap();
  }

  private onNoteHit(note: Note, column: number): void {
    note.hit = true;
    note.active = false;

    this.combo++;
    const comboMultiplier = 1 + this.combo * 0.1;
    this.score += 100 * comboMultiplier;

    this.uiManager.setScore(this.score);
    this.uiManager.setCombo(this.combo);
    this.catPaw.setCombo(this.combo);

    const noteCenterX = note.x + this.noteWidth / 2;
    const noteCenterY = note.y + this.noteHeight / 2;
    this.particleSystem.spawnExplosion(noteCenterX, noteCenterY, note.color);

    audioManager.playNote(column);

    this.updateBackgroundColors();
  }

  private onMiss(): void {
    if (this.combo > 0) {
      this.combo = 0;
      this.uiManager.setCombo(this.combo);
      this.catPaw.setCombo(this.combo);
      this.uiManager.triggerRedFlash();
      audioManager.playMissSound();
      this.updateBackgroundColors();
    }
  }

  private onNoteMiss(note: Note): void {
    note.active = false;
    this.lives--;
    this.uiManager.setLives(this.lives);

    if (this.combo > 0) {
      this.combo = 0;
      this.uiManager.setCombo(this.combo);
      this.catPaw.setCombo(this.combo);
      this.updateBackgroundColors();
    }

    this.uiManager.triggerRedFlash();
    audioManager.playMissSound();

    if (this.lives <= 0) {
      this.endGame();
    }
  }

  private updateBackgroundColors(): void {
    if (this.combo >= 30) {
      this.bgColorTop = '#1a0a1e';
      this.bgColorBottom = '#2d1b4e';
    } else if (this.combo >= 20) {
      this.bgColorTop = '#1a0a0a';
      this.bgColorBottom = '#3d1a1a';
    } else if (this.combo >= 15) {
      this.bgColorTop = '#1a1208';
      this.bgColorBottom = '#3d2d1a';
    } else if (this.combo >= 10) {
      this.bgColorTop = '#0e141a';
      this.bgColorBottom = '#1a2d3d';
    } else if (this.combo >= 5) {
      this.bgColorTop = '#0b0e14';
      this.bgColorBottom = '#1a1f35';
    } else {
      this.bgColorTop = '#0b0e14';
      this.bgColorBottom = '#141829';
    }
  }

  private spawnNote(): void {
    const column = Math.floor(Math.random() * this.columns);
    const totalColumnsWidth = this.columnWidth * this.columns;
    const startX = (this.width - totalColumnsWidth) / 2;
    const x = startX + column * this.columnWidth + (this.columnWidth - this.noteWidth) / 2;
    const y = -this.noteHeight;

    const note = new Note(column, x, y);
    this.notes.push(note);
  }

  private update(deltaTime: number): void {
    if (this.gameOver) {
      this.particleSystem.update(deltaTime);
      this.catPaw.update(deltaTime);
      this.uiManager.update(deltaTime);
      return;
    }

    this.noteSpawnTimer += deltaTime;
    if (this.noteSpawnTimer >= this.noteSpawnInterval) {
      this.noteSpawnTimer = 0;
      this.spawnNote();
    }

    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];
      note.update(deltaTime, this.noteSpeed);

      if (note.active && !note.hit && note.y > this.hitLineY + this.hitTolerance) {
        this.onNoteMiss(note);
      }

      if (note.y > this.height + 100) {
        this.notes.splice(i, 1);
      }
    }

    this.particleSystem.update(deltaTime);
    this.catPaw.update(deltaTime);
    this.uiManager.update(deltaTime);
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, this.bgColorTop);
    gradient.addColorStop(1, this.bgColorBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % this.width;
      const y = (i * 89.3 + 100) % (this.height - 200);
      const size = (i % 3) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawColumns(): void {
    const ctx = this.ctx;
    const totalColumnsWidth = this.columnWidth * this.columns;
    const startX = (this.width - totalColumnsWidth) / 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= this.columns; i++) {
      const x = startX + i * this.columnWidth;
      ctx.beginPath();
      ctx.moveTo(x, 60);
      ctx.lineTo(x, this.height - 80);
      ctx.stroke();
    }
  }

  private drawHitLine(): void {
    const ctx = this.ctx;
    const totalColumnsWidth = this.columnWidth * this.columns;
    const startX = (this.width - totalColumnsWidth) / 2;
    const endX = startX + totalColumnsWidth;
    const y = this.hitLineY;
    const arcHeight = 20;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 5;

    ctx.beginPath();
    ctx.moveTo(startX, y);

    const midX = (startX + endX) / 2;
    ctx.quadraticCurveTo(midX, y - arcHeight, endX, y);

    ctx.stroke();
    ctx.restore();

    const keyLabels = ['A', 'S', 'D', 'F'];
    ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < this.columns; i++) {
      const x = startX + i * this.columnWidth + this.columnWidth / 2;
      const labelY = this.height - 50;

      const isPressed = Object.values(this.keys)[i];
      if (isPressed) {
        ctx.fillStyle = 'rgba(72, 219, 251, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x, labelY, 25, 20, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = isPressed ? '#48dbfb' : 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(keyLabels[i], x, labelY);
    }
  }

  private draw(): void {
    this.drawBackground();
    this.drawColumns();

    for (const note of this.notes) {
      note.draw(this.ctx);
    }

    this.particleSystem.draw(this.ctx);
    this.drawHitLine();
    this.catPaw.draw(this.ctx);
    this.uiManager.draw();
  }

  private updateFps(deltaTime: number): void {
    const currentFps = 1 / deltaTime;
    this.fpsHistory.push(currentFps);

    if (this.fpsHistory.length > 30) {
      this.fpsHistory.shift();
    }

    this.fps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    if (this.fps < 45 && !this.performanceMode) {
      this.lowFpsDuration += deltaTime;
      if (this.lowFpsDuration >= 2) {
        this.performanceMode = true;
        this.particleSystem.setMultiplier(0.5);
      }
    } else if (this.fps > 55 && this.performanceMode) {
      this.lowFpsDuration = Math.max(0, this.lowFpsDuration - deltaTime);
      if (this.lowFpsDuration <= 0) {
        this.performanceMode = false;
        this.particleSystem.setMultiplier(1);
      }
    } else {
      this.lowFpsDuration = Math.max(0, this.lowFpsDuration - deltaTime * 0.5);
    }
  }

  private gameLoop(timestamp: number): void {
    if (this.lastTime === 0) {
      this.lastTime = timestamp;
    }

    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.updateFps(deltaTime);

    this.update(deltaTime);
    this.draw();

    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private endGame(): void {
    this.gameOver = true;
    this.uiManager.showGameOver(this.score);
  }

  private restartGame(): void {
    this.score = 0;
    this.combo = 0;
    this.lives = this.maxLives;
    this.gameOver = false;
    this.notes = [];
    this.noteSpawnTimer = 0;

    this.catPaw.setCombo(0);
    this.uiManager.reset();
    this.uiManager.setScore(0);
    this.uiManager.setCombo(0);
    this.uiManager.setLives(this.maxLives);

    this.bgColorTop = '#0b0e14';
    this.bgColorBottom = '#141829';
  }

  start(): void {
    audioManager.init();
    this.uiManager.setLives(this.maxLives);
    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
  }
}

const game = new Game();
game.start();
