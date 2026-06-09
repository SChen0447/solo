export interface FluidConfig {
  gridSize: number;
  diffusion: number;
  viscosity: number;
  pressureIterations: number;
  timeStep: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class FluidSolver {
  readonly N: number;
  readonly size: number;
  readonly dt: number;
  readonly diff: number;
  readonly visc: number;
  readonly pressureIter: number;

  private u: Float32Array;
  private v: Float32Array;
  private uPrev: Float32Array;
  private vPrev: Float32Array;

  private densR: Float32Array;
  private densG: Float32Array;
  private densB: Float32Array;
  private densPrevR: Float32Array;
  private densPrevG: Float32Array;
  private densPrevB: Float32Array;

  constructor(config: FluidConfig) {
    this.N = config.gridSize;
    this.size = this.N + 2;
    this.dt = config.timeStep;
    this.diff = config.diffusion;
    this.visc = config.viscosity;
    this.pressureIter = config.pressureIterations;

    const total = this.size * this.size;

    this.u = new Float32Array(total);
    this.v = new Float32Array(total);
    this.uPrev = new Float32Array(total);
    this.vPrev = new Float32Array(total);

    this.densR = new Float32Array(total);
    this.densG = new Float32Array(total);
    this.densB = new Float32Array(total);
    this.densPrevR = new Float32Array(total);
    this.densPrevG = new Float32Array(total);
    this.densPrevB = new Float32Array(total);
  }

  private IX(x: number, y: number): number {
    return x + y * this.size;
  }

  addDensity(x: number, y: number, r: number, g: number, b: number, amount: number = 100): void {
    const idx = this.IX(x, y);
    this.densR[idx] += r * amount;
    this.densG[idx] += g * amount;
    this.densB[idx] += b * amount;
  }

  addDensityRadial(
    cx: number, cy: number, radius: number,
    r: number, g: number, b: number, amount: number = 100
  ): void {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 <= r2) {
          const x = Math.floor(cx) + dx;
          const y = Math.floor(cy) + dy;
          if (x >= 1 && x <= this.N && y >= 1 && y <= this.N) {
            const falloff = 1 - Math.sqrt(d2) / radius;
            this.addDensity(x, y, r, g, b, amount * falloff);
          }
        }
      }
    }
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number): void {
    const idx = this.IX(x, y);
    this.u[idx] += amountX;
    this.v[idx] += amountY;
  }

  addVelocityRadial(
    cx: number, cy: number, radius: number,
    forceX: number, forceY: number, magnitude: number
  ): void {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 <= r2 && d2 > 0) {
          const x = Math.floor(cx) + dx;
          const y = Math.floor(cy) + dy;
          if (x >= 1 && x <= this.N && y >= 1 && y <= this.N) {
            const dist = Math.sqrt(d2);
            const falloff = 1 - dist / radius;
            const nx = dx / dist;
            const ny = dy / dist;
            this.addVelocity(x, y, (forceX + nx * magnitude) * falloff, (forceY + ny * magnitude) * falloff);
          }
        }
      }
    }
  }

  getVelocity(x: number, y: number): { vx: number; vy: number } {
    const idx = this.IX(Math.max(1, Math.min(this.N, Math.floor(x))), Math.max(1, Math.min(this.N, Math.floor(y))));
    return { vx: this.u[idx], vy: this.v[idx] };
  }

  getDensity(x: number, y: number): { r: number; g: number; b: number } {
    const idx = this.IX(Math.max(1, Math.min(this.N, Math.floor(x))), Math.max(1, Math.min(this.N, Math.floor(y))));
    return { r: this.densR[idx], g: this.densG[idx], b: this.densB[idx] };
  }

  getDensityField(): { r: Float32Array; g: Float32Array; b: Float32Array } {
    return { r: this.densR, g: this.densG, b: this.densB };
  }

  getVelocityField(): { u: Float32Array; v: Float32Array } {
    return { u: this.u, v: this.v };
  }

  reset(): void {
    this.u.fill(0);
    this.v.fill(0);
    this.uPrev.fill(0);
    this.vPrev.fill(0);
    this.densR.fill(0);
    this.densG.fill(0);
    this.densB.fill(0);
    this.densPrevR.fill(0);
    this.densPrevG.fill(0);
    this.densPrevB.fill(0);
  }

  step(): void {
    this.velocityStep();
    this.densityStep();
  }

  private velocityStep(): void {
    this.swapU();
    this.diffuse(1, this.u, this.uPrev, this.visc);

    this.swapV();
    this.diffuse(2, this.v, this.vPrev, this.visc);

    this.project(this.u, this.v, this.uPrev, this.vPrev);

    this.swapU();
    this.swapV();

    this.advect(1, this.u, this.uPrev, this.uPrev, this.vPrev);
    this.advect(2, this.v, this.vPrev, this.uPrev, this.vPrev);

    this.project(this.u, this.v, this.uPrev, this.vPrev);
  }

  private densityStep(): void {
    this.swapDR();
    this.diffuse(0, this.densR, this.densPrevR, this.diff);

    this.swapDG();
    this.diffuse(0, this.densG, this.densPrevG, this.diff);

    this.swapDB();
    this.diffuse(0, this.densB, this.densPrevB, this.diff);

    this.swapDR();
    this.swapDG();
    this.swapDB();

    this.advect(0, this.densR, this.densPrevR, this.u, this.v);
    this.advect(0, this.densG, this.densPrevG, this.u, this.v);
    this.advect(0, this.densB, this.densPrevB, this.u, this.v);
  }

  private swapU(): void {
    const tmp = this.u;
    this.u = this.uPrev;
    this.uPrev = tmp;
  }

  private swapV(): void {
    const tmp = this.v;
    this.v = this.vPrev;
    this.vPrev = tmp;
  }

  private swapDR(): void {
    const tmp = this.densR;
    this.densR = this.densPrevR;
    this.densPrevR = tmp;
  }

  private swapDG(): void {
    const tmp = this.densG;
    this.densG = this.densPrevG;
    this.densPrevG = tmp;
  }

  private swapDB(): void {
    const tmp = this.densB;
    this.densB = this.densPrevB;
    this.densPrevB = tmp;
  }

  private addSource(x: Float32Array, s: Float32Array): void {
    for (let i = 0; i < x.length; i++) {
      x[i] += this.dt * s[i];
    }
  }

  private setBnd(b: number, x: Float32Array): void {
    const N = this.N;
    for (let i = 1; i <= N; i++) {
      x[this.IX(0, i)]     = b === 1 ? -x[this.IX(1, i)] : x[this.IX(1, i)];
      x[this.IX(N + 1, i)] = b === 1 ? -x[this.IX(N, i)] : x[this.IX(N, i)];
      x[this.IX(i, 0)]     = b === 2 ? -x[this.IX(i, 1)] : x[this.IX(i, 1)];
      x[this.IX(i, N + 1)] = b === 2 ? -x[this.IX(i, N)] : x[this.IX(i, N)];
    }
    x[this.IX(0, 0)]         = 0.5 * (x[this.IX(1, 0)] + x[this.IX(0, 1)]);
    x[this.IX(0, N + 1)]     = 0.5 * (x[this.IX(1, N + 1)] + x[this.IX(0, N)]);
    x[this.IX(N + 1, 0)]     = 0.5 * (x[this.IX(N, 0)] + x[this.IX(N + 1, 1)]);
    x[this.IX(N + 1, N + 1)] = 0.5 * (x[this.IX(N, N + 1)] + x[this.IX(N + 1, N)]);
  }

  private diffuse(b: number, x: Float32Array, x0: Float32Array, diff: number): void {
    const a = this.dt * diff * this.N * this.N;
    this.linSolve(b, x, x0, a, 1 + 4 * a);
  }

  private linSolve(b: number, x: Float32Array, x0: Float32Array, a: number, c: number): void {
    const cRecip = 1.0 / c;
    const N = this.N;
    for (let k = 0; k < 4; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          x[this.IX(i, j)] =
            (x0[this.IX(i, j)] +
              a * (x[this.IX(i + 1, j)] + x[this.IX(i - 1, j)] +
                   x[this.IX(i, j + 1)] + x[this.IX(i, j - 1)])) * cRecip;
        }
      }
      this.setBnd(b, x);
    }
  }

  private project(velocX: Float32Array, velocY: Float32Array, p: Float32Array, div: Float32Array): void {
    const N = this.N;
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        div[this.IX(i, j)] = -0.5 * (
          velocX[this.IX(i + 1, j)] - velocX[this.IX(i - 1, j)] +
          velocY[this.IX(i, j + 1)] - velocY[this.IX(i, j - 1)]
        ) / N;
        p[this.IX(i, j)] = 0;
      }
    }
    this.setBnd(0, div);
    this.setBnd(0, p);
    this.linSolve(0, p, div, 1, 4);

    for (let k = 0; k < this.pressureIter; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          p[this.IX(i, j)] =
            (div[this.IX(i, j)] +
              p[this.IX(i + 1, j)] + p[this.IX(i - 1, j)] +
              p[this.IX(i, j + 1)] + p[this.IX(i, j - 1)]) / 4;
        }
      }
      this.setBnd(0, p);
    }

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        velocX[this.IX(i, j)] -= 0.5 * (p[this.IX(i + 1, j)] - p[this.IX(i - 1, j)]) * N;
        velocY[this.IX(i, j)] -= 0.5 * (p[this.IX(i, j + 1)] - p[this.IX(i, j - 1)]) * N;
      }
    }
    this.setBnd(1, velocX);
    this.setBnd(2, velocY);
  }

  private advect(b: number, d: Float32Array, d0: Float32Array, velocX: Float32Array, velocY: Float32Array): void {
    const N = this.N;
    const dtx = this.dt * N;
    const dty = this.dt * N;

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        let x = i - dtx * velocX[this.IX(i, j)];
        let y = j - dty * velocY[this.IX(i, j)];

        if (x < 0.5) x = 0.5;
        if (x > N + 0.5) x = N + 0.5;
        const i0 = Math.floor(x);
        const i1 = i0 + 1;

        if (y < 0.5) y = 0.5;
        if (y > N + 0.5) y = N + 0.5;
        const j0 = Math.floor(y);
        const j1 = j0 + 1;

        const s1 = x - i0;
        const s0 = 1 - s1;
        const t1 = y - j0;
        const t0 = 1 - t1;

        d[this.IX(i, j)] =
          s0 * (t0 * d0[this.IX(i0, j0)] + t1 * d0[this.IX(i0, j1)]) +
          s1 * (t0 * d0[this.IX(i1, j0)] + t1 * d0[this.IX(i1, j1)]);
      }
    }
    this.setBnd(b, d);
  }
}
