import { Gear, GearType, GEAR_PRESETS } from './gear';

export type EngagementCallback = (gear1: Gear, gear2: Gear) => void;
export type DisengagementCallback = (gear: Gear) => void;

export class InteractionManager {
  canvas: HTMLCanvasElement;
  gears: Gear[];
  driverGear: Gear;
  targetGear: Gear;
  draggingGear: Gear | null;
  ghostGear: Gear | null;
  maxGears: number;
  onEngage: EngagementCallback | null;
  onDisengage: DisengagementCallback | null;
  mouseX: number;
  mouseY: number;
  offsetX: number;
  offsetY: number;
  audioContext: AudioContext | null;

  constructor(
    canvas: HTMLCanvasElement,
    gears: Gear[],
    driverGear: Gear,
    targetGear: Gear,
    maxGears: number = 6
  ) {
    this.canvas = canvas;
    this.gears = gears;
    this.driverGear = driverGear;
    this.targetGear = targetGear;
    this.draggingGear = null;
    this.ghostGear = null;
    this.maxGears = maxGears;
    this.onEngage = null;
    this.onDisengage = null;
    this.mouseX = 0;
    this.mouseY = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.audioContext = null;
    this.initAudio();
    this.bindEvents();
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      this.audioContext = null;
    }
  }

  playClickSound(): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 800;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3000;
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(1800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    oscillator.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.12);

    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
    }
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2000;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.08);
  }

  getGearsOnCanvas(): Gear[] {
    return this.gears.filter(g => g !== this.driverGear && g !== this.targetGear);
  }

  getGearCount(): number {
    return this.getGearsOnCanvas().length;
  }

  canAddGear(): boolean {
    return this.getGearCount() < this.maxGears;
  }

  spawnGear(type: Exclude<GearType, 'driver' | 'target'>, x: number, y: number): Gear | null {
    if (!this.canAddGear()) return null;
    const preset = GEAR_PRESETS[type];
    const gear = new Gear({
      type,
      x,
      y,
      ...preset
    });
    gear.homeX = x;
    gear.homeY = y;
    this.gears.push(gear);
    return gear;
  }

  createGhostGear(type: Exclude<GearType, 'driver' | 'target'>, x: number, y: number): void {
    const preset = GEAR_PRESETS[type];
    this.ghostGear = new Gear({
      type,
      x,
      y,
      ...preset
    });
    this.ghostGear.isGhost = true;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const { x, y } = this.getCanvasCoords(e);
    for (let i = this.gears.length - 1; i >= 0; i--) {
      const gear = this.gears[i];
      if (gear === this.driverGear || gear === this.targetGear) continue;
      if (gear.containsPoint(x, y) && !gear.isReturning) {
        this.startDragging(gear, x, y);
        return;
      }
    }
  }

  startDragging(gear: Gear, x: number, y: number): void {
    this.draggingGear = gear;
    gear.isDragging = true;
    this.offsetX = x - gear.x;
    this.offsetY = y - gear.y;
    if (gear.isEngaged && gear.connectedTo) {
      this.disengageChain(gear);
    }
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private disengageChain(gear: Gear): void {
    const toDisengage: Gear[] = [];
    const collectDependent = (g: Gear): void => {
      for (const other of this.gears) {
        if (other !== g && other.connectedTo === g && !toDisengage.includes(other)) {
          toDisengage.push(other);
          collectDependent(other);
        }
      }
    };
    toDisengage.push(gear);
    collectDependent(gear);
    for (const g of toDisengage) {
      g.disengage();
      if (this.onDisengage) {
        this.onDisengage(g);
      }
    }
  }

  handleMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    this.mouseX = x;
    this.mouseY = y;
    if (this.draggingGear) {
      this.draggingGear.x = x - this.offsetX;
      this.draggingGear.y = y - this.offsetY;
    }
    if (this.ghostGear) {
      this.ghostGear.x = x;
      this.ghostGear.y = y;
    }
  }

  handleMouseUp(_e: MouseEvent): void {
    if (this.draggingGear) {
      this.finishDragging();
    }
    if (this.ghostGear) {
      this.ghostGear = null;
    }
  }

  finishDragging(): void {
    if (!this.draggingGear) return;
    const gear = this.draggingGear;
    gear.isDragging = false;
    const engaged = this.tryEngage(gear);
    if (!engaged) {
      gear.isReturning = true;
      gear.returnProgress = 0;
    }
    this.draggingGear = null;
  }

  tryEngage(gear: Gear): boolean {
    const candidates = [this.driverGear, this.targetGear, ...this.getGearsOnCanvas().filter(g => g !== gear)];
    for (const other of candidates) {
      if (!other) continue;
      if (gear.canEngageWith(other)) {
        gear.snapTo(other);
        gear.engageWith(other);
        this.playClickSound();
        if (this.onEngage) {
          this.onEngage(gear, other);
        }
        this.tryEngageDependents();
        return true;
      }
    }
    return false;
  }

  tryEngageDependents(): void {
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 10) {
      changed = false;
      iterations++;
      for (const gear of this.getGearsOnCanvas()) {
        if (gear.isEngaged) continue;
        const candidates = [this.driverGear, this.targetGear, ...this.getGearsOnCanvas().filter(g => g !== gear && g.isEngaged)];
        for (const other of candidates) {
          if (!other || !other.isEngaged) continue;
          if (gear.canEngageWith(other)) {
            gear.snapTo(other);
            gear.engageWith(other);
            if (this.onEngage) {
              this.onEngage(gear, other);
            }
            changed = true;
            break;
          }
        }
      }
    }
  }

  releaseGhost(type: Exclude<GearType, 'driver' | 'target'>): Gear | null {
    if (!this.ghostGear) return null;
    const { x, y } = { x: this.ghostGear.x, y: this.ghostGear.y };
    this.ghostGear = null;
    const newGear = this.spawnGear(type, x, y);
    if (!newGear) return null;
    if (x >= 0 && x <= this.canvas.width && y >= 0 && y <= this.canvas.height) {
      this.startDragging(newGear, x, y);
    } else {
      newGear.isReturning = true;
    }
    return newGear;
  }

  reset(): void {
    const playerGears = this.getGearsOnCanvas();
    for (const gear of playerGears) {
      const idx = this.gears.indexOf(gear);
      if (idx !== -1) {
        this.gears.splice(idx, 1);
      }
    }
    this.targetGear.isEngaged = false;
    this.targetGear.connectedTo = null;
    this.targetGear.angularVelocity = 0;
    this.draggingGear = null;
    this.ghostGear = null;
  }

  getChainLengthToTarget(): number {
    if (!this.targetGear.isEngaged) return 0;
    let count = 0;
    let current: Gear | null = this.targetGear.connectedTo;
    while (current && current !== this.driverGear) {
      count++;
      current = current.connectedTo;
    }
    return count + (current === this.driverGear ? 1 : 0);
  }

  isTargetDriven(): boolean {
    if (!this.targetGear.isEngaged) return false;
    let current: Gear | null = this.targetGear.connectedTo;
    const visited = new Set<Gear>();
    while (current && !visited.has(current)) {
      visited.add(current);
      if (current === this.driverGear) return true;
      current = current.connectedTo;
    }
    return false;
  }

  getGearRatio(): number {
    if (!this.isTargetDriven()) return 0;
    if (this.targetGear.angularVelocity === 0) return 0;
    return Math.abs(this.driverGear.angularVelocity / this.targetGear.angularVelocity);
  }
}
