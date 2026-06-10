export type RunnerState = 'stand' | 'jump' | 'doubleJump' | 'slide';

export type ObstacleType = 'low' | 'high' | 'double';

export interface GameStats {
  score: number;
  highScore: number;
  lives: number;
  perfectCount: number;
  obstaclePassedCount: number;
  gameOver: boolean;
}

interface TrailFrame {
  x: number;
  y: number;
  state: RunnerState;
  alpha: number;
}

export class Runner {
  x: number;
  y: number;
  width = 32;
  height = 48;
  vy = 0;
  state: RunnerState = 'stand';
  jumpCount = 0;
  flashWhiteTime = 0;
  trail: TrailFrame[] = [];

  private groundY: number;
  private gravity = 0.8;
  private jumpPower = -15;
  private slideDuration = 0;

  constructor(x: number, groundY: number) {
    this.x = x;
    this.groundY = groundY;
    this.y = groundY - this.height;
  }

  reset(groundY: number): void {
    this.groundY = groundY;
    this.y = groundY - this.height;
    this.vy = 0;
    this.state = 'stand';
    this.jumpCount = 0;
    this.flashWhiteTime = 0;
    this.slideDuration = 0;
    this.trail = [];
  }

  jump(): boolean {
    if (this.state === 'slide') return false;

    if (this.state === 'stand' || this.jumpCount === 0) {
      this.vy = this.jumpPower;
      this.state = 'jump';
      this.jumpCount = 1;
      this.addTrail();
      return true;
    } else if (this.state === 'jump' && this.jumpCount === 1) {
      this.vy = this.jumpPower * 0.9;
      this.state = 'doubleJump';
      this.jumpCount = 2;
      this.addTrail();
      return true;
    }
    return false;
  }

  slide(): void {
    if (this.state === 'jump' || this.state === 'doubleJump') {
      this.vy = Math.max(this.vy, 8);
      return;
    }
    if (this.state === 'stand') {
      this.state = 'slide';
      this.slideDuration = 30;
      this.addTrail();
    }
  }

  update(timeScale: number): void {
    this.vy += this.gravity * timeScale;
    this.y += this.vy * timeScale;

    const currentHeight = this.state === 'slide' ? 24 : 48;

    if (this.y + currentHeight >= this.groundY) {
      this.y = this.groundY - currentHeight;
      this.vy = 0;

      if (this.state === 'slide') {
        this.slideDuration -= timeScale;
        if (this.slideDuration <= 0) {
          this.state = 'stand';
          this.jumpCount = 0;
        }
      } else {
        this.state = 'stand';
        this.jumpCount = 0;
      }
    }

    if (this.flashWhiteTime > 0) {
      this.flashWhiteTime -= timeScale;
    }

    if (this.state === 'jump' || this.state === 'doubleJump') {
      if (Math.random() < 0.3) {
        this.addTrail();
      }
    }

    this.trail = this.trail.filter(t => {
      t.alpha -= 0.17 * timeScale;
      return t.alpha > 0;
    });
    if (this.trail.length > 3) {
      this.trail = this.trail.slice(-3);
    }
  }

  private addTrail(): void {
    this.trail.push({
      x: this.x,
      y: this.y,
      state: this.state,
      alpha: 0.5
    });
  }

  triggerFlash(): void {
    this.flashWhiteTime = 6;
  }

  getCollisionBox(): { x: number; y: number; w: number; h: number } {
    const currentHeight = this.state === 'slide' ? 24 : 48;
    const currentWidth = this.state === 'slide' ? 48 : 32;
    return {
      x: this.x + 2,
      y: this.y + (this.state === 'slide' ? 24 : 0),
      w: currentWidth - 4,
      h: currentHeight - 4
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const t of this.trail) {
      ctx.globalAlpha = t.alpha * 0.6;
      this.drawRunnerShape(ctx, t.x, t.y, t.state, false);
    }
    ctx.globalAlpha = 1;

    const flash = this.flashWhiteTime > 0;
    this.drawRunnerShape(ctx, this.x, this.y, this.state, flash);
  }

