export type RGB = [number, number, number];

export interface FluidParams {
  viscosity: number;
  density: number;
  forceStrength: number;
}

const DIR_WEIGHTS: number[] = [
  4.0 / 9.0,
  1.0 / 9.0, 1.0 / 9.0, 1.0 / 9.0, 1.0 / 9.0,
  1.0 / 36.0, 1.0 / 36.0, 1.0 / 36.0, 1.0 / 36.0,
];

const DIR_X: number[] = [0, 1, 0, -1, 0, 1, -1, -1, 1];
const DIR_Y: number[] = [0, 0, 1, 0, -1, 1, 1, -1, -1];
const OPPOSITE: number[] = [0, 3, 4, 1, 2, 7, 8, 5, 6];

const MAX_SPEED = 5.0;

export class FluidSimulation {
  private nx: number;
  private ny: number;
  private size: number;

  private f0: Float32Array;
  private f1: Float32Array;
  private ux: Float32Array;
  private uy: Float32Array;
  private rho: Float32Array;

  private r: Float32Array;
  private g: Float32Array;
  private b: Float32Array;
  private r0: Float32Array;
  private g0: Float32Array;
  private b0: Float32Array;

  private tau: number;
  private baseDensity: number;
  private forceStrength: number;

  constructor(gridSizeX: number, gridSizeY: number) {
    this.nx = gridSizeX;
    this.ny = gridSizeY;
    this.size = this.nx * this.ny;

    this.f0 = new Float32Array(this.size * 9);
    this.f1 = new Float32Array(this.size * 9);
    this.ux = new Float32Array(this.size);
    this.uy = new Float32Array(this.size);
    this.rho = new Float32Array(this.size);

    this.r = new Float32Array(this.size);
    this.g = new Float32Array(this.size);
    this.b = new Float32Array(this.size);
    this.r0 = new Float32Array(this.size);
    this.g0 = new Float32Array(this.size);
    this.b0 = new Float32Array(this.size);

    this.tau = 3.0 * 0.1 + 0.5;
    this.baseDensity = 1.0;
    this.forceStrength = 2.0;

    this.initEquilibrium();
  }

  private initEquilibrium(): void {
    for (let y = 0; y < this.ny; y++) {
      for (let x = 0; x < this.nx; x++) {
        const idx = y * this.nx + x;
        this.ux[idx] = 0;
        this.uy[idx] = 0;
        this.rho[idx] = this.baseDensity;
        for (let k = 0; k < 9; k++) {
          this.f0[idx * 9 + k] = DIR_WEIGHTS[k] * this.baseDensity;
        }
        this.r[idx] = 0;
        this.g[idx] = 0;
        this.b[idx] = 0;
      }
    }
  }

  setParams(params: Partial<FluidParams>): void {
    if (params.viscosity !== undefined) {
      this.tau = 3.0 * params.viscosity + 0.5;
    }
    if (params.density !== undefined) {
      const ratio = params.density / this.baseDensity;
      for (let i = 0; i < this.size; i++) {
        this.rho[i] *= ratio;
      }
      for (let i = 0; i < this.size * 9; i++) {
        this.f0[i] *= ratio;
      }
      this.baseDensity = params.density;
    }
    if (params.forceStrength !== undefined) {
      this.forceStrength = params.forceStrength;
    }
  }

  resize(newNx: number, newNy: number): void {
    const oldNx = this.nx;
    const oldNy = this.ny;
    const oldSize = this.size;
    const oldF0 = this.f0;
    const oldUx = this.ux;
    const oldUy = this.uy;
    const oldRho = this.rho;
    const oldR = this.r;
    const oldG = this.g;
    const oldB = this.b;

    this.nx = newNx;
    this.ny = newNy;
    this.size = newNx * newNy;

    this.f0 = new Float32Array(this.size * 9);
    this.f1 = new Float32Array(this.size * 9);
    this.ux = new Float32Array(this.size);
    this.uy = new Float32Array(this.size);
    this.rho = new Float32Array(this.size);
    this.r = new Float32Array(this.size);
    this.g = new Float32Array(this.size);
    this.b = new Float32Array(this.size);
    this.r0 = new Float32Array(this.size);
    this.g0 = new Float32Array(this.size);
    this.b0 = new Float32Array(this.size);

    for (let y = 0; y < newNy; y++) {
      for (let x = 0; x < newNx; x++) {
        const newIdx = y * newNx + x;
        const srcX = Math.floor((x / newNx) * oldNx);
        const srcY = Math.floor((y / newNy) * oldNy);
        const clampedX = Math.min(Math.max(srcX, 0), oldNx - 1);
        const clampedY = Math.min(Math.max(srcY, 0), oldNy - 1);
        const oldIdx = clampedY * oldNx + clampedX;

        this.ux[newIdx] = oldUx[oldIdx];
        this.uy[newIdx] = oldUy[oldIdx];
        this.rho[newIdx] = oldRho[oldIdx];
        this.r[newIdx] = oldR[oldIdx];
        this.g[newIdx] = oldG[oldIdx];
        this.b[newIdx] = oldB[oldIdx];

        for (let k = 0; k < 9; k++) {
          this.f0[newIdx * 9 + k] = oldF0[oldIdx * 9 + k];
        }
      }
    }
  }

