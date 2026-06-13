export type GravityDirection = 'up' | 'down' | 'left' | 'right';
export type GameState = 'playing' | 'falling' | 'transition' | 'win';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface TrailParticle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export interface LightFragment {
  x: number;
  y: number;
  collected: boolean;
  color: string;
  wheelIndex: number;
}

export interface LightWheel {
  centerX: number;
  centerY: number;
  baseCenterX: number;
  baseCenterY: number;
  radius: number;
  rotationSpeed: number;
  rotation: number;
  segmentCount: number;
  gapAngle: number;
  gapStart: number;
  colors: string[];
  isMoving: boolean;
  moveRadius: number;
  moveSpeed: number;
  moveAngle: number;
  flashTimer: number;
}

export interface LightGate {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  active: boolean;
  fadeProgress: number;
}

export interface LevelConfig {
  levelNumber: number;
  wheels: Array<{
    offsetX: number;
    offsetY: number;
    radius: number;
    rotationPeriod: number;
    isMoving?: boolean;
    moveRadius?: number;
    movePeriod?: number;
  }>;
  gateAngle: number;
}

export class GameEngine {
  private width: number = 0;
  private height: number = 0;
  private gravity: GravityDirection = 'down';
  private gravityStrength: number = 0.35;
  private friction: number = 0.992;
  private bounceFactor: number = 0.7;

