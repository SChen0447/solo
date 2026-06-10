export interface Point {
  x: number;
  y: number;
}

export interface LineFrame {
  points: Point[];
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface AnimatorState {
  isPlaying: boolean;
  amplitude: number;
  frequency: number;
  colorCycle: number;
  time: number;
  deltaTime: number;
  explosionProgress: number;
  isExploding: boolean;
}

const LINE_COUNT = 12;
const POINTS_PER_LINE = 80;
const EXPANSION_SPEED = 1.5;
const SATURATION = 80;
const LIGHTNESS = 60;

export class LineAnimator {
  private lineAngles: Float32Array;
  private lineCos: Float32Array;
  private lineSin: Float32Array;
  private perpCos: Float32Array;
  private perpSin: Float32Array;
  private currentRadius: number = 0;
  private hueOffset: number = 0;

  constructor() {
    this.lineAngles = new Float32Array(LINE_COUNT);
    this.lineCos = new Float32Array(LINE_COUNT);
    this.lineSin = new Float32Array(LINE_COUNT);
    this.perpCos = new Float32Array(LINE_COUNT);
    this.perpSin = new Float32Array(LINE_COUNT);
    for (let i = 0; i < LINE_COUNT; i++) {
      const angleDeg = (i * 360) / LINE_COUNT;
      const angleRad = (angleDeg * Math.PI) / 180;
      const perpRad = angleRad + Math.PI / 2;
      this.lineAngles[i] = angleDeg;
      this.lineCos[i] = Math.cos(angleRad);
      this.lineSin[i] = Math.sin(angleRad);
      this.perpCos[i] = Math.cos(perpRad);
      this.perpSin[i] = Math.sin(perpRad);
    }
  }

  public update(state: AnimatorState, canvasWidth: number, canvasHeight: number): void {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

    if (state.isExploding) {
      const eased = 1 - Math.pow(1 - state.explosionProgress, 3);
      this.currentRadius = maxRadius * eased;
    } else if (state.isPlaying) {
      const rhythm = 1 + 0.3 * Math.sin(state.time * state.frequency * 2);
      this.currentRadius += EXPANSION_SPEED * rhythm * state.deltaTime * 60;
      if (this.currentRadius > maxRadius) {
        this.currentRadius = 0;
      }
    }

    this.hueOffset = ((state.time / state.colorCycle) * 360) % 360;
  }

  public generateFrames(state: AnimatorState, canvasWidth: number, canvasHeight: number): LineFrame[] {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const frames: LineFrame[] = [];
    const radius = this.currentRadius;

    for (let lineIdx = 0; lineIdx < LINE_COUNT; lineIdx++) {
      const baseAngle = this.lineAngles[lineIdx];
      const points: Point[] = [];
      const stepT = 1 / (POINTS_PER_LINE - 1);

      const cosA = this.lineCos[lineIdx];
      const sinA = this.lineSin[lineIdx];
      const cosP = this.perpCos[lineIdx];
      const sinP = this.perpSin[lineIdx];

      for (let p = 0; p < POINTS_PER_LINE; p++) {
        const t = p * stepT;
        const dist = t * radius;

        const wavePhase = t * POINTS_PER_LINE * state.frequency + state.time * state.frequency * 2;
        const waveAmplitude = state.amplitude * Math.sin(wavePhase * 2);
        const actualWave = waveAmplitude * (1 - t * 0.5);

        const bx = centerX + cosA * dist;
        const by = centerY + sinA * dist;

        const wx = bx + cosP * actualWave;
        const wy = by + sinP * actualWave;

        points.push({ x: wx, y: wy });
      }

      const hue = (baseAngle + this.hueOffset) % 360;
      const color = `hsl(${hue}, ${SATURATION}%, ${LIGHTNESS}%)`;
      frames.push({ points, color });
    }

    return frames;
  }

  public triggerExplosion(): void {
    this.currentRadius = 0;
  }

  public createParticles(canvasWidth: number, canvasHeight: number): Particle[] {
    const particles: Particle[] = [];
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2,
        alpha: 1,
        life: 0,
        maxLife: 0.5,
      });
    }
    return particles;
  }

  public updateParticles(particles: Particle[], deltaTime: number): Particle[] {
    return particles
      .map((p) => {
        p.life += deltaTime;
        p.x += p.vx * deltaTime * 60;
        p.y += p.vy * deltaTime * 60;
        p.alpha = 1 - p.life / p.maxLife;
        return p;
      })
      .filter((p) => p.life < p.maxLife);
  }

  public reset(): void {
    this.currentRadius = 0;
  }
}
