import {
  GameState,
  InputState,
  Ship,
  Crystal,
  Enemy,
  Asteroid,
  Laser,
  EnemyBullet,
  Particle,
  Shockwave,
  Star,
  GridCell,
  CrystalColor,
  Vector2,
} from './entities';

export function createInitialState(canvasWidth: number, canvasHeight: number): GameState {
  const gridSize = 20;
  const cellSize = 200;
  const worldWidth = gridSize * cellSize;
  const worldHeight = gridSize * cellSize;
  const baseX = worldWidth / 2;
  const baseY = worldHeight / 2;

  const stars: Star[] = [];
  for (let i = 0; i < 300; i++) {
    stars.push(new Star(Math.random() * worldWidth, Math.random() * worldHeight));
  }

  const grid = generateGrid(gridSize, cellSize);

  const state: GameState = {
    ship: new Ship(baseX, baseY),
    crystals: [],
    enemies: [],
    asteroids: [],
    lasers: [],
    enemyBullets: [],
    particles: [],
    shockwaves: [],
    stars,
    grid,
    gridSize,
    cellSize,
    worldWidth,
    worldHeight,
    baseX,
    baseY,
    baseRadius: 80,
    energyRed: 0,
    energyBlue: 0,
    energyGreen: 0,
    maxEnergy: 200,
    score: 0,
    crystalsCollected: 0,
    enemiesDestroyed: 0,
    screenShake: 0,
    screenShakeX: 0,
    screenShakeY: 0,
    hitFlash: 0,
    warningLevel: 0,
    gameOver: false,
    gameOverTime: 0,
    isPaused: false,
    cameraX: baseX - canvasWidth / 2,
    cameraY: baseY - canvasHeight / 2,
  };

  populateWorld(state);
  return state;
}

function generateGrid(gridSize: number, cellSize: number): GridCell[][] {
  const grid: GridCell[][] = [];

  for (let y = 0; y < gridSize; y++) {
    grid[y] = [];
    for (let x = 0; x < gridSize; x++) {
      grid[y][x] = new GridCell(x * cellSize, y * cellSize, cellSize, 'empty');
    }
  }

  const center = Math.floor(gridSize / 2);
  grid[center][center].type = 'base';

  const oreZones = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < oreZones; i++) {
    let ox, oy;
    do {
      ox = Math.floor(Math.random() * gridSize);
      oy = Math.floor(Math.random() * gridSize);
    } while (Math.abs(ox - center) < 3 && Math.abs(oy - center) < 3);

    const zoneSize = 1 + Math.floor(Math.random() * 2);
    for (let dy = -zoneSize; dy <= zoneSize; dy++) {
      for (let dx = -zoneSize; dx <= zoneSize; dx++) {
        if (
          ox + dx >= 0 &&
          ox + dx < gridSize &&
          oy + dy >= 0 &&
          oy + dy < gridSize &&
          Math.random() > 0.3
        ) {
          if (grid[oy + dy][ox + dx].type === 'empty') {
            grid[oy + dy][ox + dx].type = 'ore';
          }
        }
      }
    }
  }

  const asteroidZones = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < asteroidZones; i++) {
    let ax, ay;
    do {
      ax = Math.floor(Math.random() * gridSize);
      ay = Math.floor(Math.random() * gridSize);
    } while (Math.abs(ax - center) < 4 && Math.abs(ay - center) < 4);

    const zoneSize = 1 + Math.floor(Math.random() * 2);
    for (let dy = -zoneSize; dy <= zoneSize; dy++) {
      for (let dx = -zoneSize; dx <= zoneSize; dx++) {
        if (
          ax + dx >= 0 &&
          ax + dx < gridSize &&
          ay + dy >= 0 &&
          ay + dy < gridSize &&
          Math.random() > 0.4
        ) {
          if (grid[ay + dy][ax + dx].type === 'empty') {
            grid[ay + dy][ax + dx].type = 'asteroid';
          }
        }
      }
    }
  }

  const enemyPaths = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < enemyPaths; i++) {
    const startX = Math.floor(Math.random() * gridSize);
    const startY = Math.floor(Math.random() * gridSize);
    const isHorizontal = Math.random() > 0.5;
    const length = 4 + Math.floor(Math.random() * 6);

    for (let j = 0; j < length; j++) {
      let gx = isHorizontal ? startX + j : startX;
      let gy = isHorizontal ? startY : startY + j;
      if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
        if (grid[gy][gx].type === 'empty') {
          grid[gy][gx].type = 'enemyPath';
        }
      }
    }
  }

  return grid;
}

