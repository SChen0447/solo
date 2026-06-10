import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

export const MAX_PARTICLES = 2000;
export const PARTICLE_SIZE_MIN = 0.1;
export const PARTICLE_SIZE_MAX = 0.3;
export const PARTICLE_ALPHA = 0.6;
export const HUE_MIN = 240;
export const HUE_MAX = 360;
export const PULSE_DURATION = 0.5;
export const FIELD_STRENGTH = 1.5;
export const DAMPING = 0.98;

export interface StarParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  hue: number;
  size: number;
  alpha: number;
  fateTag: string;
  isLocked: boolean;
  pulseTimer: number;
  symbolId: number | null;
}

export interface StarsSystem {
  particles: StarParticle[];
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  rippleMeshes: THREE.Mesh[];
}

const noise3D = createNoise3D();
const FATE_TAGS = ['fire', 'water', 'earth', 'air', 'spirit'];

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomColor(): { color: THREE.Color; hue: number } {
  const hue = randRange(HUE_MIN, HUE_MAX);
  const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.6);
  return { color, hue };
}

function createParticle(position?: THREE.Vector3, velocity?: THREE.Vector3): StarParticle {
  const { color, hue } = randomColor();
  const pos = position ? position.clone() : new THREE.Vector3(
    randRange(-8, 8),
    randRange(-5, 5),
    randRange(-3, 3)
  );
  const vel = velocity ? velocity.clone() : new THREE.Vector3(
    randRange(-0.5, 0.5),
    randRange(-0.5, 0.5),
    randRange(-0.2, 0.2)
  );
  return {
    position: pos,
    velocity: vel,
    color,
    hue,
    size: randRange(PARTICLE_SIZE_MIN, PARTICLE_SIZE_MAX),
    alpha: PARTICLE_ALPHA,
    fateTag: FATE_TAGS[Math.floor(Math.random() * FATE_TAGS.length)],
    isLocked: false,
    pulseTimer: 0,
    symbolId: null
  };
}

