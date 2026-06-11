import { v4 as uuidv4 } from 'uuid';
import type {
  Ant,
  AntRole,
  AntState,
  FoodSource,
  FoodType,
  GameState,
  InputState,
  Particle,
  Pheromone,
  Position,
  Room,
  Tunnel,
  Waypoint,
} from './types';
import {
  PHEROMONE_GRID_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from './types';

const PLAYER_SPEED = 2.5;
const FRIENDLY_SPEED = 1.8;
const ENEMY_SPEED = 1.6;
const PHEROMONE_DEPOSIT_INTERVAL = 80;
const PHEROMONE_DECAY_RATE = 0.0015;
const PHEROMONE_FRIENDLY_MAX = 1.0;
const PHEROMONE_ENEMY_MAX = 0.8;
const FOOD_DETECTION_RADIUS = 150;
const PHEROMONE_DETECTION_RADIUS = 60;
const WAYPOINT_TTL = 15000;
const COLLECTION_PARTICLE_COUNT = 30;
const BUBBLE_SPAWN_CHANCE = 0.15;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function dist(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(v: Position): Position {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len < 0.0001) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function isInTunnel(pos: Position, tunnels: Tunnel[]): boolean {
  for (const t of tunnels) {
    const dx = t.end.x - t.start.x;
    const dy = t.end.y - t.start.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1) continue;
    let tParam = ((pos.x - t.start.x) * dx + (pos.y - t.start.y) * dy) / len2;
    tParam = Math.max(0, Math.min(1, tParam));
    const closestX = t.start.x + tParam * dx;
    const closestY = t.start.y + tParam * dy;
    const d = Math.sqrt((pos.x - closestX) ** 2 + (pos.y - closestY) ** 2);
    if (d <= t.width / 2) return true;
  }
  return false;
}

function isInRoom(pos: Position, rooms: Room[]): boolean {
  for (const r of rooms) {
    if (dist(pos, r.center) <= r.radius) return true;
  }
  return false;
}

function isWalkable(pos: Position, rooms: Room[], tunnels: Tunnel[]): boolean {
  return isInRoom(pos, rooms) || isInTunnel(pos, tunnels);
}

function clampToWorld(pos: Position): Position {
  return {
    x: Math.max(8, Math.min(WORLD_WIDTH - 8, pos.x)),
    y: Math.max(8, Math.min(WORLD_HEIGHT - 8, pos.y)),
  };
}

function generateRooms(count: number): Room[] {
  const rooms: Room[] = [];
  const margin = 150;
  for (let i = 0; i < count; i++) {
    const radius = rand(40, 60);
    const center = {
      x: rand(margin, WORLD_WIDTH - margin),
      y: rand(margin, WORLD_HEIGHT - margin),
    };
    let valid = true;
    for (const r of rooms) {
      if (dist(center, r.center) < r.radius + radius + 50) {
        valid = false;
        break;
      }
    }
    if (valid) {
      rooms.push({
        id: uuidv4(),
        center,
        radius,
        connectedTunnelIds: [],
      });
    }
  }
  return rooms;
}

function generateTunnels(rooms: Room[]): Tunnel[] {
  const tunnels: Tunnel[] = [];
  const sorted = [...rooms].sort((a, b) => a.center.x - b.center.x);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const width = rand(30, 60);
    const tunnel: Tunnel = {
      id: uuidv4(),
      start: { ...a.center },
      end: { ...b.center },
      width,
      connectedRoomIds: [a.id, b.id],
    };
    tunnels.push(tunnel);
    a.connectedTunnelIds.push(tunnel.id);
    b.connectedTunnelIds.push(tunnel.id);
  }
  for (let i = 0; i < rooms.length; i++) {
    const nearest = rooms
      .map((r, idx) => ({ r, idx, d: dist(rooms[i].center, r.center) }))
      .filter((x) => x.idx !== i && !rooms[i].connectedTunnelIds.some(
        (tid) => rooms[x.idx].connectedTunnelIds.includes(tid),
      ))
      .sort((a, b) => a.d - b.d);
    if (nearest.length > 0 && Math.random() < 0.5) {
      const target = nearest[0].r;
      const width = rand(30, 60);
      const tunnel: Tunnel = {
        id: uuidv4(),
        start: { ...rooms[i].center },
        end: { ...target.center },
        width,
        connectedRoomIds: [rooms[i].id, target.id],
      };
      tunnels.push(tunnel);
      rooms[i].connectedTunnelIds.push(tunnel.id);
      target.connectedTunnelIds.push(tunnel.id);
    }
  }
  return tunnels;
}

