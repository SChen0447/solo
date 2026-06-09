import { MazeGrid, Position } from './mazeGrid';

export interface LightPoint {
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  intensity: number;
  createdAt: number;
  duration: number;
}

export interface VineSegment {
  x: number;
  y: number;
  thickness: number;
  isBranch: boolean;
  createdAt: number;
}

export interface VineBranch {
  id: number;
  segments: VineSegment[];
  direction: Position;
  isMain: boolean;
  wilting: boolean;
  wiltProgress: number;
  active: boolean;
}

export interface GrowthStepResult {
  moved: boolean;
  reachedExit: boolean;
  triggeredHiddenZone: number | null;
  hiddenZoneComplete: number | null;
  newBranch: boolean;
}

export class GrowthEngine {
  private maze: MazeGrid;
  public branches: VineBranch[];
  public lightPoints: LightPoint[];
  public lightIntensity: number;
  private nextBranchId: number;
  private moveCooldown: number;
  private lastMoveTime: number;
  private totalCellsGrown: number;
  private pendingDirection: Position | null;

  constructor(maze: MazeGrid) {
    this.maze = maze;
    this.branches = [];
    this.lightPoints = [];
    this.lightIntensity = 50;
    this.nextBranchId = 1;
    this.moveCooldown = 150;
    this.lastMoveTime = 0;
    this.totalCellsGrown = 0;
    this.pendingDirection = null;
    this.initMainBranch();
  }

  private initMainBranch(): void {
    const entrance = this.maze.entrance;
    const mainBranch: VineBranch = {
      id: this.nextBranchId++,
      segments: [
        {
          x: entrance.x,
          y: entrance.y,
          thickness: 3,
          isBranch: false,
          createdAt: Date.now(),
        },
      ],
      direction: { x: 0, y: 0 },
      isMain: true,
      wilting: false,
      wiltProgress: 0,
      active: true,
    };
    this.branches.push(mainBranch);
    this.totalCellsGrown = 1;
    this.maze.visitCell(entrance.x, entrance.y);
  }

  public setLightIntensity(value: number): void {
    this.lightIntensity = Math.max(1, Math.min(100, value));
  }

  public addLightPoint(gridX: number, gridY: number): void {
    const cell = this.maze.getCell(gridX, gridY);
    if (!cell || cell.type === 'wall') return;

    const radius = 2 + (this.lightIntensity / 100) * 2;
    this.lightPoints.push({
      x: gridX,
      y: gridY,
      radius,
      baseRadius: radius,
      intensity: this.lightIntensity,
      createdAt: Date.now(),
      duration: 5000,
    });
  }

  public setPendingDirection(dir: Position | null): void {
    this.pendingDirection = dir;
  }

  public getMainBranch(): VineBranch {
    return this.branches.find(b => b.isMain) || this.branches[0];
  }

  public getTipPosition(): Position {
    const main = this.getMainBranch();
    const tip = main.segments[main.segments.length - 1];
    return { x: tip.x, y: tip.y };
  }

  public getTotalCells(): number {
    return this.totalCellsGrown;
  }

