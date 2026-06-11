import { v4 as uuidv4 } from 'uuid';

const SAND_COLORS = ['#d4a373', '#c48c47', '#b57a3a'];
const GRID_CELL_SIZE = 30;

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  humidity: number;
  bounceHeight: number;
  baseY: number;
  scatterVelocity?: { vx: number; vy: number };
  scatterStartTime?: number;
}

export interface Spark {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  createdAt: number;
  duration: number;
}

export interface Crater {
  id: string;
  x: number;
  y: number;
  radius: number;
  createdAt: number;
  duration: number;
}

export interface ControlState {
  windDirection: number;
  windSpeed: number;
  humidity: number;
}

export interface SpatialGrid {
  [key: string]: Particle[];
}

export function createParticle(canvasWidth: number, canvasHeight: number): Particle {
  const horizonY = canvasHeight * 0.7;
  const groundAreaHeight = canvasHeight - horizonY;
  
  return {
    id: uuidv4(),
    x: Math.random() * canvasWidth,
    y: horizonY + Math.random() * groundAreaHeight,
    baseY: horizonY + Math.random() * groundAreaHeight,
    vx: 0,
    vy: 0,
    size: 2 + Math.random() * 3,
    color: SAND_COLORS[Math.floor(Math.random() * SAND_COLORS.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 4,
    humidity: 30 + Math.random() * 40,
    bounceHeight: 0,
  };
}

export function initParticles(count: number, canvasWidth: number, canvasHeight: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push(createParticle(canvasWidth, canvasHeight));
  }
  return particles;
}

export function buildSpatialGrid(particles: Particle[], width: number, height: number): SpatialGrid {
  const grid: SpatialGrid = {};
  const cols = Math.ceil(width / GRID_CELL_SIZE);
  const rows = Math.ceil(height / GRID_CELL_SIZE);

  for (const p of particles) {
    const col = Math.max(0, Math.min(cols - 1, Math.floor(p.x / GRID_CELL_SIZE)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor(p.y / GRID_CELL_SIZE)));
    const key = `${col},${row}`;
    if (!grid[key]) grid[key] = [];
    grid[key].push(p);
  }

  return grid;
}

export function getNearbyParticles(
  grid: SpatialGrid,
  particle: Particle,
  width: number,
  height: number
): Particle[] {
  const cols = Math.ceil(width / GRID_CELL_SIZE);
  const rows = Math.ceil(height / GRID_CELL_SIZE);
  const col = Math.max(0, Math.min(cols - 1, Math.floor(particle.x / GRID_CELL_SIZE)));
  const row = Math.max(0, Math.min(rows - 1, Math.floor(particle.y / GRID_CELL_SIZE)));
  const nearby: Particle[] = [];

  for (let dc = -1; dc <= 1; dc++) {
    for (let dr = -1; dr <= 1; dr++) {
      const key = `${col + dc},${row + dr}`;
      if (grid[key]) {
        nearby.push(...grid[key]);
      }
    }
  }

  return nearby.filter(p => p.id !== particle.id);
}

export function updateParticle(
  particle: Particle,
  controls: ControlState,
  deltaTime: number,
  canvasWidth: number,
  canvasHeight: number,
  currentTime: number
): Particle {
  const horizonY = canvasHeight * 0.7;
  const windRad = (controls.windDirection * Math.PI) / 180;
  const windForce = controls.windSpeed * 0.15;
  const humidityDrag = 1 - (controls.humidity * 0.004);
  
  let vx = particle.vx;
  let vy = particle.vy;
  
  if (particle.scatterVelocity && particle.scatterStartTime) {
    const scatterElapsed = currentTime - particle.scatterStartTime;
    if (scatterElapsed < 500) {
      const scatterFactor = 1 - scatterElapsed / 500;
      vx += particle.scatterVelocity.vx * scatterFactor;
      vy += particle.scatterVelocity.vy * scatterFactor;
    } else {
      particle.scatterVelocity = undefined;
      particle.scatterStartTime = undefined;
    }
  }
  
  vx += Math.cos(windRad) * windForce * deltaTime * 0.06;
  vy += Math.sin(windRad) * windForce * deltaTime * 0.06;
  vx *= humidityDrag;
  vy *= humidityDrag;
  
  let x = particle.x + vx * deltaTime * 0.06;
  let y = particle.y + vy * deltaTime * 0.06;
  
  const waveOffset = Math.sin(currentTime * 0.001 + particle.x * 0.01) * 2;
  let bounceY = particle.baseY + waveOffset;
  
  if (controls.windSpeed > 5) {
    const crestOffset = Math.sin(currentTime * 0.002 + particle.x * 0.02) * 8;
    bounceY += crestOffset;
    particle.bounceHeight = Math.min(particle.bounceHeight + 0.1, 15);
  } else {
    particle.bounceHeight = Math.max(particle.bounceHeight - 0.05, 0);
  }
  
  y = Math.min(y, bounceY - particle.bounceHeight);
  
  if (x < -20) x = canvasWidth + 20;
  if (x > canvasWidth + 20) x = -20;
  if (y > canvasHeight + 20) y = horizonY + 10;
  if (y < horizonY - 50) y = horizonY - 50;
  
  const rotation = (particle.rotation + particle.rotationSpeed * deltaTime * 0.06) % 360;
  
  return {
    ...particle,
    x,
    y,
    vx,
    vy,
    rotation,
    baseY: particle.baseY + vy * 0.01,
  };
}

export function checkCollisionsAndCreateSparks(
  particles: Particle[],
  grid: SpatialGrid,
  controls: ControlState,
  currentTime: number,
  lastSparkPositions: Map<string, number>,
  width: number,
  height: number
): Spark[] {
  const sparks: Spark[] = [];
  const baseProbability = 0.008;
  const windBonus = (controls.windSpeed - 1) * 0.15;
  const triggerProbability = baseProbability * (1 + windBonus);
  const cooldown = 1000 + Math.random() * 1000;

  const checkedPairs = new Set<string>();

  for (const particle of particles) {
    const nearby = getNearbyParticles(grid, particle, width, height);
    
    for (const other of nearby) {
      const pairKey = [particle.id, other.id].sort().join('-');
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);
      
      const dx = particle.x - other.x;
      const dy = particle.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 10) {
        const posKey = `${Math.floor(particle.x / 20)},${Math.floor(particle.y / 20)}`;
        const lastSparkTime = lastSparkPositions.get(posKey) || 0;
        
        if (currentTime - lastSparkTime > cooldown && Math.random() < triggerProbability) {
          lastSparkPositions.set(posKey, currentTime);
          sparks.push({
            id: uuidv4(),
            x: (particle.x + other.x) / 2,
            y: (particle.y + other.y) / 2,
            size: 8 + Math.random() * 7,
            opacity: 0.6 + Math.random() * 0.3,
            createdAt: currentTime,
            duration: 300 + Math.random() * 300,
          });
        }
      }
    }
  }

  return sparks;
}

