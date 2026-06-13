const METEOR_COLORS = [
  { border: '#ff6b6b', gradient: ['#ff6b6b', '#ee5a6f', '#d63031'] },
  { border: '#48dbfb', gradient: ['#48dbfb', '#0abde3', '#0077b6'] },
  { border: '#feca57', gradient: ['#feca57', '#ff9f43', '#f39c12'] }
];

export class Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.size = 1 + Math.random() * 2;
    this.baseAlpha = 0.3 + Math.random() * 0.3;
    this.phase = Math.random() * Math.PI * 2;
    this.speed = (2 + Math.random() * 2) / 1000;
  }

  update(deltaTime: number): void {
    this.phase += this.speed * deltaTime;
  }

  get alpha(): number {
    return this.baseAlpha + Math.sin(this.phase) * 0.2;
  }
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  alive: boolean;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = 2 + Math.random() * 3;
    this.color = color;
    this.maxLife = 1200;
    this.life = this.maxLife;
    this.alive = true;
  }

  update(deltaTime: number): void {
    this.x += this.vx * (deltaTime / 16.67);
    this.y += this.vy * (deltaTime / 16.67);
    this.vy += 0.05 * (deltaTime / 16.67);
    this.life -= deltaTime;
    if (this.life <= 0) {
      this.alive = false;
    }
  }

  get alpha(): number {
    return Math.max(0, this.life / this.maxLife);
  }
}

export class Meteor {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  colorIndex: number;
  borderColor: string;
  gradientColors: string[];
  isGolden: boolean;
  alive: boolean;
  score: number;

  constructor(canvasWidth: number, baseSpeed: number, isGolden = false) {
    this.isGolden = isGolden;
    this.alive = true;

    if (isGolden) {
      this.width = 80;
      this.height = 80;
      this.borderColor = '#ffd700';
      this.gradientColors = ['#ffd700', '#ffb700', '#ff8c00'];
      this.score = 50;
    } else {
      const size = 40 + Math.random() * 20;
      this.width = size;
      this.height = size;
      this.colorIndex = Math.floor(Math.random() * METEOR_COLORS.length);
      this.borderColor = METEOR_COLORS[this.colorIndex].border;
      this.gradientColors = METEOR_COLORS[this.colorIndex].gradient;
      this.score = 10;
    }

    this.x = Math.random() * (canvasWidth - this.width);
    this.y = -this.height;
    this.vx = 0;
    this.vy = baseSpeed;
  }

  update(deltaTime: number): void {
    const dtFactor = deltaTime / 16.67;
    this.x += this.vx * dtFactor;
    this.y += this.vy * dtFactor;
  }

  get left(): number {
    return this.x;
  }

  get right(): number {
    return this.x + this.width;
  }

  get top(): number {
    return this.y;
  }

  get bottom(): number {
    return this.y + this.height;
  }

  get centerX(): number {
    return this.x + this.width / 2;
  }

  get centerY(): number {
    return this.y + this.height / 2;
  }
}

export class Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  targetX: number;
  trail: { x: number; alpha: number }[];
  maxTrail: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.width = 120;
    this.height = 16;
    this.x = canvasWidth / 2 - this.width / 2;
    this.y = canvasHeight - 40 - this.height;
    this.targetX = this.x;
    this.trail = [];
    this.maxTrail = 12;
  }

  update(deltaTime: number, canvasWidth: number): void {
    const dtFactor = deltaTime / 16.67;
    const dx = (this.targetX - this.x) * 0.25 * dtFactor;
    this.x += dx;

    this.trail.unshift({ x: this.x + this.width / 2, alpha: 1 });
    if (this.trail.length > this.maxTrail) {
      this.trail.pop();
    }
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = 1 - i / this.maxTrail;
    }
  }

  moveTo(mouseX: number): void {
    this.targetX = mouseX - this.width / 2;
  }

  isAtLeftEdge(canvasWidth: number): boolean {
    return this.x < 0;
  }

  isAtRightEdge(canvasWidth: number): boolean {
    return this.x + this.width > canvasWidth;
  }

  get left(): number {
    return this.x;
  }

  get right(): number {
    return this.x + this.width;
  }

  get top(): number {
    return this.y;
  }

  get bottom(): number {
    return this.y + this.height;
  }
}

