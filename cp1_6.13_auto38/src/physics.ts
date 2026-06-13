export interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  cracked: boolean;
  crackLines: CrackLine[];
  scattered: boolean;
  scatterVx: number;
  scatterVy: number;
  scatterRotation: number;
  scatterRotSpeed: number;
  scatterLife: number;
}

export interface CrackLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'debris' | 'dust';
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  active: boolean;
  trail: TrailPoint[];
}

export interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  vy: number;
}

export interface SimulationState {
  bricks: Brick[];
  projectile: Projectile;
  particles: Particle[];
  stability: number;
  launchCount: number;
  totalDamage: number;
  floatingTexts: FloatingText[];
  wallShakeOffset: number;
  screenFlashAlpha: number;
  trebuchetAngle: number;
  trebuchetSpringCompress: number;
  phase: 'idle' | 'launching' | 'flying' | 'impact' | 'settling';
  impactTimer: number;
}

export interface LaunchParams {
  angle: number;
  force: number;
  weight: number;
}

const GRAVITY = 9.8;
const PIXEL_SCALE = 18;
const WALL_COLS = 6;
const WALL_ROWS = 8;
const BRICK_W = 42;
const BRICK_H = 22;
const MORTAR = 3;

export function createBricks(wallBaseX: number, wallBaseY: number): Brick[] {
  const bricks: Brick[] = [];
  for (let row = 0; row < WALL_ROWS; row++) {
    const offset = row % 2 === 0 ? 0 : BRICK_W / 2;
    const cols = row % 2 === 0 ? WALL_COLS : WALL_COLS - 1;
    for (let col = 0; col < cols; col++) {
      const bx = wallBaseX + offset + col * (BRICK_W + MORTAR);
      const by = wallBaseY - (row + 1) * (BRICK_H + MORTAR);
      bricks.push({
        x: bx,
        y: by,
        w: BRICK_W,
        h: BRICK_H,
        alive: true,
        cracked: false,
        crackLines: [],
        scattered: false,
        scatterVx: 0,
        scatterVy: 0,
        scatterRotation: 0,
        scatterRotSpeed: 0,
        scatterLife: 0,
      });
    }
  }
  return bricks;
}

export function createInitialState(wallBaseX: number, wallBaseY: number): SimulationState {
  return {
    bricks: createBricks(wallBaseX, wallBaseY),
    projectile: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 12,
      rotation: 0,
      active: false,
      trail: [],
    },
    particles: [],
    stability: 100,
    launchCount: 0,
    totalDamage: 0,
    floatingTexts: [],
    wallShakeOffset: 0,
    screenFlashAlpha: 0,
    trebuchetAngle: 45,
    trebuchetSpringCompress: 0,
    phase: 'idle',
    impactTimer: 0,
  };
}

export function simulateLaunch(
  state: SimulationState,
  params: LaunchParams,
  trebuchetX: number,
  trebuchetY: number
): SimulationState {
  const angleRad = (params.angle * Math.PI) / 180;
  const velocity = (params.force / params.weight) * PIXEL_SCALE;
  const startX = trebuchetX + Math.cos(angleRad) * 60;
  const startY = trebuchetY - Math.sin(angleRad) * 60;

  state.projectile = {
    x: startX,
    y: startY,
    vx: velocity * Math.cos(angleRad),
    vy: -velocity * Math.sin(angleRad),
    radius: Math.max(8, 6 + params.weight / 10),
    rotation: 0,
    active: true,
    trail: [],
  };
  state.phase = 'flying';
  state.launchCount++;
  state.trebuchetSpringCompress = 1.0;

  return state;
}

