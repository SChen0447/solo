import * as THREE from 'three';
import { initScene, resizeRenderer, updateMoonLight, updateGroundParticles, type SceneObjects } from './scene';
import { Butterfly } from './butterfly';
import { Flower } from './flower';

const BUTTERFLY_COUNT = 50;
const FLOWER_COUNT = 30;
const MOON_CYCLE = 40;
const HELIX_DURATION = 8;
const HELIX_RADIUS = 5;
const HELIX_HEIGHT = 8;

let sceneObjects: SceneObjects;
let butterflies: Butterfly[] = [];
let flowers: Flower[] = [];
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;

let elapsed = 0;
let lastTime = 0;
let butterflySpeed = 1.0;
let bloomDelay = 1.5;
let moonBrightness = 0.7;

let inHelixFormation = false;
let helixTimer = 0;
let lastHelixTrigger = -999;

let butterflyTargetTimer = 0;

let isLoaded = false;

function init(): void {
  const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }

  sceneObjects = initScene(canvas);
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  flowers = Flower.spawnFlowers(sceneObjects.scene, FLOWER_COUNT);
  butterflies = Butterfly.spawnButterflies(sceneObjects.scene, BUTTERFLY_COUNT);

  butterflies.forEach(b => {
    sceneObjects.scene.add(b.trail);
  });

  setupEventListeners(canvas);
  resizeRenderer(sceneObjects.renderer, sceneObjects.camera);
  updateButterflyCount();

  setTimeout(() => {
    hideLoading();
    isLoaded = true;
    lastTime = performance.now();
    requestAnimationFrame(animate);
  }, 500);
}

function setupEventListeners(canvas: HTMLCanvasElement): void {
  window.addEventListener('resize', () => {
    resizeRenderer(sceneObjects.renderer, sceneObjects.camera);
  });

  canvas.addEventListener('click', handleCanvasClick);

  const speedSlider = document.getElementById('butterfly-speed') as HTMLInputElement;
  const delaySlider = document.getElementById('bloom-delay') as HTMLInputElement;
  const moonSlider = document.getElementById('moon-brightness') as HTMLInputElement;
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
  const speedValue = document.getElementById('speed-value') as HTMLSpanElement;
  const delayValue = document.getElementById('delay-value') as HTMLSpanElement;
  const moonValue = document.getElementById('moon-value') as HTMLSpanElement;

  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      butterflySpeed = parseFloat((e.target as HTMLInputElement).value);
      speedValue.textContent = butterflySpeed.toFixed(1);
    });
  }

  if (delaySlider) {
    delaySlider.addEventListener('input', (e) => {
      bloomDelay = parseFloat((e.target as HTMLInputElement).value);
      delayValue.textContent = bloomDelay.toFixed(1);
    });
  }

  if (moonSlider) {
    moonSlider.addEventListener('input', (e) => {
      moonBrightness = parseFloat((e.target as HTMLInputElement).value);
      moonValue.textContent = moonBrightness.toFixed(2);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetAllFlowers();
    });
  }
}

function handleCanvasClick(event: MouseEvent): void {
  const canvas = sceneObjects.renderer.domElement;
  const rect = canvas.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, sceneObjects.camera);

  const flowerMeshes: THREE.Object3D[] = [];
  flowers.forEach(flower => {
    flower.group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        flowerMeshes.push(child);
        (child as any).userData.flowerRef = flower;
      }
    });
  });

  const intersects = raycaster.intersectObjects(flowerMeshes, true);

  if (intersects.length > 0) {
    let clickedFlower: Flower | null = null;
    for (const inter of intersects) {
      let obj: THREE.Object3D | null = inter.object;
      while (obj) {
        if ((obj as any).userData?.flowerRef) {
          clickedFlower = (obj as any).userData.flowerRef;
          break;
        }
        if (obj.parent && (obj.parent as any).userData?.flowerRef) {
          clickedFlower = (obj.parent as any).userData.flowerRef;
          break;
        }
        obj = obj.parent;
      }
      if (clickedFlower) break;
    }

    for (const flower of flowers) {
      if (!clickedFlower) {
        const dist = flower.group.position.distanceTo(
          raycaster.ray.at(10, new THREE.Vector3())
        );
        if (dist < 1.5) {
          clickedFlower = flower;
          break;
        }
      }
    }

    if (!clickedFlower) {
      let closest: Flower | null = null;
      let closestDist = Infinity;
      const rayPoint = raycaster.ray.at(8, new THREE.Vector3());
      for (const flower of flowers) {
        const dist = flower.position.distanceTo(rayPoint);
        if (dist < closestDist) {
          closestDist = dist;
          closest = flower;
        }
      }
      if (closest && closestDist < 3) {
        clickedFlower = closest;
      }
    }

    if (clickedFlower) {
      clickedFlower.startBloom(bloomDelay);
    }
  }
}

