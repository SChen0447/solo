import type { InputState } from './input';

export interface PlayerHistoryFrame {
  x: number;
  y: number;
  isJumping: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isJumping: boolean;
  isRewinding: boolean;
  rewindProgress: number;
  canRewind: boolean;
  cooldownRemaining: number;
  trail: { x: number; y: number; alpha: number }[];
}

export class PlayerManager {
  public state: PlayerState;
  private history: PlayerHistoryFrame[] = [];
  private readonly maxHistoryFrames = 45;
  private readonly sampleInterval = 4;
  private sampleCounter = 0;
  private rewindIndex = 0;
  private readonly rewindDurationFrames = 120;
  private rewindFrameCount = 0;
  private readonly moveSpeed = 4;
  private readonly jumpVelocity = -8;
  private readonly gravity = 0.5;
  private readonly cooldownFrames = 300;
  public absorptionTarget: { x: number; y: number } | null = null;
  private readonly trailMaxLength = 30;

  constructor(startX: number, startY: number) {
    this.state = {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      width: 16,
      height: 20,
      isJumping: false,
      isRewinding: false,
      rewindProgress: 0,
      canRewind: true,
      cooldownRemaining: 0,
      trail: []
    };
  }

  getHistory(): PlayerHistoryFrame[] {
    return this.history;
  }

  reset(startX: number, startY: number): void {
    this.state.x = startX;
    this.state.y = startY;
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.isJumping = false;
    this.state.isRewinding = false;
    this.state.rewindProgress = 0;
    this.state.canRewind = true;
    this.state.cooldownRemaining = 0;
    this.state.trail = [];
    this.history = [];
    this.sampleCounter = 0;
    this.rewindIndex = 0;
    this.rewindFrameCount = 0;
    this.absorptionTarget = null;
  }

  startRewind(): boolean {
    if (this.state.isRewinding || !this.state.canRewind || this.history.length < 2) {
      return false;
    }
    this.state.isRewinding = true;
    this.rewindIndex = this.history.length - 1;
    this.rewindFrameCount = 0;
    this.absorptionTarget = null;
    return true;
  }

  private recordHistory(): void {
    this.sampleCounter++;
    if (this.sampleCounter >= this.sampleInterval) {
      this.sampleCounter = 0;
      const frame: PlayerHistoryFrame = {
        x: this.state.x,
        y: this.state.y,
        isJumping: this.state.isJumping
      };
      this.history.push(frame);
      if (this.history.length > this.maxHistoryFrames) {
        this.history.shift();
      }
    }
  }

  private updateTrail(): void {
    this.state.trail.unshift({ x: this.state.x, y: this.state.y, alpha: 0.5 });
    if (this.state.trail.length > this.trailMaxLength) {
      this.state.trail.pop();
    }
    for (let i = 0; i < this.state.trail.length; i++) {
      this.state.trail[i].alpha = 0.5 * (1 - i / this.trailMaxLength);
    }
  }

  update(
    input: InputState,
    platforms: { x: number; y: number; width: number; height: number }[],
    groundY: number,
    worldWidth: number,
    worldHeight: number
  ): void {
    if (this.state.cooldownRemaining > 0) {
      this.state.cooldownRemaining--;
      if (this.state.cooldownRemaining <= 0) {
        this.state.canRewind = true;
      }
    }

    if (this.state.isRewinding) {
      this.updateRewind();
      this.updateTrail();
      return;
    }

    this.state.vx = 0;
    if (input.left) this.state.vx -= this.moveSpeed;
    if (input.right) this.state.vx += this.moveSpeed;

    if (input.jumpPressed && !this.state.isJumping) {
      this.state.vy = this.jumpVelocity;
      this.state.isJumping = true;
    }

    this.state.vy += this.gravity;

    this.state.x += this.state.vx;
    this.state.y += this.state.vy;

    if (this.state.x < 0) this.state.x = 0;
    if (this.state.x + this.state.width > worldWidth) {
      this.state.x = worldWidth - this.state.width;
    }

    let onGround = false;
    if (this.state.y + this.state.height >= groundY) {
      this.state.y = groundY - this.state.height;
      this.state.vy = 0;
      this.state.isJumping = false;
      onGround = true;
    }

    for (const p of platforms) {
      if (this.checkPlatformCollision(p)) {
        if (this.state.vy > 0 && this.state.y + this.state.height - this.state.vy <= p.y) {
          this.state.y = p.y - this.state.height;
          this.state.vy = 0;
          this.state.isJumping = false;
          onGround = true;
        }
      }
    }

    if (!onGround && this.state.vy !== 0) {
      this.state.isJumping = true;
    }

    this.recordHistory();
    this.updateTrail();
  }

  private checkPlatformCollision(p: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): boolean {
    return (
      this.state.x < p.x + p.width &&
      this.state.x + this.state.width > p.x &&
      this.state.y < p.y + p.height &&
      this.state.y + this.state.height > p.y
    );
  }

  private updateRewind(): void {
    this.rewindFrameCount++;
    const totalFrames = Math.min(this.rewindDurationFrames, this.history.length * this.sampleInterval);
    this.state.rewindProgress = this.rewindFrameCount / totalFrames;

    const targetProgress = this.rewindFrameCount / this.rewindDurationFrames;
    const targetIdxFloat = (this.history.length - 1) * (1 - targetProgress);
    const idx1 = Math.floor(targetIdxFloat);
    const idx2 = Math.min(idx1 + 1, this.history.length - 1);
    const t = targetIdxFloat - idx1;

    if (idx1 >= 0 && idx2 < this.history.length) {
      const f1 = this.history[idx1];
      const f2 = this.history[idx2];
      this.state.x = f1.x + (f2.x - f1.x) * t;
      this.state.y = f1.y + (f2.y - f1.y) * t;
      this.state.isJumping = f1.isJumping || f2.isJumping;
    } else if (idx1 >= 0) {
      const f = this.history[idx1];
      this.state.x = f.x;
      this.state.y = f.y;
      this.state.isJumping = f.isJumping;
    }

    if (this.rewindFrameCount >= this.rewindDurationFrames || idx1 <= 0) {
      this.finishRewind();
    }
  }

  private finishRewind(): void {
    if (this.absorptionTarget) {
      this.state.x = this.absorptionTarget.x;
      this.state.y = this.absorptionTarget.y;
    }
    this.state.isRewinding = false;
    this.state.rewindProgress = 0;
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.canRewind = false;
    this.state.cooldownRemaining = this.cooldownFrames;
    this.history = [];
    this.absorptionTarget = null;
  }

  isFallen(worldHeight: number): boolean {
    return this.state.y > worldHeight + 100;
  }
}