function populateWorld(state: GameState): void {
  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) {
      const cell = state.grid[y][x];

      if (cell.type === 'ore') {
        const crystalCount = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < crystalCount; i++) {
          const cx = cell.x + Math.random() * cell.size;
          const cy = cell.y + Math.random() * cell.size;
          const colorRoll = Math.random();
          let color: CrystalColor;
          if (colorRoll < 0.33) color = 'red';
          else if (colorRoll < 0.66) color = 'blue';
          else color = 'green';
          state.crystals.push(new Crystal(cx, cy, color));
        }
      }

      if (cell.type === 'asteroid') {
        const asteroidCount = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < asteroidCount; i++) {
          const ax = cell.x + Math.random() * cell.size;
          const ay = cell.y + Math.random() * cell.size;
          const radius = 20 + Math.random() * 30;
          const vx = (Math.random() - 0.5) * 1;
          const vy = (Math.random() - 0.5) * 1;
          state.asteroids.push(new Asteroid(ax, ay, radius, vx, vy));
        }
      }

      if (cell.type === 'enemyPath') {
        if (Math.random() < 0.25) {
          const ex = cell.x + cell.size / 2;
          const ey = cell.y + cell.size / 2;

          const patrolPoints: Vector2[] = [];
          for (let i = 0; i < 3; i++) {
            patrolPoints.push({
              x: ex + (Math.random() - 0.5) * 300,
              y: ey + (Math.random() - 0.5) * 300,
            });
          }
          patrolPoints.push({ x: ex, y: ey });

          if (Math.random() < 0.5) {
            state.enemies.push(new Enemy(ex, ey, 'patrol', patrolPoints));
          } else {
            state.enemies.push(new Enemy(ex, ey, 'chase'));
          }
        }
      }
    }
  }
}

export function updateGame(
  state: GameState,
  input: InputState,
  deltaTime: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (state.gameOver) {
    state.gameOverTime += deltaTime;
    return;
  }
  if (state.isPaused) return;

  const dt = Math.min(deltaTime, 50);

  updateShip(state, input, dt);
  updateCrystals(state, dt);
  updateEnemies(state, dt);
  updateAsteroids(state, dt);
  updateLasers(state, dt);
  updateEnemyBullets(state, dt);
  updateParticles(state, dt);
  updateShockwaves(state, dt);
  updateStars(state, dt);
  checkCollisions(state);
  updateCamera(state, canvasWidth, canvasHeight);
  updateScreenEffects(state, dt);
}