function generateFoodSources(rooms: Room[], tunnels: Tunnel[], count: number): FoodSource[] {
  const sources: FoodSource[] = [];
  const walkablePositions: Position[] = [];
  for (const r of rooms) {
    walkablePositions.push(r.center);
  }
  for (const t of tunnels) {
    walkablePositions.push({
      x: (t.start.x + t.end.x) / 2 + rand(-10, 10),
      y: (t.start.y + t.end.y) / 2 + rand(-10, 10),
    });
  }
  for (let i = 0; i < count; i++) {
    const pos = walkablePositions[Math.floor(Math.random() * walkablePositions.length)];
    const type: FoodType = Math.random() < 0.5 ? 'sugar' : 'protein';
    const size = rand(15, 25);
    const maxAmount = type === 'sugar' ? 50 : 30;
    sources.push({
      id: uuidv4(),
      type,
      position: { x: pos.x + rand(-20, 20), y: pos.y + rand(-20, 20) },
      size,
      amount: maxAmount,
      maxAmount,
      collected: false,
      glowPhase: Math.random() * Math.PI * 2,
    });
  }
  return sources;
}

function createAnt(role: AntRole, position: Position): Ant {
  const isPlayer = role === 'player';
  const isFriendly = role === 'friendly';
  return {
    id: uuidv4(),
    role,
    state: 'exploring',
    position: { ...position },
    velocity: { x: 0, y: 0 },
    angle: rand(0, Math.PI * 2),
    size: isPlayer ? 8 : isFriendly ? 3 : 6,
    speed: isPlayer ? PLAYER_SPEED : isFriendly ? FRIENDLY_SPEED : ENEMY_SPEED,
    carryingFood: false,
    carryingFoodType: null,
    antennaPhase: 0,
    pheromoneTimer: 0,
    targetPosition: null,
    waypointId: null,
  };
}

export function initGameState(): GameState {
  const rooms = generateRooms(12);
  const tunnels = generateTunnels(rooms);
  const nestRoom = rooms[0];
  const nest = { center: { ...nestRoom.center }, radius: 50 };

  const playerAnt = createAnt('player', nest.center);
  const friendlyAnts: Ant[] = [];
  const friendlyCount = Math.floor(rand(10, 20));
  for (let i = 0; i < friendlyCount; i++) {
    const room = rooms[Math.floor(Math.random() * rooms.length)];
    const ant = createAnt('friendly', {
      x: room.center.x + rand(-20, 20),
      y: room.center.y + rand(-20, 20),
    });
    friendlyAnts.push(ant);
  }

  const enemyAnts: Ant[] = [];
  const enemyCount = Math.floor(rand(5, 10));
  const farRooms = rooms.filter((r) => dist(r.center, nest.center) > 400);
  for (let i = 0; i < enemyCount; i++) {
    const room = farRooms.length > 0
      ? farRooms[Math.floor(Math.random() * farRooms.length)]
      : rooms[rooms.length - 1];
    const ant = createAnt('enemy', {
      x: room.center.x + rand(-20, 20),
      y: room.center.y + rand(-20, 20),
    });
    enemyAnts.push(ant);
  }

  const foodSources = generateFoodSources(rooms, tunnels, Math.floor(rand(12, 20)));

  return {
    ants: [playerAnt, ...friendlyAnts, ...enemyAnts],
    pheromones: [],
    foodSources,
    rooms,
    tunnels,
    waypoints: [],
    particles: [],
    nest,
    playerAntId: playerAnt.id,
    zoom: 1.0,
    cameraOffset: { x: 0, y: 0 },
    score: { friendly: 0, enemy: 0 },
    time: 0,
    running: true,
  };
}

