export interface CrystalState {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  fixed: boolean;
  direction: number;
  speed: number;
  directionTimer: number;
  trail: Array<{ x: number; y: number; opacity: number }>;
  goldBorderPhase: number;
}

export interface GlassBlobState {
  x: number;
  y: number;
  baseRadius: number;
  stretchRatio: number;
  flatRatio: number;
  targetStretch: number;
  targetFlat: number;
  colorA: string;
  colorB: string;
  temperature: number;
  rotationAngle: number;
  rotationSpeed: number;
  opacity: number;
  isSolidified: boolean;
  solidifyProgress: number;
  crackIntensity: number;
  flowLightPhase: number;
  isDeforming: boolean;
}

export type FurnacePhase = 'idle' | 'workshop' | 'blowing' | 'solidifying' | 'complete';

export const PALETTE_A = [
  '#ff3366', '#ff6633', '#ff9933', '#ffcc33',
  '#66ccff', '#3399ff', '#9966ff', '#ff66cc',
  '#33cc99', '#99cc33', '#ff6699', '#cc66ff',
];

export const PALETTE_B = [
  '#ffe066', '#ff99cc', '#cc99ff', '#99ffcc',
  '#ffcc99', '#99ccff', '#ff9999', '#ccff99',
  '#ffdd99', '#dd99ff', '#99ffdd', '#ffaacc',
];

export class FurnaceEngine {
  phase: FurnacePhase = 'idle';
  blob: GlassBlobState;
  crystals: CrystalState[] = [];
  private nextCrystalId = 0;
  private dragging = false;
  private dragType: 'stretch' | 'flatten' | 'crystal' | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragCrystalId = -1;
  private isRotating = false;
  private lastRotateX = 0;
  private tempDecayRate = 0;
  private onStateChange?: () => void;

  constructor(private blowingAreaRadius: number = 200) {
    this.blob = this.createDefaultBlob();
  }

  setOnStateChange(cb: () => void): void {
    this.onStateChange = cb;
  }

  private notify(): void {
    this.onStateChange?.();
  }

  private createDefaultBlob(): GlassBlobState {
    return {
      x: 0,
      y: 0,
      baseRadius: 20,
      stretchRatio: 1,
      flatRatio: 1,
      targetStretch: 1,
      targetFlat: 1,
      colorA: '#fff8e1',
      colorB: '#ffe066',
      temperature: 800,
      rotationAngle: 0,
      rotationSpeed: 0,
      opacity: 0.85,
      isSolidified: false,
      solidifyProgress: 0,
      crackIntensity: 0,
      flowLightPhase: 0,
      isDeforming: false,
    };
  }

  openBlowingStation(): void {
    if (this.phase === 'idle' || this.phase === 'workshop') {
      this.phase = 'blowing';
      this.blob = this.createDefaultBlob();
      this.crystals = [];
      this.nextCrystalId = 0;
      this.notify();
    }
  }

  returnToWorkshop(): void {
    this.phase = 'workshop';
    this.dragging = false;
    this.dragType = null;
    this.notify();
  }