function updateShip(state: GameState, input: InputState, dt: number): void {
  const ship = state.ship;
  if (ship.isDead) {
    ship.deathTime += dt;
    return;
  }

  let ax = 0;
  let ay = 0;

  if (input.up) ay -= ship.acceleration;
  if (input.down) ay += ship.acceleration;
  if (input.left) ax -= ship.acceleration;
  if (input.right) ax += ship.acceleration;

  ship.vx += ax;
  ship.vy += ay;

  ship.vx *= ship.friction;
  ship.vy *= ship.friction;

  const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
  if (speed > ship.maxSpeed) {
    ship.vx = (ship.vx / speed) * ship.maxSpeed;
    ship.vy = (ship.vy / speed) * ship.maxSpeed;
  }

  ship.x += ship.vx;
  ship.y += ship.vy;

  ship.x = Math.max(ship.radius, Math.min(state.worldWidth - ship.radius, ship.x));
  ship.y = Math.max(ship.radius, Math.min(state.worldHeight - ship.radius, ship.y));

  if (speed > 0.5) {
    ship.angle = Math.atan2(ship.vy, ship.vx);
  }

  if (input.up || input.down || input.left || input.right) {
    if (Math.random() > 0.3) {
      const tailX = ship.x - Math.cos(ship.angle) * ship.radius;
      const tailY = ship.y - Math.sin(ship.angle) * ship.radius;
      const spread = ship.engineLevel > 0 ? 0.3 : 0.2;
      const tailVx = -Math.cos(ship.angle + (Math.random() - 0.5) * spread) * (2 + Math.random() * 2);
      const tailVy = -Math.sin(ship.angle + (Math.random() - 0.5) * spread) * (2 + Math.random() * 2);
      const lifetime = 300 + ship.engineLevel * 100;
      const size = 3 + ship.engineLevel * 1.5;
      ship.trailParticles.push({
        id: 0,
        x: tailX,
        y: tailY,
        vx: tailVx,
        vy: tailVy,
        radius: size,
        active: true,
        lifetime,
        maxLifetime: lifetime,
        size,
      });
    }
  }

  for (let i = ship.trailParticles.length - 1; i >= 0; i--) {
    const p = ship.trailParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.lifetime -= dt;
    p.vx *= 0.95;
    p.vy *= 0.95;
    if (p.lifetime <= 0) {
      ship.trailParticles.splice(i, 1);
    }
  }

  if (ship.fireCooldown > 0) {
    ship.fireCooldown -= dt;
  }

  if (input.space && ship.fireCooldown <= 0) {
    const angle = ship.angle;
    const muzzleX = ship.x + Math.cos(angle) * ship.radius;
    const muzzleY = ship.y + Math.sin(angle) * ship.radius;
    state.lasers.push(new Laser(muzzleX, muzzleY, angle, 12 + ship.fireRateLevel * 2, 10 + ship.fireRateLevel * 3));
    ship.fireCooldown = ship.fireRate;
  }

  ship.shieldHexPhase += dt * 0.003;

  if (ship.shield < ship.maxShield && ship.shield > 0) {
    ship.shield += dt * 0.005 * ship.shieldLevel;
  }

  ship.isWarning = ship.shield <= 0;
}

function updateCrystals(state: GameState, dt: number): void {
  const ship = state.ship;
  const attractRange = 100 + ship.engineLevel * 20;

  for (const crystal of state.crystals) {
    if (!crystal.active) continue;

    crystal.pulsePhase += dt * 0.005;

    const dx = ship.x - crystal.x;
    const dy = ship.y - crystal.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < attractRange || crystal.beingAttracted) {
      crystal.beingAttracted = true;
      crystal.attractTarget = ship;
      crystal.attractProgress += dt * 0.003;

      const t = Math.min(1, crystal.attractProgress);
      const speed = 2 + t * 8;

      const angle = Math.atan2(dy, dx);
      const curveOffset = Math.sin(t * Math.PI) * 30;
      const perpAngle = angle + Math.PI / 2;

      crystal.vx = Math.cos(angle) * speed + Math.cos(perpAngle) * curveOffset * 0.05;
      crystal.vy = Math.sin(angle) * speed + Math.sin(perpAngle) * curveOffset * 0.05;

      crystal.x += crystal.vx;
      crystal.y += crystal.vy;

      if (dist < ship.radius + crystal.radius) {
        collectCrystal(state, crystal);
      }
    }
  }
}

function collectCrystal(state: GameState, crystal: Crystal): void {
  crystal.active = false;
  state.crystalsCollected++;
  state.score += crystal.value;

  if (crystal.color === 'red') {
    state.energyRed = Math.min(state.maxEnergy, state.energyRed + crystal.value);
  } else if (crystal.color === 'blue') {
    state.energyBlue = Math.min(state.maxEnergy, state.energyBlue + crystal.value);
  } else {
    state.energyGreen = Math.min(state.maxEnergy, state.energyGreen + crystal.value);
  }

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const color = crystal.color === 'red' ? '#ff4466' : crystal.color === 'blue' ? '#4488ff' : '#44ff88';
    state.particles.push(
      new Particle(
        crystal.x,
        crystal.y,
        Math.cos(angle) * 3,
        Math.sin(angle) * 3,
        color,
        400,
        3
      )
    );
  }
}