  private drawRunnerShape(ctx: CanvasRenderingContext2D, x: number, y: number, state: RunnerState, flash: boolean): void {
    const color = flash ? '#ffffff' : '#00d4ff';
    const darkColor = flash ? '#ffffff' : '#0099cc';

    ctx.fillStyle = color;

    if (state === 'slide') {
      ctx.fillRect(x, y + 24, 48, 20);
      ctx.fillRect(x + 40, y + 18, 8, 12);
      ctx.fillStyle = darkColor;
      ctx.fillRect(x, y + 40, 48, 4);
    } else {
      ctx.fillRect(x + 8, y, 16, 16);

      ctx.fillRect(x + 6, y + 16, 20, 18);

      if (state === 'jump') {
        ctx.fillRect(x + 8, y + 34, 6, 10);
        ctx.fillRect(x + 18, y + 34, 6, 10);
        ctx.fillRect(x, y + 18, 6, 10);
        ctx.fillRect(x + 26, y + 18, 6, 10);
      } else if (state === 'doubleJump') {
        ctx.fillRect(x + 2, y + 4, 6, 4);
        ctx.fillRect(x + 24, y + 4, 6, 4);
        ctx.fillRect(x + 10, y + 34, 5, 8);
        ctx.fillRect(x + 17, y + 34, 5, 8);
      } else {
        ctx.fillRect(x + 8, y + 34, 6, 14);
        ctx.fillRect(x + 18, y + 34, 6, 14);
        ctx.fillRect(x, y + 20, 6, 12);
        ctx.fillRect(x + 26, y + 20, 6, 12);
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 12, y + 4, 3, 3);
      ctx.fillRect(x + 18, y + 4, 3, 3);
    }

    if (!flash) {
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.fillRect(x + 4, y + 2, 24, 44);
      ctx.shadowBlur = 0;
    }
  }
}

export class Obstacle {
  x: number = 0;
  y: number = 0;
  width = 30;
  type: ObstacleType = 'low';
  active = false;
  passed = false;
  scored = false;

  constructor() {}

  init(x: number, groundY: number, type: ObstacleType): void {
    this.x = x;
    this.type = type;
    this.active = true;
    this.passed = false;
    this.scored = false;

    switch (type) {
      case 'low':
        this.width = 30;
        this.y = groundY - 20;
        break;
      case 'high':
        this.width = 30;
        this.y = groundY - 40;
        break;
      case 'double':
        this.width = 30;
        this.y = groundY - 50;
        break;
    }
  }

  update(speed: number, timeScale: number): void {
    if (!this.active) return;
    this.x -= speed * timeScale;
  }

  isOffScreen(): boolean {
    return this.x + this.width < -50;
  }

  getCollisionBoxes(): { x: number; y: number; w: number; h: number }[] {
    const boxes: { x: number; y: number; w: number; h: number }[] = [];

    switch (this.type) {
      case 'low':
        boxes.push({ x: this.x, y: this.y, w: this.width, h: 20 });
        break;
      case 'high':
        boxes.push({ x: this.x, y: this.y, w: this.width, h: 40 });
        break;
      case 'double':
        boxes.push({ x: this.x, y: this.y, w: this.width, h: 15 });
        boxes.push({ x: this.x, y: this.y + 35, w: this.width, h: 15 });
        break;
    }

    return boxes;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const gradient = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
    gradient.addColorStop(0, '#ff3366');
    gradient.addColorStop(1, '#ff0033');

    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = 12;

    ctx.fillStyle = gradient;

    switch (this.type) {
      case 'low':
        ctx.fillRect(this.x, this.y, this.width, 20);
        break;
      case 'high':
        ctx.fillRect(this.x, this.y, this.width, 40);
        break;
      case 'double':
        ctx.fillRect(this.x, this.y, this.width, 15);
        ctx.fillRect(this.x, this.y + 35, this.width, 15);
        break;
    }

    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    switch (this.type) {
      case 'low':
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 3);
        break;
      case 'high':
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 3);
        break;
      case 'double':
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 2);
        ctx.fillRect(this.x + 2, this.y + 37, this.width - 4, 2);
        break;
    }
  }
}

export class Ground {
  y: number;
  private scrollOffset = 0;
  private pulseTime = 0;

  constructor(canvasHeight: number) {
    this.y = canvasHeight - 60;
  }

  update(speed: number, timeScale: number): void {
    this.scrollOffset = (this.scrollOffset + speed * timeScale) % 80;
    this.pulseTime += timeScale;
  }

  draw(ctx: CanvasRenderingContext2D, canvasWidth: number, beatFlash: boolean): void {
    const pulsePhase = (this.pulseTime % 90) / 90;
    const pulseBrightness = 0.6 + 0.4 * Math.sin(pulsePhase * Math.PI * 2);

    const glowAlpha = beatFlash ? 0.7 + pulseBrightness * 0.3 : 0.4 + pulseBrightness * 0.3;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = beatFlash ? 30 : 20;

    const groundGradient = ctx.createLinearGradient(0, this.y, 0, this.y + 60);
    groundGradient.addColorStop(0, `rgba(0, 255, 136, ${glowAlpha})`);
    groundGradient.addColorStop(0.3, '#00ff88');
    groundGradient.addColorStop(1, '#00aa55');

    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, this.y, canvasWidth, 60);

    ctx.shadowBlur = 0;