function updatePlayerAnt(ant: Ant, input: InputState, state: GameState, dt: number): void {
  const dx = (input.keys.has('d') || input.keys.has('D') ? 1 : 0) - (input.keys.has('a') || input.keys.has('A') ? 1 : 0);
  const dy = (input.keys.has('s') || input.keys.has('S') ? 1 : 0) - (input.keys.has('w') || input.keys.has('W') ? 1 : 0);
  if (dx !== 0 || dy !== 0) {
    const dir = normalize({ x: dx, y: dy });
    const newPos = clampToWorld({
      x: ant.position.x + dir.x * ant.speed * dt,
      y: ant.position.y + dir.y * ant.speed * dt,
    });
    if (isWalkable(newPos, state.rooms, state.tunnels)) {
      ant.position = newPos;
    } else {
      const slideX = clampToWorld({ x: ant.position.x + dir.x * ant.speed * dt, y: ant.position.y });
      const slideY = clampToWorld({ x: ant.position.x, y: ant.position.y + dir.y * ant.speed * dt });
      if (isWalkable(slideX, state.rooms, state.tunnels)) ant.position = slideX;
      else if (isWalkable(slideY, state.rooms, state.tunnels)) ant.position = slideY;
    }
    ant.angle = Math.atan2(dir.y, dir.x);
    ant.antennaPhase += dt * 0.15;
    ant.pheromoneTimer += dt;
    if (ant.pheromoneTimer >= PHEROMONE_DEPOSIT_INTERVAL) {
      ant.pheromoneTimer = 0;
      depositPheromone(state, ant.position, 'friendly', PHEROMONE_FRIENDLY_MAX);
      if (Math.random() < BUBBLE_SPAWN_CHANCE) {
        spawnBubbleParticle(state, ant.position);
      }
    }
  } else {
    ant.antennaPhase += dt * 0.05;
  }
}

function depositPheromone(state: GameState, pos: Position, type: 'friendly' | 'enemy', strength: number): void {
  const gridX = Math.floor(pos.x / PHEROMONE_GRID_SIZE);
  const gridY = Math.floor(pos.y / PHEROMONE_GRID_SIZE);
  const existing = state.pheromones.find(
    (p) => p.type === type && Math.floor(p.position.x / PHEROMONE_GRID_SIZE) === gridX && Math.floor(p.position.y / PHEROMONE_GRID_SIZE) === gridY,
  );
  if (existing) {
    existing.strength = Math.min(existing.strength + strength * 0.5, existing.maxStrength);
    existing.age = 0;
  } else {
    state.pheromones.push({
      id: uuidv4(),
      type,
      position: { x: gridX * PHEROMONE_GRID_SIZE + PHEROMONE_GRID_SIZE / 2, y: gridY * PHEROMONE_GRID_SIZE + PHEROMONE_GRID_SIZE / 2 },
      strength,
      maxStrength: type === 'friendly' ? PHEROMONE_FRIENDLY_MAX : PHEROMONE_ENEMY_MAX,
      decayRate: PHEROMONE_DECAY_RATE,
      age: 0,
    });
  }
}

function spawnBubbleParticle(state: GameState, pos: Position): void {
  state.particles.push({
    id: uuidv4(),
    position: { x: pos.x + rand(-3, 3), y: pos.y + rand(-3, 3) },
    velocity: { x: rand(-0.2, 0.2), y: -rand(0.3, 0.8) },
    size: rand(2, 4),
    opacity: 0.6,
    life: 0,
    maxLife: 800,
    color: '#80deea',
    type: 'bubble',
  });
}

