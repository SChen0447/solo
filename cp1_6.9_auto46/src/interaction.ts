import type p5 from 'p5';

export type InteractionState = 'idle' | 'heat' | 'cold' | 'pulse' | 'transition';

export interface HeatSource {
  x: number;
  y: number;
  strength: number;
  radius: number;
}

export interface ColdSource {
  x: number;
  y: number;
  strength: number;
  radius: number;
  startTime: number;
  duration: number;
}

export class InteractionManager {
  private p: p5;
  private mouseX: number;
  private mouseY: number;
  private isMouseOver: boolean;
  private isMousePressed: boolean;
  private heatSources: HeatSource[];
  private coldSources: ColdSource[];
  private heatDecayRate: number;
  private interactionState: InteractionState;
  private pulseStartTime: number;
  private pulseDuration: number;
  private isPulseActive: boolean;
  private onSpacePressCallback: (() => void) | null;

  constructor(p: p5) {
    this.p = p;
    this.mouseX = 0;
    this.mouseY = 0;
    this.isMouseOver = false;
    this.isMousePressed = false;
    this.heatSources = [];
    this.coldSources = [];
    this.heatDecayRate = 0.008;
    this.interactionState = 'idle';
    this.pulseStartTime = 0;
    this.pulseDuration = 1000;
    this.isPulseActive = false;
    this.onSpacePressCallback = null;
  }

  setup(): void {
    this.p.mouseMoved = () => this.handleMouseMove();
    this.p.mousePressed = () => this.handleMousePress();
    this.p.mouseReleased = () => this.handleMouseRelease();
    this.p.mouseDragged = () => this.handleMouseDrag();
    this.p.touchStarted = () => this.handleTouchStart();
    this.p.touchMoved = () => this.handleTouchMove();
    this.p.touchEnded = () => this.handleTouchEnd();
    this.p.keyPressed = () => this.handleKeyPress();
    this.p.mouseWheel = (event: WheelEvent) => this.handleWheel(event);
  }

  private handleMouseMove(): void {
    this.mouseX = this.p.mouseX;
    this.mouseY = this.p.mouseY;
    this.isMouseOver = true;

    if (this.isMousePressed) {
      this.addHeatSource(this.mouseX, this.mouseY, 1.0);
    }
  }

  private handleMouseDrag(): void {
    this.mouseX = this.p.mouseX;
    this.mouseY = this.p.mouseY;
    this.addHeatSource(this.mouseX, this.mouseY, 1.0);
  }

  private handleMousePress(): void {
    this.isMousePressed = true;
    this.mouseX = this.p.mouseX;
    this.mouseY = this.p.mouseY;
    this.addColdSource(this.mouseX, this.mouseY, 1.0);
  }

  private handleMouseRelease(): void {
    this.isMousePressed = false;
  }

  private handleTouchStart(): void {
    if (this.p.touches.length > 0) {
      const touch = this.p.touches[0] as { x: number; y: number };
      this.addColdSource(touch.x, touch.y, 1.0);
    }
  }

  private handleTouchMove(): void {
    if (this.p.touches.length > 0) {
      const touch = this.p.touches[0] as { x: number; y: number };
      this.mouseX = touch.x;
      this.mouseY = touch.y;
      this.addHeatSource(touch.x, touch.y, 1.0);
    }
  }

  private handleTouchEnd(): void {
  }

  private handleKeyPress(): void {
    if (this.p.key === ' ' && !this.isPulseActive) {
      this.triggerPulse();
      if (this.onSpacePressCallback) {
        this.onSpacePressCallback();
      }
    }
  }

  private handleWheel(event: WheelEvent): void {
    const scrollDir = event.deltaY > 0 ? 1 : -1;
    if (this.isMouseOver) {
      this.addHeatSource(this.mouseX, this.mouseY, 0.5 * scrollDir);
    }
  }

  setOnSpacePressCallback(callback: () => void): void {
    this.onSpacePressCallback = callback;
  }

  triggerPulse(): void {
    this.isPulseActive = true;
    this.pulseStartTime = performance.now();
    this.interactionState = 'pulse';
  }

