export type StrategyType = 0 | 1 | 2 | 3;
export type GuideMode = 0 | 1;

export interface Pedestrian {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  baseSpeed: number;
  radius: number;
  priority: number;
  color: string;
  targetExit: Exit | null;
  trail: { x: number; y: number; alpha: number }[];
  evacuated: boolean;
  evacuateTime: number | null;
  showPath: boolean;
  showPathTime: number;
}

export interface Exit {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  side: 'left' | 'right' | 'top' | 'bottom';
  currentWidth: number;
  targetWidth: number;
  count: number;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  size: number;
  isPreview?: boolean;
}

export interface Guide {
  x: number;
  y: number;
  radius: number;
  targetX: number;
  targetY: number;
  pulsePhase: number;
  active: boolean;
}

export interface CrowdStats {
  total: number;
  evacuated: number;
  remaining: number;
  rate: number;
  avgTime: number | null;
  completed: boolean;
}

const VENUE_WIDTH = 800;
const VENUE_HEIGHT = 600;
const PED_RADIUS = 4;
const GUIDE_RADIUS = 12;
const OBSTACLE_SIZE = 25;
const VIEW_RADIUS = 100;
const OBSTACLE_AVOID_RADIUS = 15;
const MAX_TURN_ANGLE = Math.PI / 4;
const TRAIL_LENGTH = 8;
const TRAIL_DECAY = 0.3;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function priorityToColor(priority: number): string {
  const r = Math.round(lerp(255, 78, priority));
  const g = Math.round(lerp(107, 205, priority));
  const b = Math.round(lerp(107, 196, priority));
  return `rgb(${r}, ${g}, ${b})`;
}

export class CrowdSimulator {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pedestrians: Pedestrian[] = [];
  exits: Exit[] = [];
  obstacles: Obstacle[] = [];
  userObstacles: Obstacle[] = [];
  guide: Guide;
  totalPedestrians = 500;
  strategy: StrategyType = 0;
  guideMode: GuideMode = 0;
  speedMultiplier = 1.0;
  exitWidth = 40;
  obstacleDensity = 0;
  isRunning = false;
  startTime: number | null = null;
  lastRateTime = 0;
  lastRateCount = 0;
  currentRate = 0;
  evacuatedTimes: number[] = [];
  scale = 1.0;
  offsetX = 0;
  offsetY = 0;
  venueX = 0;
  venueY = 0;
  obstacleIdCounter = 0;
  previewObstacle: Obstacle | null = null;
  strategyTransitionStart = 0;
  strategyTransitionDuration = 1000;
  isTransitioning = false;
  oldExits: Exit[] = [];
  evacuateListeners: ((stats: CrowdStats) => void)[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.guide = {
      x: VENUE_WIDTH / 2,
      y: VENUE_HEIGHT / 2,
      radius: GUIDE_RADIUS,
      targetX: VENUE_WIDTH / 2,
      targetY: VENUE_HEIGHT / 2,
      pulsePhase: 0,
      active: false
    };

    this.initExits();
    this.generatePedestrians();
    this.updateVenuePosition();
  }

  initExits(): void {
    const halfW = this.exitWidth / 2;
    this.exits = [
      {
        id: 0,
        x: 0,
        y: VENUE_HEIGHT / 2 - halfW,
        width: 4,
        height: this.exitWidth,
        side: 'left',
        currentWidth: this.exitWidth,
        targetWidth: this.exitWidth,
        count: 0
      },
      {
        id: 1,
        x: VENUE_WIDTH - 4,
        y: VENUE_HEIGHT / 2 - halfW,
        width: 4,
        height: this.exitWidth,
        side: 'right',
        currentWidth: this.exitWidth,
        targetWidth: this.exitWidth,
        count: 0
      }
    ];
  }

  generatePedestrians(): void {
    this.pedestrians = [];
    for (let i = 0; i < this.totalPedestrians; i++) {
      const priority = Math.random();
      const baseSpeed = lerp(0.5, 1.5, priority);
      let x: number, y: number;
      let attempts = 0;
      do {
        x = 50 + Math.random() * (VENUE_WIDTH - 100);
        y = 50 + Math.random() * (VENUE_HEIGHT - 100);
        attempts++;
      } while (this.collidesWithObstacle(x, y, PED_RADIUS + 2) && attempts < 50);

      this.pedestrians.push({
        id: i,
        x,
        y,
        vx: 0,
        vy: 0,
        speed: baseSpeed,
        baseSpeed,
        radius: PED_RADIUS,
        priority,
        color: priorityToColor(priority),
        targetExit: null,
        trail: [],
        evacuated: false,
        evacuateTime: null,
        showPath: false,
        showPathTime: 0
      });
    }
    this.assignTargets();
  }

