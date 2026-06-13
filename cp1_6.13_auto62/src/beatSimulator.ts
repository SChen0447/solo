import type { Note, Shard, Ripple } from './renderer';

const NOTE_COLORS = [
  { h: 330, s: 100, l: 60 },  // Pink
  { h: 180, s: 100, l: 55 },  // Cyan
  { h: 280, s: 100, l: 60 },  // Purple
  { h: 30, s: 100, l: 60 },   // Orange
  { h: 140, s: 100, l: 55 },  // Green
];

const SHARD_LIFE = 300;
const RIPPLE_LIFE = 500;
const HIT_RADIUS = 30;

export interface HitResult {
  note: Note;
  beatStrength: number;
}

export class BeatSimulator {
  private notes: Note[] = [];
  private shards: Shard[] = [];
  private ripples: Ripple[] = [];
  private nextNoteId: number = 0;

  private beatInterval: number;
  private lastBeatTime: number = 0;
  private beatCount: number = 0;

  private noteSize: number = 25;
  private baseSpeed: number = 2.5;

  private combo: number = 0;
  private missCount: number = 0;
  private maxMiss: number = 5;
  private score: number = 0;
  private maxCombo: number = 0;

  private isPlaying: boolean = false;
  private gameOver: boolean = false;
  private onGameOverCallback: (() => void) | null = null;
  private onHitCallback: ((result: HitResult) => void) | null = null;

  constructor(bpm: number = 120) {
    this.beatInterval = 60000 / bpm;
  }

  start(): void {
    this.isPlaying = true;
    this.gameOver = false;
    this.lastBeatTime = performance.now();
    this.beatCount = 0;
    this.notes = [];
    this.shards = [];
    this.ripples = [];
    this.combo = 0;
    this.missCount = 0;
    this.score = 0;
    this.maxCombo = 0;
    this.nextNoteId = 0;
  }

  stop(): void {
    this.isPlaying = false;
  }

  update(currentTime: number, saberTrail: Array<{ x: number; y: number }>): void {
    if (!this.isPlaying || this.gameOver) return;

    // Check for beat
    const elapsed = currentTime - this.lastBeatTime;
    if (elapsed >= this.beatInterval) {
      this.lastBeatTime = currentTime;
      this.beatCount++;
      this.spawnBeatNotes();
    }

    // Update notes
    const centerX = window.innerWidth / 2;
    const screenPadding = this.noteSize * 2;

    for (const note of this.notes) {
      if (!note.alive || note.hit) continue;

      // Speed up when approaching center
      const distToCenter = Math.abs(note.x - centerX);
      const centerZone = window.innerWidth * 0.3;
      const speedMultiplier = 1 + Math.max(0, (centerZone - distToCenter) / centerZone) * 0.5;

      note.x += note.vx * speedMultiplier;
      note.rotation += note.rotationSpeed;

      // Check if note passed the center (miss)
      if ((note.fromLeft && note.x > centerX + screenPadding) ||
          (!note.fromLeft && note.x < centerX - screenPadding)) {
        if (note.alive && !note.hit) {
          note.alive = false;
          this.handleMiss();
        }
      }

      // Check if off screen
      if (note.x < -screenPadding || note.x > window.innerWidth + screenPadding) {
        note.alive = false;
      }
    }

    // Check hits
    if (saberTrail.length > 1) {
      for (const note of this.notes) {
        if (!note.alive || note.hit) continue;
        if (this.checkTrailHit(note, saberTrail)) {
          this.handleHit(note);
        }
      }
    }

    // Update shards
    for (const shard of this.shards) {
      shard.x += shard.vx;
      shard.y += shard.vy;
      shard.vy += 0.1; // gravity
      shard.rotation += 0.2;
      shard.life -= 16.67;
      shard.alpha = Math.max(0, shard.life / shard.maxLife);
    }
    this.shards = this.shards.filter(s => s.life > 0);

    // Update ripples
    for (const ripple of this.ripples) {
      const progress = 1 - ripple.life / ripple.maxLife;
      ripple.radius = 10 + (ripple.maxRadius - 10) * progress;
      ripple.life -= 16.67;
      ripple.alpha = Math.max(0, ripple.life / ripple.maxLife);
    }
    this.ripples = this.ripples.filter(r => r.life > 0);

    // Remove dead notes
    this.notes = this.notes.filter(n => n.alive || n.hit);
    // Keep hit notes for a short time? Actually we create effects immediately, so we can remove them
    this.notes = this.notes.filter(n => n.alive);

    // Limit active particles
    if (this.shards.length > 100) {
      this.shards = this.shards.slice(-100);
    }
    if (this.ripples.length > 20) {
      this.ripples = this.ripples.slice(-20);
    }
  }