export function updatePhysics(state: SimulationState, dt: number): SimulationState {
  if (state.phase === 'flying' && state.projectile.active) {
    state.projectile.vy += GRAVITY * PIXEL_SCALE * dt;
    state.projectile.x += state.projectile.vx * dt;
    state.projectile.y += state.projectile.vy * dt;
    state.projectile.rotation += dt * 5;

    state.projectile.trail.push({
      x: state.projectile.x,
      y: state.projectile.y,
      age: 0,
    });

    if (state.projectile.trail.length > 120) {
      state.projectile.trail.shift();
    }

    for (const tp of state.projectile.trail) {
      tp.age += dt;
    }

    const hitBrick = checkCollision(state);
    if (hitBrick) {
      handleImpact(state, hitBrick);
    }

    if (
      state.projectile.y > 800 ||
      state.projectile.x > 1400 ||
      state.projectile.x < -100
    ) {
      state.projectile.active = false;
      state.phase = 'idle';
    }
  }

  if (state.phase === 'impact' || state.phase === 'settling') {
    state.impactTimer -= dt;
    if (state.impactTimer <= 0) {
      state.phase = 'idle';
    }
  }

  updateScatteredBricks(state, dt);
  updateParticles(state, dt);
  updateFloatingTexts(state, dt);
  updateShake(state, dt);

  if (state.screenFlashAlpha > 0) {
    state.screenFlashAlpha = Math.max(0, state.screenFlashAlpha - dt * 10);
  }

  if (state.trebuchetSpringCompress > 0) {
    state.trebuchetSpringCompress = Math.max(0, state.trebuchetSpringCompress - dt * 3);
  }

  return state;
}

function checkCollision(state: SimulationState): Brick | null {
  const p = state.projectile;
  for (const brick of state.bricks) {
    if (!brick.alive || brick.scattered) continue;
    const closestX = Math.max(brick.x, Math.min(p.x, brick.x + brick.w));
    const closestY = Math.max(brick.y, Math.min(p.y, brick.y + brick.h));
    const dx = p.x - closestX;
    const dy = p.y - closestY;
    if (dx * dx + dy * dy < p.radius * p.radius) {
      return brick;
    }
  }
  return null;
}

function handleImpact(state: SimulationState, hitBrick: Brick): void {
  const p = state.projectile;
  const momentum = Math.sqrt(p.vx * p.vx + p.vy * p.vy) * (p.radius / 8);

  state.phase = 'impact';
  state.impactTimer = 1.5;
  state.screenFlashAlpha = 0.4;

  const destroyedCount = destroyBricks(state, hitBrick, momentum);
  const damage = Math.round(destroyedCount * 8 + momentum * 2);
  state.totalDamage += damage;

  spawnExplosionParticles(state, p.x, p.y);

  const aliveBricks = state.bricks.filter((b) => b.alive).length;
  const totalBricks = state.bricks.length;
  state.stability = Math.max(0, (aliveBricks / totalBricks) * 100);

  crackNearbyBricks(state, hitBrick);

  state.floatingTexts.push({
    x: p.x,
    y: p.y - 30,
    text: `-${damage}`,
    life: 1.5,
    maxLife: 1.5,
    vy: -60,
  });

  p.active = false;

  autoDetachBricks(state);
}

function destroyBricks(
  state: SimulationState,
  hitBrick: Brick,
  momentum: number
): number {
  let count = 0;
  const radius = Math.min(momentum * 1.5, 120);
  const hitCx = hitBrick.x + hitBrick.w / 2;
  const hitCy = hitBrick.y + hitBrick.h / 2;

  for (const brick of state.bricks) {
    if (!brick.alive) continue;
    const cx = brick.x + brick.w / 2;
    const cy = brick.y + brick.h / 2;
    const dist = Math.sqrt((cx - hitCx) ** 2 + (cy - hitCy) ** 2);

    if (dist < radius) {
      brick.alive = false;
      brick.scattered = true;
      const angle = Math.atan2(cy - hitCy, cx - hitCx) + (Math.random() - 0.5) * 0.8;
      const speed = momentum * (1 - dist / radius) * 1.5 + Math.random() * 50;
      brick.scatterVx = Math.cos(angle) * speed;
      brick.scatterVy = Math.sin(angle) * speed - Math.random() * 80;
      brick.scatterRotSpeed = (Math.random() - 0.5) * 10;
      brick.scatterLife = 2.0;
      count++;
    } else if (dist < radius * 1.8) {
      brick.cracked = true;
      for (let i = 0; i < 3; i++) {
        brick.crackLines.push({
          x1: Math.random() * brick.w,
          y1: Math.random() * brick.h,
          x2: Math.random() * brick.w,
          y2: Math.random() * brick.h,
        });
      }
    }
  }
  return count;
}