export function updateSparks(sparks: Spark[], currentTime: number): Spark[] {
  return sparks.filter(spark => currentTime - spark.createdAt < spark.duration);
}

export function updateCraters(craters: Crater[], currentTime: number): Crater[] {
  return craters.filter(crater => currentTime - crater.createdAt < crater.duration);
}

export function createScatterEffect(
  particles: Particle[],
  clickX: number,
  clickY: number,
  radius: number,
  currentTime: number
): Particle[] {
  return particles.map(particle => {
    const dx = particle.x - clickX;
    const dy = particle.y - clickY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < radius) {
      const force = (1 - distance / radius) * 8;
      const angle = Math.atan2(dy, dx);
      return {
        ...particle,
        scatterVelocity: {
          vx: Math.cos(angle) * force,
          vy: Math.sin(angle) * force,
        },
        scatterStartTime: currentTime,
      };
    }
    return particle;
  });
}

export function createCrater(x: number, y: number, radius: number, currentTime: number): Crater {
  return {
    id: uuidv4(),
    x,
    y,
    radius,
    createdAt: currentTime,
    duration: 2000,
  };
}

export function findNearestParticles(
  particle: Particle,
  allParticles: Particle[],
  count: number,
  maxDistance: number
): Particle[] {
  const withDistances = allParticles
    .filter(p => p.id !== particle.id)
    .map(p => ({
      particle: p,
      distance: Math.sqrt((p.x - particle.x) ** 2 + (p.y - particle.y) ** 2),
    }))
    .filter(item => item.distance < maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
  
  return withDistances.map(item => item.particle);
}
