import * as THREE from 'three';
import { setupScene } from './scene';
import { Firefly, SpatialHash } from './firefly';
import { InteractionController } from './interaction';

const container = document.getElementById('scene-container')!;
const countDisplay = document.querySelector('#info-bar .count') as HTMLSpanElement;

const sceneSetup = setupScene(container);
const { scene, camera, renderer, stars, perches } = sceneSetup;

const fireflies: Firefly[] = [];
const FIREFLY_COUNT = 30;
const spatialHash = new SpatialHash(2.0);

const bounds = {
  minX: -14,
  maxX: 14,
  minY: 1.5,
  maxY: 9,
  minZ: -14,
  maxZ: 14
};

for (let i = 0; i < FIREFLY_COUNT; i++) {
  const perch = perches[i % perches.length];
  const firefly = new Firefly(perch);
  scene.add(firefly.mesh);
  fireflies.push(firefly);
}

if (countDisplay) {
  countDisplay.textContent = `萤火虫: ${fireflies.length}`;
}

const interaction = new InteractionController(sceneSetup, fireflies, (boost: number) => {
  for (const f of fireflies) {
    f.setEnvironmentBoost(boost);
  }
});

let syncFlashTimer = 0;
let isSyncFlashing = false;
let syncFlashProgress = 0;
const SYNC_FLASH_INTERVAL = 15;
const SYNC_FLASH_DURATION = 3;

const processedPairs = new Set<string>();

const clock = new THREE.Clock();
let frameCount = 0;

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  frameCount++;

  const starsMaterial = stars.material as THREE.ShaderMaterial;
  if (starsMaterial.uniforms && starsMaterial.uniforms.uTime) {
    starsMaterial.uniforms.uTime.value = elapsed;
  }

  interaction.update(deltaTime);

  if (!isSyncFlashing) {
    syncFlashTimer += deltaTime;
    if (syncFlashTimer >= SYNC_FLASH_INTERVAL) {
      isSyncFlashing = true;
      syncFlashProgress = 0;
    }
  } else {
    syncFlashProgress += deltaTime / SYNC_FLASH_DURATION;
    if (syncFlashProgress >= 1) {
      for (const f of fireflies) {
        f.setSyncFlash(null);
        f.glowIntensity = 0.1;
      }
      isSyncFlashing = false;
      syncFlashTimer = 0;
      syncFlashProgress = 0;
    } else {
      const intensity = 0.2 + 0.8 * Math.sin(syncFlashProgress * Math.PI * 0.5);
      for (const f of fireflies) {
        f.setSyncFlash(intensity);
      }
    }
  }

  spatialHash.build(fireflies);

  processedPairs.clear();

  for (const firefly of fireflies) {
    const neighbors = spatialHash.query(firefly);

    if (!isSyncFlashing) {
      for (const neighbor of neighbors) {
        const idA = firefly.mesh.uuid;
        const idB = neighbor.mesh.uuid;
        const pairKey = idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;

        if (processedPairs.has(pairKey)) continue;

        const dx = firefly.x - neighbor.x;
        const dy = firefly.y - neighbor.y;
        const dz = firefly.z - neighbor.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < 4.0 && distSq > 0.01) {
          processedPairs.add(pairKey);
          firefly.triggerSocialFlash(neighbor);
          neighbor.triggerSocialFlash(firefly);
        }
      }
    }

    firefly.update(deltaTime, neighbors, interaction.meteors, bounds, isSyncFlashing);
  }

  renderer.render(scene, camera);
}

animate();