  getPulseProgress(): number {
    if (!this.isPulseActive) return 0;
    const elapsed = performance.now() - this.pulseStartTime;
    const progress = Math.min(elapsed / this.pulseDuration, 1);

    if (progress >= 1) {
      this.isPulseActive = false;
    }

    return progress;
  }

  getPulseBrightnessMultiplier(): number {
    const progress = this.getPulseProgress();
    if (progress === 0) return 1;

    const flashPhase = 0.2;
    const recoverPhase = 0.8;

    if (progress < flashPhase) {
      const t = progress / flashPhase;
      return this.easeOutExpo(t);
    } else {
      const t = (progress - flashPhase) / recoverPhase;
      return 1 + (1 - this.easeOutExpo(t));
    }
  }

  private easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  addHeatSource(x: number, y: number, strength: number): void {
    this.heatSources.push({
      x,
      y,
      strength: Math.min(strength, 1.5),
      radius: 120
    });
    this.interactionState = 'heat';
  }

  addColdSource(x: number, y: number, strength: number): void {
    this.coldSources.push({
      x,
      y,
      strength,
      radius: 150,
      startTime: performance.now(),
      duration: 1500
    });
    this.interactionState = 'cold';
  }

  update(): void {
    this.heatSources = this.heatSources.filter((source) => {
      source.strength -= this.heatDecayRate;
      return source.strength > 0;
    });

    const now = performance.now();
    this.coldSources = this.coldSources.filter((source) => {
      const elapsed = now - source.startTime;
      return elapsed < source.duration;
    });

    if (this.isPulseActive) {
      this.interactionState = 'pulse';
    } else if (this.heatSources.length > 0) {
      this.interactionState = 'heat';
    } else if (this.coldSources.length > 0) {
      this.interactionState = 'cold';
    } else {
      this.interactionState = 'idle';
    }
  }

  setTransitionState(): void {
    this.interactionState = 'transition';
  }

  getInteractionState(): InteractionState {
    return this.interactionState;
  }

  getInteractionStateLabel(): string {
    switch (this.interactionState) {
      case 'idle':
        return '无交互';
      case 'heat':
        return '热源激活';
      case 'cold':
        return '冷源激活';
      case 'pulse':
        return '色彩脉冲';
      case 'transition':
        return '季节切换中';
      default:
        return '无交互';
    }
  }

  getHeatEffect(x: number, y: number): number {
    let effect = 0;
    for (const source of this.heatSources) {
      const dist = Math.sqrt((x - source.x) ** 2 + (y - source.y) ** 2);
      if (dist < source.radius) {
        effect += (1 - dist / source.radius) * source.strength;
      }
    }
    return Math.min(effect, 1);
  }

  getColdEffect(x: number, y: number): number {
    let effect = 0;
    const now = performance.now();
    for (const source of this.coldSources) {
      const dist = Math.sqrt((x - source.x) ** 2 + (y - source.y) ** 2);
      if (dist < source.radius) {
        const elapsed = now - source.startTime;
        const timeFactor = 1 - elapsed / source.duration;
        effect += (1 - dist / source.radius) * source.strength * timeFactor;
      }
    }
    return Math.min(effect, 1);
  }

  getColdContraction(x: number, y: number): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;
    const now = performance.now();

    for (const source of this.coldSources) {
      const distX = source.x - x;
      const distY = source.y - y;
      const dist = Math.sqrt(distX * distX + distY * distY);

      if (dist < source.radius && dist > 0) {
        const elapsed = now - source.startTime;
        const timeFactor = 1 - elapsed / source.duration;
        const strength = (1 - dist / source.radius) * source.strength * timeFactor * 0.5;
        dx += (distX / dist) * strength;
        dy += (distY / dist) * strength;
      }
    }

    return { dx, dy };
  }

  getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  getHeatSources(): HeatSource[] {
    return [...this.heatSources];
  }

  getColdSources(): ColdSource[] {
    return [...this.coldSources];
  }
}