function updateEnemies(state: GameState, dt: number): void {
  const ship = state.ship;

  for (const enemy of state.enemies) {
    if (!enemy.active) continue;

    enemy.alertFlash = Math.max(0, enemy.alertFlash - dt * 0.005);
    if (enemy.fireCooldown > 0) {
      enemy.fireCooldown -= dt;
    }

    const dx = ship.x - enemy.x;
    const dy = ship.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    enemy.rotation = Math.atan2(dy, dx);

    const inVision = dist < enemy.visionRange;

    if (inVision && enemy.alertLevel < 1) {
      enemy.alertLevel += dt * 0.002;
      enemy.alertFlash = 1;
    } else if (!inVision && enemy.alertLevel > 0) {
      enemy.alertLevel -= dt * 0.001;
    }
    enemy.alertLevel = Math.max(0, Math.min(1, enemy.alertLevel));

    if (enemy.type === 'patrol') {
      if (enemy.patrolPoints.length > 0) {
        const target = enemy.patrolPoints[enemy.currentPatrolIndex];
        const tdx = target.x - enemy.x;
        const tdy = target.y - enemy.y;
        const tdist = Math.sqrt(tdx * tdx + tdy * tdy);

        if (tdist < 20) {
          enemy.currentPatrolIndex = (enemy.currentPatrolIndex + 1) % enemy.patrolPoints.length;
        } else {
          const moveSpeed = inVision ? enemy.speed * 1.5 : enemy.speed;
          enemy.vx = (tdx / tdist) * moveSpeed;
          enemy.vy = (tdy / tdist) * moveSpeed;
        }
      }

      if (inVision && enemy.fireCooldown <= 0 && enemy.alertLevel > 0.5) {
        fireEnemyBullet(state, enemy);
      }
    } else {
      if (inVision) {
        const moveSpeed = enemy.speed + enemy.alertLevel * 2;
        enemy.vx = (dx / dist) * moveSpeed;
        enemy.vy = (dy / dist) * moveSpeed;

        if (enemy.fireCooldown <= 0 && enemy.alertLevel > 0.3) {
          fireEnemyBullet(state, enemy);
        }
      } else {
        enemy.vx *= 0.95;
        enemy.vy *= 0.95;
      }
    }

    enemy.x += enemy.vx;
    enemy.y += enemy.vy;

    enemy.x = Math.max(enemy.radius, Math.min(state.worldWidth - enemy.radius, enemy.x));
    enemy.y = Math.max(enemy.radius, Math.min(state.worldHeight - enemy.radius, enemy.y));
  }
}

function fireEnemyBullet(state: GameState, enemy: Enemy): void {
  state.enemyBullets.push(new EnemyBullet(enemy.x, enemy.y, state.ship));
  enemy.fireCooldown = enemy.fireRate;
}

function updateAsteroids(state: GameState, dt: number): void {
  for (const asteroid of state.asteroids) {
    if (!asteroid.active) continue;

    asteroid.x += asteroid.vx;
    asteroid.y += asteroid.vy;
    asteroid.rotation += asteroid.rotationSpeed;

    if (asteroid.x < asteroid.radius || asteroid.x > state.worldWidth - asteroid.radius) {
      asteroid.vx *= -1;
    }
    if (asteroid.y < asteroid.radius || asteroid.y > state.worldHeight - asteroid.radius) {
      asteroid.vy *= -1;
    }
  }
}

function updateLasers(state: GameState, dt: number): void {
  for (const laser of state.lasers) {
    if (!laser.active) continue;

    laser.x += laser.vx;
    laser.y += laser.vy;
    laser.lifetime -= dt;
    laser.muzzleFlashTime -= dt;

    if (
      laser.lifetime <= 0 ||
      laser.x < 0 ||
      laser.x > state.worldWidth ||
      laser.y < 0 ||
      laser.y > state.worldHeight
    ) {
      laser.active = false;
    }
  }

  state.lasers = state.lasers.filter((l) => l.active);
}

function updateEnemyBullets(state: GameState, dt: number): void {
  for (const bullet of state.enemyBullets) {
    if (!bullet.active) continue;

    if (bullet.target && bullet.target.active && !bullet.target.isDead) {
      const targetAngle = Math.atan2(bullet.target.y - bullet.y, bullet.target.x - bullet.x);
      const currentAngle = Math.atan2(bullet.vy, bullet.vx);

      let angleDiff = targetAngle - currentAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const newAngle = currentAngle + Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), bullet.turnRate);
      bullet.vx = Math.cos(newAngle) * bullet.speed;
      bullet.vy = Math.sin(newAngle) * bullet.speed;
    }

    bullet.trailPositions.push({ x: bullet.x, y: bullet.y });
    if (bullet.trailPositions.length > 8) {
      bullet.trailPositions.shift();
    }

    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    bullet.lifetime -= dt;

    if (
      bullet.lifetime <= 0 ||
      bullet.x < -50 ||
      bullet.x > state.worldWidth + 50 ||
      bullet.y < -50 ||
      bullet.y > state.worldHeight + 50
    ) {
      bullet.active = false;
    }
  }

  state.enemyBullets = state.enemyBullets.filter((b) => b.active);
}