  private spawnBeatNotes(): void {
    const notesPerBeat = 2 + Math.floor(Math.random() * 2); // 2-3 notes
    const height = window.innerHeight;

    for (let i = 0; i < notesPerBeat; i++) {
      const fromLeft = Math.random() > 0.5;
      const yPos = height * 0.2 + Math.random() * height * 0.6;
      const colorIdx = Math.floor(Math.random() * NOTE_COLORS.length);
      const color = NOTE_COLORS[colorIdx];

      // Beat strength: every 4th beat is strong
      const beatInBar = this.beatCount % 4;
      const beatStrength = beatInBar === 0 ? 1.0 : 0.6 + Math.random() * 0.3;

      const speed = this.baseSpeed * (0.8 + Math.random() * 0.4) * (fromLeft ? 1 : -1);

      const note: Note = {
        id: this.nextNoteId++,
        x: fromLeft ? -this.noteSize : window.innerWidth + this.noteSize,
        y: yPos,
        vx: speed,
        size: this.noteSize,
        color: `hsl(${color.h}, ${color.s}%, ${color.l}%)`,
        colorHsl: { h: color.h, s: color.s, l: color.l },
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        fromLeft,
        alive: true,
        hit: false,
        beatStrength,
      };

      this.notes.push(note);
    }
  }

  private checkTrailHit(note: Note, trail: Array<{ x: number; y: number }>): boolean {
    for (const point of trail) {
      const dx = point.x - note.x;
      const dy = point.y - note.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < HIT_RADIUS + note.size * 0.5) {
        return true;
      }
    }
    return false;
  }

  private handleHit(note: Note): void {
    note.hit = true;
    note.alive = false;

    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    this.missCount = 0;

    // Calculate score
    const baseScore = 100;
    const comboBonus = Math.min(this.combo * 0.1, 5);
    const strengthBonus = note.beatStrength;
    const points = Math.floor(baseScore * (1 + comboBonus) * strengthBonus);
    this.score += points;

    // Create hit effects
    this.createShards(note);
    this.createRipple(note);

    // Callback
    if (this.onHitCallback) {
      this.onHitCallback({ note, beatStrength: note.beatStrength });
    }
  }

  private createShards(note: Note): void {
    const shardCount = 6;
    const color = `hsl(${note.colorHsl.h}, ${note.colorHsl.s}%, ${note.colorHsl.l}%)`;

    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2;
      const speed = 3 + Math.random() * 3;

      this.shards.push({
        x: note.x,
        y: note.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: note.size * 0.3,
        color,
        angle,
        rotation: Math.random() * Math.PI * 2,
        alpha: 1,
        life: SHARD_LIFE,
        maxLife: SHARD_LIFE,
      });
    }
  }

  private createRipple(note: Note): void {
    const color = `hsla(${note.colorHsl.h}, ${note.colorHsl.s}%, ${note.colorHsl.l}%, 1)`;

    this.ripples.push({
      x: note.x,
      y: note.y,
      radius: 10,
      maxRadius: 80,
      color,
      alpha: 1,
      life: RIPPLE_LIFE,
      maxLife: RIPPLE_LIFE,
    });
  }

  private handleMiss(): void {
    this.combo = 0;
    this.missCount++;

    if (this.missCount >= this.maxMiss) {
      this.gameOver = true;
      if (this.onGameOverCallback) {
        this.onGameOverCallback();
      }
    }
  }

  getNotes(): Note[] {
    return this.notes;
  }

  getShards(): Shard[] {
    return this.shards;
  }

  getRipples(): Ripple[] {
    return this.ripples;
  }

  getScore(): number {
    return this.score;
  }

  getCombo(): number {
    return this.combo;
  }

  getMaxCombo(): number {
    return this.maxCombo;
  }

  getMissCount(): number {
    return this.missCount;
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  setNoteSize(size: number): void {
    this.noteSize = size;
  }

  getNoteSize(): number {
    return this.noteSize;
  }

  setOnGameOver(callback: () => void): void {
    this.onGameOverCallback = callback;
  }

  setOnHit(callback: (result: HitResult) => void): void {
    this.onHitCallback = callback;
  }

  getRating(): string {
    const score = this.score;
    if (score >= 10000) return 'S';
    if (score >= 7000) return 'A';
    if (score >= 4000) return 'B';
    if (score >= 1500) return 'C';
    return 'D';
  }
}