  collidesWithObstacle(x: number, y: number, radius: number): boolean {
    for (const obs of [...this.obstacles, ...this.userObstacles]) {
      const closestX = clamp(x, obs.x, obs.x + obs.size);
      const closestY = clamp(y, obs.y, obs.y + obs.size);
      if (dist(x, y, closestX, closestY) < radius) {
        return true;
      }
    }
    return false;
  }

  assignTargets(): void {
    for (const p of this.pedestrians) {
      if (p.evacuated) continue;
      p.targetExit = this.findNearestExit(p.x, p.y);
    }
  }

  findNearestExit(x: number, y: number): Exit {
    let nearest: Exit = this.exits[0];
    let minDist = Infinity;
    for (const exit of this.exits) {
      const cx = exit.x + exit.width / 2;
      const cy = exit.y + exit.height / 2;
      const d = dist(x, y, cx, cy);
      if (d < minDist) {
        minDist = d;
        nearest = exit;
      }
    }
    return nearest;
  }

  setStrategy(strategy: StrategyType): void {
    if (this.strategy === strategy) return;
    this.oldExits = JSON.parse(JSON.stringify(this.exits));
    this.strategy = strategy;
    this.isTransitioning = true;
    this.strategyTransitionStart = performance.now();

    const halfW = this.exitWidth / 2;
    const newExits: Exit[] = [];

    if (strategy === 2) {
      newExits.push(
        { id: 0, x: 0, y: VENUE_HEIGHT / 2 - halfW, width: 4, height: this.exitWidth, side: 'left', currentWidth: this.exitWidth, targetWidth: this.exitWidth, count: this.exits[0]?.count || 0 },
        { id: 1, x: VENUE_WIDTH - 4, y: VENUE_HEIGHT / 2 - halfW, width: 4, height: this.exitWidth, side: 'right', currentWidth: this.exitWidth, targetWidth: this.exitWidth, count: this.exits[1]?.count || 0 },
        { id: 2, x: VENUE_WIDTH / 2 - halfW, y: 0, width: this.exitWidth, height: 4, side: 'top', currentWidth: this.exitWidth, targetWidth: this.exitWidth, count: 0 },
        { id: 3, x: VENUE_WIDTH / 2 - halfW, y: VENUE_HEIGHT - 4, width: this.exitWidth, height: 4, side: 'bottom', currentWidth: this.exitWidth, targetWidth: this.exitWidth, count: 0 }
      );
    } else {
      newExits.push(
        { id: 0, x: 0, y: VENUE_HEIGHT / 2 - halfW, width: 4, height: this.exitWidth, side: 'left', currentWidth: this.exitWidth, targetWidth: this.exitWidth, count: this.exits[0]?.count || 0 },
        { id: 1, x: VENUE_WIDTH - 4, y: VENUE_HEIGHT / 2 - halfW, width: 4, height: this.exitWidth, side: 'right', currentWidth: this.exitWidth, targetWidth: this.exitWidth, count: this.exits[1]?.count || 0 }
      );
    }

    this.exits = newExits;
    this.assignTargets();
    this.generateObstacles();
  }

  setGuideMode(mode: GuideMode): void {
    this.guideMode = mode;
    this.guide.active = mode === 1;
    if (mode === 1) {
      this.guide.x = VENUE_WIDTH / 2;
      this.guide.y = VENUE_HEIGHT / 2;
    }
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
    for (const p of this.pedestrians) {
      p.speed = p.baseSpeed * multiplier;
    }
  }

  setExitWidth(width: number): void {
    this.exitWidth = width;
    const halfW = width / 2;
    for (const exit of this.exits) {
      exit.targetWidth = width;
      if (exit.side === 'left' || exit.side === 'right') {
        exit.height = width;
        exit.y = VENUE_HEIGHT / 2 - halfW;
      } else {
        exit.width = width;
        exit.x = VENUE_WIDTH / 2 - halfW;
      }
    }
  }

  setObstacleDensity(density: number): void {
    this.obstacleDensity = density;
    this.generateObstacles();
  }

