import { v4 as uuidv4 } from 'uuid';
import {
  Vector3,
  Island,
  Checkpoint,
  AirflowColumn,
  Vortex,
  Particle,
  PlayerState,
  GameState,
  KeyState,
  WORLD_CONFIG,
} from './types';

const {
  WORLD_SIZE,
  PLAYER_SPEED_BASE,
  PITCH_MIN,
  PITCH_MAX,
  YAW_MIN,
  YAW_MAX,
  LIFT_UP,
  LIFT_DOWN,
  GLIDE_DESCENT,
  CHECKPOINT_RADIUS,
  VORTEX_RADIUS,
  CAMERA_PHI_MIN,
  CAMERA_PHI_MAX,
} = WORLD_CONFIG;

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function distance3D(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function generateIslands(): Island[] {
  const islands: Island[] = [];
  const count = Math.floor(randomRange(5, 8));

  for (let i = 0; i < count; i++) {
    islands.push({
      id: uuidv4(),
      position: {
        x: randomRange(-WORLD_SIZE / 3, WORLD_SIZE / 3),
        y: randomRange(200, 800),
        z: randomRange(-WORLD_SIZE / 3, WORLD_SIZE / 3),
      },
      diameter: randomRange(150, 350),
      rotation: randomRange(0, Math.PI * 2),
    });
  }

  return islands;
}

export function generateCheckpoints(): Checkpoint[] {
  const checkpoints: Checkpoint[] = [];
  const count = 6;
  const centerX = 0;
  const centerZ = 0;
  const radius = WORLD_SIZE / 4;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    checkpoints.push({
      id: uuidv4(),
      position: {
        x: centerX + Math.cos(angle) * radius + randomRange(-200, 200),
        y: randomRange(300, 700),
        z: centerZ + Math.sin(angle) * radius + randomRange(-200, 200),
      },
      index: i + 1,
      passed: false,
    });
  }

  return checkpoints;
}

export function generateAirflows(islands: Island[]): AirflowColumn[] {
  const airflows: AirflowColumn[] = [];

  for (let i = 0; i < islands.length - 1; i++) {
    const from = islands[i].position;
    const to = islands[i + 1].position;
    const mid: Vector3 = {
      x: (from.x + to.x) / 2,
      y: Math.min(from.y, to.y) - 100,
      z: (from.z + to.z) / 2,
    };

    airflows.push({
      id: uuidv4(),
      position: mid,
      type: Math.random() > 0.4 ? 'up' : 'down',
      height: randomRange(600, 1000),
      radius: randomRange(80, 120),
    });
  }

  return airflows;
}

export function createInitialPlayerState(): PlayerState {
  return {
    position: { x: 0, y: 500, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    pitch: 0,
    yaw: 0,
    roll: 0,
    isInVortex: false,
    vortexTimer: 0,
    trailColor: '#FF4500',
  };
}

export function createInitialGameState(): GameState {
  const islands = generateIslands();
  const checkpoints = generateCheckpoints();
  const airflows = generateAirflows(islands);

  const firstCheckpoint = checkpoints[0];
  const initialPlayer = createInitialPlayerState();
  initialPlayer.position = {
    x: firstCheckpoint.position.x - 200,
    y: firstCheckpoint.position.y,
    z: firstCheckpoint.position.z,
  };

  return {
    player: initialPlayer,
    islands,
    checkpoints,
    airflows,
    vortexes: [],
    particles: [],
    currentCheckpoint: 0,
    totalCheckpoints: checkpoints.length,
    startTime: null,
    elapsedTime: 0,
    isFinished: false,
    cameraAngle: {
      theta: 0,
      phi: 40,
      distance: 600,
    },
    showFlash: false,
    flashColor: '#00FF00',
    screenShake: false,
  };
}

export function updatePlayerPhysics(
  player: PlayerState,
  keys: KeyState,
  airflows: AirflowColumn[],
  vortexes: Vortex[],
  deltaTime: number
): { player: PlayerState; hitVortex: Vortex | null } {
  let newPlayer = { ...player };
  let hitVortex: Vortex | null = null;

  if (newPlayer.isInVortex) {
    newPlayer.vortexTimer -= deltaTime;
    if (newPlayer.vortexTimer <= 0) {
      newPlayer.isInVortex = false;
      newPlayer.trailColor = '#FF4500';
    }
  }

  let pitchChange = 0;
  let yawChange = 0;

  if (keys.w) pitchChange -= 30 * deltaTime;
  if (keys.s) pitchChange += 30 * deltaTime;
  if (keys.a) yawChange -= 45 * deltaTime;
  if (keys.d) yawChange += 45 * deltaTime;

  if (newPlayer.isInVortex) {
    pitchChange += randomRange(-10, 10) * deltaTime;
    yawChange += randomRange(-15, 15) * deltaTime;
  }

  newPlayer.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, newPlayer.pitch + pitchChange));
  newPlayer.yaw = Math.max(YAW_MIN, Math.min(YAW_MAX, newPlayer.yaw + yawChange));
  newPlayer.roll = -newPlayer.yaw * 0.5;

  const pitchRad = (newPlayer.pitch * Math.PI) / 180;
  const yawRad = (newPlayer.yaw * Math.PI) / 180;

  let speed = PLAYER_SPEED_BASE;
  let verticalVelocity = -GLIDE_DESCENT;

  for (const airflow of airflows) {
    const dx = newPlayer.position.x - airflow.position.x;
    const dz = newPlayer.position.z - airflow.position.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

    if (horizontalDist < airflow.radius) {
      const yMin = airflow.position.y;
      const yMax = airflow.position.y + airflow.height;
      if (newPlayer.position.y >= yMin && newPlayer.position.y <= yMax) {
        if (airflow.type === 'up') {
          verticalVelocity = LIFT_UP;
        } else {
          verticalVelocity = LIFT_DOWN;
        }
      }
    }
  }

  verticalVelocity += Math.sin(pitchRad) * speed;

  for (const vortex of vortexes) {
    const dist = distance3D(newPlayer.position, vortex.position);
    if (dist < VORTEX_RADIUS && !newPlayer.isInVortex) {
      hitVortex = vortex;
      newPlayer.isInVortex = true;
      newPlayer.vortexTimer = 1.5;
      newPlayer.trailColor = '#8B0000';
      newPlayer.pitch += randomRange(15, 25) * (Math.random() > 0.5 ? 1 : -1);
      newPlayer.yaw += randomRange(15, 25) * (Math.random() > 0.5 ? 1 : -1);
    }
  }

  const forwardX = Math.sin(yawRad);
  const forwardZ = Math.cos(yawRad);

  newPlayer.velocity = {
    x: forwardX * speed * 60 * deltaTime,
    y: verticalVelocity * 60 * deltaTime,
    z: forwardZ * speed * 60 * deltaTime,
  };

  newPlayer.position = {
    x: newPlayer.position.x + newPlayer.velocity.x,
    y: newPlayer.position.y + newPlayer.velocity.y,
    z: newPlayer.position.z + newPlayer.velocity.z,
  };

  newPlayer.position.y = Math.max(50, newPlayer.position.y);

  return { player: newPlayer, hitVortex };
}

