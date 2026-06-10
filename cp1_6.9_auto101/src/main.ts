import * as THREE from 'three';
import { generateTree, TreeResult } from './tree';
import { setupInteraction, InteractionState } from './interaction';
import { updateParticles, initParticles } from './particles';
import { createStrings, updateStrings, StringData } from './strings';

export const globalState = {
  activeOrbs: 8,
  maxOrbs: 8,
  collisionCount: 0,
  noteSequence: [] as string[],
  maxNoteSequence: 6,
  awakeSpots: [] as THREE.Mesh[],
  constellationActive: false,
  bgTransition: 0,
  infoSphere: null as THREE.Mesh | null,
  infoCanvas: null as HTMLCanvasElement | null,
  infoTexture: null as THREE.CanvasTexture | null,
  infoRotationSpeed: 0.2,
  infoLookedAt: false,
  BASE_WIDTH: 1920,
  scaleFactor: 1
};

const ORB_COLORS = [
  0xff2233, 0xff8800, 0xffdd00, 0x44ff44,
  0x33ddff, 0x8866ff, 0xff44aa, 0xffaa88
];

export const ORB_COLOR_PALETTE = ORB_COLORS;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let treeResult: TreeResult;
let stringData: StringData;
let interactionState: InteractionState;
let clock: THREE.Clock;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function init() {
  const container = document.getElementById('app');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a2a);
  scene.fog = new THREE.FogExp2(0x0a0a2a, 0.02);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 10);
  camera.lookAt(0, 3, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0x88aaff, 1.5, 30);
  pointLight1.position.set(5, 8, 5);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0xff88cc, 1.2, 25);
  pointLight2.position.set(-5, 5, -5);
  scene.add(pointLight2);

  globalState.scaleFactor = Math.min(window.innerWidth / globalState.BASE_WIDTH, 1.5);

  treeResult = generateTree(scene);
  stringData = createStrings(scene);
  initParticles(scene);
  createInfoSphere();

  interactionState = setupInteraction(camera, renderer, treeResult.orbGroup, stringData);

  clock = new THREE.Clock();

  window.addEventListener('resize', onWindowResize);
  animate();
}

function createInfoSphere() {
  const geometry = new THREE.SphereGeometry(0.3, 32, 32);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.4
  });

  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(0, 5.5, 0);
  scene.add(sphere);

  globalState.infoSphere = sphere;
  globalState.infoCanvas = canvas;
  globalState.infoTexture = texture;

  updateInfoSphere();
}

export function updateInfoSphere() {
  if (!globalState.infoCanvas || !globalState.infoTexture) return;
  const canvas = globalState.infoCanvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, 'rgba(136, 170, 255, 0.6)');
  gradient.addColorStop(1, 'rgba(255, 136, 204, 0.6)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(256, 256, 250, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = 'bold 36px Microsoft YaHei, PingFang SC';
  ctx.textAlign = 'center';
  ctx.fillText(`光球: ${globalState.activeOrbs}/${globalState.maxOrbs}`, 256, 140);

  const collisionColors = ['#ff2233', '#ff8800', '#ffdd00', '#44ff44', '#33ddff', '#8866ff'];
  const countStr = globalState.collisionCount.toString();
  ctx.font = 'bold 56px Arial';
  for (let i = 0; i < countStr.length; i++) {
    ctx.fillStyle = collisionColors[i % collisionColors.length];
    ctx.fillText(countStr[i], 180 + i * 40, 230);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '24px Microsoft YaHei';
  ctx.fillText('最近音符', 256, 300);

  const noteBlockWidth = 60;
  const noteBlockHeight = 40;
  const totalWidth = globalState.noteSequence.length * noteBlockWidth;
  const startX = 256 - totalWidth / 2;

  for (let i = 0; i < globalState.noteSequence.length; i++) {
    const note = globalState.noteSequence[i];
    const colorIndex = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'].indexOf(note);
    const colors = ['#ff3366', '#ff8833', '#ffcc44', '#44ff88', '#33ddff', '#3366ff', '#aa66ff'];
    const color = colorIndex >= 0 ? colors[colorIndex] : '#ffffff';

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(startX + i * noteBlockWidth, 330, noteBlockWidth - 6, noteBlockHeight);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(note, startX + i * noteBlockWidth + (noteBlockWidth - 6) / 2, 360);
  }

  globalState.infoTexture.needsUpdate = true;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  globalState.scaleFactor = Math.min(window.innerWidth / globalState.BASE_WIDTH, 1.5);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (treeResult) {
    treeResult.orbs.forEach((orb, index) => {
      const pulse = 0.05 * Math.sin(elapsed * 2 + index * 0.8);
      orb.scale.setScalar(1 + pulse);
    });
  }

  if (globalState.infoSphere) {
    const speed = globalState.infoLookedAt ? 0.5 : 0.2;
    globalState.infoSphere.rotation.y += speed * delta;
  }

  if (globalState.bgTransition > 0) {
    globalState.bgTransition = Math.max(0, globalState.bgTransition - delta * 0.1);
    const t = 1 - globalState.bgTransition;
    const startColor = new THREE.Color(0x0a0a2a);
    const endColor = new THREE.Color(0x1a0a2a);
    const bgColor = startColor.clone().lerp(endColor, t);
    scene.background = bgColor;
  }

  updateParticles(delta, elapsed);
  updateStrings(delta, elapsed);
  updateAwakeSpots(delta, elapsed);

  renderer.render(scene, camera);
}

function updateAwakeSpots(delta: number, elapsed: number) {
  const spots = globalState.awakeSpots;
  for (let i = spots.length - 1; i >= 0; i--) {
    const spot = spots[i];
    const userData = spot.userData as {
      basePosition: THREE.Vector3;
      life: number;
      maxLife: number;
      floating: boolean;
      constellation: boolean;
      constellationTarget?: THREE.Vector3;
      startTime: number;
    };

    userData.life -= delta;

    const blink = 0.5 + 0.5 * Math.sin(elapsed * Math.PI * 4);
    (spot.material as THREE.MeshBasicMaterial).opacity = 0.3 + blink * 0.5;

    if (userData.floating && !userData.constellation) {
      spot.position.y += (0.2 + Math.random() * 0.1) * delta;
    }

    if (userData.constellation && userData.constellationTarget) {
      const t = Math.min(1, (elapsed - userData.startTime) / 1.0);
      const eased = easeOutCubic(t);
      spot.position.lerpVectors(userData.basePosition, userData.constellationTarget, eased);
    }

    if (userData.life <= 0) {
      scene.remove(spot);
      spots.splice(i, 1);
    }
  }
}

export function addNoteToSequence(note: string) {
  globalState.noteSequence.push(note);
  if (globalState.noteSequence.length > globalState.maxNoteSequence) {
    globalState.noteSequence.shift();
  }
  updateInfoSphere();
}

export function incrementCollisionCount() {
  globalState.collisionCount++;
  updateInfoSphere();
}

init();

export { scene, camera, treeResult };
