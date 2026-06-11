export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Player {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  maxSpeed: number;
  currentSpeed: number;
  accelTime: number;
  decelTime: number;
  glowPulse: number;
  glowRadius: number;
  baseGlowRadius: number;
  isBoosted: boolean;
  boostTimer: number;
  isSlowed: boolean;
  slowTimer: number;
  trail: Vec2[];
  trailMaxLength: number;
  flashTimer: number;
  flashColor: string;
}

export interface Mushroom {
  pos: Vec2;
  capRadius: number;
  stemHeight: number;
  stemWidth: number;
  sporeTimer: number;
  isPulsing: boolean;
  pulseTimer: number;
  pulseScale: number;
}

export interface Spore {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  life: number;
  maxLife: number;
}

export interface StarDust {
  pos: Vec2;
  vel: Vec2;
  size: number;
  rotation: number;
  rotationSpeed: number;
  isAbsorbing: boolean;
  absorbTarget: Vec2 | null;
  absorbTimer: number;
  absorbDuration: number;
  active: boolean;
}

export interface Tentacle {
  basePos: Vec2;
  segments: Vec2[];
  length: number;
  thickness: number;
  wavePhase: number;
  tipPos: Vec2;
  speed: number;
  extendProgress: number;
  active: boolean;
}

export interface Portal {
  pos: Vec2;
  radius: number;
  rotation: number;
  active: boolean;
  pulsePhase: number;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Star {
  pos: Vec2;
  size: number;
  blinkPhase: number;
  blinkSpeed: number;
}

export interface GameState {
  player: Player;
  mushrooms: Mushroom[];
  spores: Spore[];
  starDusts: StarDust[];
  tentacles: Tentacle[];
  portal: Portal | null;
  particles: Particle[];
  stars: Star[];
  starCount: number;
  level: number;
  isGameOver: boolean;
  gameOverTimer: number;
  nextStarTimer: number;
  nextTentacleTimer: number;
  canvasWidth: number;
  canvasHeight: number;
  mushroomBaseCount: number;
  tentacleBaseInterval: number;
  showRestartButton: boolean;
  restartButton: { x: number; y: number; w: number; h: number } | null;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

const rand = (min: number, max: number): number => Math.random() * (max - min) + min;
const dist = (a: Vec2, b: Vec2): number => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

export function createPlayer(w: number, h: number): Player {
  return {
    pos: { x: w / 2, y: h / 2 },
    vel: { x: 0, y: 0 },
    radius: 10,
    maxSpeed: 4,
    currentSpeed: 0,
    accelTime: 0,
    decelTime: 0,
    glowPulse: 0,
    glowRadius: 20,
    baseGlowRadius: 20,
    isBoosted: false,
    boostTimer: 0,
    isSlowed: false,
    slowTimer: 0,
    trail: [],
    trailMaxLength: 15,
    flashTimer: 0,
    flashColor: '#ff3366',
  };
}

export function createMushrooms(count: number, w: number, h: number, minDist: number): Mushroom[] {
  const mushrooms: Mushroom[] = [];
  let attempts = 0;
  const maxAttempts = count * 20;

  while (mushrooms.length < count && attempts < maxAttempts) {
    attempts++;
    const pos: Vec2 = {
      x: rand(80, w - 80),
      y: rand(80, h - 80),
    };

    let valid = true;
    for (const m of mushrooms) {
      if (dist(pos, m.pos) < minDist) {
        valid = false;
        break;
      }
    }

    if (valid) {
      mushrooms.push({
        pos,
        capRadius: rand(10, 15),
        stemHeight: rand(12, 20),
        stemWidth: rand(4, 6),
        sporeTimer: rand(0, 2000),
        isPulsing: false,
        pulseTimer: 0,
        pulseScale: 1,
      });
    }
  }

  return mushrooms;
}

export function createSpores(mushroom: Mushroom, count: number = 12): Spore[] {
  const spores: Spore[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const speed = 0.5;
    spores.push({
      pos: { x: mushroom.pos.x, y: mushroom.pos.y },
      vel: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      radius: rand(1, 2),
      life: 800,
      maxLife: 800,
    });
  }
  return spores;
}

export function createStarDust(w: number, h: number, mushrooms: Mushroom[]): StarDust | null {
  for (let i = 0; i < 50; i++) {
    const edge = Math.floor(Math.random() * 4);
    let pos: Vec2;
    switch (edge) {
      case 0: pos = { x: rand(0, w), y: -20 }; break;
      case 1: pos = { x: w + 20, y: rand(0, h) }; break;
      case 2: pos = { x: rand(0, w), y: h + 20 }; break;
      default: pos = { x: -20, y: rand(0, h) };
    }

    const target: Vec2 = {
      x: rand(w * 0.2, w * 0.8),
      y: rand(h * 0.2, h * 0.8),
    };

    let valid = true;
    for (const m of mushrooms) {
      if (dist(target, m.pos) < m.capRadius + 25) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;

    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = 180;
    const speed = distance / duration;

    return {
      pos,
      vel: {
        x: (dx / distance) * speed,
        y: (dy / distance) * speed - 0.03,
      },
      size: 15,
      rotation: 0,
      rotationSpeed: 0.02,
      isAbsorbing: false,
      absorbTarget: null,
      absorbTimer: 0,
      absorbDuration: 300,
      active: true,
    };
  }
  return null;
}

export function createTentacle(w: number, h: number, _playerPos: Vec2): Tentacle {
  const edge = Math.floor(Math.random() * 4);
  let basePos: Vec2;
  switch (edge) {
    case 0: basePos = { x: rand(50, w - 50), y: -30 }; break;
    case 1: basePos = { x: w + 30, y: rand(50, h - 50) }; break;
    case 2: basePos = { x: rand(50, w - 50), y: h + 30 }; break;
    default: basePos = { x: -30, y: rand(50, h - 50) };
  }

  const length = rand(50, 80);
  const segments: Vec2[] = [];
  for (let i = 0; i < 4; i++) {
    segments.push({ x: basePos.x, y: basePos.y });
  }

  return {
    basePos,
    segments,
    length,
    thickness: 4,
    wavePhase: Math.random() * Math.PI * 2,
    tipPos: { x: basePos.x, y: basePos.y },
    speed: 1.5,
    extendProgress: 0,
    active: true,
  };
}

export function createPortal(w: number, h: number): Portal {
  const edge = Math.floor(Math.random() * 4);
  let pos: Vec2;
  switch (edge) {
    case 0: pos = { x: rand(100, w - 100), y: 80 }; break;
    case 1: pos = { x: w - 80, y: rand(100, h - 100) }; break;
    case 2: pos = { x: rand(100, w - 100), y: h - 80 }; break;
    default: pos = { x: 80, y: rand(100, h - 100) };
  }

  return {
    pos,
    radius: 30,
    rotation: 0,
    active: true,
    pulsePhase: 0,
  };
}

export function createStars(count: number, w: number, h: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      pos: { x: rand(0, w), y: rand(0, h) },
      size: rand(1, 3),
      blinkPhase: rand(0, Math.PI * 2),
      blinkSpeed: rand(Math.PI / 2000, Math.PI / 1000),
    });
  }
  return stars;
}