function updateParticles(state: GameState, dt: number): void {
  for (const particle of state.particles) {
    if (!particle.active) continue;

    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.lifetime -= dt;
    particle.rotation += particle.rotationSpeed;
    particle.vx *= 0.98;
    particle.vy *= 0.98;

    if (particle.lifetime <= 0) {
      particle.active = false;
    }
  }

  state.particles = state.particles.filter((p) => p.active);
}

function updateShockwaves(state: GameState, dt: number): void {
  for (const shockwave of state.shockwaves) {
    if (!shockwave.active) continue;

    const progress = 1 - shockwave.lifetime / shockwave.maxLifetime;
    shockwave.radius = 5 + shockwave.maxRadius * progress;
    shockwave.lifetime -= dt;

    if (shockwave.lifetime <= 0) {
      shockwave.active = false;
    }
  }

  state.shockwaves = state.shockwaves.filter((s) => s.active);
}

function updateStars(state: GameState, dt: number): void {
  for (const star of state.stars) {
    star.twinklePhase += star.twinkleSpeed * dt;
  }
}

function checkCollisions(state: GameState): void {
  const ship = state.ship;

  for (const laser of state.lasers) {
    if (!laser.active) continue;

    for (const asteroid of state.asteroids) {
      if (!asteroid.active) continue;

      const dx = laser.x - asteroid.x;
      const dy = laser.y - asteroid.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < asteroid.radius + laser.radius) {
        laser.active = false;
        asteroid.health--;

        if (asteroid.health <= 0) {
          destroyAsteroid(state, asteroid);
        } else {
          for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            state.particles.push(
              new Particle(
                laser.x,
                laser.y,
                Math.cos(angle) * 2,
                Math.sin(angle) * 2,
                '#888888',
                300,
                2
              )
            );
          }
        }
        break;
      }
    }
  }

  for (const laser of state.lasers) {
    if (!laser.active) continue;

    for (const enemy of state.enemies) {
      if (!enemy.active) continue;

      const dx = laser.x - enemy.x;
      const dy = laser.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < enemy.radius + laser.radius) {
        laser.active = false;
        enemy.health -= laser.damage;

        state.shockwaves.push(new Shockwave(laser.x, laser.y, 30, 300, '#ff8844'));

        if (enemy.health <= 0) {
          destroyEnemy(state, enemy);
        }
        break;
      }
    }
  }

  if (!ship.isDead) {
    for (const bullet of state.enemyBullets) {
      if (!bullet.active) continue;

      const dx = bullet.x - ship.x;
      const dy = bullet.y - ship.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ship.radius + bullet.radius) {
        bullet.active = false;
        damagePlayer(state, bullet.damage);
      }
    }
  }

  if (!ship.isDead) {
    for (const asteroid of state.asteroids) {
      if (!asteroid.active) continue;

      const dx = ship.x - asteroid.x;
      const dy = ship.y - asteroid.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < asteroid.radius + ship.radius) {
        damagePlayer(state, 20);

        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = asteroid.radius + ship.radius - dist;
        ship.x += nx * overlap * 0.5;
        ship.y += ny * overlap * 0.5;
        asteroid.x -= nx * overlap * 0.5;
        asteroid.y -= ny * overlap * 0.5;

        const relVx = ship.vx - asteroid.vx;
        const relVy = ship.vy - asteroid.vy;
        const dotProduct = relVx * nx + relVy * ny;

        ship.vx -= dotProduct * nx * 0.5;
        ship.vy -= dotProduct * ny * 0.5;
        asteroid.vx += dotProduct * nx * 0.3;
        asteroid.vy += dotProduct * ny * 0.3;
      }
    }
  }
}

