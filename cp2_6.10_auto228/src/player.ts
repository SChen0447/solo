export interface HistoryFrame {
  playerX: number;
  playerY: number;
  playerVx: number;
  playerVy: number;
  spikeStates: { id: string; x: number; y: number; direction: number }[];
  ballStates: { id: string; collected: boolean }[];
}

const GRAVITY = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = -12;
const MAX_FALL_SPEED = 15;
const MAX_HISTORY_FRAMES = 180;

export class Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number = 32;
  height: number = 32;
  onGround: boolean = false;
  recordHistory: HistoryFrame[] = [];
  private keys: { left: boolean; right: boolean; jump: boolean } = {
    left: false,
    right: false,
    jump: false
  };

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }

  setKey(key: 'left' | 'right' | 'jump', pressed: boolean): void {
    this.keys[key] = pressed;
  }

  resetKeys(): void {
    this.keys = { left: false, right: false, jump: false };
  }

  tryJump(): boolean {
    if (this.onGround) {
      this.vy = JUMP_FORCE;
      this.onGround = false;
      return true;
    }
    return false;
  }

  update(platforms: { x: number; y: number; width: number; height: number }[]): void {
    this.vx = 0;
    if (this.keys.left) this.vx -= MOVE_SPEED;
    if (this.keys.right) this.vx += MOVE_SPEED;

    this.vy += GRAVITY;
    if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;

    this.x += this.vx;
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > 1200) this.x = 1200 - this.width;

    this.y += this.vy;
    this.onGround = false;

    for (const platform of platforms) {
      if (this.checkPlatformCollision(platform)) {
        if (this.vy > 0 && this.y + this.height - this.vy <= platform.y + 2) {
          this.y = platform.y - this.height;
          this.vy = 0;
          this.onGround = true;
        }
      }
    }

    if (this.y + this.height > 600) {
      this.y = 600 - this.height;
      this.vy = 0;
      this.onGround = true;
    }
  }

  private checkPlatformCollision(platform: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): boolean {
    return (
      this.x < platform.x + platform.width &&
      this.x + this.width > platform.x &&
      this.y < platform.y + platform.height &&
      this.y + this.height > platform.y
    );
  }

  checkSpikeCollision(spike: { x: number; y: number; size: number }): boolean {
    const spikeLeft = spike.x;
    const spikeRight = spike.x + spike.size;
    const spikeTop = spike.y;
    const spikeBottom = spike.y + spike.size;
    return (
      this.x < spikeRight &&
      this.x + this.width > spikeLeft &&
      this.y < spikeBottom &&
      this.y + this.height > spikeTop
    );
  }

  checkGoldBallCollision(ball: { x: number; y: number; radius: number }): boolean {
    const playerCenterX = this.x + this.width / 2;
    const playerCenterY = this.y + this.height / 2;
    const dx = playerCenterX - ball.x;
    const dy = playerCenterY - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < ball.radius + this.width / 2;
  }

  recordFrame(
    spikeStates: { id: string; x: number; y: number; direction: number }[],
    ballStates: { id: string; collected: boolean }[]
  ): void {
    const frame: HistoryFrame = {
      playerX: this.x,
      playerY: this.y,
      playerVx: this.vx,
      playerVy: this.vy,
      spikeStates: spikeStates.map((s) => ({ ...s })),
      ballStates: ballStates.map((b) => ({ ...b }))
    };
    this.recordHistory.push(frame);
    if (this.recordHistory.length > MAX_HISTORY_FRAMES) {
      this.recordHistory.shift();
    }
  }

  restoreFrame(frame: HistoryFrame): void {
    this.x = frame.playerX;
    this.y = frame.playerY;
    this.vx = frame.playerVx;
    this.vy = frame.playerVy;
  }

  clearHistory(): void {
    this.recordHistory = [];
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(
      this.x + this.width / 2,
      this.y + this.height + 4,
      this.width / 2,
      6,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    const gradient = ctx.createLinearGradient(
      this.x,
      this.y,
      this.x,
      this.y + this.height
    );
    gradient.addColorStop(0, '#4dabf7');
    gradient.addColorStop(1, '#1971c2');
    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(77, 171, 247, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#74c0fc';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2);

    ctx.restore();
  }
}