function spawnCollectionParticles(state: GameState, pos: Position): void {
  for (let i = 0; i < COLLECTION_PARTICLE_COUNT; i++) {
    const angle = (i / COLLECTION_PARTICLE_COUNT) * Math.PI * 2;
    const speed = rand(0.5, 2.0);
    state.particles.push({
      id: uuidv4(),
      position: { ...pos },
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      size: rand(2, 5),
      opacity: 1.0,
      life: 0,
      maxLife: 2000,
      color: '#ffd54f',
      type: 'collection',
    });
  }
}

function spawnClashParticles(state: GameState, pos: Position): void {
  for (let i = 0; i < 8; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(0.3, 1.2);
    state.particles.push({
      id: uuidv4(),
      position: { ...pos },
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      size: rand(2, 4),
      opacity: 0.9,
      life: 0,
      maxLife: 500,
      color: '#ce93d8',
      type: 'clash',
    });
  }
}

function updateFriendlyAI(ant: Ant, state: GameState, dt: number): void {
  ant.antennaPhase += dt * 0.08;

  const activeWaypoints = state.waypoints.filter(
    (w) => Date.now() - w.createdAt < w.ttl,
  );
  if (activeWaypoints.length > 0 && ant.state !== 'carrying_food') {
    const nearestWp = activeWaypoints.sort(
      (a, b) => dist(ant.position, a.position) - dist(ant.position, b.position),
    )[0];
    if (dist(ant.position, nearestWp.position) > 15) {
      ant.targetPosition = { ...nearestWp.position };
      ant.state = 'following_pheromone';
    }
  }

  if (ant.carryingFood) {
    ant.state = 'returning';
    ant.targetPosition = { ...state.nest.center };
    moveToward(ant, state, dt);
    if (dist(ant.position, state.nest.center) < state.nest.radius) {
      ant.carryingFood = false;
      ant.carryingFoodType = null;
      ant.state = 'exploring';
      ant.targetPosition = null;
      state.score.friendly += 10;
      spawnCollectionParticles(state, state.nest.center);
    }
    return;
  }

  const nearFood = state.foodSources.find(
    (f) => !f.collected && f.amount > 0 && dist(ant.position, f.position) < FOOD_DETECTION_RADIUS,
  );
  if (nearFood) {
    ant.targetPosition = { ...nearFood.position };
    ant.state = 'following_pheromone';
    moveToward(ant, state, dt);
    if (dist(ant.position, nearFood.position) < nearFood.size) {
      nearFood.amount -= 5;
      if (nearFood.amount <= 0) nearFood.collected = true;
      ant.carryingFood = true;
      ant.carryingFoodType = nearFood.type;
      ant.state = 'carrying_food';
    }
    return;
  }

  const nearbyPheromones = state.pheromones
    .filter((p) => p.type === 'friendly' && p.strength > 0.1 && dist(ant.position, p.position) < PHEROMONE_DETECTION_RADIUS)
    .sort((a, b) => b.strength - a.strength);

  if (nearbyPheromones.length > 0 && ant.state !== 'returning') {
    const strongest = nearbyPheromones[0];
    const awayFromStrongest = normalize({
      x: ant.position.x - strongest.position.x,
      y: ant.position.y - strongest.position.y,
    });
    ant.targetPosition = {
      x: strongest.position.x - awayFromStrongest.x * 30,
      y: strongest.position.y - awayFromStrongest.y * 30,
    };
    ant.state = 'following_pheromone';
  } else {
    if (!ant.targetPosition || dist(ant.position, ant.targetPosition) < 10) {
      const room = state.rooms[Math.floor(Math.random() * state.rooms.length)];
      ant.targetPosition = {
        x: room.center.x + rand(-room.radius * 0.5, room.radius * 0.5),
        y: room.center.y + rand(-room.radius * 0.5, room.radius * 0.5),
      };
      ant.state = 'exploring';
    }
  }

  moveToward(ant, state, dt);
  ant.pheromoneTimer += dt;
  if (ant.pheromoneTimer >= PHEROMONE_DEPOSIT_INTERVAL * 1.5) {
    ant.pheromoneTimer = 0;
    depositPheromone(state, ant.position, 'friendly', PHEROMONE_FRIENDLY_MAX * 0.5);
  }
}