function destroyAsteroid(state: GameState, asteroid: Asteroid): void {
  asteroid.active = false;
  state.score += Math.floor(asteroid.radius);

  const fragmentCount = Math.floor(asteroid.radius / 8);
  for (let i = 0; i < fragmentCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    state.particles.push(
      new Particle(
        asteroid.x,
        asteroid.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        '#666677',
        800 + Math.random() * 400,
        3 + Math.random() * 4
      )
    );
  }

  if (asteroid.radius > 25) {
    const pieces = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < pieces; i++) {
      const angle = (i / pieces) * Math.PI * 2 + Math.random() * 0.5;
      const newRadius = asteroid.radius * 0.4;
      const vx = Math.cos(angle) * 1.5;
      const vy = Math.sin(angle) * 1.5;
      state.asteroids.push(new Asteroid(asteroid.x, asteroid.y, newRadius, vx, vy));
    }
  }
}

function destroyEnemy(state: GameState, enemy: Enemy): void {
  enemy.active = false;
  state.enemiesDestroyed++;
  state.score += enemy.type === 'patrol' ? 200 : 100;

  state.shockwaves.push(new Shockwave(enemy.x, enemy.y, 80, 500, '#ff6600'));
  state.screenShake = Math.max(state.screenShake, enemy.type === 'patrol' ? 10 : 5);

  const particleCount = enemy.type === 'patrol' ? 20 : 12;
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    const color = Math.random() > 0.5 ? '#ff6600' : '#ffaa00';
    state.particles.push(
      new Particle(
        enemy.x,
        enemy.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        600 + Math.random() * 400,
        3 + Math.random() * 4
      )
    );
  }
}

function damagePlayer(state: GameState, damage: number): void {
  const ship = state.ship;

  if (ship.shield > 0) {
    ship.shield -= damage;
    if (ship.shield < 0) {
      const overflow = -ship.shield;
      ship.shield = 0;
      ship.health -= Math.ceil(overflow / 30);
    }
  } else {
    ship.health -= Math.ceil(damage / 20);
  }

  state.hitFlash = 1;
  state.screenShake = Math.max(state.screenShake, 15);

  if (ship.health <= 0) {
    ship.health = 0;
    ship.isDead = true;
    state.gameOver = true;
  }
}

function updateCamera(state: GameState, canvasWidth: number, canvasHeight: number): void {
  const ship = state.ship;
  const targetX = ship.x - canvasWidth / 2;
  const targetY = ship.y - canvasHeight / 2;

  state.cameraX += (targetX - state.cameraX) * 0.1;
  state.cameraY += (targetY - state.cameraY) * 0.1;

  state.cameraX = Math.max(0, Math.min(state.worldWidth - canvasWidth, state.cameraX));
  state.cameraY = Math.max(0, Math.min(state.worldHeight - canvasHeight, state.cameraY));
}

function updateScreenEffects(state: GameState, dt: number): void {
  if (state.screenShake > 0) {
    state.screenShakeX = (Math.random() - 0.5) * state.screenShake * 2;
    state.screenShakeY = (Math.random() - 0.5) * state.screenShake * 2;
    state.screenShake *= 0.92;
    if (state.screenShake < 0.1) {
      state.screenShake = 0;
      state.screenShakeX = 0;
      state.screenShakeY = 0;
    }
  }

  if (state.hitFlash > 0) {
    state.hitFlash -= dt * 0.003;
    if (state.hitFlash < 0) state.hitFlash = 0;
  }

  if (state.ship.isWarning && !state.ship.isDead) {
    state.warningLevel = Math.min(1, state.warningLevel + dt * 0.001);
  } else {
    state.warningLevel = Math.max(0, state.warningLevel - dt * 0.002);
  }
}

export function upgradeShield(state: GameState): boolean {
  if (state.energyRed >= state.maxEnergy && state.ship.shieldLevel < 3) {
    state.energyRed -= state.maxEnergy;
    state.ship.upgradeShield();
    return true;
  }
  return false;
}

export function upgradeEngine(state: GameState): boolean {
  if (state.energyBlue >= state.maxEnergy && state.ship.engineLevel < 3) {
    state.energyBlue -= state.maxEnergy;
    state.ship.upgradeEngine();
    return true;
  }
  return false;
}

export function upgradeFireRate(state: GameState): boolean {
  if (state.energyGreen >= state.maxEnergy && state.ship.fireRateLevel < 3) {
    state.energyGreen -= state.maxEnergy;
    state.ship.upgradeFireRate();
    return true;
  }
  return false;
}

export function isNearBase(state: GameState): boolean {
  const dx = state.ship.x - state.baseX;
  const dy = state.ship.y - state.baseY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < state.baseRadius + 50;
}