function assignButterflyTarget(): void {
  const availableButterflies = butterflies.filter(b => !b.targetFlower || !b.targetFlower.isBloomed);
  const bloomedFlowers = flowers.filter(f => f.isBloomed);

  if (availableButterflies.length > 0 && bloomedFlowers.length > 0) {
    const butterfly = availableButterflies[Math.floor(Math.random() * availableButterflies.length)];
    const flower = bloomedFlowers[Math.floor(Math.random() * bloomedFlowers.length)];
    butterfly.targetFlower = flower;
  } else if (availableButterflies.length > 0) {
    const budFlowers = flowers.filter(f => f.state === 'bud');
    if (budFlowers.length > 0) {
      const butterfly = availableButterflies[Math.floor(Math.random() * availableButterflies.length)];
      let closest: Flower | null = null;
      let closestDist = Infinity;
      for (const flower of budFlowers) {
        const dist = butterfly.position.distanceTo(flower.position);
        if (dist < closestDist) {
          closestDist = dist;
          closest = flower;
        }
      }
      if (closest && closestDist < 2) {
        closest.startBloom(bloomDelay * 0.5);
      }
    }
  }
}

function resetAllFlowers(): void {
  flowers.forEach(flower => flower.startShrink());
  butterflies.forEach(b => {
    b.targetFlower = null;
  });
}

function checkHelixFormation(delta: number): void {
  const cyclePhase = (elapsed % MOON_CYCLE) / MOON_CYCLE;
  const moonAtZenith = Math.abs(cyclePhase - 0.25) < 0.02 || Math.abs(cyclePhase - 0.75) < 0.02;

  if (moonAtZenith && elapsed - lastHelixTrigger > MOON_CYCLE * 0.5) {
    inHelixFormation = true;
    helixTimer = HELIX_DURATION;
    lastHelixTrigger = elapsed;

    butterflies.forEach(b => b.setGolden(2));
  }

  if (inHelixFormation) {
    helixTimer -= delta;
    if (helixTimer <= 0) {
      inHelixFormation = false;
    }
  }
}

function updateButterflyCount(): void {
  const countEl = document.getElementById('butterfly-count');
  if (countEl) {
    countEl.textContent = butterflies.length.toString();
  }
}

function hideLoading(): void {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 800);
  }
}

function animate(currentTime: number): void {
  if (!isLoaded) return;

  const delta = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;
  elapsed += delta;

  const startTime = performance.now();

  updateMoonLight(sceneObjects.moonLight, elapsed, MOON_CYCLE, moonBrightness);
  updateGroundParticles(sceneObjects.groundParticles, elapsed);
  checkHelixFormation(delta);

  butterflyTargetTimer += delta;
  if (butterflyTargetTimer >= 3) {
    butterflyTargetTimer = 0;
    assignButterflyTarget();
  }

  const moonDir = sceneObjects.moonLight.position.clone();
  const helixCenter = new THREE.Vector3(0, 4, 0);

  butterflies.forEach((butterfly, index) => {
    butterfly.update(
      delta,
      elapsed,
      butterflySpeed,
      moonDir,
      flowers,
      inHelixFormation,
      helixCenter,
      HELIX_RADIUS,
      HELIX_HEIGHT,
      index,
      butterflies.length
    );
  });

  flowers.forEach(flower => {
    flower.update(delta, elapsed);
  });

  const computeTime = performance.now() - startTime;
  if (computeTime > 5) {
    // Optional: log performance warnings
  }

  sceneObjects.renderer.render(sceneObjects.scene, sceneObjects.camera);

  requestAnimationFrame(animate);
}

window.addEventListener('DOMContentLoaded', init);
