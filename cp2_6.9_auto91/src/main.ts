import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createRuins,
  updateBubbles,
  updateSeaweed,
  updateWaterSurface,
  resizeBubbleSystem,
  RuinsData
} from './ruins';
import {
  createLighting,
  updateLighting,
  createGoldenBeamParticles,
  updateGoldenBeamParticles,
  createBlueFlameParticles,
  updateBlueFlameParticles,
  triggerWaterColorTransition,
  LightingData,
  GoldenParticleEffect,
  BlueFlameEffect
} from './lighting';

interface ColumnAnimation {
  mesh: THREE.Mesh;
  startY: number;
  targetY: number;
  startTime: number;
  duration: number;
}

interface HologramEffect {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
}

const INITIAL_CAMERA_POSITION = new THREE.Vector3(0, 8, 20);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let ruins: RuinsData;
let lighting: LightingData;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let hoveredObject: THREE.Object3D | null = null;
let outlineMeshes: Map<THREE.Object3D, THREE.Mesh> = new Map();

let goldenBeamEffects: GoldenParticleEffect[] = [];
let blueFlameEffects: BlueFlameEffect[] = [];
let columnAnimations: ColumnAnimation[] = [];
let hologramEffects: HologramEffect[] = [];

const activatedMechanisms = {
  altar: false,
  archBeam: false,
  allColumns: false
};
let allMechanismsActivated = false;

let bubbleDensity = 50;
let waveSpeed = 2;

const clock = new THREE.Clock();
let fpsCounter = 0;
let fpsTime = 0;
let fpsElement: HTMLElement;

let audioContext: AudioContext | null = null;

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  fpsElement = document.getElementById('fps-counter')!;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.copy(INITIAL_CAMERA_POSITION);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 2;
  controls.maxDistance = 30;
  controls.enablePan = true;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  };
  controls.target.set(0, 0, 0);

  lighting = createLighting(scene);

  ruins = createRuins();
  scene.add(ruins.group);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  setupEventListeners();
  animate();
}

function setupEventListeners(): void {
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('click', onPointerClick);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);

  const bubbleSlider = document.getElementById('bubble-density') as HTMLInputElement;
  const bubbleValue = document.getElementById('bubble-value')!;
  bubbleSlider.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLInputElement;
    bubbleDensity = parseInt(target.value, 10);
    bubbleValue.textContent = target.value;
    const result = resizeBubbleSystem(ruins.bubbles, ruins.bubbleData, bubbleDensity, ruins.group);
    ruins.bubbles = result.bubbles;
    ruins.bubbleData = result.data;
  });

  const waveSlider = document.getElementById('wave-speed') as HTMLInputElement;
  const waveValue = document.getElementById('wave-value')!;
  waveSlider.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLInputElement;
    waveSpeed = parseFloat(target.value);
    waveValue.textContent = `${waveSpeed.toFixed(1)} Hz`;
  });

  const resetBtn = document.getElementById('reset-btn')!;
  resetBtn.addEventListener('click', () => {
    camera.position.copy(INITIAL_CAMERA_POSITION);
    controls.target.set(0, 0, 0);
    controls.update();
  });
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onPointerLeave(): void {
  clearHover();
}

function onPointerClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(ruins.interactiveObjects, false);

  if (intersects.length > 0) {
    const object = intersects[0].object;
    handleObjectClick(object);
    playClickSound();
  }
}

function handleObjectClick(object: THREE.Object3D): void {
  const type = object.userData.type;

  if (type === 'column' && !object.userData.raised) {
    const mesh = object as THREE.Mesh;
    object.userData.raised = true;
    columnAnimations.push({
      mesh,
      startY: mesh.position.y,
      targetY: mesh.position.y + 5,
      startTime: performance.now() / 1000,
      duration: 2
    });

    const pos = new THREE.Vector3();
    mesh.getWorldPosition(pos);
    goldenBeamEffects.push(createGoldenBeamParticles(scene, pos, 4));

    checkColumnActivation();
  } else if (type === 'altar' && !object.userData.activated) {
    object.userData.activated = true;
    activatedMechanisms.altar = true;
    createHologram(object as THREE.Mesh);
    checkAllMechanisms();
  } else if (type === 'archBeam' && !object.userData.activated) {
    object.userData.activated = true;
    activatedMechanisms.archBeam = true;
    createBlueFlames();
    checkAllMechanisms();
  }
}

function checkColumnActivation(): void {
  const allRaised = ruins.columns.every(col => col.userData.raised);
  if (allRaised) {
    activatedMechanisms.allColumns = true;
    checkAllMechanisms();
  }
}

function checkAllMechanisms(): void {
  if (
    activatedMechanisms.altar &&
    activatedMechanisms.archBeam &&
    activatedMechanisms.allColumns &&
    !allMechanismsActivated
  ) {
    allMechanismsActivated = true;
    triggerFinalEffect();
  }
}

function triggerFinalEffect(): void {
  triggerWaterColorTransition(lighting);
  lighting.ambientLight.intensity = lighting.baseAmbientIntensity + 0.3;

  ruins.columns.forEach(col => {
    addGlowToMesh(col);
  });
  addGlowToMesh(ruins.altar);
  addGlowToMesh(ruins.arch.beam);
  addGlowToMesh(ruins.arch.leftPillar);
  addGlowToMesh(ruins.arch.rightPillar);
}

function addGlowToMesh(mesh: THREE.Mesh): void {
  const mat = mesh.material as THREE.MeshStandardMaterial;
  mat.emissive = new THREE.Color(0xFFD700);
  mat.emissiveIntensity = 0.15;
}