  applyForce(px: number, py: number, fx: number, fy: number, radius: number = 2): void {
    const speed = Math.sqrt(fx * fx + fy * fy);
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      fx *= scale;
      fy *= scale;
    }

    const r2 = radius * radius;
    const intR = Math.ceil(radius);

    for (let dy = -intR; dy <= intR; dy++) {
      for (let dx = -intR; dx <= intR; dx++) {
        const dist2 = dx * dx + dy * dy;
        if (dist2 > r2) continue;

        const x = Math.floor(px) + dx;
        const y = Math.floor(py) + dy;
        if (x < 0 || x >= this.nx || y < 0 || y >= this.ny) continue;

        const weight = 1.0 - dist2 / r2;
        const idx = y * this.nx + x;
        const f = this.forceStrength * weight;

        this.ux[idx] += fx * f * 0.02;
        this.uy[idx] += fy * f * 0.02;

        const curSpeed = Math.sqrt(this.ux[idx] ** 2 + this.uy[idx] ** 2);
        if (curSpeed > MAX_SPEED) {
          this.ux[idx] = (this.ux[idx] / curSpeed) * MAX_SPEED;
          this.uy[idx] = (this.uy[idx] / curSpeed) * MAX_SPEED;
        }
      }
    }
  }

  addColor(px: number, py: number, color: RGB, radius: number = 2): void {
    const r2 = radius * radius;
    const intR = Math.ceil(radius);

    for (let dy = -intR; dy <= intR; dy++) {
      for (let dx = -intR; dx <= intR; dx++) {
        const dist2 = dx * dx + dy * dy;
        if (dist2 > r2) continue;

        const x = Math.floor(px) + dx;
        const y = Math.floor(py) + dy;
        if (x < 0 || x >= this.nx || y < 0 || y >= this.ny) continue;

        const weight = (1.0 - dist2 / r2) * 0.3;
        const idx = y * this.nx + x;

        this.r[idx] = Math.min(1.0, this.r[idx] + color[0] * weight);
        this.g[idx] = Math.min(1.0, this.g[idx] + color[1] * weight);
        this.b[idx] = Math.min(1.0, this.b[idx] + color[2] * weight);
      }
    }
  }

  step(): void {
    this.collide();
    this.stream();
    this.bounceBack();
    this.computeMacroscopic();
    this.advectColors();
  }

  private collide(): void {
    const invTau = 1.0 / this.tau;
    const invTau1 = 1.0 - invTau;

    for (let i = 0; i < this.size; i++) {
      const ux = this.ux[i];
      const uy = this.uy[i];
      const rho = this.rho[i];

      const ux2 = ux * ux;
      const uy2 = uy * uy;
      const uSq = ux2 + uy2;
      const uDot = 1.0 - 1.5 * uSq;

      for (let k = 0; k < 9; k++) {
        const ex = DIR_X[k];
        const ey = DIR_Y[k];
        const eu = ex * ux + ey * uy;
        const feq = DIR_WEIGHTS[k] * rho * (uDot + 3.0 * eu + 4.5 * eu * eu - 1.5 * uSq);
        this.f0[i * 9 + k] = invTau1 * this.f0[i * 9 + k] + invTau * feq;
      }
    }
  }

  private stream(): void {
    this.f1.fill(0);

    for (let y = 0; y < this.ny; y++) {
      for (let x = 0; x < this.nx; x++) {
        const idx = y * this.nx + x;
        for (let k = 0; k < 9; k++) {
          const nx = x + DIR_X[k];
          const ny = y + DIR_Y[k];
          if (nx >= 0 && nx < this.nx && ny >= 0 && ny < this.ny) {
            const nIdx = ny * this.nx + nx;
            this.f1[nIdx * 9 + k] = this.f0[idx * 9 + k];
          }
        }
      }
    }

    const tmp = this.f0;
    this.f0 = this.f1;
    this.f1 = tmp;
  }

  private bounceBack(): void {
    for (let x = 0; x < this.nx; x++) {
      const topIdx = x;
      const botIdx = (this.ny - 1) * this.nx + x;
      for (let k = 1; k < 9; k++) {
        const opp = OPPOSITE[k];
        this.f0[topIdx * 9 + opp] = this.f0[topIdx * 9 + k];
        this.f0[botIdx * 9 + opp] = this.f0[botIdx * 9 + k];
      }
    }
    for (let y = 0; y < this.ny; y++) {
      const leftIdx = y * this.nx;
      const rightIdx = y * this.nx + (this.nx - 1);
      for (let k = 1; k < 9; k++) {
        const opp = OPPOSITE[k];
        this.f0[leftIdx * 9 + opp] = this.f0[leftIdx * 9 + k];
        this.f0[rightIdx * 9 + opp] = this.f0[rightIdx * 9 + k];
      }
    }
  }

  private computeMacroscopic(): void {
    for (let i = 0; i < this.size; i++) {
      let rho = 0;
      let ux = 0;
      let uy = 0;

      for (let k = 0; k < 9; k++) {
        const f = this.f0[i * 9 + k];
        rho += f;
        ux += f * DIR_X[k];
        uy += f * DIR_Y[k];
      }

      if (rho < 0.0001) rho = 0.0001;
      this.rho[i] = rho;
      this.ux[i] = ux / rho;
      this.uy[i] = uy / rho;
    }
  }

  private advectColors(): void {
    this.r0.set(this.r);
    this.g0.set(this.g);
    this.b0.set(this.b);
    this.r.fill(0);
    this.g.fill(0);
    this.b.fill(0);

    for (let y = 0; y < this.ny; y++) {
      for (let x = 0; x < this.nx; x++) {
        const idx = y * this.nx + x;

        const fx = x - this.ux[idx];
        const fy = y - this.uy[idx];

        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const sx = fx - x0;
        const sy = fy - y0;

        const cx0 = Math.min(Math.max(x0, 0), this.nx - 1);
        const cx1 = Math.min(Math.max(x1, 0), this.nx - 1);
        const cy0 = Math.min(Math.max(y0, 0), this.ny - 1);
        const cy1 = Math.min(Math.max(y1, 0), this.ny - 1);

        const i00 = cy0 * this.nx + cx0;
        const i10 = cy0 * this.nx + cx1;
        const i01 = cy1 * this.nx + cx0;
        const i11 = cy1 * this.nx + cx1;

        const decay = 0.998;
        this.r[idx] = decay * (
          this.r0[i00] * (1 - sx) * (1 - sy) +
          this.r0[i10] * sx * (1 - sy) +
          this.r0[i01] * (1 - sx) * sy +
          this.r0[i11] * sx * sy
        );
        this.g[idx] = decay * (
          this.g0[i00] * (1 - sx) * (1 - sy) +
          this.g0[i10] * sx * (1 - sy) +
          this.g0[i01] * (1 - sx) * sy +
          this.g0[i11] * sx * sy
        );
        this.b[idx] = decay * (
          this.b0[i00] * (1 - sx) * (1 - sy) +
          this.b0[i10] * sx * (1 - sy) +
          this.b0[i01] * (1 - sx) * sy +
          this.b0[i11] * sx * sy
        );
      }
    }
  }

  reset(): void {
    this.initEquilibrium();
  }

  getVelocityField(): [Float32Array, Float32Array] {
    return [this.ux, this.uy];
  }

  getDensityField(): Float32Array {
    return this.rho;
  }

  getColorField(): [Float32Array, Float32Array, Float32Array] {
    return [this.r, this.g, this.b];
  }

  getGridSize(): [number, number] {
    return [this.nx, this.ny];
  }
}