  handleMouseDown(x: number, y: number): void {
    if (this.phase !== 'blowing' || this.blob.isSolidified) return;

    const dx = x - this.blob.x;
    const dy = y - this.blob.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const rx = this.blob.baseRadius * this.blob.stretchRatio;
    const ry = this.blob.baseRadius * this.blob.flatRatio;

    for (const c of this.crystals) {
      const cdx = x - c.x;
      const cdy = y - c.y;
      if (Math.sqrt(cdx * cdx + cdy * cdy) < c.size + 8) {
        if (c.fixed) {
          this.dragging = true;
          this.dragType = 'crystal';
          this.dragCrystalId = c.id;
          this.dragStartX = x;
          this.dragStartY = y;
        } else {
          c.fixed = true;
          c.goldBorderPhase = 0;
        }
        this.notify();
        return;
      }
    }

    if (dist < Math.max(rx, ry) + 10) {
      this.dragging = true;
      this.dragStartX = x;
      this.dragStartY = y;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.dragType = 'stretch';
      } else {
        this.dragType = 'flatten';
      }
      this.notify();
    } else {
      this.isRotating = true;
      this.lastRotateX = x;
    }
  }

  handleMouseMove(x: number, y: number): void {
    if (this.phase !== 'blowing') return;

    if (this.dragging && this.dragType === 'crystal') {
      const crystal = this.crystals.find(c => c.id === this.dragCrystalId);
      if (crystal) {
        crystal.x = x;
        crystal.y = y;
      }
      this.notify();
      return;
    }

    if (this.dragging && this.dragType) {
      const dx = x - this.dragStartX;
      const dy = y - this.dragStartY;

      if (this.dragType === 'stretch') {
        const stretchDelta = Math.abs(dx) / this.blob.baseRadius;
        this.blob.targetStretch = Math.min(3, Math.max(1, 1 + stretchDelta * 0.5));
        this.blob.isDeforming = true;
        this.tempDecayRate = 10;
      } else if (this.dragType === 'flatten') {
        const flatDelta = Math.abs(dy) / this.blob.baseRadius;
        this.blob.targetFlat = Math.min(2, Math.max(1, 1 + flatDelta * 0.4));
        this.blob.isDeforming = true;
        this.tempDecayRate = 10;
      }
      this.notify();
    }

    if (this.isRotating) {
      const rotDelta = (x - this.lastRotateX) * 0.5;
      this.blob.rotationSpeed = rotDelta;
      this.lastRotateX = x;
    }
  }

  handleMouseUp(): void {
    if (this.dragging && this.dragType === 'crystal') {
      const crystal = this.crystals.find(c => c.id === this.dragCrystalId);
      if (crystal) {
        crystal.x = Math.max(this.blob.x - this.blob.baseRadius * this.blob.stretchRatio,
          Math.min(this.blob.x + this.blob.baseRadius * this.blob.stretchRatio, crystal.x));
        crystal.y = Math.max(this.blob.y - this.blob.baseRadius * this.blob.flatRatio,
          Math.min(this.blob.y + this.blob.baseRadius * this.blob.flatRatio, crystal.y));
      }
    }

    this.dragging = false;
    this.dragType = null;
    this.isRotating = false;

    if (this.blob.targetStretch > 1) {
      setTimeout(() => {
        this.blob.targetStretch = this.blob.stretchRatio;
        this.blob.isDeforming = false;
        this.notify();
      }, 300);
    }
    if (this.blob.targetFlat > 1) {
      setTimeout(() => {
        this.blob.targetFlat = this.blob.flatRatio;
        this.blob.isDeforming = false;
        this.notify();
      }, 200);
    }
    this.tempDecayRate = 0;
    this.notify();
  }

  handleWheel(delta: number): void {
    if (this.phase !== 'blowing') return;
    const zoomFactor = delta > 0 ? 0.95 : 1.05;
    this.blob.baseRadius = Math.max(12, Math.min(50, this.blob.baseRadius * zoomFactor));
    this.notify();
  }

  selectPaletteAColor(color: string): void {
    if (this.phase !== 'blowing' || this.blob.isSolidified) return;
    this.blob.colorA = color;
    this.notify();
  }

  selectPaletteBColor(color: string): void {
    if (this.phase !== 'blowing' || this.blob.isSolidified) return;
    this.blob.colorB = color;
    this.generateCrystals(color);
    this.notify();
  }

  private generateCrystals(baseColor: string): void {
    if (this.crystals.length >= 10) return;
    const count = Math.min(2 + Math.floor(Math.random() * 4), 10 - this.crystals.length);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * this.blob.baseRadius * 0.6;
      const rx = this.blob.baseRadius * this.blob.stretchRatio;
      const ry = this.blob.baseRadius * this.blob.flatRatio;
      const cx = this.blob.x + Math.cos(angle) * dist * (rx / this.blob.baseRadius);
      const cy = this.blob.y + Math.sin(angle) * dist * (ry / this.blob.baseRadius);

      const colorIdx = Math.floor(Math.random() * PALETTE_B.length);
      this.crystals.push({
        id: this.nextCrystalId++,
        x: cx,
        y: cy,
        size: 3 + Math.random() * 2,
        color: PALETTE_B[colorIdx],
        opacity: 0.7 + Math.random() * 0.3,
        fixed: false,
        direction: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.0,
        directionTimer: 3,
        trail: [],
        goldBorderPhase: 0,
      });
    }
  }

  startCooling(): void {
    if (this.phase !== 'blowing' || this.blob.isSolidified) return;
    if (this.blob.temperature < 450) {
      this.phase = 'solidifying';
      this.blob.solidifyProgress = 0;
      this.notify();
    }
  }

  update(dt: number): void {
    if (this.phase === 'blowing' || this.phase === 'solidifying') {
      this.updateBlob(dt);
      this.updateCrystals(dt);
    }
    if (this.phase === 'solidifying') {
      this.blob.solidifyProgress += dt / 2;
      if (this.blob.solidifyProgress >= 1) {
        this.blob.solidifyProgress = 1;
        this.blob.isSolidified = true;
        this.blob.opacity = 0.6;
        this.phase = 'complete';
        this.notify();
      }
    }
  }

  private updateBlob(dt: number): void {
    if (this.blob.isSolidified) return;

    if (this.tempDecayRate > 0 || this.blob.isDeforming) {
      this.blob.temperature = Math.max(400, this.blob.temperature - 10 * dt);
    }

    if (this.blob.temperature < 500) {
      this.blob.crackIntensity = Math.min(1, (500 - this.blob.temperature) / 100);
    } else {
      this.blob.crackIntensity = 0;
    }

    const stretchLerp = 1 - Math.pow(0.05, dt);
    this.blob.stretchRatio += (this.blob.targetStretch - this.blob.stretchRatio) * stretchLerp;
    const flatLerp = 1 - Math.pow(0.03, dt);
    this.blob.flatRatio += (this.blob.targetFlat - this.blob.flatRatio) * flatLerp;

    this.blob.flowLightPhase += dt * 3;

    if (!this.isRotating) {
      this.blob.rotationSpeed *= Math.pow(0.9, dt * 60);
      if (Math.abs(this.blob.rotationSpeed) < 0.01) {
        this.blob.rotationSpeed = 0;
      }
    }
    this.blob.rotationAngle += this.blob.rotationSpeed * dt;

    for (const c of this.crystals) {
      c.x += (this.blob.x - c.x) * 0.01;
      c.y += (this.blob.y - c.y) * 0.01;
    }
  }

  private updateCrystals(dt: number): void {
    for (const c of this.crystals) {
      if (c.fixed) {
        c.goldBorderPhase += dt;
        continue;
      }

      c.directionTimer -= dt;
      if (c.directionTimer <= 0) {
        c.direction = Math.random() * Math.PI * 2;
        c.directionTimer = 3;
      }

      const moveX = Math.cos(c.direction) * c.speed * dt;
      const moveY = Math.sin(c.direction) * c.speed * dt;

      const rx = this.blob.baseRadius * this.blob.stretchRatio * 0.8;
      const ry = this.blob.baseRadius * this.blob.flatRatio * 0.8;
      const newX = c.x + moveX;
      const newY = c.y + moveY;
      const ndx = (newX - this.blob.x) / rx;
      const ndy = (newY - this.blob.y) / ry;

      if (ndx * ndx + ndy * ndy < 1) {
        c.x = newX;
        c.y = newY;
      } else {
        c.direction += Math.PI * 0.5 + Math.random() * Math.PI;
      }

      c.trail.unshift({ x: c.x, y: c.y, opacity: 0.6 });
      const maxTrailLen = 15;
      if (c.trail.length > maxTrailLen) {
        c.trail.length = maxTrailLen;
      }
      for (let i = 0; i < c.trail.length; i++) {
        c.trail[i].opacity = 0.6 * (1 - i / c.trail.length);
      }
    }
  }

  getVesselData() {
    return {
      shape: {
        stretchRatio: this.blob.stretchRatio,
        flatRatio: this.blob.flatRatio,
      },
      colorA: this.blob.colorA,
      colorB: this.blob.colorB,
      crystals: this.crystals.map(c => ({
        x: c.x - this.blob.x,
        y: c.y - this.blob.y,
        size: c.size,
        color: c.color,
        opacity: c.opacity,
        fixed: c.fixed,
      })),
    };
  }

  resetBlowing(): void {
    this.phase = 'blowing';
    this.blob = this.createDefaultBlob();
    this.crystals = [];
    this.nextCrystalId = 0;
    this.dragging = false;
    this.dragType = null;
    this.notify();
  }
}
