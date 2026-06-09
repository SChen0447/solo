import { PlayerState } from './player';
import { MovingBlockState, CrystalState } from './level';

export interface FrameState {
  player: PlayerState;
  movingBlocks: MovingBlockState[];
  crystals: CrystalState[][];
  timestamp: number;
}

export interface Checkpoint {
  frameIndex: number;
  roomIndex: number;
  spawnX: number;
  spawnY: number;
}

const MAX_FRAMES = 600;
const NORMAL_SPEED = 1;
const HALF_SPEED = 0.5;
const DOUBLE_SPEED = 2;

export class RewindSystem {
  private frames: FrameState[];
  private isRewinding: boolean;
  private rewindIndex: number;
  private rewindSpeed: number;
  private rewindFrameAccumulator: number;
  private rewindPoints: number;
  private checkpoints: Checkpoint[];
  private lastCheckpointIndex: number;
  private ghostTrail: { player: PlayerState; alpha: number }[];

  constructor() {
    this.frames = [];
    this.isRewinding = false;
    this.rewindIndex = 0;
    this.rewindSpeed = NORMAL_SPEED;
    this.rewindFrameAccumulator = 0;
    this.rewindPoints = 3;
    this.checkpoints = [];
    this.lastCheckpointIndex = 0;
    this.ghostTrail = [];
  }

  getPoints(): number {
    return this.rewindPoints;
  }

  addPoint(): void {
    this.rewindPoints++;
  }

  canRewind(): boolean {
    return this.rewindPoints > 0 && this.frames.length > 1;
  }

  isActive(): boolean {
    return this.isRewinding;
  }

  getSpeed(): number {
    return this.rewindSpeed;
  }

  cycleSpeed(): void {
    if (this.rewindSpeed === NORMAL_SPEED) {
      this.rewindSpeed = HALF_SPEED;
    } else if (this.rewindSpeed === HALF_SPEED) {
      this.rewindSpeed = DOUBLE_SPEED;
    } else {
      this.rewindSpeed = NORMAL_SPEED;
    }
  }

  recordFrame(frame: FrameState): void {
    if (this.isRewinding) return;

    this.frames.push(frame);
    if (this.frames.length > MAX_FRAMES) {
      this.frames.shift();
      if (this.lastCheckpointIndex > 0) {
        this.lastCheckpointIndex--;
      }
      for (let i = this.checkpoints.length - 1; i >= 0; i--) {
        if (this.checkpoints[i].frameIndex > 0) {
          this.checkpoints[i].frameIndex--;
        } else {
          this.checkpoints.splice(i, 1);
        }
      }
    }
  }

  saveCheckpoint(roomIndex: number, spawnX: number, spawnY: number): void {
    const cp: Checkpoint = {
      frameIndex: this.frames.length - 1,
      roomIndex,
      spawnX,
      spawnY
    };
    this.checkpoints.push(cp);
    this.lastCheckpointIndex = this.frames.length - 1;
  }

  getLastCheckpoint(): Checkpoint | null {
    if (this.checkpoints.length === 0) return null;
    return this.checkpoints[this.checkpoints.length - 1];
  }

  startRewind(toCheckpoint: boolean = false): boolean {
    if (!this.canRewind()) return false;

    this.rewindPoints--;
    this.isRewinding = true;

    if (toCheckpoint) {
      const cp = this.getLastCheckpoint();
      this.rewindIndex = cp ? cp.frameIndex : 0;
    } else {
      this.rewindIndex = this.frames.length - 1;
    }

    this.rewindFrameAccumulator = 0;
    this.ghostTrail = [];
    return true;
  }

  stopRewind(): void {
    this.isRewinding = false;
    this.frames = this.frames.slice(0, this.rewindIndex + 1);
    this.ghostTrail = [];
  }

  update(): FrameState | null {
    if (!this.isRewinding) return null;

    this.rewindFrameAccumulator += this.rewindSpeed;

    if (this.rewindFrameAccumulator >= 1) {
      this.rewindFrameAccumulator -= 1;
      this.rewindIndex = Math.max(0, this.rewindIndex - 1);

      if (this.rewindIndex <= 0) {
        const state = this.frames[0];
        this.stopRewind();
        return state;
      }
    }

    const currentFrame = this.frames[this.rewindIndex];
    if (currentFrame) {
      this.ghostTrail.unshift({ player: currentFrame.player, alpha: 1 });
      if (this.ghostTrail.length > 20) {
        this.ghostTrail.pop();
      }
      this.ghostTrail.forEach((g, i) => {
        g.alpha = 0.6 * (1 - i / this.ghostTrail.length);
      });
    }

    return currentFrame;
  }

  getCurrentFrame(): FrameState | null {
    if (this.rewindIndex >= 0 && this.rewindIndex < this.frames.length) {
      return this.frames[this.rewindIndex];
    }
    return null;
  }

  getProgress(): number {
    if (this.frames.length === 0) return 0;
    return 1 - this.rewindIndex / this.frames.length;
  }

  renderGhostTrail(ctx: CanvasRenderingContext2D, renderPlayer: (ctx: CanvasRenderingContext2D, p: PlayerState, alpha: number) => void): void {
    for (const ghost of this.ghostTrail) {
      renderPlayer(ctx, ghost.player, ghost.alpha * 0.5);
    }
  }

  renderHUD(ctx: CanvasRenderingContext2D, _canvasWidth: number, canvasHeight: number): void {
    const barX = 20;
    const barY = canvasHeight - 50;
    const barWidth = 200;
    const barHeight = 16;

    ctx.save();

    ctx.shadowColor = '#34D399';
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    const progress = this.isRewinding ? this.getProgress() : 1;
    const fillWidth = (barWidth - 4) * progress;

    const progressGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    progressGradient.addColorStop(0, '#4ADE80');
    progressGradient.addColorStop(0.5, '#FBBF24');
    progressGradient.addColorStop(1, '#F87171');

    ctx.shadowBlur = 0;
    ctx.fillStyle = progressGradient;
    ctx.fillRect(barX + 2, barY + 2, fillWidth, barHeight - 4);

    let speedText = '1x';
    if (this.rewindSpeed === HALF_SPEED) speedText = '0.5x';
    if (this.rewindSpeed === DOUBLE_SPEED) speedText = '2x';

    ctx.shadowColor = '#34D399';
    ctx.shadowBlur = 10;
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = this.isRewinding ? '#34D399' : '#6B7280';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(speedText, barX, barY - 12);

    ctx.restore();
  }
}