export class GameState {
  score: number;
  combo: number;
  comboTimer: number;
  comboDuration: number;
  meteorsDestroyed: number;
  baseSpeed: number;
  speedIncreaseTimer: number;
  speedIncreaseInterval: number;
  goldenMeteorCounter: number;
  backgroundLevel: number;
  backgroundTransition: number;
  backgroundTargetLevel: number;
  flashAlpha: number;
  gameOver: boolean;
  paused: boolean;

  constructor() {
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboDuration = 5000;
    this.meteorsDestroyed = 0;
    this.baseSpeed = 2;
    this.speedIncreaseTimer = 0;
    this.speedIncreaseInterval = 5000;
    this.goldenMeteorCounter = 0;
    this.backgroundLevel = 0;
    this.backgroundTransition = 0;
    this.backgroundTargetLevel = 0;
    this.flashAlpha = 0;
    this.gameOver = false;
    this.paused = true;
  }

  reset(): void {
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.meteorsDestroyed = 0;
    this.baseSpeed = 2;
    this.speedIncreaseTimer = 0;
    this.goldenMeteorCounter = 0;
    this.backgroundLevel = 0;
    this.backgroundTransition = 0;
    this.backgroundTargetLevel = 0;
    this.flashAlpha = 0;
    this.gameOver = false;
    this.paused = false;
  }

  addScore(points: number): void {
    this.score += points;
  }

  incrementCombo(): void {
    this.combo++;
    this.comboTimer = this.comboDuration;

    if (this.combo >= 5 && this.backgroundTargetLevel < 1) {
      this.backgroundTargetLevel = 1;
    }
    if (this.combo >= 10 && this.backgroundTargetLevel < 2) {
      this.backgroundTargetLevel = 2;
    }
    if (this.combo >= 15 && this.backgroundTargetLevel < 3) {
      this.backgroundTargetLevel = 3;
    }
  }

  updateCombo(deltaTime: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= deltaTime;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboTimer = 0;
        this.backgroundTargetLevel = 0;
      }
    }
  }

  updateSpeed(deltaTime: number): void {
    this.speedIncreaseTimer += deltaTime;
    if (this.speedIncreaseTimer >= this.speedIncreaseInterval) {
      this.speedIncreaseTimer -= this.speedIncreaseInterval;
      this.baseSpeed += 0.2;
    }
  }

  updateBackground(deltaTime: number): void {
    const target = this.backgroundTargetLevel;
    if (this.backgroundLevel < target) {
      this.backgroundTransition += deltaTime / 800;
      if (this.backgroundTransition >= 1) {
        this.backgroundLevel = target;
        this.backgroundTransition = 0;
      }
    } else if (this.backgroundLevel > target) {
      this.backgroundTransition += deltaTime / 800;
      if (this.backgroundTransition >= 1) {
        this.backgroundLevel = target;
        this.backgroundTransition = 0;
      }
    } else {
      this.backgroundTransition = 0;
    }
  }

  updateFlash(deltaTime: number): void {
    if (this.flashAlpha > 0) {
      this.flashAlpha -= deltaTime / 200;
      if (this.flashAlpha < 0) this.flashAlpha = 0;
    }
  }

  triggerFlash(): void {
    this.flashAlpha = 0.3;
  }

  destroyMeteor(isGolden: boolean): boolean {
    this.meteorsDestroyed++;
    if (isGolden) {
      this.goldenMeteorCounter++;
      return false;
    }

    if (this.meteorsDestroyed % 10 === 0) {
      this.triggerFlash();
      return true;
    }
    return false;
  }
}