    ctx.strokeStyle = beatFlash ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.y);
    ctx.lineTo(canvasWidth, this.y);
    ctx.stroke();

    ctx.fillStyle = beatFlash ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.25)';
    for (let x = -this.scrollOffset; x < canvasWidth; x += 80) {
      ctx.fillRect(x, this.y + 20, 40, 4);
      ctx.fillRect(x + 20, this.y + 40, 40, 4);
    }

    const sideGlowGradient = ctx.createLinearGradient(0, this.y, 60, this.y);
    sideGlowGradient.addColorStop(0, beatFlash ? 'rgba(168, 85, 247, 0.75)' : 'rgba(168, 85, 247, 0.5)');
    sideGlowGradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = sideGlowGradient;
    ctx.fillRect(0, this.y - 200, 60, 260);

    const rightSideGradient = ctx.createLinearGradient(canvasWidth, this.y, canvasWidth - 60, this.y);
    rightSideGradient.addColorStop(0, beatFlash ? 'rgba(168, 85, 247, 0.75)' : 'rgba(168, 85, 247, 0.5)');
    rightSideGradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = rightSideGradient;
    ctx.fillRect(canvasWidth - 60, this.y - 200, 60, 260);
  }
}

export class Score {
  current = 0;
  highScore = 0;
  perfectCount = 0;
  obstaclePassedCount = 0;

  constructor() {
    this.highScore = this.loadHighScore();
  }