  generateObstacles(): void {
    this.obstacles = [];
    if (this.strategy === 3) {
      for (let i = 0; i < this.obstacleDensity; i++) {
        let x: number, y: number;
        let attempts = 0;
        do {
          x = 100 + Math.random() * (VENUE_WIDTH - 200);
          y = 100 + Math.random() * (VENUE_HEIGHT - 200);
          attempts++;
        } while (this.collidesWithExits(x, y, OBSTACLE_SIZE) && attempts < 100);

        this.obstacles.push({
          id: this.obstacleIdCounter++,
          x,
          y,
          size: OBSTACLE_SIZE
        });
      }
    } else {
      for (let i = 0; i < this.obstacleDensity; i++) {
        let x: number, y: number;
        let attempts = 0;
        do {
          x = 100 + Math.random() * (VENUE_WIDTH - 200);
          y = 100 + Math.random() * (VENUE_HEIGHT - 200);
          attempts++;
        } while (this.collidesWithExits(x, y, OBSTACLE_SIZE) && attempts < 100);

        this.obstacles.push({
          id: this.obstacleIdCounter++,
          x,
          y,
          size: OBSTACLE_SIZE
        });
      }
    }
    this.assignTargets();
  }

  collidesWithExits(x: number, y: number, size: number): boolean {
    for (const exit of this.exits) {
      const padding = 40;
      if (x < exit.x + exit.width + padding &&
          x + size > exit.x - padding &&
          y < exit.y + exit.height + padding &&
          y + size > exit.y - padding) {
        return true;
      }
    }
    return false;
  }

  addUserObstacle(x: number, y: number): void {
    const worldPos = this.screenToWorld(x, y);
    const obsX = worldPos.x - OBSTACLE_SIZE / 2;
    const obsY = worldPos.y - OBSTACLE_SIZE / 2;
    if (this.collidesWithExits(obsX, obsY, OBSTACLE_SIZE)) return;
    if (obsX < 0 || obsY < 0 || obsX + OBSTACLE_SIZE > VENUE_WIDTH || obsY + OBSTACLE_SIZE > VENUE_HEIGHT) return;

    this.userObstacles.push({
      id: this.obstacleIdCounter++,
      x: obsX,
      y: obsY,
      size: OBSTACLE_SIZE
    });
    this.assignTargets();
  }

  setPreviewObstacle(x: number | null, y: number | null): void {
    if (x === null || y === null) {
      this.previewObstacle = null;
      return;
    }
    const worldPos = this.screenToWorld(x, y);
    this.previewObstacle = {
      id: -1,
      x: worldPos.x - OBSTACLE_SIZE / 2,
      y: worldPos.y - OBSTACLE_SIZE / 2,
      size: OBSTACLE_SIZE,
      isPreview: true
    };
  }

  removeObstacleAt(x: number, y: number): boolean {
    const worldPos = this.screenToWorld(x, y);
    for (let i = this.userObstacles.length - 1; i >= 0; i--) {
      const obs = this.userObstacles[i];
      if (worldPos.x >= obs.x && worldPos.x <= obs.x + obs.size &&
          worldPos.y >= obs.y && worldPos.y <= obs.y + obs.size) {
        this.userObstacles.splice(i, 1);
        this.assignTargets();
        return true;
      }
    }
    return false;
  }

  togglePedestrianPath(x: number, y: number): boolean {
    const worldPos = this.screenToWorld(x, y);
    for (const p of this.pedestrians) {
      if (p.evacuated) continue;
      if (dist(worldPos.x, worldPos.y, p.x, p.y) < p.radius + 8) {
        p.showPath = true;
        p.showPathTime = 2000;
        return true;
      }
    }
    return false;
  }

