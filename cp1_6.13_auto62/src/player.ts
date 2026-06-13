import type { SaberState, TrailPoint } from './renderer';

const SABER_COLORS = [
  { h: 0, s: 100, l: 55 },    // Red
  { h: 200, s: 100, l: 55 },  // Blue
  { h: 120, s: 100, l: 55 },  // Green
  { h: 280, s: 100, l: 55 },  // Purple
];

const COLOR_TRANSITION_DURATION = 200;
const BRIGHTNESS_PULSE_DURATION = 300;

export class Player {
  private saberLength: number;
  private trailMaxLength: number;
  private colorIndex: number = 0;
  private targetColorIndex: number = 0;
  private colorTransitionStart: number = 0;
  private isTransitioning: boolean = false;

  private targetBrightness: number = 1.0;
  private brightnessPulseStart: number = 0;
  private baseBrightness: number = 1.0;

  private saber: SaberState;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private targetTipX: number = 0;
  private targetTipY: number = 0;
  private saberAngle: number = -Math.PI / 2;

  private readonly smoothing: number = 0.25;

  constructor(saberLength: number = 150, trailMaxLength: number = 50) {
    this.saberLength = saberLength;
    this.trailMaxLength = trailMaxLength;
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.targetTipX = this.mouseX;
    this.targetTipY = this.mouseY;

    const color = SABER_COLORS[0];
    this.saber = {
      tipX: this.mouseX,
      tipY: this.mouseY,
      handleX: this.mouseX,
      handleY: this.mouseY + saberLength,
      colorHsl: { h: color.h, s: color.s, l: color.l },
      brightness: 1.0,
      length: saberLength,
      trail: [],
      trailLength: trailMaxLength,
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

    const handlePointerMove = (e: PointerEvent) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    };

    const handlePointerDown = (e: PointerEvent) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    };

    const handlePointerUp = () => {
      // no-op
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);

    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        this.mouseX = e.touches[0].clientX;
        this.mouseY = e.touches[0].clientY;
      }
    }, { passive: false });

    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length > 0) {
        this.mouseX = e.touches[0].clientX;
        this.mouseY = e.touches[0].clientY;
      }
    });

    canvas.addEventListener('touchend', () => {
      // no-op
    });
  }

  update(_deltaTime: number): void {
    const now = Date.now();

    // Smooth tip position follow mouse
    this.targetTipX = this.mouseX;
    this.targetTipY = this.mouseY;

    this.saber.tipX += (this.targetTipX - this.saber.tipX) * this.smoothing;
    this.saber.tipY += (this.targetTipY - this.saber.tipY) * this.smoothing;

    // Calculate handle position based on saber angle
    // Angle follows the direction of movement, with some smoothing
    const dx = this.saber.tipX - this.mouseX;
    const dy = this.saber.tipY - this.mouseY;
    const moveSpeed = Math.sqrt(dx * dx + dy * dy);

    if (moveSpeed > 2) {
      const targetAngle = Math.atan2(
        this.saber.tipY - (window.innerHeight * 0.65),
        this.saber.tipX - window.innerWidth / 2
      ) + Math.PI;
      const angleDiff = this.normalizeAngle(targetAngle - this.saberAngle);
      this.saberAngle += angleDiff * 0.1;
    }

    // Calculate handle position
    this.saber.handleX = this.saber.tipX + Math.cos(this.saberAngle) * this.saberLength;
    this.saber.handleY = this.saber.tipY + Math.sin(this.saberAngle) * this.saberLength;

    // Update trail
    this.updateTrail();

    // Update color transition
    this.updateColorTransition(now);

    // Update brightness pulse
    this.updateBrightnessPulse(now);
  }

  private updateTrail(): void {
    const tipPoint: TrailPoint = {
      x: this.saber.tipX,
      y: this.saber.tipY,
      alpha: 1.0,
    };

    // Add new point
    this.saber.trail.unshift(tipPoint);

    // Remove old points and update alpha
    const maxPoints = Math.min(this.trailMaxLength, 40);
    if (this.saber.trail.length > maxPoints) {
      this.saber.trail.length = maxPoints;
    }

    // Update alpha values for fade effect
    for (let i = 0; i < this.saber.trail.length; i++) {
      this.saber.trail[i].alpha = 1 - (i / this.saber.trail.length);
    }
  }

  private updateColorTransition(now: number): void {
    if (!this.isTransitioning) return;

    const elapsed = now - this.colorTransitionStart;
    const progress = Math.min(elapsed / COLOR_TRANSITION_DURATION, 1);
    const eased = this.easeInOutCubic(progress);

    const fromColor = SABER_COLORS[this.colorIndex];
    const toColor = SABER_COLORS[this.targetColorIndex];

    // HSL interpolation
    const h = this.lerpHue(fromColor.h, toColor.h, eased);
    const s = fromColor.s + (toColor.s - fromColor.s) * eased;
    const l = fromColor.l + (toColor.l - fromColor.l) * eased;

    this.saber.colorHsl.h = h;
    this.saber.colorHsl.s = s;
    this.saber.colorHsl.l = l;

    if (progress >= 1) {
      this.isTransitioning = false;
      this.colorIndex = this.targetColorIndex;
    }
  }

  private lerpHue(h1: number, h2: number, t: number): number {
    let diff = h2 - h1;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (h1 + diff * t + 360) % 360;
  }

  private updateBrightnessPulse(now: number): void {
    const elapsed = now - this.brightnessPulseStart;
    const progress = Math.min(elapsed / BRIGHTNESS_PULSE_DURATION, 1);

    if (progress < 1) {
      // Pulse: brighten then dim back
      const pulse = Math.sin(progress * Math.PI);
      this.saber.brightness = this.baseBrightness + (this.targetBrightness - this.baseBrightness) * pulse;
    } else {
      this.saber.brightness = this.baseBrightness;
    }
  }

  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  hitNote(beatStrength: number = 1.0): void {
    // Cycle to next color
    this.targetColorIndex = (this.colorIndex + 1) % SABER_COLORS.length;
    this.colorTransitionStart = Date.now();
    this.isTransitioning = true;

    // Trigger brightness pulse
    this.targetBrightness = 1.0 + beatStrength * 0.4;
    this.brightnessPulseStart = Date.now();
  }

  getSaberState(): SaberState {
    return this.saber;
  }

  getTipPosition(): { x: number; y: number } {
    return { x: this.saber.tipX, y: this.saber.tipY };
  }

  getSaberTrailPoints(): Array<{ x: number; y: number }> {
    return this.saber.trail.slice(0, 20).map(p => ({ x: p.x, y: p.y }));
  }

  setSaberLength(length: number): void {
    this.saberLength = length;
    this.saber.length = length;
  }

  getSaberLength(): number {
    return this.saberLength;
  }

  reset(): void {
    this.colorIndex = 0;
    this.targetColorIndex = 0;
    this.isTransitioning = false;
    const color = SABER_COLORS[0];
    this.saber.colorHsl = { h: color.h, s: color.s, l: color.l };
    this.saber.brightness = 1.0;
    this.saber.trail = [];
    this.saber.tipX = window.innerWidth / 2;
    this.saber.tipY = window.innerHeight / 2;
  }
}
