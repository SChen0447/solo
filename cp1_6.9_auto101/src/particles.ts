import * as THREE from 'three';
import { scene, treeResult, incrementCollisionCount, globalState } from './main';
import { getRandomPointOnBranches } from './tree';

interface Particle {
  mesh: THREE.Points;
  velocities: Float32Array;
  life: number;
  maxLife: number;
}

interface AwakeSpotConfig {
  position: THREE.Vector3;
  life: number;
}

let particles: Particle[] = [];
let totalParticleCount = 0;
const MAX_PARTICLES = 800;

export function initParticles(_scene: THREE.Scene) {}

export function spawnCollisionParticles(
  position: THREE.Vector3,
  color1: number,
  color2: number
) {
  const count = 40 + Math.floor(Math.random() * 21);

  if (totalParticleCount + count > MAX_PARTICLES) {
    const excess = totalParticleCount + count - MAX_PARTICLES;
    removeOldParticles(excess);
  }

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;

    const t = Math.random();
    const color = c1.clone().lerp(c2, t);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = 1.5 + Math.random() * 2.5;

    velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
    velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed + 0.5;
    velocities[i * 3 + 2] = Math.cos(phi) * speed;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.06,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const mesh = new THREE.Points(geometry, material);
  scene.add(mesh);

  const maxLife = 0.8 + Math.random() * 0.4;

  particles.push({ mesh, velocities, life: maxLife, maxLife });
  totalParticleCount += count;

  incrementCollisionCount();
  spawnAwakeSpots();
}

function spawnAwakeSpots() {
  if (!treeResult) return;

  const count = 6 + Math.floor(Math.random() * 5);

  for (let i = 0; i < count; i++) {
    if (globalState.awakeSpots.length >= 20) break;

    const pos = getRandomPointOnBranches(treeResult.branchSegments);
    const size = 0.03 + Math.random() * 0.03;

    const geometry = new THREE.SphereGeometry(size, 8, 8);

    const startColor = new THREE.Color(0x335566);
    const endColor = new THREE.Color(0xaaccff);
    const t = Math.random();
    const spotColor = startColor.clone().lerp(endColor, t);

    const material = new THREE.MeshBasicMaterial({
      color: spotColor,
      transparent: true,
      opacity: 0.8
    });

    const spot = new THREE.Mesh(geometry, material);
    spot.position.copy(pos);
    spot.userData = {
      basePosition: pos.clone(),
      life: 5,
      maxLife: 5,
      floating: false,
      constellation: false,
      startTime: 0
    };

    scene.add(spot);
    globalState.awakeSpots.push(spot);
  }
}

export function triggerConstellation() {
  const spots = globalState.awakeSpots.filter(s => !s.userData.constellation);
  if (spots.length === 0) return;

  const patterns = ['star', 'spiral', 'wave'];
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];

  const center = new THREE.Vector3(0, 6, 0);
  const radius = 1.5;

  spots.forEach((spot, index) => {
    spot.userData.floating = true;
    spot.userData.constellation = true;
    spot.userData.startTime = performance.now() / 1000;
    spot.userData.life = 3.5;

    let target: THREE.Vector3;
    const t = index / spots.length;

    switch (pattern) {
      case 'star': {
        const angle = t * Math.PI * 2 - Math.PI / 2;
        const r = index % 2 === 0 ? radius : radius * 0.4;
        target = new THREE.Vector3(
          center.x + Math.cos(angle) * r,
          center.y + Math.sin(angle) * r,
          center.z
        );
        break;
      }
      case 'spiral': {
        const angle = t * Math.PI * 4;
        const r = t * radius;
        target = new THREE.Vector3(
          center.x + Math.cos(angle) * r,
          center.y + 1 - t * 2,
          center.z + Math.sin(angle) * r
        );
        break;
      }
      case 'wave': {
        target = new THREE.Vector3(
          center.x - radius + t * radius * 2,
          center.y + Math.sin(t * Math.PI * 6) * 0.5,
          center.z
        );
        break;
      }
      default:
        target = center.clone();
    }

    spot.userData.constellationTarget = target;
  });

  globalState.bgTransition = 1;
}

function removeOldParticles(count: number) {
  let removed = 0;
  while (particles.length > 0 && removed < count) {
    const oldest = particles.shift()!;
    const posAttr = oldest.mesh.geometry.getAttribute('position');
    removed += posAttr.count;
    scene.remove(oldest.mesh);
    oldest.mesh.geometry.dispose();
    (oldest.mesh.material as THREE.Material).dispose();
  }
  totalParticleCount -= removed;
}

export function updateParticles(delta: number, _elapsed: number) {
  const gravity = -1.5;

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= delta;

    if (p.life <= 0) {
      const posAttr = p.mesh.geometry.getAttribute('position');
      totalParticleCount -= posAttr.count;
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      particles.splice(i, 1);
      continue;
    }

    const positions = p.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;

    for (let j = 0; j < posArray.length / 3; j++) {
      p.velocities[j * 3 + 1] += gravity * delta;

      posArray[j * 3] += p.velocities[j * 3] * delta;
      posArray[j * 3 + 1] += p.velocities[j * 3 + 1] * delta;
      posArray[j * 3 + 2] += p.velocities[j * 3 + 2] * delta;
    }

    positions.needsUpdate = true;
    (p.mesh.material as THREE.PointsMaterial).opacity = (p.life / p.maxLife) * 0.9;
  }
}
