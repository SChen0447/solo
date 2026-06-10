const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const ATTRACT_DISTANCE = 80;
const ATTRACT_SPEED = 50;
const WANDER_SPEED_MIN = 20;
const WANDER_SPEED_MAX = 30;
const TURN_SPEED = (60 * Math.PI) / 180;
const BLINK_PERIOD = 1.5;

export class Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  size: number;
  blinkPhase: number;
  isAttracted: boolean;
  attractTarget: { x: number; y: number } | null;
  wanderPhase: number;
  wanderSpeed: number;

  constructor() {
    this.x = Math.random() * CANVAS_WIDTH;
    this.y = Math.random() * CANVAS_HEIGHT;
    this.angle = Math.random() * Math.PI * 2;
    this.size = 4 + Math.random() * 2;
    this.blinkPhase = Math.random() * Math.PI * 2;
    this.isAttracted = false;
    this.attractTarget = null;
    this.wanderPhase = Math.random() * Math.PI * 2;
    this.wanderSpeed = WANDER_SPEED_MIN + Math.random() * (WANDER_SPEED_MAX - WANDER_SPEED_MIN);
    this.vx = Math.cos(this.angle) * this.wanderSpeed;
    this.vy = Math.sin(this.angle) * this.wanderSpeed;
  }

  update(dt: number, cursorX: number, cursorY: number, isCursorInCanvas: boolean, mushroomAttractPoint: { x: number; y: number } | null) {
    this.blinkPhase += (Math.PI * 2 * dt) / BLINK_PERIOD;

    let target: { x: number; y: number } | null = null;
    let targetSpeed = this.wanderSpeed;

    if (mushroomAttractPoint) {
      const mdx = mushroomAttractPoint.x - this.x;
      const mdy = mushroomAttractPoint.y - this.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mDist < 200) {
        target = mushroomAttractPoint;
        targetSpeed = ATTRACT_SPEED;
        this.isAttracted = true;
      }
    }

    if (!target && isCursorInCanvas) {
      const dx = cursorX - this.x;
      const dy = cursorY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ATTRACT_DISTANCE) {
        target = { x: cursorX, y: cursorY };
        targetSpeed = ATTRACT_SPEED;
        this.isAttracted = true;
      }
    }

    if (target) {
      this.attractTarget = target;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const targetAngle = Math.atan2(dy, dx);

      let angleDiff = targetAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const maxTurn = TURN_SPEED * dt;
      if (Math.abs(angleDiff) <= maxTurn) {
        this.angle = targetAngle;
      } else {
        this.angle += Math.sign(angleDiff) * maxTurn;
      }

      this.vx = Math.cos(this.angle) * targetSpeed;
      this.vy = Math.sin(this.angle) * targetSpeed;
    } else {
      this.isAttracted = false;
      this.attractTarget = null;
      this.wanderPhase += dt * 0.8;
      const wanderAngle = this.angle + Math.sin(this.wanderPhase) * 0.5;
      this.angle = wanderAngle;
      this.vx = Math.cos(this.angle) * this.wanderSpeed;
      this.vy = Math.sin(this.angle) * this.wanderSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < 0) {
      this.x = 0;
      this.angle = Math.PI - this.angle + (Math.random() - 0.5) * 0.5;
    }
    if (this.x > CANVAS_WIDTH) {
      this.x = CANVAS_WIDTH;
      this.angle = Math.PI - this.angle + (Math.random() - 0.5) * 0.5;
    }
    if (this.y < 0) {
      this.y = 0;
      this.angle = -this.angle + (Math.random() - 0.5) * 0.5;
    }
    if (this.y > CANVAS_HEIGHT) {
      this.y = CANVAS_HEIGHT;
      this.angle = -this.angle + (Math.random() - 0.5) * 0.5;
    }
  }

  draw(ctx: CanvasRenderingContext2D, performanceMode: 'high' | 'low') {
    const blinkAlpha = this.isAttracted
      ? 0.7 + 0.3 * ((Math.sin(this.blinkPhase) + 1) / 2)
      : 0.85 + 0.15 * ((Math.sin(this.blinkPhase) + 1) / 2);

    if (performanceMode === 'high') {
      const glowRadius = 15;
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowRadius);
      gradient.addColorStop(0, `rgba(255, 234, 0, ${0.6 * blinkAlpha})`);
      gradient.addColorStop(0.4, `rgba(255, 245, 157, ${0.3 * blinkAlpha})`);
      gradient.addColorStop(1, 'rgba(255, 245, 157, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.6 * blinkAlpha;
      ctx.fillStyle = '#fff59d';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = `rgba(255, 234, 0, ${blinkAlpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = `rgba(255, 245, 157, ${0.6 * blinkAlpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 234, 0, ${blinkAlpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
