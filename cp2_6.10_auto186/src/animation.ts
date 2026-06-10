export interface SkillAnimationData {
  frameIndex: number;
  totalFrames: number;
}

type FramePose = {
  head: { x: number; y: number };
  neck: { x: number; y: number };
  torso: { x: number; y: number };
  hips: { x: number; y: number };
  leftArm: { shoulder: { x: number; y: number }; hand: { x: number; y: number } };
  rightArm: { shoulder: { x: number; y: number }; hand: { x: number; y: number } };
  leftLeg: { hip: { x: number; y: number }; foot: { x: number; y: number } };
  rightLeg: { hip: { x: number; y: number }; foot: { x: number; y: number } };
  weapon?: { x1: number; y1: number; x2: number; y2: number; color: string };
};

const TOTAL_FRAMES = 10;
const FPS = 12;
const FRAME_DURATION = 1000 / FPS;

export class AnimationPlayer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentFrame: number = 0;
  private isPlaying: boolean = false;
  private lastFrameTime: number = 0;
  private animationId: number | null = null;
  private onFrameChange?: (frame: number) => void;
  private onStop?: () => void;
  private comboSequence: { frameStart: number; frameEnd: number }[] = [];
  private comboIndex: number = 0;
  private isComboPlaying: boolean = false;
  private fadeAlpha: number = 1;
  private fadeDirection: number = 0;
  private fadeDuration: number = 150;
  private fadeStartTime: number = 0;
  private currentSkillType: string = 'light';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.currentFrame = 0;
    this.renderFrame(0);
  }

  setSkillType(type: string): void {
    this.currentSkillType = type;
  }

  setOnFrameChange(callback: (frame: number) => void): void {
    this.onFrameChange = callback;
  }

  setOnStop(callback: () => void): void {
    this.onStop = callback;
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.isComboPlaying = false;
    this.fadeAlpha = 1;
    this.fadeDirection = 0;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.isPlaying = false;
    this.isComboPlaying = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.currentFrame = 0;
    this.renderFrame(0);
    if (this.onStop) this.onStop();
  }

  playComboSequence(sequence: { frameStart: number; frameEnd: number }[]): void {
    if (sequence.length === 0) return;
    this.comboSequence = sequence;
    this.comboIndex = 0;
    this.isComboPlaying = true;
    this.isPlaying = true;
    this.currentFrame = sequence[0].frameStart;
    this.fadeAlpha = 1;
    this.fadeDirection = 0;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  private loop(): void {
    if (!this.isPlaying) return;
    const now = performance.now();
    const delta = now - this.lastFrameTime;

    if (this.fadeDirection !== 0) {
      const fadeProgress = (now - this.fadeStartTime) / this.fadeDuration;
      if (fadeProgress >= 1) {
        this.fadeAlpha = this.fadeDirection > 0 ? 1 : 0;
        if (this.fadeDirection < 0) {
          this.comboIndex++;
          if (this.comboIndex >= this.comboSequence.length) {
            this.stop();
            return;
          }
          this.currentFrame = this.comboSequence[this.comboIndex].frameStart;
          this.fadeDirection = 1;
          this.fadeStartTime = now;
        } else {
          this.fadeDirection = 0;
        }
      } else {
        this.fadeAlpha = this.fadeDirection > 0 ? fadeProgress : 1 - fadeProgress;
      }
    } else if (delta >= FRAME_DURATION) {
      this.lastFrameTime = now;
      this.advanceFrame();
    }

    this.renderFrame(this.currentFrame, this.fadeAlpha);
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private advanceFrame(): void {
    if (this.isComboPlaying) {
      const seg = this.comboSequence[this.comboIndex];
      this.currentFrame++;
      if (this.currentFrame > seg.frameEnd) {
        if (this.comboIndex < this.comboSequence.length - 1) {
          this.fadeDirection = -1;
          this.fadeStartTime = performance.now();
        } else {
          this.stop();
          return;
        }
      }
    } else {
      this.currentFrame = (this.currentFrame + 1) % TOTAL_FRAMES;
    }
    if (this.onFrameChange) this.onFrameChange(this.currentFrame);
  }

  setFrame(frame: number): void {
    this.currentFrame = Math.max(0, Math.min(TOTAL_FRAMES - 1, frame));
    this.renderFrame(this.currentFrame);
  }

  private renderFrame(frame: number, alpha: number = 1): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    this.drawCheckerboard();
    ctx.save();
    ctx.globalAlpha = alpha;
    const pose = this.getFramePose(frame);
    this.drawStickman(pose);
    ctx.restore();
  }

  private drawCheckerboard(): void {
    const ctx = this.ctx;
    const size = 20;
    for (let y = 0; y < this.canvas.height; y += size) {
      for (let x = 0; x < this.canvas.width; x += size) {
        ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#3a3a4e' : '#4a4a5e';
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  private getFramePose(frame: number): FramePose {
    const cx = 100;
    const cy = 100;
    const scale = 1.2;
    const poses: FramePose[] = [
      {
        head: { x: cx, y: cy - 50 * scale },
        neck: { x: cx, y: cy - 38 * scale },
        torso: { x: cx, y: cy - 10 * scale },
        hips: { x: cx, y: cy + 20 * scale },
        leftArm: { shoulder: { x: cx - 8 * scale, y: cy - 30 * scale }, hand: { x: cx - 25 * scale, y: cy - 5 * scale } },
        rightArm: { shoulder: { x: cx + 8 * scale, y: cy - 30 * scale }, hand: { x: cx + 25 * scale, y: cy - 5 * scale } },
        leftLeg: { hip: { x: cx - 8 * scale, y: cy + 20 * scale }, foot: { x: cx - 15 * scale, y: cy + 60 * scale } },
        rightLeg: { hip: { x: cx + 8 * scale, y: cy + 20 * scale }, foot: { x: cx + 15 * scale, y: cy + 60 * scale } },
      },
      {
        head: { x: cx - 2, y: cy - 48 * scale },
        neck: { x: cx - 2, y: cy - 36 * scale },
        torso: { x: cx - 2, y: cy - 8 * scale },
        hips: { x: cx, y: cy + 22 * scale },
        leftArm: { shoulder: { x: cx - 10 * scale, y: cy - 28 * scale }, hand: { x: cx - 30 * scale, y: cy - 20 * scale } },
        rightArm: { shoulder: { x: cx + 8 * scale, y: cy - 32 * scale }, hand: { x: cx + 35 * scale, y: cy - 25 * scale } },
        leftLeg: { hip: { x: cx - 8 * scale, y: cy + 20 * scale }, foot: { x: cx - 18 * scale, y: cy + 60 * scale } },
        rightLeg: { hip: { x: cx + 8 * scale, y: cy + 20 * scale }, foot: { x: cx + 18 * scale, y: cy + 58 * scale } },
      },
      {
        head: { x: cx - 4, y: cy - 46 * scale },
        neck: { x: cx - 4, y: cy - 34 * scale },
        torso: { x: cx - 3, y: cy - 6 * scale },
        hips: { x: cx - 1, y: cy + 24 * scale },
        leftArm: { shoulder: { x: cx - 12 * scale, y: cy - 26 * scale }, hand: { x: cx - 35 * scale, y: cy - 35 * scale } },
        rightArm: { shoulder: { x: cx + 10 * scale, y: cy - 34 * scale }, hand: { x: cx + 45 * scale, y: cy - 40 * scale } },
        leftLeg: { hip: { x: cx - 8 * scale, y: cy + 22 * scale }, foot: { x: cx - 20 * scale, y: cy + 58 * scale } },
        rightLeg: { hip: { x: cx + 8 * scale, y: cy + 22 * scale }, foot: { x: cx + 20 * scale, y: cy + 56 * scale } },
        weapon: { x1: cx + 45 * scale, y1: cy - 40 * scale, x2: cx + 70 * scale, y2: cy - 55 * scale, color: '#fbbf24' },
      },
      {
        head: { x: cx + 2, y: cy - 48 * scale },
        neck: { x: cx + 2, y: cy - 36 * scale },
        torso: { x: cx + 3, y: cy - 10 * scale },
        hips: { x: cx + 2, y: cy + 22 * scale },
        leftArm: { shoulder: { x: cx - 10 * scale, y: cy - 30 * scale }, hand: { x: cx - 25 * scale, y: cy - 15 * scale } },
        rightArm: { shoulder: { x: cx + 10 * scale, y: cy - 30 * scale }, hand: { x: cx + 50 * scale, y: cy - 10 * scale } },
        leftLeg: { hip: { x: cx - 8 * scale, y: cy + 20 * scale }, foot: { x: cx - 15 * scale, y: cy + 60 * scale } },
        rightLeg: { hip: { x: cx + 10 * scale, y: cy + 20 * scale }, foot: { x: cx + 22 * scale, y: cy + 58 * scale } },
        weapon: { x1: cx + 50 * scale, y1: cy - 10 * scale, x2: cx + 80 * scale, y2: cy + 5 * scale, color: '#fbbf24' },
      },
      {
        head: { x: cx + 8, y: cy - 50 * scale },
        neck: { x: cx + 8, y: cy - 38 * scale },
        torso: { x: cx + 6, y: cy - 12 * scale },
        hips: { x: cx + 4, y: cy + 20 * scale },
        leftArm: { shoulder: { x: cx - 8 * scale, y: cy - 32 * scale }, hand: { x: cx - 18 * scale, y: cy - 25 * scale } },
        rightArm: { shoulder: { x: cx + 12 * scale, y: cy - 26 * scale }, hand: { x: cx + 55 * scale, y: cy + 15 * scale } },
        leftLeg: { hip: { x: cx - 6 * scale, y: cy + 18 * scale }, foot: { x: cx - 10 * scale, y: cy + 60 * scale } },
        rightLeg: { hip: { x: cx + 12 * scale, y: cy + 20 * scale }, foot: { x: cx + 25 * scale, y: cy + 56 * scale } },
        weapon: { x1: cx + 55 * scale, y1: cy + 15 * scale, x2: cx + 85 * scale, y2: cy + 40 * scale, color: '#f87171' },
      },
      {
        head: { x: cx + 10, y: cy - 48 * scale },
        neck: { x: cx + 10, y: cy - 36 * scale },
        torso: { x: cx + 8, y: cy - 10 * scale },
        hips: { x: cx + 5, y: cy + 18 * scale },
        leftArm: { shoulder: { x: cx - 6 * scale, y: cy - 30 * scale }, hand: { x: cx - 12 * scale, y: cy - 30 * scale } },
        rightArm: { shoulder: { x: cx + 14 * scale, y: cy - 22 * scale }, hand: { x: cx + 40 * scale, y: cy + 30 * scale } },
        leftLeg: { hip: { x: cx - 4 * scale, y: cy + 16 * scale }, foot: { x: cx - 5 * scale, y: cy + 60 * scale } },
        rightLeg: { hip: { x: cx + 14 * scale, y: cy + 18 * scale }, foot: { x: cx + 28 * scale, y: cy + 54 * scale } },
        weapon: { x1: cx + 40 * scale, y1: cy + 30 * scale, x2: cx + 60 * scale, y2: cy + 65 * scale, color: '#ef4444' },
      },
      {
        head: { x: cx + 6, y: cy - 48 * scale },
        neck: { x: cx + 6, y: cy - 36 * scale },
        torso: { x: cx + 5, y: cy - 8 * scale },
        hips: { x: cx + 3, y: cy + 20 * scale },
        leftArm: { shoulder: { x: cx - 6 * scale, y: cy - 28 * scale }, hand: { x: cx - 15 * scale, y: cy - 20 * scale } },
        rightArm: { shoulder: { x: cx + 12 * scale, y: cy - 24 * scale }, hand: { x: cx + 30 * scale, y: cy + 10 * scale } },
        leftLeg: { hip: { x: cx - 5 * scale, y: cy + 18 * scale }, foot: { x: cx - 8 * scale, y: cy + 60 * scale } },
        rightLeg: { hip: { x: cx + 12 * scale, y: cy + 20 * scale }, foot: { x: cx + 25 * scale, y: cy + 56 * scale } },
        weapon: { x1: cx + 30 * scale, y1: cy + 10 * scale, x2: cx + 45 * scale, y2: cy + 35 * scale, color: '#fbbf24' },
      },
      {
        head: { x: cx + 3, y: cy - 48 * scale },
        neck: { x: cx + 3, y: cy - 36 * scale },
        torso: { x: cx + 2, y: cy - 9 * scale },
        hips: { x: cx + 1, y: cy + 21 * scale },
        leftArm: { shoulder: { x: cx - 8 * scale, y: cy - 29 * scale }, hand: { x: cx - 20 * scale, y: cy - 10 * scale } },
        rightArm: { shoulder: { x: cx + 10 * scale, y: cy - 27 * scale }, hand: { x: cx + 22 * scale, y: cy - 5 * scale } },
        leftLeg: { hip: { x: cx - 7 * scale, y: cy + 20 * scale }, foot: { x: cx - 12 * scale, y: cy + 60 * scale } },
        rightLeg: { hip: { x: cx + 10 * scale, y: cy + 21 * scale }, foot: { x: cx + 20 * scale, y: cy + 58 * scale } },
        weapon: { x1: cx + 22 * scale, y1: cy - 5 * scale, x2: cx + 30 * scale, y2: cy + 15 * scale, color: '#fbbf24' },
      },
      {
        head: { x: cx, y: cy - 49 * scale },
        neck: { x: cx, y: cy - 37 * scale },
        torso: { x: cx, y: cy - 9 * scale },
        hips: { x: cx, y: cy + 21 * scale },
        leftArm: { shoulder: { x: cx - 9 * scale, y: cy - 29 * scale }, hand: { x: cx - 23 * scale, y: cy - 3 * scale } },
        rightArm: { shoulder: { x: cx + 9 * scale, y: cy - 29 * scale }, hand: { x: cx + 24 * scale, y: cy - 3 * scale } },
        leftLeg: { hip: { x: cx - 8 * scale, y: cy + 20 * scale }, foot: { x: cx - 14 * scale, y: cy + 60 * scale } },
        rightLeg: { hip: { x: cx + 8 * scale, y: cy + 21 * scale }, foot: { x: cx + 17 * scale, y: cy + 59 * scale } },
      },
      {
        head: { x: cx, y: cy - 50 * scale },
        neck: { x: cx, y: cy - 38 * scale },
        torso: { x: cx, y: cy - 10 * scale },
        hips: { x: cx, y: cy + 20 * scale },
        leftArm: { shoulder: { x: cx - 8 * scale, y: cy - 30 * scale }, hand: { x: cx - 25 * scale, y: cy - 5 * scale } },
        rightArm: { shoulder: { x: cx + 8 * scale, y: cy - 30 * scale }, hand: { x: cx + 25 * scale, y: cy - 5 * scale } },
        leftLeg: { hip: { x: cx - 8 * scale, y: cy + 20 * scale }, foot: { x: cx - 15 * scale, y: cy + 60 * scale } },
        rightLeg: { hip: { x: cx + 8 * scale, y: cy + 20 * scale }, foot: { x: cx + 15 * scale, y: cy + 60 * scale } },
      },
    ];
    return poses[frame] || poses[0];
  }

  private drawStickman(pose: FramePose): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(pose.head.x, pose.head.y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(pose.neck.x, pose.neck.y);
    ctx.lineTo(pose.torso.x, pose.torso.y);
    ctx.lineTo(pose.hips.x, pose.hips.y);
    ctx.stroke();

    this.drawLimb(pose.leftArm.shoulder, pose.leftArm.hand);
    this.drawLimb(pose.rightArm.shoulder, pose.rightArm.hand);
    this.drawLimb(pose.leftLeg.hip, pose.leftLeg.foot);
    this.drawLimb(pose.rightLeg.hip, pose.rightLeg.foot);

    if (pose.weapon) {
      ctx.strokeStyle = pose.weapon.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(pose.weapon.x1, pose.weapon.y1);
      ctx.lineTo(pose.weapon.x2, pose.weapon.y2);
      ctx.stroke();
      ctx.lineWidth = 3;
    }
  }

  private drawLimb(p1: { x: number; y: number }, p2: { x: number; y: number }): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
  }

  static get TOTAL_FRAMES(): number {
    return TOTAL_FRAMES;
  }

  static get FPS(): number {
    return FPS;
  }
}
