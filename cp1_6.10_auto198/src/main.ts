import { SceneManager, GameState, FlashType } from './scene';
import { AudioEngine } from './audio';
import { Note } from './note';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const BPM = 120;
const BEAT_DURATION = 60000 / BPM;
const HIT_TOLERANCE = 15;
const MAX_NOTES = 40;
const MAX_PARTICLES = 200;
const NOTES_PER_PHRASE = 4;
const BEATS_PER_PHRASE = 4;

class Game {
  private canvas: HTMLCanvasElement;
  private scene: SceneManager;
  private audio: AudioEngine;
  private notes: Note[] = [];
  private particles: Particle[] = [];
  private score: number = 0;
  private combo: number = 0;
  private lastFrameTime: number = 0;
  private noteSpawnTimer: number = 0;
  private phraseNoteCount: number = 0;
  private fallSpeed: number = 0;
  private noteSpacing: number = 0;
  private flashType: FlashType = null;
  private flashTimer: number = 0;
  private running: boolean = false;
  private animationId: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas element not found');

    this.scene = new SceneManager(this.canvas);
    this.audio = new AudioEngine();

    this.calculateSpeeds();
    this.bindEvents();
  }

  private calculateSpeeds(): void {
    const hitLineY = this.scene.getHitLineY();
    const travelTime = BEAT_DURATION * BEATS_PER_PHRASE;
    this.fallSpeed = hitLineY / travelTime * 1000;
    this.noteSpacing = this.fallSpeed * 1;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.scene.resize();
      this.calculateSpeeds();
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.handleHit();
      }
    });

    this.canvas.addEventListener('click', () => {
      this.handleHit();
    });
  }

  private handleHit(): void {
    this.audio.resume();

    const hitLineY = this.scene.getHitLineY();
    const centerX = this.scene.getCenterX();

    let closestNote: Note | null = null;
    let closestDistance = Infinity;

    for (const note of this.notes) {
      if (note.hit || note.missed) continue;
      if (Math.abs(note.x - centerX) > 60) continue;

      const distance = Math.abs(note.y - hitLineY);
      if (distance <= HIT_TOLERANCE && distance < closestDistance) {
        closestNote = note;
        closestDistance = distance;
      }
    }

    if (closestNote) {
      this.onNoteHit(closestNote);
    }
  }

  private onNoteHit(note: Note): void {
    note.hit = true;
    this.score += 100 + this.combo * 10;
    this.combo++;
    this.triggerFlash('hit');
    this.audio.playFrequency(note.frequency, 0.35);
    this.spawnHitParticles(note.x, note.y, note.color);

    if (this.combo > 0 && this.combo % 10 === 0) {
      this.spawnComboRewardParticles();
    }
  }

  private onNoteMiss(note: Note): void {
    note.missed = true;
    this.combo = 0;
    this.triggerFlash('miss');
  }

  private triggerFlash(type: FlashType): void {
    this.flashType = type;
    this.flashTimer = 200;
  }

  private spawnHitParticles(x: number, y: number, color: string): void {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;

      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 100 + Math.random() * 100;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 300,
        maxLife: 300,
        color: '#ffffff',
        size: 3 + Math.random() * 2
      });
    }
  }

  private spawnComboRewardParticles(): void {
    const centerX = this.scene.getCenterX();
    const canvasHeight = this.canvas.height;
    const particleCount = 40;

    for (let i = 0; i < particleCount; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;

      const angle = (Math.PI * 2 * i) / particleCount;
      const radius = 50 + Math.random() * 100;
      const speed = 80 + Math.random() * 60;

      this.particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: canvasHeight - 80,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 500,
        maxLife: 500,
        color: '#ffd700',
        size: 2 + Math.random() * 3
      });
    }
  }

  private spawnNote(): void {
    if (this.notes.length >= MAX_NOTES) return;

    const { note, frequency } = this.audio.getRandomPentatonicFrequency();

    const newNote = new Note({
      x: this.scene.getCenterX(),
      y: -30,
      speed: this.fallSpeed,
      color: Note.getRandomColor(),
      frequency,
      noteName: note
    });

    this.notes.push(newNote);
  }

  private updateNotes(deltaTime: number): void {
    const hitLineY = this.scene.getHitLineY();
    const canvasHeight = this.canvas.height;

    for (const note of this.notes) {
      note.update(deltaTime);

      if (!note.hit && !note.missed && note.y > hitLineY + HIT_TOLERANCE) {
        this.onNoteMiss(note);
      }
    }

    this.notes = this.notes.filter(note => !note.isOutOfScreen(canvasHeight) && !note.hit);
  }

  private updateParticles(deltaTime: number): void {
    for (const p of this.particles) {
      p.x += p.vx * deltaTime / 1000;
      p.y += p.vy * deltaTime / 1000;
      p.vy += 50 * deltaTime / 1000;
      p.life -= deltaTime;
    }

    this.particles = this.particles.filter(p => p.life > 0);
  }

  private drawNotes(): void {
    const ctx = this.scene.getContext();
    for (const note of this.notes) {
      note.draw(ctx);
    }
  }

  private drawParticles(): void {
    const ctx = this.scene.getContext();

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private gameLoop(currentTime: number): void {
    if (!this.running) return;

    const deltaTime = Math.min(currentTime - this.lastFrameTime, 33.33);
    this.lastFrameTime = currentTime;

    this.noteSpawnTimer += deltaTime;
    if (this.noteSpawnTimer >= BEAT_DURATION) {
      this.noteSpawnTimer -= BEAT_DURATION;
      this.spawnNote();
      this.phraseNoteCount++;
      if (this.phraseNoteCount >= NOTES_PER_PHRASE) {
        this.phraseNoteCount = 0;
      }
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= deltaTime;
      if (this.flashTimer <= 0) {
        this.flashType = null;
      }
    }

    this.updateNotes(deltaTime);
    this.updateParticles(deltaTime);
    this.scene.update(deltaTime);

    const state: GameState = {
      score: this.score,
      combo: this.combo
    };

    this.scene.render(state, this.flashType);
    this.drawNotes();
    this.drawParticles();

    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  public start(): void {
    this.running = true;
    this.lastFrameTime = performance.now();
    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  public stop(): void {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

const game = new Game();
game.start();
