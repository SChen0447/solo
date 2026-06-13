export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  scored: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  initialSize: number;
}

export interface SeesawEndpoints {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
}

export interface CollisionEvent {
  x: number;
  y: number;
  color: string;
  scored: boolean;
}

export interface PhysicsState {
  pivotX: number;
  pivotY: number;
  seesawAngle: number;
  balls: Ball[];
  particles: Particle[];
  score: number;
  highScore: number;
  isGameOver: boolean;
  screenFlashTimer: number;
  leftAuraOpacity: number;
  rightAuraOpacity: number;
  nextSide: 'left' | 'right';
  nextBallColor: string;
  endpoints: SeesawEndpoints;
}

const GRAVITY = 0.35;
const RESTITUTION = 0.7;
const SEESAW_HALF_LENGTH = 300;
const SEESAW_HALF_THICKNESS = 3;
const MAX_ANGLE_RAD = (20 * Math.PI) / 180;
const MAX_BALLS = 8;
const MAX_PARTICLES = 30;
const BALL_RADIUS = 10;
const BALL_COLORS = ['#ff9ff3', '#48dbfb', '#feca57', '#54a0ff'];

export class PhysicsEngine {
  pivotX: number;
  pivotY: number;
  seesawAngle: number;
  balls: Ball[];
  particles: Particle[];
  score: number;
  highScore: number;
  isGameOver: boolean;
  screenFlashTimer: number;
  leftAuraOpacity: number;
  rightAuraOpacity: number;
  nextSide: 'left' | 'right';
  nextBallColor: string;

  private canvasWidth: number;
  private canvasHeight: number;
  private centerX: number;
  private centerY: number;
  private previousScore: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.centerX = canvasWidth / 2;
    this.centerY = canvasHeight * 0.6;