  setGuideTarget(x: number, y: number): void {
    const worldPos = this.screenToWorld(x, y);
    this.guide.targetX = clamp(worldPos.x, 50, VENUE_WIDTH - 50);
    this.guide.targetY = clamp(worldPos.y, 50, VENUE_HEIGHT - 50);
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.venueX) / this.scale,
      y: (sy - this.venueY) / this.scale
    };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: wx * this.scale + this.venueX,
      y: wy * this.scale + this.venueY
    };
  }

  setScale(scale: number, centerX: number, centerY: number): void {
    const oldScale = this.scale;
    this.scale = clamp(scale, 0.5, 2.0);
    const ratio = this.scale / oldScale;
    this.venueX = centerX - (centerX - this.venueX) * ratio;
    this.venueY = centerY - (centerY - this.venueY) * ratio;
  }

  updateVenuePosition(): void {
    const containerW = this.canvas.width;
    const containerH = this.canvas.height - 40;
    const venueRatio = VENUE_WIDTH / VENUE_HEIGHT;
    const containerRatio = containerW / containerH;

    let drawW: number, drawH: number;
    if (containerRatio > venueRatio) {
      drawH = containerH * 0.9;
      drawW = drawH * venueRatio;
    } else {
      drawW = containerW * 0.9;
      drawH = drawW / venueRatio;
    }

    this.scale = drawW / VENUE_WIDTH;
    this.venueX = (containerW - drawW) / 2;
    this.venueY = (containerH - drawH) / 2 + 10;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.updateVenuePosition();
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    if (this.startTime === null) {
      this.startTime = performance.now();
      this.lastRateTime = this.startTime;
    }
  }

  pause(): void {
    this.isRunning = false;
  }

  reset(): void {
    this.isRunning = false;
    this.startTime = null;
    this.lastRateTime = 0;
    this.lastRateCount = 0;
    this.currentRate = 0;
    this.evacuatedTimes = [];
    this.userObstacles = [];
    this.generatePedestrians();
    for (const exit of this.exits) {
      exit.count = 0;
    }
    this.notifyListeners();
  }

  getStats(): CrowdStats {
    const evacuated = this.pedestrians.filter(p => p.evacuated).length;
    const remaining = this.totalPedestrians - evacuated;
    const completed = remaining === 0;
    let avgTime: number | null = null;
    if (completed && this.evacuatedTimes.length > 0) {
      avgTime = this.evacuatedTimes.reduce((a, b) => a + b, 0) / this.evacuatedTimes.length / 1000;
    }
    return {
      total: this.totalPedestrians,
      evacuated,
      remaining,
      rate: this.currentRate,
      avgTime,
      completed
    };
  }

  onEvacuate(listener: (stats: CrowdStats) => void): void {
    this.evacuateListeners.push(listener);
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    for (const listener of this.evacuateListeners) {
      listener(stats);
    }
  }

  update(dt: number, now: number): void {
    if (this.isTransitioning) {
      const elapsed = now - this.strategyTransitionStart;
      if (elapsed >= this.strategyTransitionDuration) {
        this.isTransitioning = false;
      }
    }

    if (this.guide.active) {
      const dx = this.guide.targetX - this.guide.x;
      const dy = this.guide.targetY - this.guide.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) {
        const speed = 1.2 * this.speedMultiplier;
        this.guide.x += (dx / d) * speed;
        this.guide.y += (dy / d) * speed;
      }
      this.guide.pulsePhase += dt / 500;
    }

    if (!this.isRunning) return;

    for (const p of this.pedestrians) {
      if (p.evacuated) continue;

      if (p.showPath) {
        p.showPathTime -= dt;
        if (p.showPathTime <= 0) {
          p.showPath = false;
        }
      }

      let targetX: number, targetY: number;

      if (this.guideMode === 1 && this.guide.active) {
        const guideDist = dist(p.x, p.y, this.guide.x, this.guide.y);
        if (guideDist < VIEW_RADIUS) {
          targetX = this.guide.x;
          targetY = this.guide.y;
        } else if (p.targetExit) {
          targetX = p.targetExit.x + p.targetExit.width / 2;
          targetY = p.targetExit.y + p.targetExit.height / 2;
        } else {
          targetX = VENUE_WIDTH / 2;
          targetY = VENUE_HEIGHT / 2;
        }
      } else if (p.targetExit) {
        targetX = p.targetExit.x + p.targetExit.width / 2;
        targetY = p.targetExit.y + p.targetExit.height / 2;
      } else {
        targetX = VENUE_WIDTH / 2;
        targetY = VENUE_HEIGHT / 2;
      }

      if (this.strategy === 1) {
        if (p.targetExit) {
          if (p.targetExit.side === 'left' || p.targetExit.side === 'right') {
            targetY = clamp(p.y, p.targetExit.y + 10, p.targetExit.y + p.targetExit.height - 10);
            targetX = p.targetExit.x + p.targetExit.width / 2;
            const laneOffset = (p.id % 3 - 1) * 12;
            targetY += laneOffset;
          } else {
            targetX = clamp(p.x, p.targetExit.x + 10, p.targetExit.x + p.targetExit.width - 10);
            targetY = p.targetExit.y + p.targetExit.height / 2;
            const laneOffset = (p.id % 3 - 1) * 12;
            targetX += laneOffset;
          }
        }
      }

      let dx = targetX - p.x;
      let dy = targetY - p.y;
      let targetAngle = Math.atan2(dy, dx);

      for (const obs of [...this.obstacles, ...this.userObstacles]) {
        const closestX = clamp(p.x, obs.x, obs.x + obs.size);
        const closestY = clamp(p.y, obs.y, obs.y + obs.size);
        const obsDist = dist(p.x, p.y, closestX, closestY);
        if (obsDist < OBSTACLE_AVOID_RADIUS + p.radius) {
          const avoidAngle = Math.atan2(p.y - closestY, p.x - closestX);
          const weight = 1 - (obsDist / (OBSTACLE_AVOID_RADIUS + p.radius));
          targetAngle = targetAngle * (1 - weight) + avoidAngle * weight;
        }
      }

      const currentAngle = Math.atan2(p.vy, p.vx) || targetAngle;
      let angleDiff = targetAngle - currentAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      angleDiff = clamp(angleDiff, -MAX_TURN_ANGLE, MAX_TURN_ANGLE);
      const newAngle = currentAngle + angleDiff;

      p.vx = Math.cos(newAngle) * p.speed * this.speedMultiplier;
      p.vy = Math.sin(newAngle) * p.speed * this.speedMultiplier;

      const newX = p.x + p.vx;
      const newY = p.y + p.vy;

      p.x = clamp(newX, p.radius, VENUE_WIDTH - p.radius);
      p.y = clamp(newY, p.radius, VENUE_HEIGHT - p.radius);

      if (this.collidesWithObstacle(p.x, p.y, p.radius)) {
        p.x -= p.vx;
        p.y -= p.vy;
      }

      p.trail.unshift({ x: p.x, y: p.y, alpha: 1 });
      if (p.trail.length > TRAIL_LENGTH) {
        p.trail.pop();
      }
      for (let i = 0; i < p.trail.length; i++) {
        p.trail[i].alpha = 1 - (i / TRAIL_LENGTH) * TRAIL_DECAY;
      }

      for (const exit of this.exits) {
        if (this.isAtExit(p, exit)) {
          p.evacuated = true;
          p.evacuateTime = now - (this.startTime || now);
          this.evacuatedTimes.push(p.evacuateTime);
          exit.count++;

          if (now - this.lastRateTime >= 1000) {
            this.currentRate = exit.count + this.exits.reduce((sum, e) => e === exit ? sum : sum + e.count, 0) - this.lastRateCount;
            this.lastRateCount = exit.count + this.exits.reduce((sum, e) => e === exit ? sum : sum + e.count, 0);
            this.lastRateTime = now;
          }
          this.notifyListeners();
          break;
        }
      }
    }

    for (const p of this.pedestrians) {
      if (p.evacuated) continue;
      for (const other of this.pedestrians) {
        if (other === p || other.evacuated) continue;
        const d = dist(p.x, p.y, other.x, other.y);
        const minDist = p.radius + other.radius + 2;
        if (d < minDist && d > 0) {
          const overlap = (minDist - d) / 2;
          const nx = (p.x - other.x) / d;
          const ny = (p.y - other.y) / d;
          p.x += nx * overlap;
          p.y += ny * overlap;
          other.x -= nx * overlap;
          other.y -= ny * overlap;
        }
      }
    }
  }

  isAtExit(p: Pedestrian, exit: Exit): boolean {
    const threshold = p.radius + 2;
    if (exit.side === 'left') {
      return p.x - p.radius <= threshold &&
             p.y >= exit.y - 5 &&
             p.y <= exit.y + exit.height + 5;
    } else if (exit.side === 'right') {
      return p.x + p.radius >= VENUE_WIDTH - threshold &&
             p.y >= exit.y - 5 &&
             p.y <= exit.y + exit.height + 5;
    } else if (exit.side === 'top') {
      return p.y - p.radius <= threshold &&
             p.x >= exit.x - 5 &&
             p.x <= exit.x + exit.width + 5;
    } else {
      return p.y + p.radius >= VENUE_HEIGHT - threshold &&
             p.x >= exit.x - 5 &&
             p.x <= exit.x + exit.width + 5;
    }
  }

  render(now: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.venueX, this.venueY);
    ctx.scale(this.scale, this.scale);

    ctx.fillStyle = '#2D2D44';
    ctx.fillRect(0, 0, VENUE_WIDTH, VENUE_HEIGHT);

    ctx.strokeStyle = '#3D3D54';
    ctx.lineWidth = 1;
    for (let x = 0; x <= VENUE_WIDTH; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, VENUE_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= VENUE_HEIGHT; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VENUE_WIDTH, y);
      ctx.stroke();
    }

    for (const exit of this.exits) {
      this.renderExit(exit, now);
    }

    for (const obs of this.obstacles) {
      this.renderObstacle(obs);
    }
    for (const obs of this.userObstacles) {
      this.renderObstacle(obs);
    }
    if (this.previewObstacle) {
      this.renderObstacle(this.previewObstacle);
    }

    for (const p of this.pedestrians) {
      if (p.evacuated) continue;
      this.renderPedestrian(p, now);
    }

    if (this.guide.active) {
      this.renderGuide(now);
    }

    ctx.restore();
  }

  renderExit(exit: Exit, now: number): void {
    const ctx = this.ctx;
    const glowSize = 20;
    const pulse = (Math.sin(now / 500) + 1) / 2;

    let glowX = exit.x + exit.width / 2;
    let glowY = exit.y + exit.height / 2;

    const gradient = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowSize + pulse * 10);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
    gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(glowX - glowSize - 20, glowY - glowSize - 20, (glowSize + 20) * 2, (glowSize + 20) * 2);

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (exit.side === 'left') {
      ctx.moveTo(0, exit.y);
      ctx.lineTo(0, exit.y + exit.height);
    } else if (exit.side === 'right') {
      ctx.moveTo(VENUE_WIDTH, exit.y);
      ctx.lineTo(VENUE_WIDTH, exit.y + exit.height);
    } else if (exit.side === 'top') {
      ctx.moveTo(exit.x, 0);
      ctx.lineTo(exit.x + exit.width, 0);
    } else {
      ctx.moveTo(exit.x, VENUE_HEIGHT);
      ctx.lineTo(exit.x + exit.width, VENUE_HEIGHT);
    }
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    let labelX = exit.x + exit.width / 2;
    let labelY = exit.side === 'top' ? exit.y + 18 : exit.side === 'bottom' ? exit.y - 6 : exit.side === 'left' ? exit.x + 30 : exit.x - 30;
    if (exit.side === 'left' || exit.side === 'right') {
      labelY = exit.y + exit.height / 2;
    }
    ctx.fillText(`${exit.count}`, labelX, labelY);
  }

  renderObstacle(obs: Obstacle): void {
    const ctx = this.ctx;
    if (obs.isPreview) {
      ctx.strokeStyle = '#777777';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(obs.x, obs.y, obs.size, obs.size);
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = '#555555';
      ctx.fillRect(obs.x, obs.y, obs.size, obs.size);
      ctx.strokeStyle = '#777777';
      ctx.lineWidth = 1;
      ctx.strokeRect(obs.x, obs.y, obs.size, obs.size);
    }
  }

  renderPedestrian(p: Pedestrian, now: number): void {
    const ctx = this.ctx;

    for (let i = p.trail.length - 1; i >= 0; i--) {
      const t = p.trail[i];
      ctx.fillStyle = p.color.replace('rgb(', 'rgba(').replace(')', `, ${t.alpha * 0.4})`);
      ctx.beginPath();
      ctx.arc(t.x, t.y, p.radius * (1 - i / p.trail.length * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }

    if (p.showPath && p.targetExit) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.targetExit.x + p.targetExit.width / 2, p.targetExit.y + p.targetExit.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  renderGuide(now: number): void {
    const ctx = this.ctx;
    const pulse = (Math.sin(this.guide.pulsePhase) + 1) / 2;
    const glowRadius = this.guide.radius + 8 + pulse * 8;

    const gradient = ctx.createRadialGradient(this.guide.x, this.guide.y, this.guide.radius * 0.5, this.guide.x, this.guide.y, glowRadius);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.guide.x, this.guide.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00FF88';
    ctx.beginPath();
    ctx.arc(this.guide.x, this.guide.y, this.guide.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.guide.x, this.guide.y, this.guide.radius + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}