function updateEnemyAI(ant: Ant, state: GameState, dt: number): void {
  ant.antennaPhase += dt * 0.06;

  if (ant.carryingFood) {
    ant.state = 'returning';
    const enemyNestRoom = state.rooms[state.rooms.length - 1];
    ant.targetPosition = { ...enemyNestRoom.center };
    moveToward(ant, state, dt);
    if (dist(ant.position, enemyNestRoom.center) < 60) {
      ant.carryingFood = false;
      ant.carryingFoodType = null;
      ant.state = 'exploring';
      ant.targetPosition = null;
      state.score.enemy += 10;
    }
    return;
  }

  const friendlyPheromones = state.pheromones.filter(
    (p) => p.type === 'friendly' && p.strength > 0.1 && dist(ant.position, p.position) < PHEROMONE_DETECTION_RADIUS,
  );

  if (friendlyPheromones.length > 0) {
    const target = friendlyPheromones.sort((a, b) => b.strength - a.strength)[0];
    ant.targetPosition = { ...target.position };
    ant.state = 'following_pheromone';
    moveToward(ant, state, dt);
    depositPheromone(state, ant.position, 'enemy', PHEROMONE_ENEMY_MAX * 0.6);
    return;
  }

  const nearFood = state.foodSources.find(
    (f) => !f.collected && f.amount > 0 && dist(ant.position, f.position) < FOOD_DETECTION_RADIUS * 0.7,
  );
  if (nearFood) {
    ant.targetPosition = { ...nearFood.position };
    moveToward(ant, state, dt);
    if (dist(ant.position, nearFood.position) < nearFood.size) {
      nearFood.amount -= 5;
      if (nearFood.amount <= 0) nearFood.collected = true;
      ant.carryingFood = true;
      ant.carryingFoodType = nearFood.type;
    }
    return;
  }

  if (!ant.targetPosition || dist(ant.position, ant.targetPosition) < 10) {
    const room = state.rooms[Math.floor(Math.random() * state.rooms.length)];
    ant.targetPosition = {
      x: room.center.x + rand(-room.radius * 0.5, room.radius * 0.5),
      y: room.center.y + rand(-room.radius * 0.5, room.radius * 0.5),
    };
    ant.state = 'exploring';
  }
  moveToward(ant, state, dt);
}

function moveToward(ant: Ant, state: GameState, dt: number): void {
  if (!ant.targetPosition) return;
  const dir = normalize({
    x: ant.targetPosition.x - ant.position.x,
    y: ant.targetPosition.y - ant.position.y,
  });
  const wobble = { x: Math.sin(state.time * 0.003 + ant.id.charCodeAt(0)) * 0.3, y: Math.cos(state.time * 0.003 + ant.id.charCodeAt(1)) * 0.3 };
  const moveDir = normalize({ x: dir.x + wobble.x, y: dir.y + wobble.y });
  const newPos = clampToWorld({
    x: ant.position.x + moveDir.x * ant.speed * dt,
    y: ant.position.y + moveDir.y * ant.speed * dt,
  });
  if (isWalkable(newPos, state.rooms, state.tunnels)) {
    ant.position = newPos;
    ant.angle = Math.atan2(moveDir.y, moveDir.x);
  } else {
    ant.targetPosition = null;
    ant.state = 'exploring';
  }
}