  public ball: Ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 10 };
  public wheels: LightWheel[] = [];
  public fragments: LightFragment[] = [];
  public gate: LightGate = { x: 0, y: 0, width: 60, height: 120, angle: 0, active: false, fadeProgress: 0 };
  public particles: Particle[] = [];
  public trailParticles: TrailParticle[] = [];
  public fallParticles: Particle[] = [];

  public gameState: GameState = 'playing';
  public currentLevel: number = 1;
  public totalLevels: number = 3;
  public collectedFragments: number = 0;
  public totalFragments: number = 9;
  public fallTimer: number = 0;
  public transitionTimer: number = 0;

  private readonly WHEEL_COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#a29bfe'];
  private readonly FALL_DURATION = 1.2;
  private readonly TRANSITION_DURATION = 1.0;
  private readonly GATE_FADE_DURATION = 2.0;

  private levelConfigs: LevelConfig[] = [
    {
      levelNumber: 1,
      wheels: [
        { offsetX: 0, offsetY: 0, radius: 80, rotationPeriod: 3 },
        { offsetX: 0, offsetY: 0, radius: 140, rotationPeriod: 5 },
        { offsetX: 0, offsetY: 0, radius: 200, rotationPeriod: 7 }
      ],
      gateAngle: -Math.PI / 2
    },
    {
      levelNumber: 2,
      wheels: [
        { offsetX: -60, offsetY: 0, radius: 80, rotationPeriod: 3 },
        { offsetX: 0, offsetY: 0, radius: 140, rotationPeriod: 5 },
        { offsetX: 60, offsetY: 0, radius: 200, rotationPeriod: 7 }
      ],
      gateAngle: -Math.PI / 2
    },
    {
      levelNumber: 3,
      wheels: [
        { offsetX: 0, offsetY: 0, radius: 80, rotationPeriod: 3 },
        { offsetX: 0, offsetY: 0, radius: 140, rotationPeriod: 5, isMoving: true, moveRadius: 60, movePeriod: 4 },
        { offsetX: 0, offsetY: 0, radius: 200, rotationPeriod: 7 }
      ],
      gateAngle: -Math.PI / 2
    }
  ];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.loadLevel(1);
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.loadLevel(this.currentLevel);
  }

  public getGravity(): GravityDirection {
    return this.gravity;
  }

  public setGravity(dir: GravityDirection): void {
    if (this.gameState !== 'playing') return;
    this.gravity = dir;
  }

  public loadLevel(levelNum: number): void {
    this.currentLevel = levelNum;
    this.gameState = 'playing';
    this.collectedFragments = 0;
    this.particles = [];
    this.trailParticles = [];
    this.fallParticles = [];
    this.fallTimer = 0;
    this.transitionTimer = 0;

    const config = this.levelConfigs[levelNum - 1];
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    this.wheels = config.wheels.map(w => ({
      centerX: centerX + w.offsetX,
      centerY: centerY + w.offsetY,
      baseCenterX: centerX + w.offsetX,
      baseCenterY: centerY + w.offsetY,
      radius: w.radius,
      rotationSpeed: (Math.PI * 2) / (w.rotationPeriod * 60),
      rotation: 0,
      segmentCount: 12,
      gapAngle: (20 + Math.random() * 10) * Math.PI / 180,
      gapStart: Math.random() * Math.PI * 2,
      colors: [...this.WHEEL_COLORS],
      isMoving: w.isMoving || false,
      moveRadius: w.moveRadius || 0,
      moveSpeed: w.movePeriod ? (Math.PI * 2) / (w.movePeriod * 60) : 0,
      moveAngle: 0,
      flashTimer: 0
    }));

    this.totalFragments = this.wheels.length * 3;
    this.fragments = [];
    this.wheels.forEach((wheel, wi) => {
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = wheel.radius - 15 - Math.random() * 20;
        this.fragments.push({
          x: wheel.centerX + Math.cos(angle) * r,
          y: wheel.centerY + Math.sin(angle) * r,
          collected: false,
          color: wheel.colors[i % wheel.colors.length],
          wheelIndex: wi
        });
      }
    });

    const outerWheel = this.wheels[this.wheels.length - 1];
    this.gate = {
      x: outerWheel.centerX + Math.cos(config.gateAngle) * (outerWheel.radius + 30),
      y: outerWheel.centerY + Math.sin(config.gateAngle) * (outerWheel.radius + 30),
      width: 60,
      height: 120,
      angle: config.gateAngle,
      active: false,
      fadeProgress: 0
    };

    this.ball = {
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: 10
    };
  }

  public retryLevel(): void {
    this.loadLevel(this.currentLevel);
  }

  public update(deltaTime: number): void {
    if (this.gameState === 'falling') {
      this.fallTimer += deltaTime;
      this.updateFallParticles(deltaTime);
      return;
    }

    if (this.gameState === 'transition') {
      this.transitionTimer += deltaTime;
      if (this.transitionTimer >= this.TRANSITION_DURATION) {
        if (this.currentLevel < this.totalLevels) {
          this.loadLevel(this.currentLevel + 1);
        } else {
          this.gameState = 'win';
        }
      }
      return;
    }

    if (this.gameState === 'win') {
      return;
    }

    this.updateWheels(deltaTime);
    this.updateBall(deltaTime);
    this.updateFragments();
    this.updateGate(deltaTime);
    this.updateParticles(deltaTime);
    this.updateTrail();
    this.checkWheelCollisions();
    this.checkBounds();
    this.checkGate();
  }

  private updateWheels(deltaTime: number): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (let i = 0; i < this.wheels.length; i++) {
      const wheel = this.wheels[i];
      wheel.rotation += wheel.rotationSpeed;
      if (wheel.rotation > Math.PI * 2) wheel.rotation -= Math.PI * 2;

      if (wheel.isMoving) {
        wheel.moveAngle += wheel.moveSpeed;
        if (wheel.moveAngle > Math.PI * 2) wheel.moveAngle -= Math.PI * 2;
        wheel.centerX = wheel.baseCenterX + Math.cos(wheel.moveAngle) * wheel.moveRadius;
        wheel.centerY = wheel.baseCenterY + Math.sin(wheel.moveAngle) * wheel.moveRadius;
      }

      if (wheel.flashTimer > 0) {
        wheel.flashTimer -= deltaTime;
      }
    }

    for (let i = 0; i < this.wheels.length; i++) {
      for (let j = i + 1; j < this.wheels.length; j++) {
        const w1 = this.wheels[i];
        const w2 = this.wheels[j];
        const dx = w1.centerX - w2.centerX;
        const dy = w1.centerY - w2.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = Math.abs(w1.radius - w2.radius);
        const maxDist = w1.radius + w2.radius;

        if (dist > minDist && dist < maxDist) {
          if (w1.isMoving || w2.isMoving) {
            w1.flashTimer = 0.5;
            w2.flashTimer = 0.5;
          }
        }
      }
    }

    this.fragments.forEach(f => {
      const w = this.wheels[f.wheelIndex];
      const angle = Math.atan2(f.y - w.baseCenterY, f.x - w.baseCenterX);
      const r = Math.sqrt((f.x - w.baseCenterX) ** 2 + (f.y - w.baseCenterY) ** 2);
      f.x = w.centerX + Math.cos(angle) * r;
      f.y = w.centerY + Math.sin(angle) * r;
    });
  }

  private updateBall(deltaTime: number): void {
    switch (this.gravity) {
      case 'up': this.ball.vy -= this.gravityStrength; break;
      case 'down': this.ball.vy += this.gravityStrength; break;
      case 'left': this.ball.vx -= this.gravityStrength; break;
      case 'right': this.ball.vx += this.gravityStrength; break;
    }

    this.ball.vx *= this.friction;
    this.ball.vy *= this.friction;

    const maxSpeed = 12;
    const speed = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2);
    if (speed > maxSpeed) {
      this.ball.vx = (this.ball.vx / speed) * maxSpeed;
      this.ball.vy = (this.ball.vy / speed) * maxSpeed;
    }

    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;
  }

  private updateFragments(): void {
    for (const frag of this.fragments) {
      if (frag.collected) continue;
      const dx = this.ball.x - frag.x;
      const dy = this.ball.y - frag.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.ball.radius + 8) {
        frag.collected = true;
        this.collectedFragments++;
        this.spawnCollectParticles(frag.x, frag.y, frag.color);
        if (this.collectedFragments >= this.totalFragments) {
          this.gate.active = true;
        }
      }
    }
  }

  private updateGate(deltaTime: number): void {
    if (this.gate.active && this.gate.fadeProgress < 1) {
      this.gate.fadeProgress = Math.min(1, this.gate.fadeProgress + deltaTime / this.GATE_FADE_DURATION);
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
    if (this.particles.length > 50) {
      this.particles.splice(0, this.particles.length - 50);
    }
  }

  private updateTrail(): void {
    if (this.gameState === 'playing') {
      const speed = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2);
      if (speed > 1) {
        this.trailParticles.push({
          x: this.ball.x,
          y: this.ball.y,
          radius: 2 + Math.random(),
          alpha: 1
        });
      }
    }

    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      this.trailParticles[i].alpha -= 0.05;
      if (this.trailParticles[i].alpha <= 0) {
        this.trailParticles.splice(i, 1);
      }
    }
    if (this.trailParticles.length > 10) {
      this.trailParticles.splice(0, this.trailParticles.length - 10);
    }
  }

  private updateFallParticles(deltaTime: number): void {
    for (let i = this.fallParticles.length - 1; i >= 0; i--) {
      const p = this.fallParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.fallParticles.splice(i, 1);
      }
    }
  }

  private checkWheelCollisions(): void {
    for (const wheel of this.wheels) {
      const dx = this.ball.x - wheel.centerX;
      const dy = this.ball.y - wheel.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const wheelThickness = 4;
      const collisionDist = wheel.radius + this.ball.radius;
      const innerDist = wheel.radius - wheelThickness - this.ball.radius;

      if (dist > innerDist && dist < collisionDist + 5) {
        const angleToBall = Math.atan2(dy, dx);
        let relAngle = angleToBall - wheel.rotation;
        while (relAngle < 0) relAngle += Math.PI * 2;
        while (relAngle > Math.PI * 2) relAngle -= Math.PI * 2;

        const gapEnd = wheel.gapStart + wheel.gapAngle;
        const isInGap = relAngle >= wheel.gapStart && relAngle <= gapEnd;

        if (!isInGap) {
          const nx = dx / dist;
          const ny = dy / dist;
          const dot = this.ball.vx * nx + this.ball.vy * ny;

          if (dist >= wheel.radius) {
            this.ball.x = wheel.centerX + nx * (wheel.radius + this.ball.radius + 0.5);
            this.ball.y = wheel.centerY + ny * (wheel.radius + this.ball.radius + 0.5);
          } else {
            this.ball.x = wheel.centerX + nx * (wheel.radius - wheelThickness - this.ball.radius - 0.5);
            this.ball.y = wheel.centerY + ny * (wheel.radius - wheelThickness - this.ball.radius - 0.5);
          }

          if (dot < 0) {
            this.ball.vx = (this.ball.vx - 2 * dot * nx) * this.bounceFactor;
            this.ball.vy = (this.ball.vy - 2 * dot * ny) * this.bounceFactor;
            this.spawnBounceParticles(this.ball.x, this.ball.y);
          }
        }
      }
    }
  }

  private checkBounds(): void {
    const outerWheel = this.wheels[this.wheels.length - 1];
    const dx = this.ball.x - outerWheel.centerX;
    const dy = this.ball.y - outerWheel.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const margin = 60;
    if (dist > outerWheel.radius + margin) {
      if (this.gate.active) {
        const gateDx = this.ball.x - this.gate.x;
        const gateDy = this.ball.y - this.gate.y;
        const gateDist = Math.sqrt(gateDx * gateDx + gateDy * gateDy);
        if (gateDist < 80) return;
      }
      this.triggerFall();
    }
  }

  private checkGate(): void {
    if (!this.gate.active || this.gate.fadeProgress < 0.5) return;

    const dx = this.ball.x - this.gate.x;
    const dy = this.ball.y - this.gate.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 40) {
      this.gameState = 'transition';
      this.transitionTimer = 0;
      this.spawnTransitionParticles();
    }
  }

  private triggerFall(): void {
    this.gameState = 'falling';
    this.fallTimer = 0;
    this.fallParticles = [];
    const colors = ['#ffffff', '#48dbfb', '#ff6b6b', '#feca57'];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.fallParticles.push({
        x: this.ball.x,
        y: this.ball.y,
        vx: Math.cos(angle) * (3 + Math.random() * 2),
        vy: Math.sin(angle) * (3 + Math.random() * 2),
        radius: 4 + Math.random() * 4,
        color: colors[i % colors.length],
        alpha: 1,
        decay: 0.025
      });
    }
  }

  private spawnBounceParticles(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1 + Math.random() * 2,
        color: '#48dbfb',
        alpha: 1,
        decay: 0.04
      });
    }
  }

  private spawnCollectParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 2,
        color,
        alpha: 1,
        decay: 0.03
      });
    }
  }

  private spawnTransitionParticles(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        color: '#ffeb3b',
        alpha: 1,
        decay: 0.015
      });
    }
  }

  public isFallComplete(): boolean {
    return this.fallTimer >= this.FALL_DURATION;
  }

  public getTransitionProgress(): number {
    return Math.min(1, this.transitionTimer / this.TRANSITION_DURATION);
  }
}