  public update(now: number): GrowthStepResult {
    this.updateLightPoints(now);
    this.updateWiltingBranches(now);

    const result: GrowthStepResult = {
      moved: false,
      reachedExit: false,
      triggeredHiddenZone: null,
      hiddenZoneComplete: null,
      newBranch: false,
    };

    if (now - this.lastMoveTime < this.moveCooldown) {
      return result;
    }

    const main = this.getMainBranch();
    if (!main.active) return result;

    const tip = main.segments[main.segments.length - 1];
    const validDirs = this.maze.getValidDirections(tip.x, tip.y);

    if (validDirs.length === 0) return result;

    let chosenDir: Position | null = null;

    if (this.pendingDirection) {
      const isValid = validDirs.some(
        d => d.x === this.pendingDirection!.x && d.y === this.pendingDirection!.y
      );
      if (isValid) {
        chosenDir = this.pendingDirection;
      }
      this.pendingDirection = null;
    }

    if (!chosenDir && validDirs.length >= 2) {
      chosenDir = this.chooseDirectionByLight(tip.x, tip.y, validDirs);
    }

    if (!chosenDir) {
      if (validDirs.length === 1) {
        chosenDir = validDirs[0];
      } else {
        chosenDir = validDirs[Math.floor(Math.random() * validDirs.length)];
      }
    }

    const nextX = tip.x + chosenDir.x;
    const nextY = tip.y + chosenDir.y;

    const prevThickness = tip.thickness;
    const newThickness = main.isMain
      ? Math.min(10, 3 + Math.floor(this.totalCellsGrown / 5) * 0.5)
      : prevThickness;

    main.segments.push({
      x: nextX,
      y: nextY,
      thickness: newThickness,
      isBranch: !main.isMain,
      createdAt: now,
    });

    main.direction = chosenDir;
    this.maze.visitCell(nextX, nextY);
    this.totalCellsGrown++;
    this.lastMoveTime = now;
    result.moved = true;

    if (this.maze.isExit(nextX, nextY)) {
      result.reachedExit = true;
    }

    const hiddenZone = this.maze.getHiddenZoneAt(nextX, nextY);
    if (hiddenZone && !hiddenZone.puzzleTriggered) {
      result.triggeredHiddenZone = hiddenZone.id;
    }
    if (hiddenZone && this.maze.isHiddenZoneComplete(hiddenZone.id)) {
      result.hiddenZoneComplete = hiddenZone.id;
    }

    if (validDirs.length >= 3) {
      const branchResult = this.tryCreateBranch(tip.x, tip.y, validDirs, chosenDir, now);
      if (branchResult) {
        result.newBranch = true;
      }
    }

    return result;
  }

  private chooseDirectionByLight(
    x: number,
    y: number,
    validDirs: Position[]
  ): Position | null {
    if (validDirs.length < 2) return null;

    const leftRight = this.getLeftRightDirs(validDirs);

    if (leftRight.left && leftRight.right) {
      const leftLight = this.getDirectionLightSum(x, y, leftRight.left);
      const rightLight = this.getDirectionLightSum(x, y, leftRight.right);
      const total = leftLight + rightLight;

      if (total > 0) {
        const diffPct = Math.abs(leftLight - rightLight) / total;
        if (diffPct > 0.3) {
          return leftLight > rightLight ? leftRight.left : leftRight.right;
        }
      }
    }

    let bestDir: Position | null = null;
    let bestScore = -1;

    for (const dir of validDirs) {
      const score = this.getDirectionScore(x, y, dir);
      if (score > bestScore) {
        bestScore = score;
        bestDir = dir;
      }
    }

    return bestDir;
  }

  private getLeftRightDirs(validDirs: Position[]): { left: Position | null; right: Position | null } {
    let left: Position | null = null;
    let right: Position | null = null;

    const main = this.getMainBranch();
    const forwardDir = main.direction;
    if (forwardDir.x === 0 && forwardDir.y === 0) {
      return { left: null, right: null };
    }

    for (const dir of validDirs) {
      if (this.isLeftOf(forwardDir, dir)) left = dir;
      else if (this.isRightOf(forwardDir, dir)) right = dir;
    }

    return { left, right };
  }

  private isLeftOf(forward: Position, test: Position): boolean {
    return forward.x * test.y - forward.y * test.x > 0;
  }

  private isRightOf(forward: Position, test: Position): boolean {
    return forward.x * test.y - forward.y * test.x < 0;
  }

  private getDirectionLightSum(x: number, y: number, dir: Position): number {
    let sum = 0;
    for (let i = 1; i <= 3; i++) {
      const cx = x + dir.x * i;
      const cy = y + dir.y * i;
      sum += this.getLightAt(cx, cy);
      const cell = this.maze.getCell(cx, cy);
      if (cell) sum += cell.nutrition * 0.3;
    }
    return sum;
  }

  private getDirectionScore(x: number, y: number, dir: Position): number {
    const cx = x + dir.x;
    const cy = y + dir.y;
    const light = this.getLightAt(cx, cy);
    const cell = this.maze.getCell(cx, cy);
    const nutrition = cell ? cell.nutrition : 0;
    const unvisitedBonus = cell && !cell.visited ? 30 : 0;
    return light * 1.5 + nutrition * 0.5 + unvisitedBonus;
  }