function updatePheromones(state: GameState, dt: number): void {
  for (let i = state.pheromones.length - 1; i >= 0; i--) {
    const p = state.pheromones[i];
    p.age += dt;
    p.strength -= p.decayRate * dt;
    if (p.strength <= 0.01) {
      state.pheromones.splice(i, 1);
    }
  }

  const friendlyMap = new Map<string, Pheromone>();
  const enemyMap = new Map<string, Pheromone>();
  for (const p of state.pheromones) {
    const key = `${Math.floor(p.position.x / PHEROMONE_GRID_SIZE)}_${Math.floor(p.position.y / PHEROMONE_GRID_SIZE)}`;
    if (p.type === 'friendly') {
      if (!friendlyMap.has(key) || friendlyMap.get(key)!.strength < p.strength) {
        friendlyMap.set(key, p);
      }
    } else {
      if (!enemyMap.has(key) || enemyMap.get(key)!.strength < p.strength) {
        enemyMap.set(key, p);
      }
    }
  }

  for (const [key, ep] of enemyMap) {
    const fp = friendlyMap.get(key);
    if (fp && fp.strength > 0.05 && ep.strength > 0.05) {
      const mixPos = {
        x: (fp.position.x + ep.position.x) / 2,
        y: (fp.position.y + ep.position.y) / 2,
      };
      if (Math.random() < 0.02) {
        spawnClashParticles(state, mixPos);
      }
      fp.strength *= 0.998;
      ep.strength *= 0.998;
    }
  }
}

function updateParticles(state: GameState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life += dt;
    p.position.x += p.velocity.x * dt;
    p.position.y += p.velocity.y * dt;
    const progress = p.life / p.maxLife;
    p.opacity = Math.max(0, 1 - progress);
    if (p.type === 'bubble') {
      p.position.y -= 0.015 * dt;
      if (p.life > p.maxLife || p.position.y < 0) {
        state.particles.splice(i, 1);
      }
    } else if (p.type === 'collection') {
      p.velocity.x *= 0.98;
      p.velocity.y *= 0.98;
      if (p.life > p.maxLife) {
        state.particles.splice(i, 1);
      }
    } else if (p.type === 'clash') {
      if (p.life > p.maxLife) {
        state.particles.splice(i, 1);
      }
    }
  }
}

function updateWaypoints(state: GameState): void {
  const now = Date.now();
  state.waypoints = state.waypoints.filter((w) => now - w.createdAt < w.ttl);
}

function updateFoodGlow(state: GameState, dt: number): void {
  for (const f of state.foodSources) {
    f.glowPhase += dt * 0.003;
  }
}

export function updateGame(state: GameState, input: InputState, dt: number): void {
  if (!state.running) return;

  state.time += dt;

  const playerAnt = state.ants.find((a) => a.id === state.playerAntId);
  if (playerAnt) {
    updatePlayerAnt(playerAnt, input, state, dt);
  }

  for (const ant of state.ants) {
    if (ant.role === 'friendly') updateFriendlyAI(ant, state, dt);
    else if (ant.role === 'enemy') updateEnemyAI(ant, state, dt);
  }

  updatePheromones(state, dt);
  updateParticles(state, dt);
  updateWaypoints(state);
  updateFoodGlow(state, dt);

  if (input.scrollDelta !== 0) {
    state.zoom = Math.max(0.5, Math.min(2.0, state.zoom - input.scrollDelta * 0.001));
  }

  if (playerAnt) {
    const targetOffset = {
      x: -(playerAnt.position.x * state.zoom) + (window.innerWidth / 2),
      y: -(playerAnt.position.y * state.zoom) + (window.innerHeight / 2),
    };
    state.cameraOffset.x += (targetOffset.x - state.cameraOffset.x) * 0.08;
    state.cameraOffset.y += (targetOffset.y - state.cameraOffset.y) * 0.08;
  }

  if (input.rightClickPosition) {
    const worldPos = {
      x: (input.rightClickPosition.x - state.cameraOffset.x) / state.zoom,
      y: (input.rightClickPosition.y - state.cameraOffset.y) / state.zoom,
    };
    if (isWalkable(worldPos, state.rooms, state.tunnels)) {
      state.waypoints.push({
        id: uuidv4(),
        position: worldPos,
        createdAt: Date.now(),
        ttl: WAYPOINT_TTL,
      });
    }
  }
}
