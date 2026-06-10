import * as THREE from 'three';
import {
  VesselData,
  getPathAt,
  getPathLength,
  isInSlowZone,
  isInAneurysmZone,
  getVortexOffset,
} from './vessel';

export interface ParticleSystem {
  points: THREE.Points;
  trailPoints: THREE.Points | null;
  update: (delta: number, speedMultiplier: number, showTrails: boolean) => void;
  getActiveCount: () => number;
  reset: () => void;
}

interface ParticleData {
  pathIndex: number;
  progress: number;
  speed: number;
  active: boolean;
  offsetRadius: number;
  offsetAngle: number;
  trailHistory: THREE.Vector3[];
}

const PARTICLE_COUNT = 5000;
const MAX_TRAIL_HISTORY = 30;
const PARTICLE_RADIUS = 0.1;
const BASE_SPEED = 2.5;
const SLOW_SPEED_FACTOR = 0.3;

export function createParticleSystem(vesselData: VesselData): ParticleSystem {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);

  const particles: ParticleData[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const pathIndex = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? 1 : 2;
    particles.push({
      pathIndex,
      progress: Math.random(),
      speed: BASE_SPEED * (0.8 + Math.random() * 0.4),
      active: true,
      offsetRadius: (Math.random() - 0.5) * 1.6,
      offsetAngle: Math.random() * Math.PI * 2,
      trailHistory: [],
    });

    const color = new THREE.Color().setHSL(0, 1, 0.5);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = PARTICLE_RADIUS;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: PARTICLE_RADIUS,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'bloodParticles';

  const maxTrailCount = PARTICLE_COUNT * MAX_TRAIL_HISTORY;
  const trailPositions = new Float32Array(maxTrailCount * 3);
  const trailColors = new Float32Array(maxTrailCount * 3);
  const trailSizes = new Float32Array(maxTrailCount);

  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
  trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));

  const trailMaterial = new THREE.PointsMaterial({
    size: PARTICLE_RADIUS * 0.7,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const trailPoints = new THREE.Points(trailGeometry, trailMaterial);
  trailPoints.name = 'particleTrails';
  trailPoints.visible = false;

  function computeParticlePosition(particle: ParticleData, time: number): THREE.Vector3 {
    const path = getPathAt(particle.pathIndex, vesselData);
    const pathLen = getPathLength(vesselData, particle.pathIndex);
    const t = Math.min(1, particle.progress);
    const basePos = path.getPointAt(t);

    const tan = path.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    let normal = new THREE.Vector3().crossVectors(tan, up).normalize();
    if (normal.lengthSq() < 0.01) {
      normal.set(1, 0, 0);
    }
    const binormal = new THREE.Vector3().crossVectors(tan, normal).normalize();

    const rotAngle = particle.offsetAngle + particle.progress * Math.PI * 4;
    const radialOffset = normal
      .clone()
      .multiplyScalar(Math.cos(rotAngle) * particle.offsetRadius)
      .add(binormal.clone().multiplyScalar(Math.sin(rotAngle) * particle.offsetRadius));

    const finalPos = basePos.clone().add(radialOffset);

    const vortexOffset = getVortexOffset(finalPos, vesselData, time);
    finalPos.add(vortexOffset);

    return finalPos;
  }

  function update(delta: number, speedMultiplier: number, showTrails: boolean): void {
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const positionArray = positionAttr.array as Float32Array;

    const time = performance.now() * 0.001;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i];
      if (!p.active) continue;

      let currentSpeed = p.speed * speedMultiplier;
      const tempPos = computeParticlePosition(p, time);
      if (isInSlowZone(tempPos, vesselData)) {
        currentSpeed *= SLOW_SPEED_FACTOR;
      }

      const pathLen = getPathLength(vesselData, p.pathIndex);
      p.progress += (currentSpeed * delta) / pathLen;

      if (p.progress >= 1.0) {
        p.pathIndex = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? 1 : 2;
        p.progress = 0;
        p.speed = BASE_SPEED * (0.8 + Math.random() * 0.4);
        p.offsetRadius = (Math.random() - 0.5) * 1.6;
        p.offsetAngle = Math.random() * Math.PI * 2;
        p.trailHistory.length = 0;
      }

      const pos = computeParticlePosition(p, time);

      if (showTrails) {
        p.trailHistory.unshift(pos.clone());
        if (p.trailHistory.length > MAX_TRAIL_HISTORY) {
          p.trailHistory.pop();
        }
      } else {
        p.trailHistory.length = 0;
      }

      positionArray[i * 3] = pos.x;
      positionArray[i * 3 + 1] = pos.y;
      positionArray[i * 3 + 2] = pos.z;
    }

    positionAttr.needsUpdate = true;

    if (showTrails) {
      trailPoints.visible = true;
      const trailPosAttr = trailGeometry.getAttribute('position') as THREE.BufferAttribute;
      const trailColorAttr = trailGeometry.getAttribute('color') as THREE.BufferAttribute;
      const trailSizeAttr = trailGeometry.getAttribute('size') as THREE.BufferAttribute;
      const trailPosArray = trailPosAttr.array as Float32Array;
      const trailColorArray = trailColorAttr.array as Float32Array;
      const trailSizeArray = trailSizeAttr.array as Float32Array;

      let trailIndex = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        if (!p.active) continue;

        for (let j = 0; j < p.trailHistory.length && trailIndex < maxTrailCount; j++) {
          const tp = p.trailHistory[j];
          const fade = 1 - j / MAX_TRAIL_HISTORY;

          trailPosArray[trailIndex * 3] = tp.x;
          trailPosArray[trailIndex * 3 + 1] = tp.y;
          trailPosArray[trailIndex * 3 + 2] = tp.z;

          const color = new THREE.Color().setHSL(0, 1, 0.4 + fade * 0.3);
          trailColorArray[trailIndex * 3] = color.r * fade;
          trailColorArray[trailIndex * 3 + 1] = color.g * fade;
          trailColorArray[trailIndex * 3 + 2] = color.b * fade;

          trailSizeArray[trailIndex] = PARTICLE_RADIUS * 0.7 * fade;

          trailIndex++;
        }
      }

      trailGeometry.setDrawRange(0, trailIndex);
      trailPosAttr.needsUpdate = true;
      trailColorAttr.needsUpdate = true;
      trailSizeAttr.needsUpdate = true;
    } else {
      trailPoints.visible = false;
      trailGeometry.setDrawRange(0, 0);
    }
  }

  function getActiveCount(): number {
    return particles.filter((p) => p.active).length;
  }

  function reset(): void {
    const time = performance.now() * 0.001;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles[i].pathIndex = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? 1 : 2;
      particles[i].progress = Math.random() * 0.1;
      particles[i].speed = BASE_SPEED * (0.8 + Math.random() * 0.4);
      particles[i].active = true;
      particles[i].offsetRadius = (Math.random() - 0.5) * 1.6;
      particles[i].offsetAngle = Math.random() * Math.PI * 2;
      particles[i].trailHistory.length = 0;
    }
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const positionArray = positionAttr.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pos = computeParticlePosition(particles[i], time);
      positionArray[i * 3] = pos.x;
      positionArray[i * 3 + 1] = pos.y;
      positionArray[i * 3 + 2] = pos.z;
    }
    positionAttr.needsUpdate = true;
    trailGeometry.setDrawRange(0, 0);
  }

  reset();

  return {
    points,
    trailPoints,
    update,
    getActiveCount,
    reset,
  };
}

export { PARTICLE_COUNT, isInAneurysmZone };