  public getLightAt(gridX: number, gridY: number): number {
    let totalLight = 0;

    for (const lp of this.lightPoints) {
      const dx = gridX - lp.x;
      const dy = gridY - lp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= lp.radius) {
        const age = Date.now() - lp.createdAt;
        const fadeFactor = Math.max(0, 1 - age / lp.duration);
        const falloff = 1 - dist / lp.radius;
        totalLight += lp.intensity * falloff * falloff * fadeFactor;
      }
    }

    return totalLight;
  }

  private updateLightPoints(now: number): void {
    this.lightPoints = this.lightPoints.filter(lp => {
      const age = now - lp.createdAt;
      const fadeProgress = age / lp.duration;
      if (fadeProgress >= 1) return false;
      lp.radius = lp.baseRadius * (1 - fadeProgress * 0.3);
      return true;
    });
  }

  private tryCreateBranch(
    x: number,
    y: number,
    validDirs: Position[],
    excludeDir: Position,
    now: number
  ): boolean {
    const branchDirs = validDirs.filter(
      d => !(d.x === excludeDir.x && d.y === excludeDir.y)
    );

    if (branchDirs.length === 0) return false;

    const nutrition = this.maze.getCell(x, y)?.nutrition || 50;
    const light = this.getLightAt(x, y);
    const branchProbability = Math.min(0.6, 0.2 + (nutrition / 200) + (light / 300));

    if (Math.random() > branchProbability) return false;

    const activeBranches = this.branches.filter(b => b.active && !b.isMain);
    if (activeBranches.length >= 3) {
      const oldest = activeBranches.sort(
        (a, b) => a.segments[0].createdAt - b.segments[0].createdAt
      )[0];
      oldest.wilting = true;
      oldest.wiltProgress = 0;
    }

    const chosenDir = branchDirs[Math.floor(Math.random() * branchDirs.length)];
    const mainBranch = this.getMainBranch();
    const mainThickness = mainBranch.segments[mainBranch.segments.length - 1].thickness;

    const newBranch: VineBranch = {
      id: this.nextBranchId++,
      segments: [
        {
          x,
          y,
          thickness: mainThickness * 0.6,
          isBranch: true,
          createdAt: now,
        },
        {
          x: x + chosenDir.x,
          y: y + chosenDir.y,
          thickness: mainThickness * 0.6,
          isBranch: true,
          createdAt: now,
        },
      ],
      direction: chosenDir,
      isMain: false,
      wilting: false,
      wiltProgress: 0,
      active: true,
    };

    this.maze.visitCell(x + chosenDir.x, y + chosenDir.y);
    this.totalCellsGrown++;
    this.branches.push(newBranch);
    return true;
  }

  private updateWiltingBranches(now: number): void {
    for (const branch of this.branches) {
      if (branch.wilting && branch.active) {
        branch.wiltProgress += 0.02;
        if (branch.wiltProgress >= 1) {
          branch.active = false;
        }
      }
    }
    this.branches = this.branches.filter(b => b.active || b.isMain);
  }

  public getActiveBranches(): VineBranch[] {
    return this.branches.filter(b => b.active);
  }

  public getSegmentColor(segment: VineSegment, _branch: VineBranch): string {
    if (segment.isBranch) {
      return '#4ECDC4';
    }
    const age = Date.now() - segment.createdAt;
    const saturationFactor = Math.max(0.6, 1 - age / 10000);
    const startR = 126, startG = 200, startB = 80;
    const endR = 45, endG = 80, endB = 22;
    const t = Math.min(1, age / 8000);
    const r = Math.round(startR + (endR - startR) * t);
    const g = Math.round(startG + (endG - startG) * t);
    const b = Math.round(startB + (endB - startB) * t);
    const sat = saturationFactor;
    return `rgb(${Math.round(r * sat)}, ${Math.round(g * sat)}, ${Math.round(b * sat)})`;
  }
}