export function createStars(initialCount: number = 50): StarsSystem {
  const particles: StarParticle[] = [];
  const positions = new Float32Array(MAX_PARTICLES * 3);
  const colors = new Float32Array(MAX_PARTICLES * 3);
  const sizes = new Float32Array(MAX_PARTICLES);
  const alphas = new Float32Array(MAX_PARTICLES);

  for (let i = 0; i < initialCount; i++) {
    const centerPos = new THREE.Vector3(
      randRange(-1, 1),
      randRange(-1, 1),
      randRange(-0.5, 0.5)
    );
    particles.push(createParticle(centerPos));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

  const material = new THREE.PointsMaterial({
    size: 0.25,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  updateBuffers(particles, geometry);
  geometry.setDrawRange(0, particles.length);

  return {
    particles,
    points,
    geometry,
    material,
    rippleMeshes: []
  };
}

function updateBuffers(particles: StarParticle[], geometry: THREE.BufferGeometry): void {
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
  const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute;
  const alphaAttr = geometry.getAttribute('alpha') as THREE.BufferAttribute;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    posAttr.array[i * 3] = p.position.x;
    posAttr.array[i * 3 + 1] = p.position.y;
    posAttr.array[i * 3 + 2] = p.position.z;

    const pulseBoost = p.pulseTimer > 0 ? (1 + p.pulseTimer / PULSE_DURATION) : 1;
    colAttr.array[i * 3] = Math.min(1, p.color.r * pulseBoost);
    colAttr.array[i * 3 + 1] = Math.min(1, p.color.g * pulseBoost);
    colAttr.array[i * 3 + 2] = Math.min(1, p.color.b * pulseBoost);

    sizeAttr.array[i] = p.size * (p.isLocked ? 1.5 : 1) * (pulseBoost > 1 ? 1.3 : 1);
    alphaAttr.array[i] = p.alpha;
  }

  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;
  sizeAttr.needsUpdate = true;
  alphaAttr.needsUpdate = true;
}

export function updateStars(
  system: StarsSystem,
  deltaTime: number,
  elapsedTime: number
): void {
  const { particles, geometry, rippleMeshes } = system;
  const dt = Math.min(deltaTime, 0.05);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    if (p.isLocked) {
      if (p.pulseTimer > 0) {
        p.pulseTimer = Math.max(0, p.pulseTimer - dt);
      }
      continue;
    }

    const nx = noise3D(p.position.x * 0.1, p.position.y * 0.1, elapsedTime * 0.1) * FIELD_STRENGTH;
    const ny = noise3D(p.position.x * 0.1 + 100, p.position.y * 0.1 + 100, elapsedTime * 0.1) * FIELD_STRENGTH;
    const nz = noise3D(p.position.x * 0.1 + 200, p.position.y * 0.1 + 200, elapsedTime * 0.1) * FIELD_STRENGTH * 0.5;

    p.velocity.x += nx * dt;
    p.velocity.y += ny * dt;
    p.velocity.z += nz * dt;

    p.velocity.x *= DAMPING;
    p.velocity.y *= DAMPING;
    p.velocity.z *= DAMPING;

    const speed = p.velocity.length();
    const maxSpeed = 3;
    if (speed > maxSpeed) {
      p.velocity.multiplyScalar(maxSpeed / speed);
    }

    p.position.addScaledVector(p.velocity, dt);

    const bounds = 12;
    if (Math.abs(p.position.x) > bounds) {
      p.position.x = Math.sign(p.position.x) * bounds;
      p.velocity.x *= -0.5;
    }
    if (Math.abs(p.position.y) > bounds * 0.7) {
      p.position.y = Math.sign(p.position.y) * bounds * 0.7;
      p.velocity.y *= -0.5;
    }
    if (Math.abs(p.position.z) > bounds * 0.4) {
      p.position.z = Math.sign(p.position.z) * bounds * 0.4;
      p.velocity.z *= -0.5;
    }

    if (p.pulseTimer > 0) {
      p.pulseTimer = Math.max(0, p.pulseTimer - dt);
    }
  }

  for (let i = 0; i < particles.length; i++) {
    if (particles[i].isLocked) continue;
    for (let j = i + 1; j < particles.length; j++) {
      if (particles[j].isLocked) continue;
      const dx = particles[i].position.x - particles[j].position.x;
      const dy = particles[i].position.y - particles[j].position.y;
      const dz = particles[i].position.z - particles[j].position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const collisionDist = (particles[i].size + particles[j].size) * 2;
      if (distSq < collisionDist * collisionDist && distSq > 0.0001) {
        const tempColor = particles[i].color.clone();
        const tempHue = particles[i].hue;
        particles[i].color.copy(particles[j].color);
        particles[i].hue = particles[j].hue;
        particles[j].color.copy(tempColor);
        particles[j].hue = tempHue;
        particles[i].pulseTimer = PULSE_DURATION;
        particles[j].pulseTimer = PULSE_DURATION;
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const overlap = collisionDist - dist;
        particles[i].position.x += nx * overlap * 0.5;
        particles[i].position.y += ny * overlap * 0.5;
        particles[i].position.z += nz * overlap * 0.5;
        particles[j].position.x -= nx * overlap * 0.5;
        particles[j].position.y -= ny * overlap * 0.5;
        particles[j].position.z -= nz * overlap * 0.5;
      }
    }
  }

  for (let i = rippleMeshes.length - 1; i >= 0; i--) {
    const mesh = rippleMeshes[i];
    const userData = mesh.userData as { startTime: number; duration: number };
    const t = (elapsedTime - userData.startTime) / userData.duration;
    if (t >= 1) {
      rippleMeshes.splice(i, 1);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      continue;
    }
    mesh.scale.setScalar(1 + t * 2);
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
  }

  updateBuffers(particles, geometry);
  geometry.setDrawRange(0, particles.length);
}

export function addDust(
  system: StarsSystem,
  position: THREE.Vector3,
  count: number,
  elapsedTime: number,
  scene: THREE.Scene
): number {
  const actualCount = Math.min(count, MAX_PARTICLES - system.particles.length);
  if (actualCount <= 0) return 0;

  for (let i = 0; i < actualCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI - Math.PI / 2;
    const speed = randRange(2, 5);
    const velocity = new THREE.Vector3(
      Math.cos(angle) * Math.cos(phi) * speed,
      Math.sin(phi) * speed,
      Math.sin(angle) * Math.cos(phi) * speed
    );
    const offset = new THREE.Vector3(
      randRange(-0.3, 0.3),
      randRange(-0.3, 0.3),
      randRange(-0.3, 0.3)
    );
    const spawnPos = position.clone().add(offset);
    system.particles.push(createParticle(spawnPos, velocity));
  }

  const rippleGeo = new THREE.RingGeometry(0.1, 0.3, 32);
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0xff4aff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const ripple = new THREE.Mesh(rippleGeo, rippleMat);
  ripple.position.copy(position);
  ripple.lookAt(new THREE.Vector3(0, 0, 20));
  ripple.userData = { startTime: elapsedTime, duration: 0.5 };
  system.rippleMeshes.push(ripple);
  scene.add(ripple);

  return actualCount;
}

export function explodeParticles(
  system: StarsSystem,
  center: THREE.Vector3,
  count: number,
  colorA: THREE.Color,
  colorB: THREE.Color,
  elapsedTime: number,
  scene: THREE.Scene
): void {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const velocities: THREE.Vector3[] = [];

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = randRange(2, 6);
    velocities.push(new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
      Math.cos(phi) * speed
    ));
    positions[i * 3] = center.x;
    positions[i * 3 + 1] = center.y;
    positions[i * 3 + 2] = center.z;
    const t = Math.random();
    const c = colorA.clone().lerp(colorB, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.2,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });
  const points = new THREE.Points(geo, mat);
  points.userData = {
    startTime: elapsedTime,
    duration: 2.0,
    velocities
  };
  points.name = 'explosion';
  scene.add(points);
}

