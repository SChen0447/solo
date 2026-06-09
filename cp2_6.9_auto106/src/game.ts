import { InputManager, InputState } from './input';
import {
  Renderer,
  CarState,
  ObstacleState,
  PowerUpState,
  ParticleState,
  GameRenderState
} from './renderer';

interface GameState {
  car: CarState;
  obstacles: ObstacleState[];
  powerUps: PowerUpState[];
  particles: ParticleState[];
  score: number;
  speedPercent: number;
  progress: number;
  scrollOffset: number;
  baseScrollSpeed: number;
  flashRed: boolean;
  flashRedTimer: number;
  slowdownTimer: number;
  boostTimer: number;
  gameOver: boolean;
  victory: boolean;
  victoryAnimProgress: number;
  obstacleIdCounter: number;
  powerUpIdCounter: number;
  obstacleSpawnTimer: number;
  nextObstacleSpawn: number;
  powerUpSpawnTimer: number;
  nextPowerUpSpawn: number;
  lastFrameTime: number;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private inputManager: InputManager;
  private renderer: Renderer;
  private state: GameState;
  private running: boolean = false;
  private animationId: number | null = null;

  private readonly OBSTACLE_SPAWN_MIN = 3000;
  private readonly OBSTACLE_SPAWN_MAX = 5000;
  private readonly POWERUP_SPAWN_MIN = 6000;
  private readonly POWERUP_SPAWN_MAX = 10000;
  private readonly TRACK_LENGTH = 100000;
  private readonly CAR_LERP = 0.1;
  private readonly FLASH_DURATION = 200;
  private readonly SLOWDOWN_DURATION = 500;
  private readonly BOOST_DURATION = 3000;
  private readonly BOOST_MULTIPLIER = 1.5;
  private readonly SLOWDOWN_FACTOR = 0.3;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Game canvas not found');
    }

    this.inputManager = new InputManager(this.canvas);
    this.renderer = new Renderer(this.canvas);
    this.state = this.createInitialState();
    this.setupUI();
  }

  private createInitialState(): GameState {
    return {
      car: {
        x: 0.5,
        y: 0.8,
        width: 60,
        height: 100,
        speedMultiplier: 1,
        boosted: false
      },
      obstacles: [],
      powerUps: [],
      particles: [],
      score: 0,
      speedPercent: 0,
      progress: 0,
      scrollOffset: 0,
      baseScrollSpeed: 200,
      flashRed: false,
      flashRedTimer: 0,
      slowdownTimer: 0,
      boostTimer: 0,
      gameOver: false,
      victory: false,
      victoryAnimProgress: 0,
      obstacleIdCounter: 0,
      powerUpIdCounter: 0,
      obstacleSpawnTimer: 0,
      nextObstacleSpawn: 2000,
      powerUpSpawnTimer: 0,
      nextPowerUpSpawn: 4000,
      lastFrameTime: 0
    };
  }

  private setupUI(): void {
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restart());
    }
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.state.lastFrameTime = performance.now();
    this.gameLoop();
  }

  public stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public restart(): void {
    this.hideOverlay();
    this.state = this.createInitialState();
    this.state.lastFrameTime = performance.now();
    this.updateProgressBar(0);
    if (!this.running) {
      this.start();
    }
  }

  private gameLoop = (): void => {
    if (!this.running) return;

    const currentTime = performance.now();
    let deltaTime = currentTime - this.state.lastFrameTime;
    this.state.lastFrameTime = currentTime;

    if (deltaTime > 100) deltaTime = 100;

    this.update(deltaTime, currentTime);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number, currentTime: number): void {
    if (this.state.gameOver || this.state.victory) {
      if (this.state.victory && this.state.victoryAnimProgress < 1) {
        this.state.victoryAnimProgress = Math.min(1, this.state.victoryAnimProgress + deltaTime / 500);
      }
      return;
    }

    const input: InputState = this.inputManager.update(currentTime);

    this.updateCar(input, deltaTime);
    this.updateScroll(deltaTime);
    this.updateTimers(deltaTime);
    this.spawnObstacles(deltaTime);
    this.spawnPowerUps(deltaTime);
    this.updateObstacles(deltaTime);
    this.updatePowerUps(deltaTime);
    this.updateParticles(deltaTime);
    this.checkCollisions();
    this.updateProgress();
    this.updateSpeedPercent();
    this.updateProgressBar(this.state.progress);
    this.spawnBoostParticles();

    if (this.state.progress >= 1) {
      this.state.victory = true;
      this.showOverlay(true);
    }
  }

  private updateCar(input: InputState, _deltaTime: number): void {
    const targetX = input.x;
    this.state.car.x += (targetX - this.state.car.x) * this.CAR_LERP;
    this.state.car.x = Math.max(0, Math.min(1, this.state.car.x));
  }

  private updateScroll(deltaTime: number): void {
    const dt = deltaTime / 1000;
    this.state.baseScrollSpeed *= 1 + 0.005 * dt;

    let speed = this.state.baseScrollSpeed;
    if (this.state.boostTimer > 0) {
      speed *= this.BOOST_MULTIPLIER;
      this.state.car.boosted = true;
    } else {
      this.state.car.boosted = false;
    }
    if (this.state.slowdownTimer > 0) {
      speed *= this.SLOWDOWN_FACTOR;
    }

    this.state.scrollOffset += speed * dt;
    this.state.car.speedMultiplier = speed / this.state.baseScrollSpeed;
  }

  private updateTimers(deltaTime: number): void {
    if (this.state.flashRedTimer > 0) {
      this.state.flashRedTimer -= deltaTime;
      if (this.state.flashRedTimer <= 0) {
        this.state.flashRed = false;
      }
    }
    if (this.state.slowdownTimer > 0) {
      this.state.slowdownTimer -= deltaTime;
    }
    if (this.state.boostTimer > 0) {
      this.state.boostTimer -= deltaTime;
    }
  }

  private spawnObstacles(deltaTime: number): void {
    this.state.obstacleSpawnTimer += deltaTime;
    if (this.state.obstacleSpawnTimer >= this.state.nextObstacleSpawn) {
      this.state.obstacleSpawnTimer = 0;
      this.state.nextObstacleSpawn =
        this.OBSTACLE_SPAWN_MIN +
        Math.random() * (this.OBSTACLE_SPAWN_MAX - this.OBSTACLE_SPAWN_MIN);

      const count = 1 + Math.floor(Math.random() * 3);
      const lanes = [0.2, 0.4, 0.6, 0.8];
      const usedLanes = new Set<number>();

      for (let i = 0; i < count; i++) {
        let laneIdx: number;
        do {
          laneIdx = Math.floor(Math.random() * lanes.length);
        } while (usedLanes.has(laneIdx) && usedLanes.size < lanes.length);
        usedLanes.add(laneIdx);

        const isMissile = Math.random() < 0.3;
        const obs: ObstacleState = {
          id: ++this.state.obstacleIdCounter,
          type: isMissile ? 'missile' : 'cone',
          x: lanes[laneIdx],
          y: 0,
          width: isMissile ? 30 : 30,
          height: isMissile ? 30 : 40,
          passed: false
        };
        this.state.obstacles.push(obs);
      }
    }
  }

  private spawnPowerUps(deltaTime: number): void {
    this.state.powerUpSpawnTimer += deltaTime;
    if (this.state.powerUpSpawnTimer >= this.state.nextPowerUpSpawn) {
      this.state.powerUpSpawnTimer = 0;
      this.state.nextPowerUpSpawn =
        this.POWERUP_SPAWN_MIN + Math.random() * (this.POWERUP_SPAWN_MAX - this.POWERUP_SPAWN_MIN);

      const pu: PowerUpState = {
        id: ++this.state.powerUpIdCounter,
        x: 0.5,
        y: 0,
        radius: 20,
        rotation: 0,
        collected: false
      };
      this.state.powerUps.push(pu);
    }
  }

  private updateObstacles(deltaTime: number): void {
    const dt = deltaTime / 1000;
    let speed = this.state.baseScrollSpeed;
    if (this.state.boostTimer > 0) speed *= this.BOOST_MULTIPLIER;
    if (this.state.slowdownTimer > 0) speed *= this.SLOWDOWN_FACTOR;

    const carX = this.state.car.x;

    this.state.obstacles = this.state.obstacles.filter((obs) => {
      obs.y += speed * dt;
      if (obs.type === 'missile') {
        const missileHomingSpeed = 0.0003 * speed * dt;
        if (obs.x < carX) {
          obs.x = Math.min(carX, obs.x + missileHomingSpeed);
        } else if (obs.x > carX) {
          obs.x = Math.max(carX, obs.x - missileHomingSpeed);
        }
      }
      return obs.y < this.canvas.height + 100;
    });
  }

  private updatePowerUps(deltaTime: number): void {
    const dt = deltaTime / 1000;
    let speed = this.state.baseScrollSpeed;
    if (this.state.boostTimer > 0) speed *= this.BOOST_MULTIPLIER;
    if (this.state.slowdownTimer > 0) speed *= this.SLOWDOWN_FACTOR;

    this.state.powerUps = this.state.powerUps.filter((pu) => {
      pu.y += speed * dt;
      pu.rotation = (pu.rotation + 3) % 360;
      return pu.y < this.canvas.height + 100 && !pu.collected;
    });
  }

  private updateParticles(deltaTime: number): void {
    const dt = deltaTime / 1000;
    this.state.particles = this.state.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaTime;
      return p.life > 0;
    });
  }

  private checkCollisions(): void {
    const carY = this.canvas.height * 0.8;
    const carCollisionRadius = 35;

    for (const obs of this.state.obstacles) {
      if (obs.passed) continue;

      const obsRadius = obs.type === 'cone' ? 20 : 18;
      const dx = (this.state.car.x - obs.x) * (this.canvas.width * 0.6 * 0.8);
      const dy = carY - obs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < carCollisionRadius + obsRadius) {
        this.triggerHit();
        obs.passed = true;
      } else if (obs.y > carY + 60 && !obs.passed) {
        obs.passed = true;
        this.state.score += 10;
      }
    }

    for (const pu of this.state.powerUps) {
      if (pu.collected) continue;

      const dx = (this.state.car.x - pu.x) * (this.canvas.width * 0.6 * 0.8);
      const dy = carY - pu.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < carCollisionRadius + pu.radius) {
        pu.collected = true;
        this.state.boostTimer = this.BOOST_DURATION;
        this.state.score += 50;
      }
    }
  }

  private triggerHit(): void {
    this.state.flashRed = true;
    this.state.flashRedTimer = this.FLASH_DURATION;
    this.state.slowdownTimer = this.SLOWDOWN_DURATION;
  }

  private spawnBoostParticles(): void {
    if (this.state.boostTimer <= 0) return;

    const carY = this.canvas.height * 0.8;
    const trackWidth = this.canvas.width * 0.6;
    const trackLeft = (this.canvas.width - trackWidth) / 2;
    const innerWidth = trackWidth * 0.8;
    const innerLeft = trackLeft + (trackWidth - innerWidth) / 2;
    const carX = innerLeft + this.state.car.x * innerWidth;

    for (let i = 0; i < 3; i++) {
      const particle: ParticleState = {
        x: carX + (Math.random() - 0.5) * 40,
        y: carY + Math.random() * 40,
        vx: (Math.random() - 0.5) * 80,
        vy: 80 + Math.random() * 120,
        size: 2 + Math.random() * 4,
        life: 1000,
        maxLife: 1000,
        colorStart: '#FFD700',
        colorEnd: '#FFA500'
      };
      this.state.particles.push(particle);
    }

    if (this.state.particles.length > 200) {
      this.state.particles = this.state.particles.slice(-200);
    }
  }

  private updateProgress(): void {
    this.state.progress = Math.min(1, this.state.scrollOffset / this.TRACK_LENGTH);
  }

  private updateSpeedPercent(): void {
    let speed = this.state.baseScrollSpeed;
    if (this.state.boostTimer > 0) speed *= this.BOOST_MULTIPLIER;
    if (this.state.slowdownTimer > 0) speed *= this.SLOWDOWN_FACTOR;

    const maxSpeed = 1000;
    this.state.speedPercent = Math.min(100, (speed / maxSpeed) * 100);
  }

  private updateProgressBar(progress: number): void {
    const fill = document.getElementById('progressFill');
    if (fill) {
      fill.style.width = `${Math.floor(progress * 100)}%`;
    }
  }

  private showOverlay(victory: boolean): void {
    const overlay = document.getElementById('gameOverlay');
    const title = document.getElementById('overlayTitle');
    const score = document.getElementById('finalScore');
    if (overlay && title && score) {
      title.textContent = victory ? 'Victory!' : 'Game Over';
      title.style.color = victory ? '#FFD700' : '#00E5FF';
      score.textContent = `Score: ${Math.floor(this.state.score)}`;
      overlay.style.display = 'block';
    }
  }

  private hideOverlay(): void {
    const overlay = document.getElementById('gameOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  private render(): void {
    const renderState: GameRenderState = {
      car: this.state.car,
      obstacles: this.state.obstacles,
      powerUps: this.state.powerUps,
      particles: this.state.particles,
      score: this.state.score,
      speedPercent: this.state.speedPercent,
      progress: this.state.progress,
      scrollOffset: this.state.scrollOffset,
      flashRed: this.state.flashRed,
      gameOver: this.state.gameOver,
      victory: this.state.victory,
      victoryAnimProgress: this.state.victoryAnimProgress
    };
    this.renderer.render(renderState);
  }
}

const game = new Game();
game.start();
