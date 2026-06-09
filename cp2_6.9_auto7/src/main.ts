import './style.css';
import {
  createShip,
  createStar,
  createObstacle,
  createPowerUp,
  createParticle,
  resetParticle,
  checkShipObstacleCollision,
  circleCollision,
  type GameStateData,
  type Particle
} from './entities';
import { Renderer } from './renderer';
import { UIManager } from './ui';

const BASE_OBSTACLE_SPEED = 3;
const SHIP_SPEED = 5;
const MAX_OBSTACLES = 30;
const MAX_PARTICLES = 50;
const STAR_COUNT = 150;
const DIFFICULTY_INTERVAL = 10;
const DIFFICULTY_INCREMENT = 0.5;
const POWERUP_INTERVAL = 20;
const BOOST_MULTIPLIER = 1.5;
const BOOST_DURATION = 5;
const SCORE_PER_SECOND = 10;
const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;

function createInitialState(canvasWidth: number, canvasHeight: number): GameStateData {
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push(createStar(canvasWidth, canvasHeight));
  }

  const particles: Particle[] = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particles.push(createParticle());
  }

  return {
    ship: createShip(canvasWidth, canvasHeight),
    obstacles: [],
    powerUps: [],
    particles,
    stars,
    score: 0,
    displayScore: 0,
    baseSpeedMultiplier: 1,
    boostMultiplier: 1,
    boostRemaining: 0,
    elapsedTime: 0,
    obstacleSpawnTimer: 0,
    powerUpSpawnTimer: 0,
    gameStatus: 'idle',
    keys: { up: false, down: false },
    canvasWidth,
    canvasHeight
  };
}

function getTotalSpeedMultiplier(state: GameStateData): number {
  return state.baseSpeedMultiplier * state.boostMultiplier;
}

function getObstacleSpawnInterval(state: GameStateData): number {
  const base = 1500;
  return Math.max(base / getTotalSpeedMultiplier(state), 350);
}

function findInactiveParticle(state: GameStateData): Particle | null {
  for (const p of state.particles) {
    if (!p.active) return p;
  }
  return null;
}

function spawnParticle(state: GameStateData): void {
  const p = findInactiveParticle(state);
  if (!p) return;
  const ship = state.ship;
  const vx = -(2 + Math.random() * 3) * getTotalSpeedMultiplier(state);
  const vy = (Math.random() - 0.5) * 2;
  const life = 30 + Math.random() * 20;
  resetParticle(p, ship.x - ship.radius, ship.y + (Math.random() - 0.5) * ship.radius * 0.6, vx, vy, life);
}

function updateParticles(state: GameStateData): void {
  for (const p of state.particles) {
    if (!p.active) continue;
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) {
      p.active = false;
    }
  }
}

function updateShip(state: GameStateData): void {
  const ship = state.ship;
  if (state.keys.up) {
    ship.y -= SHIP_SPEED;
  }
  if (state.keys.down) {
    ship.y += SHIP_SPEED;
  }
  const minY = ship.radius;
  const maxY = state.canvasHeight - ship.radius;
  ship.y = Math.max(minY, Math.min(maxY, ship.y));

  if (ship.boosting && Math.random() < 0.8) {
    spawnParticle(state);
  }
}

function updateObstacles(state: GameStateData, dt: number): void {
  const speed = BASE_OBSTACLE_SPEED * getTotalSpeedMultiplier(state);
  for (const obs of state.obstacles) {
    if (!obs.active) continue;
    obs.x -= speed * (dt / FRAME_DURATION);
    if (obs.x + obs.width < 0) {
      obs.active = false;
    }
  }
  state.obstacles = state.obstacles.filter(o => o.active);
}

function updatePowerUps(state: GameStateData, dt: number, time: number): void {
  const speed = BASE_OBSTACLE_SPEED * getTotalSpeedMultiplier(state) * 0.6;
  for (const pu of state.powerUps) {
    if (!pu.active) continue;
    pu.x -= speed * (dt / FRAME_DURATION);
    pu.pulsePhase = time * 0.001;
    if (pu.x + pu.radius < 0) {
      pu.active = false;
    }
  }
  state.powerUps = state.powerUps.filter(p => p.active);
}

function updateStars(state: GameStateData, dt: number): void {
  const speed = getTotalSpeedMultiplier(state) * 0.5;
  for (const star of state.stars) {
    star.x -= speed * star.size * (dt / FRAME_DURATION);
    if (star.x < 0) {
      star.x = state.canvasWidth;
      star.y = Math.random() * state.canvasHeight;
    }
  }
}

function trySpawnObstacle(state: GameStateData, dt: number): void {
  state.obstacleSpawnTimer += dt;
  const interval = getObstacleSpawnInterval(state);
  if (state.obstacleSpawnTimer >= interval) {
    state.obstacleSpawnTimer = 0;
    if (state.obstacles.length < MAX_OBSTACLES) {
      state.obstacles.push(createObstacle(state.canvasWidth, state.canvasHeight));
    }
  }
}

function trySpawnPowerUp(state: GameStateData, dt: number): void {
  state.powerUpSpawnTimer += dt;
  if (state.powerUpSpawnTimer >= POWERUP_INTERVAL * 1000) {
    state.powerUpSpawnTimer = 0;
    state.powerUps.push(createPowerUp(state.canvasWidth, state.canvasHeight));
  }
}

