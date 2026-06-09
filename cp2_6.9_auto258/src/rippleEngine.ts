export interface RippleParams {
  centerX: number;
  centerY: number;
  frequency: number;
  amplitude: number;
  decay: number;
}

interface Ripple {
  createdAt: number;
  centerX: number;
  centerY: number;
  amplitude: number;
  frequency: number;
  decay: number;
  currentAmplitude: number;
}

const GRID_COLS = 320;
const GRID_ROWS = 240;
const CELL_SIZE = 16;
const RIPPLE_RADIUS = 60;
const PROPAGATION_SPEED = 120;
const MAX_RIPPLES = 50;
const AMPLITUDE_THRESHOLD = 0.01;

export class RippleEngine {
  private ripples: Ripple[] = [];
  private heightMap: Float32Array;
  private paused: boolean = false;
  private gridCols: number = GRID_COLS;
  private gridRows: number = GRID_ROWS;
  private cellSize: number = CELL_SIZE;

  constructor() {
    this.heightMap = new Float32Array(this.gridCols * this.gridRows);
  }

  getGridCols(): number {
    return this.gridCols;
  }

  getGridRows(): number {
    return this.gridRows;
  }

  getCellSize(): number {
    return this.cellSize;
  }

  addRipple(params: RippleParams, currentTime: number): void {
    if (this.ripples.length >= MAX_RIPPLES) {
      this.ripples.shift();
    }

    this.ripples.push({
      createdAt: currentTime,
      centerX: params.centerX,
      centerY: params.centerY,
      amplitude: params.amplitude,
      frequency: params.frequency,
      decay: params.decay,
      currentAmplitude: params.amplitude
    });
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  reset(): void {
    this.ripples = [];
    this.heightMap.fill(0);
  }

  update(currentTime: number, _deltaTime: number): Float32Array {
    if (this.paused) {
      return this.heightMap;
    }

    this.heightMap.fill(0);

    const activeRipples: Ripple[] = [];

    for (const ripple of this.ripples) {
      const age = (currentTime - ripple.createdAt) / 1000;

      const frames = age * 60;
      ripple.currentAmplitude = ripple.amplitude * Math.pow(ripple.decay, frames);

      if (ripple.currentAmplitude < AMPLITUDE_THRESHOLD) {
        continue;
      }

      activeRipples.push(ripple);

      const waveFront = age * PROPAGATION_SPEED;
      const angularFrequency = 2 * Math.PI * ripple.frequency;

      const centerGX = ripple.centerX / this.cellSize;
      const centerGY = ripple.centerY / this.cellSize;

      const maxDistPx = waveFront + RIPPLE_RADIUS;
      const minDistPx = Math.max(0, waveFront - RIPPLE_RADIUS * 3);
      const maxDistG = maxDistPx / this.cellSize;
      const minDistG = minDistPx / this.cellSize;

      const minCol = Math.max(0, Math.floor(centerGX - maxDistG));
      const maxCol = Math.min(this.gridCols - 1, Math.ceil(centerGX + maxDistG));
      const minRow = Math.max(0, Math.floor(centerGY - maxDistG));
      const maxRow = Math.min(this.gridRows - 1, Math.ceil(centerGY + maxDistG));

      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const dxG = col - centerGX;
          const dyG = row - centerGY;
          const distG = Math.sqrt(dxG * dxG + dyG * dyG);
          const distPx = distG * this.cellSize;

          if (distPx > maxDistPx || distPx < minDistPx) {
            continue;
          }

          const r = distPx - waveFront;
          const envelope = Math.exp(-(r * r) / (2 * RIPPLE_RADIUS * RIPPLE_RADIUS));
          const wave = Math.cos(angularFrequency * (distPx / PROPAGATION_SPEED - age));
          const height = ripple.currentAmplitude * envelope * wave;

          const idx = row * this.gridCols + col;
          this.heightMap[idx] += height;
        }
      }
    }

    this.ripples = activeRipples;

    return this.heightMap;
  }

  getHeightMap(): Float32Array {
    return this.heightMap;
  }
}
