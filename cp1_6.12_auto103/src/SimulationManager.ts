export interface Vector2 {
  x: number;
  y: number;
}

export interface FoodParticle {
  id: number;
  position: Vector2;
  radius: number;
  opacity: number;
  targetOpacity: number;
  opacityDirection: number;
  opacityTimer: number;
  isEaten: boolean;
  eatProgress: number;
}

export interface TrailParticle {
  position: Vector2;
  opacity: number;
  life: number;
  maxLife: number;
}

export interface Ripple {
  position: Vector2;
  radius: number;
  maxRadius: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export interface Microbe {
  id: number;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  baseSpeed: number;
  speed: number;
  rotation: number;
  targetRotation: number;
  rotationalInertia: number;
  perceptionRadius: number;
  trailParticles: TrailParticle[];
  maxTrailParticles: number;
  isFlashing: boolean;
  flashTimer: number;
  targetFood: FoodParticle | null;
  wavetime: number;
  waveAmplitude: number;
  waveFrequency: number;
  color: string;
  generation: number;
}

export interface EvolutionStats {
  timestamp: number;
  avgSpeed: number;
  avgSize: number;
}

export interface SimulationConfig {
  canvasWidth: number;
  canvasHeight: number;
  initialFoodCount: number;
  foodSpawnInterval: number;
  maxMicrobes: number;
  lowPerformanceThreshold: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
  canvasWidth: 800,
  canvasHeight: 600,
  initialFoodCount: 50,
  foodSpawnInterval: 500,
  maxMicrobes: 500,
  lowPerformanceThreshold: 200,
};

export class SimulationManager {
  private config: SimulationConfig;
  private microbes: Microbe[] = [];
  private foodParticles: FoodParticle[] = [];
  private ripples: Ripple[] = [];
  private evolutionHistory: EvolutionStats[] = [];
  private idCounter = 0;
  private lastFoodSpawnTime = 0;
  private lastStatsUpdate = 0;
  private statsUpdateInterval = 2000;
  private isPaused = false;
  private speedMultiplier = 1;
  private isLowPerformance = false;
  private camera = {
    x: 0,
    y: 0,
    zoom: 1,
    targetZoom: 1,
    zoomTransition: 0,
  };
  private canvasWidth: number;
  private canvasHeight: number;
  private onStatsUpdate?: (stats: EvolutionStats[]) => void;

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.canvasWidth = this.config.canvasWidth;
    this.canvasHeight = this.config.canvasHeight;
    this.initializeFood();
  }

  setOnStatsUpdate(callback: (stats: EvolutionStats[]) => void): void {
    this.onStatsUpdate = callback;
  }

  private generateId(): number {
    return ++this.idCounter;
  }

  private initializeFood(): void {
    this.foodParticles = [];
    for (let i = 0; i < this.config.initialFoodCount; i++) {
      this.spawnFood();
    }
  }

  private spawnFood(): void {
    const margin = 20;
    const food: FoodParticle = {
      id: this.generateId(),
      position: {
        x: margin + Math.random() * (this.canvasWidth - margin * 2),
        y: margin + Math.random() * (this.canvasHeight - margin * 2),
      },
      radius: 3,
      opacity: 0.6 + Math.random() * 0.4,
      targetOpacity: Math.random() > 0.5 ? 1 : 0.6,
      opacityDirection: 1,
      opacityTimer: Math.random() * 1200,
      isEaten: false,
      eatProgress: 0,
    };
    this.foodParticles.push(food);
  }

  spawnMicrobe(worldX: number, worldY: number): void {
    const speed = 30 + Math.random() * 30;
    const microbe: Microbe = {
      id: this.generateId(),
      position: { x: worldX, y: worldY },
      velocity: { x: 0, y: 0 },
      radius: 8,
      baseSpeed: speed,
      speed: speed,
      rotation: Math.random() * Math.PI * 2,
      targetRotation: 0,
      rotationalInertia: 0.2 + Math.random() * 0.3,
      perceptionRadius: 50 + Math.random() * 30,
      trailParticles: [],
      maxTrailParticles: this.isLowPerformance ? 3 : 6,
      isFlashing: false,
      flashTimer: 0,
      targetFood: null,
      wavetime: 0,
      waveAmplitude: 5,
      waveFrequency: 0.02,
      color: '#4FC3F7',
      generation: 1,
    };
    this.microbes.push(microbe);
    this.updateLowPerformanceMode();
  }