export function updatePlayer(
  player: Player,
  input: InputState,
  dt: number,
  w: number,
  h: number
): void {
  const accelDuration = 300;
  const decelDuration = 500;

  const moving = input.up || input.down || input.left || input.right;
  let dx = 0, dy = 0;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;

  if (moving) {
    player.accelTime = Math.min(player.accelTime + dt, accelDuration);
    player.decelTime = 0;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }
    const accelProgress = player.accelTime / accelDuration;
    const easedProgress = 1 - Math.pow(1 - accelProgress, 3);
    let targetSpeed = player.maxSpeed * easedProgress;

    if (player.isBoosted) targetSpeed *= 1.3;
    if (player.isSlowed) targetSpeed *= 0.5;

    player.currentSpeed = targetSpeed;
    player.vel.x = dx * player.currentSpeed;
    player.vel.y = dy * player.currentSpeed;
  } else {
    player.decelTime = Math.min(player.decelTime + dt, decelDuration);
    player.accelTime = 0;
    const decelProgress = player.decelTime / decelDuration;
    const easedProgress = 1 - Math.pow(1 - decelProgress, 3);
    player.currentSpeed = player.currentSpeed * (1 - easedProgress);
    if (player.currentSpeed < 0.01) player.currentSpeed = 0;
    const velLen = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
    if (velLen > 0) {
      const newLen = player.currentSpeed;
      player.vel.x = (player.vel.x / velLen) * newLen;
      player.vel.y = (player.vel.y / velLen) * newLen;
    }
  }

  player.pos.x = Math.max(player.radius, Math.min(w - player.radius, player.pos.x + player.vel.x));
  player.pos.y = Math.max(player.radius, Math.min(h - player.radius, player.pos.y + player.vel.y));

  player.glowPulse = (player.glowPulse + dt / 1000) % 1;

  if (player.isBoosted) {
    player.boostTimer -= dt;
    if (player.boostTimer <= 0) {
      player.isBoosted = false;
      player.glowRadius = player.baseGlowRadius;
    } else {
      player.glowRadius = player.baseGlowRadius * 2;
    }
  }

  if (player.isSlowed) {
    player.slowTimer -= dt;
    if (player.slowTimer <= 0) {
      player.isSlowed = false;
    }
  }

  if (player.flashTimer > 0) {
    player.flashTimer -= dt;
  }

  player.trail.unshift({ x: player.pos.x, y: player.pos.y });
  if (player.trail.length > player.trailMaxLength) {
    player.trail.pop();
  }
}

export function applyPlayerBoost(player: Player): void {
  player.isBoosted = true;
  player.boostTimer = 3000;
}

export function applyPlayerSlow(player: Player): void {
  player.isSlowed = true;
  player.slowTimer = 1000;
}

export function triggerPlayerFlash(player: Player, color: string): void {
  player.flashTimer = 100;
  player.flashColor = color;
}

