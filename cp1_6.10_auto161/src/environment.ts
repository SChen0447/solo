export interface StaticPlatform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MovingPlatformState {
  x: number;
  y: number;
  width: number;
  height: number;
  baseX: number;
  baseY: number;
  amplitude: number;
  direction: 'horizontal' | 'vertical';
  speed: number;
  phase: number;
}

export interface TimeBarrierState {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  absorbing: boolean;
}

export interface GoalState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MovingPlatformHistory {
  x: number;
  y: number;
  phase: number;
}

export class EnvironmentManager {
  public staticPlatforms: StaticPlatform[] = [];
  public movingPlatforms: MovingPlatformState[] = [];
  public timeBarrier: TimeBarrierState;
  public goal: GoalState;
  public groundY: number;
  public worldWidth: number;
  public worldHeight: number;

  private platformHistory: MovingPlatformHistory[][] = [];
  private readonly maxHistoryFrames = 45;
  private readonly sampleInterval = 4;
  private sampleCounter = 0;
  public isRewinding = false;
  private rewindFrameCount = 0;
  private readonly rewindDurationFrames = 120;

  constructor(worldWidth: number, worldHeight: number) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.groundY = worldHeight - 60;

    this.staticPlatforms = [
      { x: 120, y: worldHeight - 180, width: 120, height: 20 },
      { x: 320, y: worldHeight - 280, width: 100, height: 20 },
      { x: 520, y: worldHeight - 200, width: 140, height: 20 },
      { x: 750, y: worldHeight - 320, width: 100, height: 20 }
    ];

    this.movingPlatforms = [
      {
        x: 240,
        y: worldHeight - 240,
        width: 70,
        height: 16,
        baseX: 240,
        baseY: worldHeight - 240,
        amplitude: 80,
        direction: 'horizontal',
        speed: 1,
        phase: 0
      },
      {
        x: 650,
        y: worldHeight - 250,
        width: 70,
        height: 16,
        baseX: 650,
        baseY: worldHeight - 250,
        amplitude: 90,
        direction: 'vertical',
        speed: 1,
        phase: Math.PI
      }
    ];

    this.timeBarrier = {
      x: 450,
      y: worldHeight - 200,
      width: 60,
      height: 120,
      active: true,
      absorbing: false
    };

    this.goal = {
      x: worldWidth - 80,
      y: this.groundY - 140,
      width: 20,
      height: 140
    };
  }

  startRewind(): void {
    this.isRewinding = true;
    this.rewindFrameCount = 0;
    this.timeBarrier.absorbing = false;
  }

  resetRewind(): void {
    this.isRewinding = false;
    this.platformHistory = [];
    this.sampleCounter = 0;
    this.timeBarrier.absorbing = false;
  }

  private recordHistory(): void {
    this.sampleCounter++;
    if (this.sampleCounter >= this.sampleInterval) {
      this.sampleCounter = 0;
      const frame: MovingPlatformHistory[] = this.movingPlatforms.map((p) => ({
        x: p.x,
        y: p.y,
        phase: p.phase
      }));
      this.platformHistory.push(frame);
      if (this.platformHistory.length > this.maxHistoryFrames) {
        this.platformHistory.shift();
      }
    }
  }

  update(
    isPlayerRewinding: boolean,
    playerX: number,
    playerY: number,
    playerW: number,
    playerH: number
  ): void {
    if (isPlayerRewinding) {
      this.isRewinding = true;
      this.updateRewind();
    } else {
      this.isRewinding = false;
      for (const p of this.movingPlatforms) {
        p.phase += (p.speed * Math.PI) / 120;
        if (p.direction === 'horizontal') {
          p.x = p.baseX + Math.sin(p.phase) * p.amplitude;
        } else {
          p.y = p.baseY + Math.sin(p.phase) * p.amplitude;
        }
      }
      this.recordHistory();
    }

    if (this.isRewinding) {
      const overlaps =
        playerX < this.timeBarrier.x + this.timeBarrier.width &&
        playerX + playerW > this.timeBarrier.x &&
        playerY < this.timeBarrier.y + this.timeBarrier.height &&
        playerY + playerH > this.timeBarrier.y;
      this.timeBarrier.absorbing = overlaps;
    } else {
      this.timeBarrier.absorbing = false;
    }
  }

  private updateRewind(): void {
    this.rewindFrameCount++;
    const targetProgress = this.rewindFrameCount / this.rewindDurationFrames;
    const targetIdxFloat = (this.platformHistory.length - 1) * (1 - targetProgress);
    const idx1 = Math.max(0, Math.floor(targetIdxFloat));
    const idx2 = Math.min(idx1 + 1, this.platformHistory.length - 1);
    const t = targetIdxFloat - idx1;

    if (this.platformHistory.length > 0 && idx1 < this.platformHistory.length) {
      const f1 = this.platformHistory[idx1];
      const f2 = this.platformHistory[Math.min(idx2, this.platformHistory.length - 1)];
      for (let i = 0; i < this.movingPlatforms.length; i++) {
        const p = this.movingPlatforms[i];
        const h1 = f1[i];
        const h2 = f2[i] || f1[i];
        p.x = h1.x + (h2.x - h1.x) * t;
        p.y = h1.y + (h2.y - h1.y) * t;
        p.phase = h1.phase + (h2.phase - h1.phase) * t;
      }
    }

    if (this.rewindFrameCount >= this.rewindDurationFrames || idx1 <= 0) {
      this.rewindFrameCount = 0;
    }
  }

  getAllPlatforms(): { x: number; y: number; width: number; height: number }[] {
    const result: { x: number; y: number; width: number; height: number }[] = [];
    for (const p of this.staticPlatforms) result.push(p);
    for (const p of this.movingPlatforms) result.push(p);
    return result;
  }

  checkGoal(playerX: number, playerY: number, playerW: number, playerH: number): boolean {
    return (
      playerX < this.goal.x + this.goal.width &&
      playerX + playerW > this.goal.x &&
      playerY < this.goal.y + this.goal.height &&
      playerY + playerH > this.goal.y
    );
  }

  checkBarrierAbsorption(
    playerX: number,
    playerY: number,
    playerW: number,
    playerH: number
  ): { x: number; y: number } | null {
    if (!this.timeBarrier.absorbing) return null;
    const overlaps =
      playerX < this.timeBarrier.x + this.timeBarrier.width &&
      playerX + playerW > this.timeBarrier.x &&
      playerY < this.timeBarrier.y + this.timeBarrier.height &&
      playerY + playerH > this.timeBarrier.y;
    if (!overlaps) return null;
    return {
      x: this.timeBarrier.x + this.timeBarrier.width / 2 - playerW / 2,
      y: this.timeBarrier.y + this.timeBarrier.height - playerH - 5
    };
  }
}