function createHologram(altar: THREE.Mesh): void {
  const greekLetters = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Μ',
                        'Ν', 'Ξ', 'Ο', 'Π', 'Ρ', 'Σ', 'Τ', 'Υ', 'Φ', 'Χ', 'Ψ', 'Ω'];
  let text = '';
  for (let i = 0; i < 3; i++) {
    text += greekLetters[Math.floor(Math.random() * greekLetters.length)];
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0, 255, 170, 0)';
  ctx.fillRect(0, 0, 512, 256);
  ctx.font = 'bold 140px serif';
  ctx.fillStyle = '#00FFAA';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 128);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const geometry = new THREE.PlaneGeometry(2.5, 1.2);
  const mesh = new THREE.Mesh(geometry, material);
  const altarPos = new THREE.Vector3();
  altar.getWorldPosition(altarPos);
  mesh.position.set(altarPos.x, altarPos.y + 1.5, altarPos.z);
  mesh.rotation.x = -0.2;
  scene.add(mesh);

  hologramEffects.push({
    mesh,
    startTime: performance.now() / 1000,
    duration: 5
  });
}

function createBlueFlames(): void {
  const leftTop = new THREE.Vector3();
  const rightTop = new THREE.Vector3();
  ruins.arch.leftPillar.getWorldPosition(leftTop);
  ruins.arch.rightPillar.getWorldPosition(rightTop);
  leftTop.y += 3.5;
  rightTop.y += 3.5;

  blueFlameEffects.push(createBlueFlameParticles(scene, leftTop));
  blueFlameEffects.push(createBlueFlameParticles(scene, rightTop));
}

function clearHover(): void {
  if (hoveredObject) {
    removeOutline(hoveredObject);
    hoveredObject = null;
    renderer.domElement.style.cursor = 'default';
  }
}

function updateHover(): void {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(ruins.interactiveObjects, false);

  if (intersects.length > 0) {
    const object = intersects[0].object;
    if (hoveredObject !== object) {
      clearHover();
      hoveredObject = object;
      addOutline(object);
      renderer.domElement.style.cursor = 'pointer';
    }
  } else {
    clearHover();
  }
}

function addOutline(object: THREE.Object3D): void {
  const mesh = object as THREE.Mesh;
  if (!mesh.geometry) return;

  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: 0x4A9BDB,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.5
  });

  const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMaterial);
  outlineMesh.position.copy(mesh.position);
  outlineMesh.rotation.copy(mesh.rotation);
  outlineMesh.scale.copy(mesh.scale).multiplyScalar(1.05);
  
  if (mesh.parent) {
    mesh.parent.add(outlineMesh);
  } else {
    scene.add(outlineMesh);
  }

  outlineMeshes.set(object, outlineMesh);
}

function removeOutline(object: THREE.Object3D): void {
  const outlineMesh = outlineMeshes.get(object);
  if (outlineMesh) {
    outlineMesh.geometry.dispose();
    (outlineMesh.material as THREE.Material).dispose();
    if (outlineMesh.parent) {
      outlineMesh.parent.remove(outlineMesh);
    } else {
      scene.remove(outlineMesh);
    }
    outlineMeshes.delete(object);
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function updateColumnAnimations(currentTime: number): void {
  for (let i = columnAnimations.length - 1; i >= 0; i--) {
    const anim = columnAnimations[i];
    const elapsed = currentTime - anim.startTime;
    const progress = Math.min(1, elapsed / anim.duration);
    const easedProgress = easeOutCubic(progress);
    
    anim.mesh.position.y = anim.startY + (anim.targetY - anim.startY) * easedProgress;

    if (progress >= 1) {
      columnAnimations.splice(i, 1);
    }
  }
}

function updateHologramEffects(currentTime: number): void {
  for (let i = hologramEffects.length - 1; i >= 0; i--) {
    const effect = hologramEffects[i];
    const elapsed = currentTime - effect.startTime;
    
    effect.mesh.rotation.y += 0.01;
    effect.mesh.position.y += Math.sin(currentTime * 2) * 0.002;

    const material = effect.mesh.material as THREE.MeshBasicMaterial;
    if (elapsed > effect.duration - 1) {
      material.opacity = 0.6 * (1 - (elapsed - (effect.duration - 1)));
    }

    if (elapsed >= effect.duration) {
      effect.mesh.geometry.dispose();
      const mat = effect.mesh.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
      scene.remove(effect.mesh);
      hologramEffects.splice(i, 1);
    }
  }
}

function playClickSound(): void {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      return;
    }
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime);

  gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

function updateWaterColorSync(): void {
  if (allMechanismsActivated) {
    const waterMat = ruins.waterSurface.material as THREE.MeshStandardMaterial;
    waterMat.color.copy(lighting.waterColorCurrent);
  }
}

function updateFPS(delta: number): void {
  fpsCounter++;
  fpsTime += delta;
  if (fpsTime >= 1) {
    fpsElement.textContent = `FPS: ${fpsCounter}`;
    fpsCounter = 0;
    fpsTime = 0;
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  controls.update();
  updateHover();

  updateBubbles(ruins.bubbles, ruins.bubbleData, delta);
  updateSeaweed(ruins.seaweed, ruins.seaweedData, time);
  updateWaterSurface(ruins.waterSurface, time, waveSpeed);
  updateLighting(lighting, time, delta);
  updateWaterColorSync();

  updateColumnAnimations(time);
  updateHologramEffects(time);

  goldenBeamEffects = goldenBeamEffects.filter(effect =>
    updateGoldenBeamParticles(effect, time, delta)
  );

  blueFlameEffects = blueFlameEffects.filter(effect =>
    updateBlueFlameParticles(effect, time, delta)
  );

  updateFPS(delta);

  renderer.render(scene, camera);
}

init();
