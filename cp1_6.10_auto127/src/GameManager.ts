import { Tube } from './Tube';

export const COLORS: string[] = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f1c40f',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#ecf0f1',
];

export interface PourAnimation {
  sourceId: number;
  targetId: number;
  color: string;
  layersToPour: number;
  layersPoured: string[];
  startTime: number;
  duration: number;
}

export interface ShakeAnimation {
  tubeId: number;
  startTime: number;
  duration: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export class GameManager {
  public static readonly TUBE_COUNT = 8;
  public static readonly TUBE_CAPACITY = 4;
  public static readonly TUBE_WIDTH = 24;
  public static readonly TUBE_HEIGHT = 320;
  public static readonly TUBE_SPACING = 30;
  public static readonly CANVAS_WIDTH = 700;
  public static readonly CANVAS_HEIGHT = 600;

  public tubes: Tube[] = [];
  public selectedTubeId: number | null = null;
  public moves: number = 0;
  public isWon: boolean = false;
  public pourAnimation: PourAnimation | null = null;
  public shakeAnimation: ShakeAnimation | null = null;
  public particles: Particle[] = [];
  public completedTubeIds: Set<number> = new Set();
  public initialColors: Map<number, string[]> = new Map();
  public winStartTime: number | null = null;
  public selectStartTime: number | null = null;
  public hoverResetButton: boolean = false;

  private audioContext: AudioContext | null = null;
  private newCompletedThisFrame: number[] = [];

  constructor() {
    this.generateLevel();
  }

  private initAudio(): void {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        this.audioContext = null;
      }
    }
  }

  playDingSound(): void {
    this.initAudio();
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  private computeTubePositions(): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const totalWidth =
      GameManager.TUBE_COUNT * GameManager.TUBE_WIDTH +
      (GameManager.TUBE_COUNT - 1) * GameManager.TUBE_SPACING;
    const startX = (GameManager.CANVAS_WIDTH - totalWidth) / 2 + GameManager.TUBE_WIDTH / 2;
    const tubeY = GameManager.CANVAS_HEIGHT - 60;
    for (let i = 0; i < GameManager.TUBE_COUNT; i++) {
      positions.push({
        x: startX + i * (GameManager.TUBE_WIDTH + GameManager.TUBE_SPACING),
        y: tubeY,
      });
    }
    return positions;
  }

  generateLevel(): void {
    this.tubes = [];
    this.selectedTubeId = null;
    this.moves = 0;
    this.isWon = false;
    this.pourAnimation = null;
    this.shakeAnimation = null;
    this.particles = [];
    this.completedTubeIds = new Set();
    this.initialColors.clear();
    this.winStartTime = null;
    this.selectStartTime = null;

    const numColors = 4;
    const chosenColors = [...COLORS].sort(() => Math.random() - 0.5).slice(0, numColors);
    const positions = this.computeTubePositions();

    for (let i = 0; i < GameManager.TUBE_COUNT; i++) {
      const pos = positions[i];
      this.tubes.push(
        new Tube(
          i,
          GameManager.TUBE_CAPACITY,
          pos.x,
          pos.y,
          GameManager.TUBE_WIDTH,
          GameManager.TUBE_HEIGHT
        )
      );
    }

    for (let i = 0; i < numColors; i++) {
      const color = chosenColors[i];
      for (let j = 0; j < GameManager.TUBE_CAPACITY; j++) {
        this.tubes[i].colors.push(color);
      }
    }

    const shuffleSteps = 3 + Math.floor(Math.random() * 3);
    for (let step = 0; step < shuffleSteps; step++) {
      this.performRandomValidMove();
    }

    this.tubes.forEach((t) => {
      this.initialColors.set(t.id, [...t.colors]);
    });

    this.updateCompletedTubes(true);
  }

  private performRandomValidMove(): void {
    const attempts = 100;
    for (let i = 0; i < attempts; i++) {
      const srcIdx = Math.floor(Math.random() * this.tubes.length);
      const tgtIdx = Math.floor(Math.random() * this.tubes.length);
      if (srcIdx === tgtIdx) continue;
      const src = this.tubes[srcIdx];
      const tgt = this.tubes[tgtIdx];
      if (src.isEmpty() || tgt.isFull()) continue;
      const topColor = src.topColor();
      if (topColor === null) continue;
      if (!tgt.isEmpty() && tgt.topColor() !== topColor) continue;
      const count = Math.min(src.consecutiveTopCount(), tgt.capacity - tgt.colors.length);
      if (count <= 0) continue;
      const poured = src.pour(count);
      tgt.receive(poured);
      return;
    }
  }

  reset(): void {
    this.selectedTubeId = null;
    this.moves = 0;
    this.isWon = false;
    this.pourAnimation = null;
    this.shakeAnimation = null;
    this.particles = [];
    this.completedTubeIds = new Set();
    this.winStartTime = null;
    this.selectStartTime = null;
    this.tubes.forEach((t) => {
      const colors = this.initialColors.get(t.id);
      if (colors) t.setColors(colors);
    });
    this.updateCompletedTubes(true);
  }

  getResetButtonBounds(): { x: number; y: number; r: number } {
    return { x: GameManager.CANVAS_WIDTH - 40, y: 40, r: 20 };
  }

  isResetButton(px: number, py: number): boolean {
    const b = this.getResetButtonBounds();
    const dx = px - b.x;
    const dy = py - b.y;
    return dx * dx + dy * dy <= b.r * b.r;
  }

  handleClick(px: number, py: number): void {
    if (this.pourAnimation) return;

    if (this.isResetButton(px, py)) {
      this.reset();
      return;
    }

    if (this.isWon) return;

    const tube = this.findTubeAt(px, py);
    if (!tube) {
      this.selectedTubeId = null;
      this.selectStartTime = null;
      return;
    }

    if (this.selectedTubeId === null) {
      if (!tube.isEmpty()) {
        this.selectedTubeId = tube.id;
        this.selectStartTime = performance.now();
      }
      return;
    }

    if (this.selectedTubeId === tube.id) {
      this.selectedTubeId = null;
      this.selectStartTime = null;
      return;
    }

    const source = this.tubes.find((t) => t.id === this.selectedTubeId);
    if (!source) {
      this.selectedTubeId = null;
      this.selectStartTime = null;
      return;
    }

    const topColor = source.topColor();
    if (topColor === null || !tube.canReceive(topColor)) {
      this.shakeAnimation = {
        tubeId: tube.id,
        startTime: performance.now(),
        duration: 200,
      };
      return;
    }

    const layersPoured = Math.min(
      source.consecutiveTopCount(),
      tube.capacity - tube.colors.length
    );
    if (layersPoured <= 0) {
      this.shakeAnimation = {
        tubeId: tube.id,
        startTime: performance.now(),
        duration: 200,
      };
      return;
    }

    const pouredColors: string[] = [];
    for (let i = 0; i < layersPoured; i++) pouredColors.push(topColor);

    this.pourAnimation = {
      sourceId: source.id,
      targetId: tube.id,
      color: topColor,
      layersToPour: layersPoured,
      layersPoured: pouredColors,
      startTime: performance.now(),
      duration: 400,
    };

    this.moves++;
    source.pour(layersPoured);
    this.selectedTubeId = null;
    this.selectStartTime = null;
  }

  private findTubeAt(px: number, py: number): Tube | null {
    for (const t of this.tubes) {
      if (t.containsPoint(px, py)) return t;
    }
    return null;
  }

  update(now: number): void {
    this.newCompletedThisFrame = [];

    if (this.shakeAnimation) {
      if (now - this.shakeAnimation.startTime >= this.shakeAnimation.duration) {
        this.shakeAnimation = null;
      }
    }

    if (this.pourAnimation) {
      const elapsed = now - this.pourAnimation.startTime;
      if (elapsed >= this.pourAnimation.duration) {
        const target = this.tubes.find((t) => t.id === this.pourAnimation!.targetId);
        if (target) target.receive(this.pourAnimation.layersPoured);
        this.pourAnimation = null;
        this.updateCompletedTubes();
        this.checkWin(now);
      }
    }

    if (this.particles.length > 0) {
      const dt = 1 / 60;
      this.particles = this.particles.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        return p.life > 0;
      });
    }

    if (this.newCompletedThisFrame.length > 0) {
      this.playDingSound();
    }
  }

  private updateCompletedTubes(silent: boolean = false): void {
    this.tubes.forEach((t) => {
      if (t.isComplete() && !this.completedTubeIds.has(t.id)) {
        this.completedTubeIds.add(t.id);
        if (!silent) this.newCompletedThisFrame.push(t.id);
      }
    });
  }

  private checkWin(now: number): void {
    const nonEmpty = this.tubes.filter((t) => !t.isEmpty());
    const allComplete = nonEmpty.every((t) => t.isComplete());
    if (allComplete && !this.isWon) {
      this.isWon = true;
      this.winStartTime = now;
      this.spawnWinParticles();
    }
  }

  private spawnWinParticles(): void {
    this.particles = [];
    const count = 100;
    for (let i = 0; i < count; i++) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.particles.push({
        x: Math.random() * GameManager.CANVAS_WIDTH,
        y: GameManager.CANVAS_HEIGHT + 10,
        vx: (Math.random() - 0.5) * 40,
        vy: -(50 + Math.random() * 50),
        radius: 2 + Math.random() * 3,
        color,
        life: 1.5,
        maxLife: 1.5,
      });
    }
  }

  getTubes(): Tube[] {
    return this.tubes;
  }
}