function crackNearbyBricks(state: SimulationState, hitBrick: Brick): void {
  const hitCx = hitBrick.x + hitBrick.w / 2;
  const hitCy = hitBrick.y + hitBrick.h / 2;

  for (const brick of state.bricks) {
    if (!brick.alive || brick.cracked) continue;
    const cx = brick.x + brick.w / 2;
    const cy = brick.y + brick.h / 2;
    const dist = Math.sqrt((cx - hitCx) ** 2 + (cy - hitCy) ** 2);
    if (dist < 150) {
      brick.cracked = true;
      const numCracks = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numCracks; i++) {
        brick.crackLines.push({
          x1: Math.random() * brick.w,
          y1: Math.random() * brick.h,
          x2: Math.random() * brick.w,
          y2: Math.random() * brick.h,
        });
      }
    }
  }
}

function spawnExplosionParticles(state: SimulationState, x: number, y: number): void {
  for (let i = 0; i < 300; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 120 + 20;
    const isDebris = Math.random() < 0.4;
    const size = Math.random() * 6 + 2;
    const life = 1.0 + Math.random() * 0.5;

    let color: string;
    if (isDebris) {
      const r = Math.floor(120 + Math.random() * 40);
      const g = Math.floor(70 + Math.random() * 30);
      const b = Math.floor(30 + Math.random() * 20);
      color = `rgb(${r},${g},${b})`;
    } else {
      const v = Math.floor(140 + Math.random() * 60);
      color = `rgb(${v},${v - 20},${v - 30})`;
    }

    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 40,
      size,
      color,
      life,
      maxLife: life,
      type: isDebris ? 'debris' : 'dust',
    });
  }
}

function updateScatteredBricks(state: SimulationState, dt: number): void {
  for (const brick of state.bricks) {
    if (!brick.scattered) continue;
    brick.scatterVy += GRAVITY * PIXEL_SCALE * 0.5 * dt;
    brick.x += brick.scatterVx * dt;
    brick.y += brick.scatterVy * dt;
    brick.scatterRotation += brick.scatterRotSpeed * dt;
    brick.scatterLife -= dt;
  }
}

function updateParticles(state: SimulationState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.vy += GRAVITY * PIXEL_SCALE * 0.3 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.type === 'dust') {
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

function updateFloatingTexts(state: SimulationState, dt: number): void {
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.life -= dt;
    if (ft.life <= 0) {
      state.floatingTexts.splice(i, 1);
    }
  }
}

function updateShake(state: SimulationState, dt: number): void {
  if (state.stability < 30) {
    const freq = 2;
    const amp = state.stability < 10 ? 8 : 5;
    state.wallShakeOffset = Math.sin(Date.now() * freq * Math.PI * 2 / 1000) * amp;
  } else {
    state.wallShakeOffset = 0;
  }
}

function autoDetachBricks(state: SimulationState): void {
  if (state.stability < 10) {
    const aliveBricks = state.bricks.filter((b) => b.alive && !b.scattered);
    const count = Math.max(1, Math.floor(aliveBricks.length * 0.15));
    for (let i = 0; i < count && i < aliveBricks.length; i++) {
      const idx = Math.floor(Math.random() * aliveBricks.length);
      const brick = aliveBricks[idx];
      if (brick.alive) {
        brick.alive = false;
        brick.scattered = true;
        brick.scatterVx = (Math.random() - 0.5) * 30;
        brick.scatterVy = Math.random() * 40 + 20;
        brick.scatterRotSpeed = (Math.random() - 0.5) * 6;
        brick.scatterLife = 2.0;
      }
    }
    const remaining = state.bricks.filter((b) => b.alive).length;
    state.stability = Math.max(0, (remaining / state.bricks.length) * 100);
  }
}

export function getWallDimensions() {
  return {
    cols: WALL_COLS,
    rows: WALL_ROWS,
    brickW: BRICK_W,
    brickH: BRICK_H,
    mortar: MORTAR,
    totalW: WALL_COLS * (BRICK_W + MORTAR),
    totalH: WALL_ROWS * (BRICK_H + MORTAR),
  };
}