export function checkCheckpoints(
  player: PlayerState,
  checkpoints: Checkpoint[],
  currentIndex: number
): { passed: boolean; checkpoint: Checkpoint | null; newIndex: number } {
  if (currentIndex >= checkpoints.length) {
    return { passed: false, checkpoint: null, newIndex: currentIndex };
  }

  const target = checkpoints[currentIndex];
  const dist = distance3D(player.position, target.position);

  if (dist < CHECKPOINT_RADIUS && !target.passed) {
    return { passed: true, checkpoint: target, newIndex: currentIndex + 1 };
  }

  return { passed: false, checkpoint: null, newIndex: currentIndex };
}

export function spawnVortex(
  islands: Island[],
  existingVortexes: Vortex[]
): Vortex | null {
  if (existingVortexes.length >= 3) return null;

  const island = islands[Math.floor(Math.random() * islands.length)];
  const angle = Math.random() * Math.PI * 2;
  const offset = island.diameter * 0.8;

  return {
    id: uuidv4(),
    position: {
      x: island.position.x + Math.cos(angle) * offset,
      y: island.position.y + randomRange(-100, 100),
      z: island.position.z + Math.sin(angle) * offset,
    },
    createdAt: Date.now(),
    duration: 2000,
    radius: 40,
  };
}

export function createTrailParticle(player: PlayerState): Particle {
  const yawRad = (player.yaw * Math.PI) / 180;
  const pitchRad = (player.pitch * Math.PI) / 180;
  const backOffset = 40;

  return {
    id: uuidv4(),
    position: {
      x: player.position.x - Math.sin(yawRad) * backOffset,
      y: player.position.y - Math.sin(pitchRad) * backOffset + randomRange(-5, 5),
      z: player.position.z - Math.cos(yawRad) * backOffset + randomRange(-5, 5),
    },
    velocity: {
      x: randomRange(-0.5, 0.5),
      y: randomRange(-0.3, 0.3),
      z: randomRange(-0.5, 0.5),
    },
    color: player.trailColor,
    size: randomRange(3, 8),
    life: 1,
    maxLife: 1,
  };
}

export function createCheckpointParticles(position: Vector3): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 60; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = randomRange(2, 6);
    particles.push({
      id: uuidv4(),
      position: { ...position },
      velocity: {
        x: Math.sin(phi) * Math.cos(theta) * speed,
        y: Math.sin(phi) * Math.sin(theta) * speed,
        z: Math.cos(phi) * speed,
      },
      color: '#FFD700',
      size: randomRange(4, 10),
      life: 0.8,
      maxLife: 0.8,
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[], deltaTime: number): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      position: {
        x: p.position.x + p.velocity.x,
        y: p.position.y + p.velocity.y,
        z: p.position.z + p.velocity.z,
      },
      life: p.life - deltaTime,
    }))
    .filter((p) => p.life > 0);
}

export function updateVortexes(vortexes: Vortex[]): Vortex[] {
  const now = Date.now();
  return vortexes.filter((v) => now - v.createdAt < v.duration);
}

export function clampCameraPhi(phi: number): number {
  return Math.max(CAMERA_PHI_MIN, Math.min(CAMERA_PHI_MAX, phi));
}

export function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor((ms % 1000));
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}