export function updateExplosions(scene: THREE.Scene, elapsedTime: number): void {
  const toRemove: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj.name === 'explosion' && obj instanceof THREE.Points) {
      const ud = obj.userData as { startTime: number; duration: number; velocities: THREE.Vector3[] };
      const t = (elapsedTime - ud.startTime) / ud.duration;
      if (t >= 1) {
        toRemove.push(obj);
        return;
      }
      const posAttr = obj.geometry.getAttribute('position') as THREE.BufferAttribute;
      const dt = 1 / 60;
      for (let i = 0; i < ud.velocities.length; i++) {
        posAttr.array[i * 3] += ud.velocities[i].x * dt;
        posAttr.array[i * 3 + 1] += ud.velocities[i].y * dt;
        posAttr.array[i * 3 + 2] += ud.velocities[i].z * dt;
        ud.velocities[i].multiplyScalar(0.97);
      }
      posAttr.needsUpdate = true;
      (obj.material as THREE.PointsMaterial).opacity = 1 - t;
    }
  });
  toRemove.forEach((obj) => {
    scene.remove(obj);
    if (obj instanceof THREE.Points) {
      obj.geometry.dispose();
      (obj.material as THREE.Material).dispose();
    }
  });
}

export function fadeAllParticles(system: StarsSystem, progress: number): void {
  system.particles.forEach((p) => {
    p.alpha = PARTICLE_ALPHA * (1 - progress);
  });
}

export function resetParticles(system: StarsSystem, count: number = 50): void {
  system.particles.length = 0;
  for (let i = 0; i < count; i++) {
    const centerPos = new THREE.Vector3(
      randRange(-1, 1),
      randRange(-1, 1),
      randRange(-0.5, 0.5)
    );
    system.particles.push(createParticle(centerPos));
  }
}
