import { Grid, INITIAL_TEMP, SOLIDIFY_TEMP } from './grid';

export interface SimulationParams {
  viscosity: number;
  pressure: number;
  coolingRate: number;
}

interface Vent {
  x: number;
  y: number;
}

interface PendingSpread {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
}

export class VolcanoSimulator {
  private grid: Grid;
  private vents: Vent[] = [];
  private frameCount: number = 0;
  private params: SimulationParams;
  private pendingSpreads: Map<string, PendingSpread> = new Map();

  constructor(grid: Grid) {
    this.grid = grid;
    this.params = {
      viscosity: 5,
      pressure: 5,
      coolingRate: 5
    };
  }

  public setParams(params: SimulationParams): void {
    this.params = { ...params };
  }

  public getParams(): SimulationParams {
    return { ...this.params };
  }

  public getFrameCount(): number {
    return this.frameCount;
  }

  public addVent(x: number, y: number): void {
    const exists = this.vents.some(v => v.x === x && v.y === y);
    if (!exists) {
      this.vents.push({ x, y });
      this.grid.setVent(x, y);
    }
  }

  public reset(): void {
    this.vents = [];
    this.frameCount = 0;
    this.pendingSpreads.clear();
    this.grid.clearAll();
  }

  public update(): void {
    this.frameCount++;

    this.eruptFromVents();
    this.processSpreads();
    this.coolLava();
    this.checkSolidification();
  }

  private eruptFromVents(): void {
    const lavaAmount = Math.round(this.params.pressure);

    for (const vent of this.vents) {
      this.grid.addLava(vent.x, vent.y, INITIAL_TEMP);
      const ventCell = this.grid.getCell(vent.x, vent.y);
      if (ventCell) {
        ventCell.temperature = INITIAL_TEMP;
        ventCell.progress = 1;
      }

      const neighbors = this.grid.getNeighbors(vent.x, vent.y);
      const sorted = neighbors.sort((a, b) => b.cell.height === a.cell.height ? 0 : (a.cell.height < b.cell.height ? -1 : 1));

      for (let i = 0; i < Math.min(lavaAmount, sorted.length); i++) {
        const neighbor = sorted[i];
        const key = `${vent.x},${vent.y}->${neighbor.nx},${neighbor.ny}`;
        if (!this.pendingSpreads.has(key) && !neighbor.cell.isSolidified) {
          const speed = this.calculateSpeed(vent.x, vent.y, neighbor.nx, neighbor.ny);
          if (speed > 0) {
            this.pendingSpreads.set(key, {
              x: vent.x,
              y: vent.y,
              targetX: neighbor.nx,
              targetY: neighbor.ny,
              progress: 0,
              speed
            });
          }
        }
      }
    }
  }

  private calculateSpeed(fromX: number, fromY: number, toX: number, toY: number): number {
    const heightDiff = this.grid.getHeightDiff(fromX, fromY, toX, toY);
    const viscosityMultiplier = this.getViscosityMultiplier();

    let baseSpeed: number;
    if (heightDiff > 0) {
      baseSpeed = 1.0;
    } else if (heightDiff === 0) {
      baseSpeed = 0.5;
    } else {
      baseSpeed = 0.1;
    }

    return baseSpeed * viscosityMultiplier;
  }

  private getViscosityMultiplier(): number {
    return 0.5 + (this.params.viscosity - 1) * (1.0 / 9.0);
  }

  private getCoolingMultiplier(): number {
    return 0.5 + (this.params.coolingRate - 1) * (1.5 / 9.0);
  }

  private processSpreads(): void {
    const completedSpreads: string[] = [];
    const newSpreads: { key: string; spread: PendingSpread }[] = [];

    for (const [key, spread] of this.pendingSpreads) {
      const targetCell = this.grid.getCell(spread.targetX, spread.targetY);
      if (!targetCell || targetCell.isSolidified) {
        completedSpreads.push(key);
        continue;
      }

      spread.progress += spread.speed;

      if (spread.progress >= 1) {
        const fromCell = this.grid.getCell(spread.x, spread.y);
        if (fromCell) {
          this.grid.addLava(spread.targetX, spread.targetY, Math.max(fromCell.temperature - 20, SOLIDIFY_TEMP + 50));
          const target = this.grid.getCell(spread.targetX, spread.targetY);
          if (target) {
            target.progress = 1;
          }

          const neighbors = this.grid.getNeighbors(spread.targetX, spread.targetY);
          for (const neighbor of neighbors) {
            const nKey = `${spread.targetX},${spread.targetY}->${neighbor.nx},${neighbor.ny}`;
            const reverseKey = `${neighbor.nx},${neighbor.ny}->${spread.targetX},${spread.targetY}`;
            if (!this.pendingSpreads.has(nKey) && !this.pendingSpreads.has(reverseKey) && !neighbor.cell.isSolidified) {
              const nSpeed = this.calculateSpeed(spread.targetX, spread.targetY, neighbor.nx, neighbor.ny);
              if (nSpeed > 0 && !neighbor.cell.hasLava) {
                newSpreads.push({
                  key: nKey,
                  spread: {
                    x: spread.targetX,
                    y: spread.targetY,
                    targetX: neighbor.nx,
                    targetY: neighbor.ny,
                    progress: 0,
                    speed: nSpeed
                  }
                });
              }
            }
          }
        }
        completedSpreads.push(key);
      }
    }

    for (const key of completedSpreads) {
      this.pendingSpreads.delete(key);
    }
    for (const ns of newSpreads) {
      if (!this.pendingSpreads.has(ns.key)) {
        this.pendingSpreads.set(ns.key, ns.spread);
      }
    }
  }

  private coolLava(): void {
    const coolingPerFrame = 5 * this.getCoolingMultiplier();
    const activeCells = this.grid.getActiveLavaCells();

    for (const { cell } of activeCells) {
      cell.temperature = Math.max(0, cell.temperature - coolingPerFrame);
    }
  }

  private checkSolidification(): void {
    const activeCells = this.grid.getActiveLavaCells();

    for (const { x, y, cell } of activeCells) {
      if (cell.temperature <= SOLIDIFY_TEMP) {
        this.grid.solidifyCell(x, y);
      }
    }
  }
}
