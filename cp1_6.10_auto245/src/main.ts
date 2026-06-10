import {
  createShip,
  createShipParticle,
  createComet,
  createCometTrailParticle,
  createExplosionParticles,
  createStars,
  createNebulaParticles,
  type Ship,
  type Comet,
  type ExplosionParticle,
  type Star,
  type NebulaParticle
} from './entities';
import {
  drawBackground,
  drawStars,
  drawNebula,
  drawShip,
  drawComet,
  drawExplosion,
  drawScore,
  drawLevelIndicator,
  drawHomerunText
} from './renderer';
import { checkCollision, isCometOutOfBounds } from './collision';
import {
  createLevelState,
  addScore,
  updateHomerun,
  triggerHomerun,
  shouldTriggerHomerun,
  type LevelState
} from './levels';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let width = 0;
let height = 0;

let ship: Ship;
let comets: Comet[] = [];
let explosionParticles: ExplosionParticle[] = [];
let stars: Star[] = [];
let nebulaParticles: NebulaParticle[] = [];
let levelState: LevelState;

let starsRotation = 0;
let gameTime = 0;
let lastTime = performance.now();
let capturedThisRound = 0;
let mouseClicked = false;

function resize(): void {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  stars = createStars(width, height, 400);
  nebulaParticles = createNebulaParticles(width, height, 50);
}

function init(): void {
  resize();
  ship = createShip(width, height);
  comets = [createComet(width, height, 1)];
  levelState = createLevelState();

  window.addEventListener('resize', resize);

  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    ship.targetX = e.clientX;
    ship.targetY = e.clientY;
  });

  canvas.addEventListener('click', () => {
    mouseClicked = true;
  });
}

function updateShip(_deltaTime: number): void {
  const dx = ship.targetX - ship.x;
  const dy = ship.targetY - ship.y;
  ship.x += dx * 0.15;
  ship.y += dy * 0.15;

  if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
    ship.angle = Math.atan2(dy, dx);
  }

  const trailX = ship.x - Math.cos(ship.angle) * 20;
  const trailY = ship.y - Math.sin(ship.angle) * 20;
  ship.trail.push(createShipParticle(trailX, trailY));
  if (ship.trail.length > 10) {
    ship.trail.shift();
  }
}

function updateComets(_deltaTime: number): void {
  for (const comet of comets) {
    comet.x += comet.vx;
    comet.y += comet.vy;
    comet.angle = Math.atan2(comet.vy, comet.vx);

    const trailX = comet.x - Math.cos(comet.angle) * comet.radius;
    const trailY = comet.y - Math.sin(comet.angle) * comet.radius;
    comet.trail.push(createCometTrailParticle(trailX, trailY, comet.color));
    if (comet.trail.length > 30) {
      comet.trail.shift();
    }
  }

  comets = comets.filter((comet) => !isCometOutOfBounds(comet, width, height));
}

function updateExplosions(deltaTime: number): void {
  for (const p of explosionParticles) {
    p.life += deltaTime;
  }
  explosionParticles = explosionParticles.filter((p) => p.life < p.maxLife);
}

function updateNebula(_deltaTime: number): void {
  for (const p of nebulaParticles) {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < -p.radius) p.x = width + p.radius;
    if (p.x > width + p.radius) p.x = -p.radius;
    if (p.y < -p.radius) p.y = height + p.radius;
    if (p.y > height + p.radius) p.y = -p.radius;
  }
}

function spawnCometsIfNeeded(): void {
  while (comets.length < levelState.cometCount) {
    comets.push(createComet(width, height, levelState.speedMultiplier));
  }
}

function handleCollisions(): void {
  if (!mouseClicked) return;

  const toRemove: number[] = [];

  for (let i = 0; i < comets.length; i++) {
    if (checkCollision(ship, comets[i])) {
      toRemove.push(i);
      explosionParticles.push(...createExplosionParticles(comets[i]));
      addScore(levelState, 1);
      capturedThisRound++;
    }
  }

  for (let i = toRemove.length - 1; i >= 0; i--) {
    comets.splice(toRemove[i], 1);
  }

  mouseClicked = false;
}

function checkHomerun(): void {
  if (shouldTriggerHomerun(levelState, comets.length, capturedThisRound)) {
    triggerHomerun(levelState);
    capturedThisRound = 0;
  }
  if (comets.length > 0) {
    capturedThisRound = 0;
  }
}

function render(): void {
  drawBackground(ctx, width, height, levelState.rainbowNebula);

  if (levelState.showNebula) {
    drawNebula(ctx, nebulaParticles, levelState.rainbowNebula);
  }

  drawStars(ctx, stars, gameTime, starsRotation);

  for (const comet of comets) {
    drawComet(ctx, comet);
  }

  drawShip(ctx, ship);

  drawExplosion(ctx, explosionParticles);

  drawScore(ctx, levelState.score);
  drawLevelIndicator(ctx, levelState.level, levelState.maxLevel);

  if (levelState.homerunActive) {
    drawHomerunText(ctx, levelState.homerunAlpha);
  }
}

function gameLoop(currentTime: number): void {
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  gameTime += deltaTime;
  starsRotation += 0.00005;

  updateShip(deltaTime);
  updateComets(deltaTime);
  updateExplosions(deltaTime);
  updateHomerun(levelState, deltaTime);

  if (levelState.showNebula) {
    updateNebula(deltaTime);
  }

  handleCollisions();
  checkHomerun();
  spawnCometsIfNeeded();

  render();

  requestAnimationFrame(gameLoop);
}

init();
requestAnimationFrame(gameLoop);
