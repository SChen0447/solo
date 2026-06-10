export interface SoundWave {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  lineWidth: number;
  progress: number;
  duration: number;
  elapsed: number;
  speed: number;
  active: boolean;
}

export interface StoneState {
  id: number;
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  color: string;
  baseColor: string;
  isOnCooldown: boolean;
  cooldownRemaining: number;
  pulseTimer: number;
  pulseActive: boolean;
  breathPhase: number;
  celebrateFlash: number;
}

const COOLDOWN_DURATION = 2;
const PULSE_DURATION = 0.3;
const PULSE_SCALE = 1.1;
const COOLDOWN_SCALE = 0.85;
const WAVE_MAX_RADIUS = 200;
const WAVE_SPEED = 167;
const WAVE_DURATION = 1.2;
const WAVE_MAX_LINE_WIDTH = 4;

let waveIdCounter = 0;

export class ResonanceStone {
  state: StoneState;
  private waves: SoundWave[] = [];

  constructor(id: number, x: number, y: number, radius: number, color: string) {
    this.state = {
      id,
      x,
      y,
      radius,
      baseRadius: radius,
      color,
      baseColor: color,
      isOnCooldown: false,
      cooldownRemaining: 0,
      pulseTimer: 0,
      pulseActive: false,
      breathPhase: Math.random() * Math.PI * 2,
      celebrateFlash: 0,
    };
  }

  activate(): SoundWave | null {
    if (this.state.isOnCooldown) return null;

    this.state.isOnCooldown = true;
    this.state.cooldownRemaining = COOLDOWN_DURATION;

    const wave: SoundWave = {
      id: ++waveIdCounter,
      x: this.state.x,
      y: this.state.y,
      radius: 0,
      maxRadius: WAVE_MAX_RADIUS,
      color: this.state.baseColor,
      lineWidth: WAVE_MAX_LINE_WIDTH,
      progress: 0,
      duration: WAVE_DURATION,
      elapsed: 0,
      speed: WAVE_SPEED,
      active: true,
    };
    this.waves.push(wave);
    return wave;
  }

  triggerCelebrateFlash(duration: number = 0.5): void {
    this.state.celebrateFlash = duration;
  }

  getActiveWaves(): SoundWave[] {
    return this.waves.filter(w => w.active);
  }

  hitTest(px: number, py: number): boolean {
    const dx = px - this.state.x;
    const dy = py - this.state.y;
    return dx * dx + dy * dy <= this.state.baseRadius * this.state.baseRadius;
  }

  update(deltaTime: number): SoundWave[] {
    this.state.breathPhase += deltaTime * 2;

    if (this.state.isOnCooldown) {
      this.state.cooldownRemaining -= deltaTime;
      if (this.state.cooldownRemaining <= 0) {
        this.state.isOnCooldown = false;
        this.state.cooldownRemaining = 0;
        this.state.pulseActive = true;
        this.state.pulseTimer = PULSE_DURATION;
      }
    }

    if (this.state.pulseActive) {
      this.state.pulseTimer -= deltaTime;
      if (this.state.pulseTimer <= 0) {
        this.state.pulseActive = false;
        this.state.pulseTimer = 0;
      }
    }

    if (this.state.celebrateFlash > 0) {
      this.state.celebrateFlash -= deltaTime;
      if (this.state.celebrateFlash < 0) this.state.celebrateFlash = 0;
    }

    this.updateScale();
    this.updateColor();

    const expiredWaves: SoundWave[] = [];
    for (const wave of this.waves) {
      if (!wave.active) continue;

      wave.elapsed += deltaTime;
      wave.radius = wave.speed * wave.elapsed;
      wave.progress = Math.min(wave.elapsed / wave.duration, 1);
      wave.lineWidth = WAVE_MAX_LINE_WIDTH * (1 - wave.progress);

      if (wave.progress >= 1 || wave.radius >= wave.maxRadius) {
        wave.active = false;
        expiredWaves.push(wave);
      }
    }

    this.waves = this.waves.filter(w => w.active);
    return expiredWaves;
  }

  private updateScale(): void {
    let scale = 1;

    if (this.state.isOnCooldown) {
      scale = COOLDOWN_SCALE;
    } else if (this.state.pulseActive) {
      const t = 1 - this.state.pulseTimer / PULSE_DURATION;
      const pulseProgress = Math.sin(t * Math.PI);
      scale = 1 + (PULSE_SCALE - 1) * pulseProgress;
    }

    this.state.radius = this.state.baseRadius * scale;
  }

  private updateColor(): void {
    if (this.state.celebrateFlash > 0) {
      this.state.color = '#ffffff';
      return;
    }

    if (this.state.isOnCooldown) {
      this.state.color = this.darkenColor(this.state.baseColor, 0.5);
    } else {
      this.state.color = this.state.baseColor;
    }
  }

  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dr = Math.round(r * factor);
    const dg = Math.round(g * factor);
    const db = Math.round(b * factor);
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const breathScale = 1 + Math.sin(this.state.breathPhase) * 0.08;
    const glowRadius = this.state.baseRadius * 2 * breathScale;

    const glowGrad = ctx.createRadialGradient(
      this.state.x, this.state.y, this.state.radius * 0.5,
      this.state.x, this.state.y, glowRadius
    );
    glowGrad.addColorStop(0, this.hexToRgba(this.state.baseColor, 0.35));
    glowGrad.addColorStop(1, this.hexToRgba(this.state.baseColor, 0));

    ctx.beginPath();
    ctx.arc(this.state.x, this.state.y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    for (const wave of this.waves) {
      if (!wave.active) continue;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.hexToRgba(wave.color, 1 - wave.progress);
      ctx.lineWidth = wave.lineWidth;
      ctx.stroke();
    }

    const stoneGrad = ctx.createRadialGradient(
      this.state.x - this.state.radius * 0.3,
      this.state.y - this.state.radius * 0.3,
      0,
      this.state.x, this.state.y, this.state.radius
    );
    stoneGrad.addColorStop(0, this.lightenColor(this.state.color, 1.3));
    stoneGrad.addColorStop(0.7, this.state.color);
    stoneGrad.addColorStop(1, this.darkenColor(this.state.color, 0.6));

    ctx.beginPath();
    ctx.arc(this.state.x, this.state.y, this.state.radius, 0, Math.PI * 2);
    ctx.fillStyle = stoneGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.state.x, this.state.y, this.state.radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.hexToRgba('#000000', 0.3);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private lightenColor(hex: string, factor: number): string {
    const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * factor));
    const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * factor));
    const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * factor));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
