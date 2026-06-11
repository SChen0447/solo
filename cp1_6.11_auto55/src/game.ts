import { Renderer, GameRenderState, TrailPoint, Particle, FieldDot, Star } from './renderer';
import { LEVELS, CONSTANTS, LevelConfig } from './levels';

const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export class Game {
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;

  private state: GameRenderState;

  private keys: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();

  private lastTime: number = 0;
  private running: boolean = false;
  private animationId: number = 0;

  private onLevelCompleteCallback: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);

    this.state = this.createInitialState();
    this.setupEventListeners();
    this.resize();
  }

  private createInitialState(): GameRenderState {
    const stars: Star[] = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * 3840 - 960,
        y: Math.random() * 2160 - 540,
        size: Math.random() * 1.8 + 0.3,
        brightness: Math.random() * 0.5 + 0.3,
        layer: Math.random() * 2 + 0.5
      });
    }

    const fieldDots: FieldDot[] = [];
    for (let i = 0; i < 16; i++) {
      fieldDots.push({
        angle: (i / 16) * Math.PI * 2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        frequency: Math.PI / (0.5 + Math.random() * 1.5),
        size: Math.random() * 1.8 + 1
      });
    }

    return {
      time: 0,
      dt: 0,
      cameraAngle: 0,
      targetCameraAngle: 0,
      platformAngleX: 0,
      platformAngleZ: 0,
      targetPlatformAngleX: 0,
      targetPlatformAngleZ: 0,
      ball: { active: false, x: 0, y: 0, vx: 0, vy: 0 },
      trail: [],
      target: { x: 0, y: 0, hit: false },
      particles: [],
      laserActive: false,
      laserCooldown: 0,
      ballsRemaining: CONSTANTS.MAX_BALLS,
      currentLevel: 0,
      levelConfig: null,
      levelTransition: { active: false, startTime: 0, type: 'intro' },
      fieldDots,
      stars,
      canvasWidth: 1920,
      canvasHeight: 1080,
      scale: 1
    };
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (!this.keys.has(key)) {
        this.keysPressed.add(key);
      }
      this.keys.add(key);
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const ratio = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const designRatio = 16 / 9;
    let w = width;
    let h = height;
    if (width / height > designRatio) {
      w = height * designRatio;
    } else {
      h = width / designRatio;
    }

    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = `${(width - w) / 2}px`;
    this.canvas.style.top = `${(height - h) / 2}px`;

    const cw = Math.floor(1920 * ratio);
    const ch = Math.floor(1080 * ratio);
    this.renderer.resize(cw, ch);

    this.state.canvasWidth = cw;
    this.state.canvasHeight = ch;
    this.state.scale = Math.min(cw, ch * 16 / 9) / 1920;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.loadLevel(0);
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  public onLevelComplete(callback: () => void): void {
    this.onLevelCompleteCallback = callback;
  }

  private loadLevel(index: number): void {
    if (index >= LEVELS.length) {
      this.showCompleteTransition();
      return;
    }

    const config = LEVELS[index];
    this.state.currentLevel = index;
    this.state.levelConfig = config;
    this.state.platformAngleX = config.initialPlatformAngleX;
    this.state.platformAngleZ = config.initialPlatformAngleZ;
    this.state.targetPlatformAngleX = config.initialPlatformAngleX;
    this.state.targetPlatformAngleZ = config.initialPlatformAngleZ;
    this.state.target = { x: config.targetX, y: config.targetY, hit: false };
    this.state.ballsRemaining = CONSTANTS.MAX_BALLS;
    this.state.ball = { active: false, x: 0, y: 0, vx: 0, vy: 0 };
    this.state.trail = [];
    this.state.particles = [];
    this.state.laserActive = false;
    this.state.laserCooldown = 0;
    this.state.cameraAngle = 0;
    this.state.targetCameraAngle = 0;

    this.state.levelTransition = {
      active: true,
      startTime: this.state.time,
      type: 'intro'
    };
  }

  private showCompleteTransition(): void {
    this.state.levelTransition = {
      active: true,
      startTime: this.state.time,
      type: 'complete'
    };
    this.spawnConfetti(120);
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const rawDt = Math.min((now - this.lastTime) / 1000, 1 / 30);
    this.lastTime = now;

    this.update(rawDt);
    this.renderer.render(this.state);

    this.keysPressed.clear();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.state.time += dt;
    this.state.dt = dt;

    this.handleInput(dt);
    this.updateAnimations(dt);
    this.updateBall(dt);
    this.updateLaser(dt);
    this.updateParticles(dt);
    this.updateLevelTransition(dt);
  }

  private handleInput(dt: number): void {
    const camSpeed = CONSTANTS.CAMERA_ROTATION_SPEED;
    const platSpeed = CONSTANTS.PLATFORM_ANGLE_SPEED;
    const maxAngle = CONSTANTS.MAX_PLATFORM_ANGLE;

    if (this.keys.has('a')) {
      this.state.targetCameraAngle -= camSpeed * dt;
    }
    if (this.keys.has('d')) {
      this.state.targetCameraAngle += camSpeed * dt;
    }

    if (this.keys.has('w')) {
      this.state.targetPlatformAngleX = clamp(
        this.state.targetPlatformAngleX + platSpeed * dt,
        -maxAngle,
        maxAngle
      );
    }
    if (this.keys.has('s')) {
      this.state.targetPlatformAngleX = clamp(
        this.state.targetPlatformAngleX - platSpeed * dt,
        -maxAngle,
        maxAngle
      );
    }

    if (this.keys.has('q')) {
      this.state.targetPlatformAngleZ = clamp(
        this.state.targetPlatformAngleZ - platSpeed * dt,
        -maxAngle,
        maxAngle
      );
    }
    if (this.keys.has('e')) {
      this.state.targetPlatformAngleZ = clamp(
        this.state.targetPlatformAngleZ + platSpeed * dt,
        -maxAngle,
        maxAngle
      );
    }

    if (this.keysPressed.has(' ')) {
      this.tryFireLaser();
    }

    if (this.keysPressed.has('r')) {
      this.restartLevel();
    }
  }

  private updateAnimations(dt: number): void {
    const camEase = easeOut(clamp(dt / 0.2, 0, 1));
    this.state.cameraAngle = lerp(this.state.cameraAngle, this.state.targetCameraAngle, camEase);

    const platEase = easeOut(clamp(dt / 0.1, 0, 1));
    this.state.platformAngleX = lerp(this.state.platformAngleX, this.state.targetPlatformAngleX, platEase);
    this.state.platformAngleZ = lerp(this.state.platformAngleZ, this.state.targetPlatformAngleZ, platEase);
  }

  private updateBall(dt: number): void {
    if (!this.state.ball.active) return;

    const config = this.state.levelConfig;
    if (!config) return;

    let { x, y, vx, vy } = this.state.ball;

    const radX = (this.state.platformAngleX * Math.PI) / 180;
    const radZ = (this.state.platformAngleZ * Math.PI) / 180;

    const gravity = CONSTANTS.GRAVITY;
    const gx = Math.sin(radZ) * gravity;
    const gy = Math.sin(radX) * gravity;

    vx += gx * dt;
    vy += gy * dt;

    if (config.magneticFieldEnabled) {
      const dist = Math.sqrt(x * x + y * y);
      if (dist > CONSTANTS.MAGNETIC_RING_RADIUS && dist < CONSTANTS.SCENE_RADIUS) {
        const angle = Math.atan2(y, x);
        const waveFactor = Math.sin(
          dist * 0.02 + this.state.time * config.magneticFieldFrequency
        );
        const randFactor = (Math.sin(this.state.time * 3 + dist * 0.1) * 2 - 1) * config.magneticFieldRandomness;

        const fieldStrength = (config.magneticFieldAmplitude * (waveFactor + randFactor)) / Math.max(dist, 60);
        const perpAngle = angle + Math.PI / 2;
        vx += Math.cos(perpAngle) * fieldStrength * 60 * dt;
        vy += Math.sin(perpAngle) * fieldStrength * 60 * dt;

        const radialPull = -20 * (1 - dist / CONSTANTS.SCENE_RADIUS);
        vx += Math.cos(angle) * radialPull * dt;
        vy += Math.sin(angle) * radialPull * dt;
      }
    }

    vx *= CONSTANTS.FRICTION;
    vy *= CONSTANTS.FRICTION;

    x += vx * dt;
    y += vy * dt;

    const sceneR = CONSTANTS.SCENE_RADIUS - CONSTANTS.BALL_RADIUS;
    const dist = Math.sqrt(x * x + y * y);
    if (dist > sceneR) {
      const nx = x / dist;
      const ny = y / dist;
      x = nx * sceneR;
      y = ny * sceneR;
      const dot = vx * nx + vy * ny;
      if (dot > 0) {
        vx -= 2 * dot * nx * 0.7;
        vy -= 2 * dot * ny * 0.7;
        this.spawnSparks(x, y, 5);
      }
    }

    this.state.ball.x = x;
    this.state.ball.y = y;
    this.state.ball.vx = vx;
    this.state.ball.vy = vy;

    this.state.trail.push({ x, y, age: 0 });
    const maxTrailPoints = Math.round(CONSTANTS.TRAIL_LENGTH / 3);
    while (this.state.trail.length > maxTrailPoints) {
      this.state.trail.shift();
    }
    for (const p of this.state.trail) {
      p.age += dt;
    }

    this.checkTargetCollision();
  }

  private checkTargetCollision(): void {
    const { x: bx, y: by } = this.state.ball;
    const { x: tx, y: ty } = this.state.target;

    const dx = bx - tx;
    const dy = by - ty;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < CONSTANTS.TARGET_SIZE + CONSTANTS.BALL_RADIUS - 2) {
      this.state.target.hit = true;
      this.spawnExplosion(tx, ty, 25);
      this.state.ball.active = false;
      this.state.trail = [];

      setTimeout(() => {
        this.showWinTransition();
      }, 500);
    }
  }

  private updateLaser(dt: number): void {
    if (this.state.laserCooldown > 0) {
      this.state.laserCooldown = Math.max(0, this.state.laserCooldown - dt);
    }

    if (this.state.laserActive) {
      if (this.state.ball.active) {
        const bx = this.state.ball.x;
        const by = this.state.ball.y;
        const br = CONSTANTS.BALL_RADIUS;

        if (Math.abs(bx) < br + 3 && by < 0) {
          this.state.ball.vy -= CONSTANTS.LASER_IMPULSE;
          this.state.ball.vx *= 0.2;
          this.spawnSparks(this.state.ball.x, this.state.ball.y - br, 10);
          this.state.laserActive = false;
        }
      }

      this.state.laserActive = false;
    }
  }

  private tryFireLaser(): void {
    if (this.state.laserCooldown > 0) return;
    if (!this.state.ball.active) {
      if (this.state.ballsRemaining <= 0) return;
      this.spawnBall();
    }

    this.state.laserActive = true;
    this.state.laserCooldown = CONSTANTS.LASER_COOLDOWN;
  }

  private spawnBall(): void {
    this.state.ballsRemaining--;
    this.state.ball = {
      active: true,
      x: 0,
      y: -5,
      vx: 0,
      vy: 0
    };
    this.state.trail = [];
  }

  private updateParticles(dt: number): void {
    const newParticles: Particle[] = [];

    for (const p of this.state.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;

      if (p.type === 'confetti') {
        p.vy += 400 * dt;
        p.vx *= 0.99;
      } else {
        p.vx *= 0.96;
        p.vy *= 0.96;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      newParticles.push(p);
    }

    while (newParticles.length > 200) {
      newParticles.shift();
    }

    this.state.particles = newParticles;
  }

  private spawnExplosion(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 100 + Math.random() * 200;
      const hue = 20 + Math.random() * 30;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        size: 3 + Math.random() * 5,
        color: `hsl(${hue}, 100%, ${50 + Math.random() * 20}%)`,
        type: 'explosion'
      });
    }
  }

  private spawnSparks(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 120;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        size: 1.5 + Math.random() * 2,
        color: `rgba(180, 220, 255, 0.9)`,
        type: 'spark'
      });
    }
  }

  private spawnConfetti(count: number): void {
    const w = this.state.canvasWidth;
    const colors = [
      '#ff5555', '#ffaa33', '#ffff55', '#55ff88',
      '#55ddff', '#8866ff', '#ff66cc', '#ff8844'
    ];
    for (let i = 0; i < count; i++) {
      this.state.particles.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 200,
        vy: Math.random() * 150 + 80,
        life: 5,
        maxLife: 5,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'confetti'
      });
    }
  }

  private updateLevelTransition(dt: number): void {
    if (!this.state.levelTransition.active) return;

    const { startTime, type } = this.state.levelTransition;
    const elapsed = this.state.time - startTime;

    if (type === 'intro' && elapsed > 2) {
      this.state.levelTransition.active = false;
    } else if (type === 'win' && elapsed > 3) {
      this.state.levelTransition.active = false;
      this.loadLevel(this.state.currentLevel + 1);
    } else if (type === 'lose' && elapsed > 2.5) {
      this.state.levelTransition.active = false;
    } else if (type === 'complete' && elapsed > 5) {
      this.state.levelTransition.active = false;
      if (this.onLevelCompleteCallback) {
        this.onLevelCompleteCallback();
      }
    }
  }

  private showWinTransition(): void {
    this.state.levelTransition = {
      active: true,
      startTime: this.state.time,
      type: 'win'
    };
    this.spawnConfetti(60);
  }

  private showLoseTransition(): void {
    this.state.levelTransition = {
      active: true,
      startTime: this.state.time,
      type: 'lose'
    };
  }

  private restartLevel(): void {
    this.loadLevel(this.state.currentLevel);
  }

  public getState(): GameRenderState {
    return this.state;
  }
}