  private findNearestFood(microbe: Microbe): FoodParticle | null {
    let nearest: FoodParticle | null = null;
    let nearestDist = Infinity;

    for (const food of this.foodParticles) {
      if (food.isEaten) continue;
      const dx = food.position.x - microbe.position.x;
      const dy = food.position.y - microbe.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < microbe.perceptionRadius && dist < nearestDist) {
        nearest = food;
        nearestDist = dist;
      }
    }
    return nearest;
  }

  private updateMicrobe(microbe: Microbe, dt: number): void {
    if (!microbe.targetFood || microbe.targetFood.isEaten) {
      microbe.targetFood = this.findNearestFood(microbe);
    }

    if (microbe.targetFood) {
      const dx = microbe.targetFood.position.x - microbe.position.x;
      const dy = microbe.targetFood.position.y - microbe.position.y;
      microbe.targetRotation = Math.atan2(dy, dx);

      let rotDiff = microbe.targetRotation - microbe.rotation;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      microbe.rotation += rotDiff * (1 - microbe.rotationalInertia) * dt * 8;
    }

    microbe.wavetime += microbe.speed * dt;
    const waveOffset = Math.sin(microbe.wavetime * microbe.waveFrequency) * microbe.waveAmplitude;
    const perpX = Math.cos(microbe.rotation + Math.PI / 2);
    const perpY = Math.sin(microbe.rotation + Math.PI / 2);

    microbe.velocity.x = Math.cos(microbe.rotation) * microbe.speed + perpX * waveOffset * 0.1;
    microbe.velocity.y = Math.sin(microbe.rotation) * microbe.speed + perpY * waveOffset * 0.1;

    microbe.position.x += microbe.velocity.x * dt;
    microbe.position.y += microbe.velocity.y * dt;

    microbe.position.x = Math.max(microbe.radius, Math.min(this.canvasWidth - microbe.radius, microbe.position.x));
    microbe.position.y = Math.max(microbe.radius, Math.min(this.canvasHeight - microbe.radius, microbe.position.y));

    if (microbe.isFlashing) {
      microbe.flashTimer -= dt * 1000;
      if (microbe.flashTimer <= 0) {
        microbe.isFlashing = false;
      }
    }

    const trailInterval = 0.08;
    const lastTrail = microbe.trailParticles[microbe.trailParticles.length - 1];
    if (!lastTrail || (Date.now() - (lastTrail as any).spawnTime) / 1000 > trailInterval) {
      if (microbe.trailParticles.length < microbe.maxTrailParticles) {
        const trail: TrailParticle & { spawnTime: number } = {
          position: { ...microbe.position },
          opacity: 0.6,
          life: 0.5,
          maxLife: 0.5,
          spawnTime: Date.now(),
        };
        microbe.trailParticles.push(trail);
      }
    }

    for (let i = microbe.trailParticles.length - 1; i >= 0; i--) {
      const trail = microbe.trailParticles[i];
      trail.life -= dt;
      trail.opacity = (trail.life / trail.maxLife) * 0.6;
      if (trail.life <= 0) {
        microbe.trailParticles.splice(i, 1);
      }
    }
  }

  private checkCollision(microbe: Microbe, food: FoodParticle): boolean {
    const dx = microbe.position.x - food.position.x;
    const dy = microbe.position.y - food.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < microbe.radius + food.radius;
  }

  private eatFood(microbe: Microbe, food: FoodParticle): void {
    if (food.isEaten) return;
    food.isEaten = true;
    food.eatProgress = 1;

    microbe.radius = Math.min(20, microbe.radius + 0.5);
    microbe.speed *= 1.02;
    microbe.baseSpeed = microbe.speed;

    if (!this.isLowPerformance) {
      microbe.isFlashing = true;
      microbe.flashTimer = 100;
    }

    if (Math.random() < 0.15) {
      this.splitMicrobe(microbe);
    }
  }

  private splitMicrobe(parent: Microbe): void {
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = angle1 + Math.PI;
    const offset = 5;

    const mutationSpeed = 0.05;
    const mutationPerception = 0.1;

    const child1: Microbe = {
      ...parent,
      id: this.generateId(),
      position: {
        x: parent.position.x + Math.cos(angle1) * offset,
        y: parent.position.y + Math.sin(angle1) * offset,
      },
      velocity: { x: 0, y: 0 },
      baseSpeed: parent.baseSpeed * (1 + (Math.random() * 2 - 1) * mutationSpeed),
      speed: parent.speed * (1 + (Math.random() * 2 - 1) * mutationSpeed),
      perceptionRadius: parent.perceptionRadius * (1 + (Math.random() * 2 - 1) * mutationPerception),
      radius: Math.max(6, parent.radius * 0.7),
      trailParticles: [],
      maxTrailParticles: this.isLowPerformance ? 3 : 6,
      isFlashing: false,
      flashTimer: 0,
      targetFood: null,
      wavetime: 0,
      generation: parent.generation + 1,
    };

    const child2: Microbe = {
      ...parent,
      id: this.generateId(),
      position: {
        x: parent.position.x + Math.cos(angle2) * offset,
        y: parent.position.y + Math.sin(angle2) * offset,
      },
      velocity: { x: 0, y: 0 },
      baseSpeed: parent.baseSpeed * (1 + (Math.random() * 2 - 1) * mutationSpeed),
      speed: parent.speed * (1 + (Math.random() * 2 - 1) * mutationSpeed),
      perceptionRadius: parent.perceptionRadius * (1 + (Math.random() * 2 - 1) * mutationPerception),
      radius: Math.max(6, parent.radius * 0.7),
      trailParticles: [],
      maxTrailParticles: this.isLowPerformance ? 3 : 6,
      isFlashing: false,
      flashTimer: 0,
      targetFood: null,
      wavetime: 0,
      generation: parent.generation + 1,
    };

    const index = this.microbes.indexOf(parent);
    if (index > -1) {
      this.microbes.splice(index, 1, child1, child2);
    }

    this.spawnRipple(parent.position.x, parent.position.y);
    this.updateLowPerformanceMode();
  }

  private spawnRipple(x: number, y: number): void {
    const ripple: Ripple = {
      position: { x, y },
      radius: 10,
      maxRadius: 30,
      opacity: 0.8,
      life: 0.4,
      maxLife: 0.4,
    };
    this.ripples.push(ripple);
  }

  private updateLowPerformanceMode(): void {
    const wasLowPerformance = this.isLowPerformance;
    this.isLowPerformance = this.microbes.length >= this.config.lowPerformanceThreshold;

    if (wasLowPerformance !== this.isLowPerformance) {
      const maxTrail = this.isLowPerformance ? 3 : 6;
      for (const microbe of this.microbes) {
        microbe.maxTrailParticles = maxTrail;
      }
    }
  }

  update(dt: number, currentTime: number): void {
    if (this.isPaused) return;

    dt *= this.speedMultiplier;

    for (const microbe of this.microbes) {
      this.updateMicrobe(microbe, dt);

      for (const food of this.foodParticles) {
        if (!food.isEaten && this.checkCollision(microbe, food)) {
          this.eatFood(microbe, food);
        }
      }
    }

    for (let i = this.foodParticles.length - 1; i >= 0; i--) {
      const food = this.foodParticles[i];
      if (food.isEaten) {
        food.eatProgress -= dt * 3;
        if (food.eatProgress <= 0) {
          this.foodParticles.splice(i, 1);
        }
      } else {
        food.opacityTimer += dt * 1000;
        if (food.opacityTimer >= 1200) {
          food.opacityTimer = 0;
          food.targetOpacity = food.targetOpacity > 0.8 ? 0.6 : 1;
        }
        const opacitySpeed = 0.5 * dt;
        if (food.opacity < food.targetOpacity) {
          food.opacity = Math.min(food.targetOpacity, food.opacity + opacitySpeed);
        } else {
          food.opacity = Math.max(food.targetOpacity, food.opacity - opacitySpeed);
        }
      }
    }

    const spawnInterval = this.isLowPerformance ? 1000 : this.config.foodSpawnInterval;
    if (currentTime - this.lastFoodSpawnTime > spawnInterval && this.foodParticles.length < 100) {
      this.spawnFood();
      this.lastFoodSpawnTime = currentTime;
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.life -= dt;
      ripple.radius = 10 + (30 - 10) * (1 - ripple.life / ripple.maxLife);
      ripple.opacity = (ripple.life / ripple.maxLife) * 0.8;
      if (ripple.life <= 0) {
        this.ripples.splice(i, 1);
      }
    }

    if (this.camera.zoomTransition > 0) {
      this.camera.zoomTransition -= dt;
      const t = 1 - this.camera.zoomTransition / 0.3;
      this.camera.zoom = this.camera.zoom + (this.camera.targetZoom - this.camera.zoom) * t;
      if (this.camera.zoomTransition <= 0) {
        this.camera.zoom = this.camera.targetZoom;
      }
    }

    if (currentTime - this.lastStatsUpdate > this.statsUpdateInterval) {
      this.updateEvolutionStats();
      this.lastStatsUpdate = currentTime;
    }
  }

  private updateEvolutionStats(): void {
    if (this.microbes.length === 0) return;

    const avgSpeed = this.microbes.reduce((sum, m) => sum + m.baseSpeed, 0) / this.microbes.length;
    const avgSize = this.microbes.reduce((sum, m) => sum + m.radius, 0) / this.microbes.length;

    const stats: EvolutionStats = {
      timestamp: Date.now(),
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      avgSize: Math.round(avgSize * 10) / 10,
    };

    this.evolutionHistory.push(stats);
    if (this.evolutionHistory.length > 50) {
      this.evolutionHistory.shift();
    }

    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.evolutionHistory);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(
      this.canvasWidth / 2 + this.camera.x,
      this.canvasHeight / 2 + this.camera.y
    );
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.canvasWidth / 2, -this.canvasHeight / 2);

    for (const food of this.foodParticles) {
      if (food.isEaten) {
        const scale = food.eatProgress;
        ctx.globalAlpha = food.opacity * food.eatProgress;
        ctx.beginPath();
        ctx.arc(food.position.x, food.position.y, food.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = '#FFEB3B';
        ctx.fill();
      } else {
        ctx.globalAlpha = food.opacity;
        ctx.shadowColor = '#FFEB3B';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(food.position.x, food.position.y, food.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFEB3B';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;

    for (const ripple of this.ripples) {
      ctx.globalAlpha = ripple.opacity;
      ctx.strokeStyle = '#00E676';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ripple.position.x, ripple.position.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const microbe of this.microbes) {
      for (const trail of microbe.trailParticles) {
        ctx.globalAlpha = trail.opacity;
        ctx.beginPath();
        ctx.arc(trail.position.x, trail.position.y, microbe.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = microbe.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = microbe.isFlashing ? '#FFFFFF' : microbe.color;
      ctx.shadowColor = microbe.color;
      ctx.shadowBlur = microbe.isFlashing ? 20 : 10;
      ctx.beginPath();
      ctx.arc(microbe.position.x, microbe.position.y, microbe.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      const eyeX = microbe.position.x + Math.cos(microbe.rotation) * microbe.radius * 0.4;
      const eyeY = microbe.position.y + Math.sin(microbe.rotation) * microbe.radius * 0.4;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, microbe.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0B132B';
      ctx.beginPath();
      ctx.arc(
        eyeX + Math.cos(microbe.rotation) * microbe.radius * 0.1,
        eyeY + Math.sin(microbe.rotation) * microbe.radius * 0.1,
        microbe.radius * 0.12,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }

  getMicrobes(): Microbe[] {
    return this.microbes;
  }

  getFoodParticles(): FoodParticle[] {
    return this.foodParticles;
  }

  getEvolutionHistory(): EvolutionStats[] {
    return this.evolutionHistory;
  }

  getFastestMicrobe(): Microbe | null {
    if (this.microbes.length === 0) return null;
    return this.microbes.reduce((fastest, m) => (m.baseSpeed > fastest.baseSpeed ? m : fastest));
  }

  togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  setSpeedMultiplier(speed: number): void {
    this.speedMultiplier = speed;
  }

  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  setZoom(zoom: number): void {
    this.camera.targetZoom = Math.max(0.5, Math.min(3, zoom));
    this.camera.zoomTransition = 0.3;
  }

  getZoom(): number {
    return this.camera.zoom;
  }

  panCamera(dx: number, dy: number): void {
    this.camera.x += dx;
    this.camera.y += dy;
  }

  screenToWorld(screenX: number, screenY: number, rect: DOMRect): Vector2 {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const zoom = this.camera.zoom;

    const x = (screenX - rect.left - centerX - this.camera.x) / zoom + centerX;
    const y = (screenY - rect.top - centerY - this.camera.y) / zoom + centerY;

    return { x, y };
  }

  reset(): void {
    this.microbes = [];
    this.foodParticles = [];
    this.ripples = [];
    this.evolutionHistory = [];
    this.idCounter = 0;
    this.isPaused = false;
    this.speedMultiplier = 1;
    this.isLowPerformance = false;
    this.camera = { x: 0, y: 0, zoom: 1, targetZoom: 1, zoomTransition: 0 };
    this.initializeFood();

    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.evolutionHistory);
    }
  }
}