export function updateMushroom(m: Mushroom, dt: number, spores: Spore[]): void {
  m.sporeTimer -= dt;
  if (m.sporeTimer <= 0) {
    m.sporeTimer = 2000;
    const newSpores = createSpores(m);
    spores.push(...newSpores);
  }

  if (m.isPulsing) {
    m.pulseTimer -= dt;
    if (m.pulseTimer <= 0) {
      m.isPulsing = false;
      m.pulseScale = 1;
    } else {
      const progress = 1 - m.pulseTimer / 500;
      m.pulseScale = 1 + Math.sin(progress * Math.PI) * 0.3;
    }
  }
}

export function triggerMushroomsPulse(mushrooms: Mushroom[]): void {
  for (const m of mushrooms) {
    m.isPulsing = true;
    m.pulseTimer = 500;
  }
}

export function updateSpore(s: Spore, dt: number): boolean {
  s.pos.x += s.vel.x;
  s.pos.y += s.vel.y;
  s.life -= dt;
  return s.life > 0;
}

export function updateStarDust(
  star: StarDust,
  dt: number,
  player: Player,
  w: number,
  h: number
): boolean {
  if (!star.active) return false;

  if (star.isAbsorbing && star.absorbTarget) {
    star.absorbTimer -= dt;
    const progress = 1 - star.absorbTimer / star.absorbDuration;
    star.pos.x += (star.absorbTarget.x - star.pos.x) * Math.min(1, progress * 3);
    star.pos.y += (star.absorbTarget.y - star.pos.y) * Math.min(1, progress * 3);
    star.size = 15 * (1 - progress);
    if (star.absorbTimer <= 0) {
      star.active = false;
      return false;
    }
  } else {
    star.pos.x += star.vel.x;
    star.pos.y += star.vel.y;
    star.vel.y += 0.002;
    star.rotation += star.rotationSpeed;

    const d = dist(star.pos, player.pos);
    if (d < 20 + player.radius) {
      star.isAbsorbing = true;
      star.absorbTarget = { x: player.pos.x, y: player.pos.y };
      star.absorbTimer = star.absorbDuration;
    }
  }

  if (star.pos.x < -50 || star.pos.x > w + 50 || star.pos.y < -50 || star.pos.y > h + 50) {
    star.active = false;
    return false;
  }

  return true;
}

export function updateTentacle(
  t: Tentacle,
  dt: number,
  player: Player,
  w: number,
  h: number
): boolean {
  if (!t.active) return false;

  t.wavePhase += dt * 0.005;
  t.extendProgress = Math.min(1, t.extendProgress + dt / 2000);

  const dx = player.pos.x - t.basePos.x;
  const dy = player.pos.y - t.basePos.y;
  const angle = Math.atan2(dy, dx);
  const currentLength = t.length * t.extendProgress;

  const segmentCount = t.segments.length;
  for (let i = 0; i < segmentCount; i++) {
    const segProgress = (i + 1) / segmentCount;
    const segLen = currentLength * segProgress;
    const perpAngle = angle + Math.PI / 2;
    const wave = Math.sin(t.wavePhase + segProgress * Math.PI * 2) * 8 * segProgress;

    t.segments[i].x = t.basePos.x + Math.cos(angle) * segLen + Math.cos(perpAngle) * wave;
    t.segments[i].y = t.basePos.y + Math.sin(angle) * segLen + Math.sin(perpAngle) * wave;
  }

  t.tipPos = { ...t.segments[segmentCount - 1] };

  if (t.basePos.x < -100 || t.basePos.x > w + 100 || t.basePos.y < -100 || t.basePos.y > h + 100) {
    if (t.extendProgress >= 1) {
      t.active = false;
      return false;
    }
  }

  return true;
}

export function updatePortal(p: Portal, dt: number): void {
  p.rotation += dt * 0.001;
  p.pulsePhase = (p.pulsePhase + dt / 500) % (Math.PI * 2);
}

export function updateStars(stars: Star[], dt: number): void {
  for (const s of stars) {
    s.blinkPhase = (s.blinkPhase + s.blinkSpeed * dt) % (Math.PI * 2);
  }
}

export function updateParticle(p: Particle, dt: number): boolean {
  p.pos.x += p.vel.x;
  p.pos.y += p.vel.y;
  p.vel.x *= 0.98;
  p.vel.y *= 0.98;
  p.life -= dt;
  return p.life > 0;
}

export function createExplosionParticles(pos: Vec2, color: string, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(1, 5);
    particles.push({
      pos: { x: pos.x, y: pos.y },
      vel: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      life: 1500,
      maxLife: 1500,
      color,
      size: rand(2, 5),
    });
  }
  return particles;
}

export function checkCollision(a: Vec2, aRadius: number, b: Vec2, bRadius: number): boolean {
  return dist(a, b) < aRadius + bRadius;
}

export function checkTentaclePlayerCollision(t: Tentacle, player: Player): boolean {
  for (const seg of t.segments) {
    if (dist(seg, player.pos) < player.radius + t.thickness) {
      return true;
    }
  }
  return false;
}