    this.pivotX = this.centerX;
    this.pivotY = this.centerY;
    this.seesawAngle = 0;
    this.balls = [];
    this.particles = [];
    this.score = 0;
    this.highScore = 0;
    this.isGameOver = false;
    this.screenFlashTimer = 0;
    this.leftAuraOpacity = 0.15;
    this.rightAuraOpacity = 0.15;
    this.nextSide = 'left';
    this.nextBallColor = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    this.previousScore = 0;
  }

  getState(): PhysicsState {
    return {
      pivotX: this.pivotX,
      pivotY: this.pivotY,
      seesawAngle: this.seesawAngle,
      balls: this.balls,
      particles: this.particles,
      score: this.score,
      highScore: this.highScore,
      isGameOver: this.isGameOver,
      screenFlashTimer: this.screenFlashTimer,
      leftAuraOpacity: this.leftAuraOpacity,
      rightAuraOpacity: this.rightAuraOpacity,
      nextSide: this.nextSide,
      nextBallColor: this.nextBallColor,
      endpoints: this.getSeesawEndpoints(),
    };
  }

  updatePivot(mouseX: number): void {
    const maxOffset = this.canvasWidth * 0.3;
    const offset = Math.max(-maxOffset, Math.min(maxOffset, mouseX - this.centerX));
    this.pivotX = this.centerX + offset;
    this.seesawAngle = (offset / maxOffset) * MAX_ANGLE_RAD;
  }

  getSeesawEndpoints(): SeesawEndpoints {
    const cos = Math.cos(this.seesawAngle);
    const sin = Math.sin(this.seesawAngle);
    return {
      leftX: this.pivotX - SEESAW_HALF_LENGTH * cos,
      leftY: this.pivotY - SEESAW_HALF_LENGTH * sin,
      rightX: this.pivotX + SEESAW_HALF_LENGTH * cos,
      rightY: this.pivotY + SEESAW_HALF_LENGTH * sin,
    };
  }

  spawnBall(currentTime: number, lastSpawnTime: number): { ball: Ball; spawnTime: number } | null {
    if (this.balls.length >= MAX_BALLS) return null;
    if (currentTime - lastSpawnTime < 1500) return null;

    const endpoints = this.getSeesawEndpoints();
    const side = this.nextSide;
    const spawnX = side === 'left' ? endpoints.leftX : endpoints.rightX;
    const spawnY = Math.min(endpoints.leftY, endpoints.rightY) - 160;

    const ball: Ball = {
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      color: this.nextBallColor,
      scored: false,
    };

    this.balls.push(ball);

    this.nextSide = side === 'left' ? 'right' : 'left';
    this.nextBallColor = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];

    return { ball, spawnTime: currentTime };
  }

  triggerAuraFlash(side: 'left' | 'right'): void {
    if (side === 'left') {
      this.leftAuraOpacity = 0.6;
    } else {
      this.rightAuraOpacity = 0.6;
    }
  }

  update(dt: number): CollisionEvent | null {
    if (this.isGameOver) return null;

    let collisionEvent: CollisionEvent | null = null;

    for (const ball of this.balls) {
      ball.vy += GRAVITY;
      ball.x += ball.vx;
      ball.y += ball.vy;

      const collision = this.checkSeesawCollision(ball);
      if (collision) {
        ball.x = collision.adjustedX;
        ball.y = collision.adjustedY;

        if (collision.vn < -1) {
          ball.vx -= (1 + RESTITUTION) * collision.vn * collision.nx;
          ball.vy -= (1 + RESTITUTION) * collision.vn * collision.ny;

          const tx = -collision.ny;
          const ty = collision.nx;
          const tangentVel = ball.vx * tx + ball.vy * ty;
          ball.vx -= tangentVel * 0.03 * tx;
          ball.vy -= tangentVel * 0.03 * ty;

          collisionEvent = {
            x: ball.x,
            y: ball.y,
            color: ball.color,
            scored: false,
          };
        } else {
          const nx = collision.nx;
          const ny = collision.ny;
          const vnCurrent = ball.vx * nx + ball.vy * ny;
          ball.vx -= vnCurrent * nx;
          ball.vy -= vnCurrent * ny;

          const tx = -ny;
          const ty = nx;
          const tangentVel = ball.vx * tx + ball.vy * ty;
          ball.vx -= tangentVel * 0.01 * tx;
          ball.vy -= tangentVel * 0.01 * ty;

          if (!ball.scored) {
            ball.scored = true;
            this.score += 10;
            if (this.score > this.highScore) {
              this.highScore = this.score;
            }
            collisionEvent = {
              x: ball.x,
              y: ball.y,
              color: ball.color,
              scored: true,
            };
          }
        }
      }

      if (ball.y > this.canvasHeight + 50) {
        this.isGameOver = true;
        return null;
      }
    }

    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= dt;
      return p.life > 0;
    });

    if (this.screenFlashTimer > 0) {
      this.screenFlashTimer = Math.max(0, this.screenFlashTimer - dt);
    }

    const targetLeft = 0.15;
    const targetRight = 0.15;
    this.leftAuraOpacity += (targetLeft - this.leftAuraOpacity) * 0.05;
    this.rightAuraOpacity += (targetRight - this.rightAuraOpacity) * 0.05;

    return collisionEvent;
  }

  private checkSeesawCollision(ball: Ball): {
    adjustedX: number;
    adjustedY: number;
    nx: number;
    ny: number;
    vn: number;
  } | null {
    const ep = this.getSeesawEndpoints();
    const dx = ep.rightX - ep.leftX;
    const dy = ep.rightY - ep.leftY;
    const lenSq = dx * dx + dy * dy;
    const len = Math.sqrt(lenSq);

    const dirX = dx / len;
    const dirY = dy / len;

    let normalX = -dirY;
    let normalY = dirX;
    if (normalY > 0) {
      normalX = -normalX;
      normalY = -normalY;
    }

    const toBallX = ball.x - ep.leftX;
    const toBallY = ball.y - ep.leftY;

    const signedDist = toBallX * normalX + toBallY * normalY;
    const proj = toBallX * dirX + toBallY * dirY;

    const tolerance = ball.radius;
    if (proj < -tolerance || proj > len + tolerance) return null;

    const collisionDist = ball.radius + SEESAW_HALF_THICKNESS;
    if (signedDist < -2 || signedDist > collisionDist) return null;

    const penetration = collisionDist - signedDist;
    const adjustedX = ball.x + normalX * penetration;
    const adjustedY = ball.y + normalY * penetration;

    const vn = ball.vx * normalX + ball.vy * normalY;

    return {
      adjustedX,
      adjustedY,
      nx: normalX,
      ny: normalY,
      vn,
    };
  }

  addParticleExplosion(x: number, y: number, color: string): void {
    const available = MAX_PARTICLES - this.particles.length;
    const count = Math.min(8, available);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color,
        life: 1.5,
        maxLife: 1.5,
        initialSize: 6,
      });
    }
  }

  checkScoreFlash(): boolean {
    const prevThreshold = Math.floor(this.previousScore / 50);
    const currThreshold = Math.floor(this.score / 50);
    if (currThreshold > prevThreshold) {
      this.screenFlashTimer = 0.5;
      this.previousScore = this.score;
      return true;
    }
    this.previousScore = this.score;
    return false;
  }

  reset(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.centerX = canvasWidth / 2;
    this.centerY = canvasHeight * 0.6;
    const hs = this.highScore;
    this.pivotX = this.centerX;
    this.pivotY = this.centerY;
    this.seesawAngle = 0;
    this.balls = [];
    this.particles = [];
    this.score = 0;
    this.highScore = hs;
    this.isGameOver = false;
    this.screenFlashTimer = 0;
    this.leftAuraOpacity = 0.15;
    this.rightAuraOpacity = 0.15;
    this.nextSide = 'left';
    this.nextBallColor = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    this.previousScore = 0;
  }
}
