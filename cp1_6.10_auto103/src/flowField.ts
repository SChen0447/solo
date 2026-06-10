import { Vortex } from './vortex';

export const MAX_VORTEX_COUNT = 5;

export class FlowField {
  private vortices: Vortex[] = [];

  public addVortex(vortex: Vortex): boolean {
    if (this.vortices.length >= MAX_VORTEX_COUNT) {
      return false;
    }
    this.vortices.push(vortex);
    return true;
  }

  public removeVortexAt(px: number, py: number): boolean {
    const index = this.vortices.findIndex(v => v.containsPoint(px, py));
    if (index !== -1) {
      this.vortices.splice(index, 1);
      return true;
    }
    return false;
  }

  public removeAll(): void {
    this.vortices = [];
  }

  public getVortices(): Vortex[] {
    return this.vortices;
  }

  public getVortexCount(): number {
    return this.vortices.length;
  }

  public getTotalStrength(): number {
    return this.vortices.reduce((sum, v) => sum + Math.abs(v.speed), 0);
  }

  public getVelocityAt(x: number, y: number): { vx: number; vy: number } {
    let totalVx = 0;
    let totalVy = 0;

    for (const vortex of this.vortices) {
      const vel = vortex.getVelocityAt(x, y);
      totalVx += vel.vx;
      totalVy += vel.vy;
    }

    return { vx: totalVx, vy: totalVy };
  }
}