  private loadHighScore(): number {
    try {
      const saved = localStorage.getItem('rhythm_runner_highscore');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  saveHighScore(): void {
    if (this.current > this.highScore) {
      this.highScore = this.current;
      try {
        localStorage.setItem('rhythm_runner_highscore', String(this.highScore));
      } catch {}
    }
  }

  addPoints(points: number): void {
    this.current += points;
  }

  addPerfect(): void {
    this.perfectCount++;
  }

  addObstaclePassed(): void {
    this.obstaclePassedCount++;
  }

  reset(): void {
    this.current = 0;
    this.perfectCount = 0;
    this.obstaclePassedCount = 0;
  }
}

export class ObstaclePool {
  private pool: Obstacle[] = [];
  private maxSize = 15;

  constructor() {
    for (let i = 0; i < this.maxSize; i++) {
      this.pool.push(new Obstacle());
    }
  }

  acquire(x: number, groundY: number, type: ObstacleType): Obstacle | null {
    const obstacle = this.pool.find(o => !o.active);
    if (obstacle) {
      obstacle.init(x, groundY, type);
      return obstacle;
    }
    return null;
  }

  release(obstacle: Obstacle): void {
    obstacle.active = false;
  }

  getActive(): Obstacle[] {
    return this.pool.filter(o => o.active);
  }

  reset(): void {
    this.pool.forEach(o => { o.active = false; });
  }
}

export class GameEngine {
  runner: Runner;
  ground: Ground;
  score: Score;
  obstaclePool: ObstaclePool;

  private canvasWidth: number;
  private canvasHeight: number;
  private baseSpeed = 3;
  private lives = 3;
  private gameOver = false;
  private obstacleSpawnTimer = 0;
  private defaultSpawnInterval = 1600;
  private fastSpawnInterval = 1200;
  private currentSpawnInterval = 1600;
  private beatCountSinceSpawn = 0;
  private spawnEveryBeats = 4;

  private _timeScale = 1;
  private slowMotionTimer = 0;
  private slowMotionDuration = 60;
  private slowMotionEnabled = true;

  private bgStars: { x: number; y: number; size: number; speed: number }[] = [];

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.ground = new Ground(canvasHeight);
    this.runner = new Runner(100, this.ground.y);
    this.score = new Score();
    this.obstaclePool = new ObstaclePool();

    this.initStars();
  }

  private initStars(): void {
    this.bgStars = [];
    for (let i = 0; i < 60; i++) {
      this.bgStars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * (this.ground.y - 50),
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.2
      });
    }
  }

  reset(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.ground = new Ground(canvasHeight);
    this.runner.reset(this.ground.y);
    this.score.reset();
    this.obstaclePool.reset();
    this.lives = 3;
    this.gameOver = false;
    this.obstacleSpawnTimer = 0;
    this.currentSpawnInterval = this.defaultSpawnInterval;
    this.beatCountSinceSpawn = 0;
    this._timeScale = 1;
    this.slowMotionTimer = 0;
    this.initStars();
  }

  setSlowMotionEnabled(enabled: boolean): void {
    this.slowMotionEnabled = enabled;
    if (!enabled) {
      this._timeScale = 1;
      this.slowMotionTimer = 0;
    }
  }

  triggerSlowMotion(): void {
    if (this.slowMotionEnabled) {
      this._timeScale = 0.3;
      this.slowMotionTimer = this.slowMotionDuration;
    }
    this.runner.triggerFlash();
  }

  triggerHeavyBeat(): void {
    this.currentSpawnInterval = this.fastSpawnInterval;
    this.beatCountSinceSpawn = 0;
    this.triggerSlowMotion();
  }

  onBeat(isHeavy: boolean): void {
    this.beatCountSinceSpawn++;

    if (this.beatCountSinceSpawn >= this.spawnEveryBeats) {
      this.spawnObstacle();
      this.beatCountSinceSpawn = 0;
    }

    if (isHeavy) {
      this.triggerHeavyBeat();
    }
  }

  private spawnObstacle(): void {
    if (this.gameOver) return;

    const types: ObstacleType[] = ['low', 'high', 'double'];
    const type = types[Math.floor(Math.random() * types.length)];

    this.obstaclePool.acquire(
      this.canvasWidth + 50,
      this.ground.y,
      type
    );
  }

  jump(): void {
    if (this.gameOver) return;
    this.runner.jump();
  }

  slide(): void {
    if (this.gameOver) return;
    this.runner.slide();
  }

  update(deltaTime: number, now: number, isHeavyMoment: boolean): void {
    if (this.gameOver) return;

    if (this.slowMotionTimer > 0) {
      this.slowMotionTimer -= this._timeScale;
      if (this.slowMotionTimer <= 0) {
        this._timeScale = 1;
        this.currentSpawnInterval = this.defaultSpawnInterval;
      }
    }

    const timeScale = this._timeScale;

    this.runner.update(timeScale);
    this.ground.update(this.baseSpeed, timeScale);

    for (const star of this.bgStars) {
      star.x -= star.speed * this.baseSpeed * timeScale;
      if (star.x < 0) {
        star.x = this.canvasWidth;
        star.y = Math.random() * (this.ground.y - 50);
      }
    }

    const activeObstacles = this.obstaclePool.getActive();
    for (const obstacle of activeObstacles) {
      obstacle.update(this.baseSpeed, timeScale);

      if (obstacle.isOffScreen()) {
        this.obstaclePool.release(obstacle);
        continue;
      }

      if (!obstacle.passed && obstacle.x + obstacle.width < this.runner.x) {
        obstacle.passed = true;
        this.score.addObstaclePassed();
      }

      if (!obstacle.scored && obstacle.passed) {
        let bonus = 10;
        if (isHeavyMoment && (this.runner.state === 'jump' || this.runner.state === 'doubleJump' || this.runner.state === 'slide')) {
          bonus += 50;
          this.score.addPerfect();
          (this as any)._showPerfectFlag = true;
        }
        this.score.addPoints(bonus);
        obstacle.scored = true;
      }

      if (this.checkCollision(this.runner, obstacle)) {
        this.loseLife();
        this.obstaclePool.release(obstacle);
      }
    }

    const pointsPerFrame = this._timeScale < 1 ? 2 : 1;
    this.score.addPoints(pointsPerFrame);

    this.obstacleSpawnTimer += deltaTime * timeScale;
  }

  consumePerfectFlag(): boolean {
    const flag = (this as any)._showPerfectFlag || false;
    (this as any)._showPerfectFlag = false;
    return flag;
  }

  private checkCollision(runner: Runner, obstacle: Obstacle): boolean {
    const runnerBox = runner.getCollisionBox();
    const obstacleBoxes = obstacle.getCollisionBoxes();

    for (const box of obstacleBoxes) {
      if (
        runnerBox.x < box.x + box.w &&
        runnerBox.x + runnerBox.w > box.x &&
        runnerBox.y < box.y + box.h &&
        runnerBox.y + runnerBox.h > box.y
      ) {
        return true;
      }
    }
    return false;
  }

  private loseLife(): void {
    this.lives--;
    if (this.lives <= 0) {
      this.gameOver = true;
      this.score.saveHighScore();
    }
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  getStats(): GameStats {
    return {
      score: Math.floor(this.score.current),
      highScore: this.score.highScore,
      lives: this.lives,
      perfectCount: this.score.perfectCount,
      obstaclePassedCount: this.score.obstaclePassedCount,
      gameOver: this.gameOver
    };
  }

  getTimeScale(): number {
    return this._timeScale;
  }

  draw(ctx: CanvasRenderingContext2D, beatFlash: boolean): void {
    this.drawBackground(ctx);
    this.ground.draw(ctx, this.canvasWidth, beatFlash);

    const activeObstacles = this.obstaclePool.getActive();
    for (const obstacle of activeObstacles) {
      obstacle.draw(ctx);
    }

    this.runner.draw(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(1, '#302b63');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.fillStyle = '#ffffff';
    for (const star of this.bgStars) {
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 500 + star.x) * 0.2;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }
}