function checkCollisions(state: GameStateData): 'none' | 'obstacle' | 'powerup' {
  for (const obs of state.obstacles) {
    if (!obs.active) continue;
    if (checkShipObstacleCollision(state.ship, obs)) {
      return 'obstacle';
    }
  }
  for (const pu of state.powerUps) {
    if (!pu.active) continue;
    if (circleCollision(state.ship.x, state.ship.y, state.ship.radius, pu.x, pu.y, pu.radius)) {
      pu.active = false;
      return 'powerup';
    }
  }
  return 'none';
}

function activateBoost(state: GameStateData): void {
  state.boostMultiplier = BOOST_MULTIPLIER;
  state.boostRemaining = BOOST_DURATION;
  state.ship.boosting = true;
}

function updateBoost(state: GameStateData, dt: number): void {
  if (state.boostRemaining > 0) {
    state.boostRemaining -= dt / 1000;
    if (state.boostRemaining <= 0) {
      state.boostRemaining = 0;
      state.boostMultiplier = 1;
      state.ship.boosting = false;
    }
  }
}

function updateDifficulty(state: GameStateData): void {
  const targetMultiplier = 1 + Math.floor(state.elapsedTime / DIFFICULTY_INTERVAL) * DIFFICULTY_INCREMENT;
  state.baseSpeedMultiplier = Math.min(targetMultiplier, 5);
}

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private ui: UIManager;
  private state: GameStateData;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private rafId: number | null = null;
  private gameTime: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.ui = new UIManager();

    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.resize(w, h);
    this.state = createInitialState(w, h);

    this.setupEventListeners();
    this.ui.showStart();
    this.renderIdleFrame();
  }

  private setupEventListeners(): void {
    const els = this.ui.getElements();

    els.startBtn.addEventListener('click', () => this.start());
    els.resumeBtn.addEventListener('click', () => this.resume());
    els.restartBtn.addEventListener('click', () => this.restart());
    els.pauseBtn.addEventListener('click', () => this.togglePause());

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('resize', () => this.onResize());
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
    if (e.key === 'ArrowUp') this.state.keys.up = true;
    if (e.key === 'ArrowDown') this.state.keys.down = true;
    if (e.key === 'p' || e.key === 'P') this.togglePause();
    if (e.key === ' ' || e.key === 'Enter') {
      if (this.state.gameStatus === 'idle') this.start();
      else if (this.state.gameStatus === 'gameover') this.restart();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.key === 'ArrowUp') this.state.keys.up = false;
    if (e.key === 'ArrowDown') this.state.keys.down = false;
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.resize(w, h);
    this.state.canvasWidth = w;
    this.state.canvasHeight = h;
    this.state.ship.x = w * 0.15;
    this.state.ship.y = Math.max(this.state.ship.radius, Math.min(h - this.state.ship.radius, this.state.ship.y));
    for (const star of this.state.stars) {
      if (star.x > w) star.x = Math.random() * w;
      if (star.y > h) star.y = Math.random() * h;
    }
  }

  private start(): void {
    this.state.gameStatus = 'playing';
    this.ui.hideAll();
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  private togglePause(): void {
    if (this.state.gameStatus === 'playing') {
      this.pause();
    } else if (this.state.gameStatus === 'paused') {
      this.resume();
    }
  }

  private pause(): void {
    this.state.gameStatus = 'paused';
    this.ui.showPause();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private resume(): void {
    this.state.gameStatus = 'playing';
    this.ui.hideAll();
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  private restart(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.state = createInitialState(w, h);
    this.ui.reset();
    this.start();
  }

  private gameOver(): void {
    this.state.gameStatus = 'gameover';
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.ui.showGameOver(Math.floor(this.state.score));
  }

  private update(dt: number): void {
    const state = this.state;
    state.elapsedTime += dt / 1000;
    state.score += (dt / 1000) * SCORE_PER_SECOND;

    updateDifficulty(state);
    updateBoost(state, dt);
    updateShip(state);
    updateObstacles(state, dt);
    updatePowerUps(state, dt, this.gameTime);
    updateStars(state, dt);
    updateParticles(state);
    trySpawnObstacle(state, dt);
    trySpawnPowerUp(state, dt);

    const collision = checkCollisions(state);
    if (collision === 'obstacle') {
      this.gameOver();
      return;
    } else if (collision === 'powerup') {
      activateBoost(state);
    }

    this.ui.updateScore(state.score);
    this.ui.updateSpeed(getTotalSpeedMultiplier(state));
  }

  private render(): void {
    const state = this.state;
    this.renderer.clear();
    this.renderer.drawStars(state.stars, this.gameTime);
    this.renderer.drawParticles(state.particles);
    for (const obs of state.obstacles) {
      if (obs.active) this.renderer.drawObstacle(obs);
    }
    for (const pu of state.powerUps) {
      if (pu.active) this.renderer.drawPowerUp(pu, this.gameTime);
    }
    this.renderer.drawShip(state.ship, this.gameTime);
  }

  private renderIdleFrame(): void {
    this.renderer.clear();
    this.renderer.drawStars(this.state.stars, 0);
  }

  private loop = (currentTime: number): void => {
    if (this.state.gameStatus !== 'playing') return;

    this.rafId = requestAnimationFrame(this.loop);

    let dt = currentTime - this.lastTime;
    this.lastTime = currentTime;
    if (dt > 100) dt = 100;

    this.accumulator += dt;
    while (this.accumulator >= FRAME_DURATION) {
      this.gameTime += FRAME_DURATION;
      this.update(FRAME_DURATION);
      if (this.state.gameStatus !== 'playing') return;
      this.accumulator -= FRAME_DURATION;
    }

    this.render();
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
