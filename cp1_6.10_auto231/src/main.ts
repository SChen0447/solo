import * as THREE from 'three';
import { Forest } from './Forest';
import { ParticleSystem } from './ParticleSystem';

const app = document.getElementById('app') as HTMLDivElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x0a1a0a, 0.008);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 5, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x404030, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffe0b0, 0.8);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

const groundGeometry = new THREE.CircleGeometry(18, 64);
const groundMaterial = new THREE.MeshLambertMaterial({
  color: 0x1a2a1a,
  transparent: true,
  opacity: 0.3,
  side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

const forest = new Forest();
scene.add(forest.group);

const particleSystem = new ParticleSystem();
particleSystem.setFoliagePositions(forest.getTreeFoliagePositions());
scene.add(particleSystem.group);

const glowTexture = createGlowTexture();
const glowMaterial = new THREE.SpriteMaterial({
  map: glowTexture,
  color: 0xffe066,
  transparent: true,
  opacity: 0.4,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const mouseGlow = new THREE.Sprite(glowMaterial);
mouseGlow.scale.set(0.6, 0.6, 0.6);
scene.add(mouseGlow);

function createGlowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 224, 102, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 224, 102, 0.6)');
  gradient.addColorStop(0.6, 'rgba(255, 159, 67, 0.2)');
  gradient.addColorStop(1, 'rgba(255, 159, 67, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const mouseNDC = new THREE.Vector2(0, 0);
const mouseWorld = new THREE.Vector3(0, 2, 0);
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycastTarget = new THREE.Vector3();

let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;

let cameraTheta = 0;
let cameraPhi = Math.PI / 3.5;
let cameraRadius = 13;

function updateCameraPosition(): void {
  camera.position.x = cameraRadius * Math.sin(cameraPhi) * Math.sin(cameraTheta);
  camera.position.y = cameraRadius * Math.cos(cameraPhi);
  camera.position.z = cameraRadius * Math.sin(cameraPhi) * Math.cos(cameraTheta);
  camera.lookAt(0, 0, 0);
}

updateCameraPosition();

window.addEventListener('mousemove', (event: MouseEvent) => {
  mouseNDC.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(event.clientY / window.innerHeight) * 2 + 1;

  if (isDragging) {
    const deltaX = event.clientX - previousMouseX;
    const deltaY = event.clientY - previousMouseY;
    cameraTheta -= deltaX * 0.005;
    cameraPhi = Math.max(0.2, Math.min(Math.PI / 2.1, cameraPhi - deltaY * 0.005));
    updateCameraPosition();
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
  }

  previousMouseX = event.clientX;
  previousMouseY = event.clientY;
});

window.addEventListener('mousedown', (event: MouseEvent) => {
  isDragging = true;
  previousMouseX = event.clientX;
  previousMouseY = event.clientY;
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

window.addEventListener('wheel', (event: WheelEvent) => {
  event.preventDefault();
  cameraRadius = Math.max(5, Math.min(25, cameraRadius + event.deltaY * 0.01));
  updateCameraPosition();
}, { passive: false });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let animationStarted = false;
const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  if (animationStarted) {
    raycaster.setFromCamera(mouseNDC, camera);
    raycaster.ray.intersectPlane(groundPlane, raycastTarget);
    if (raycastTarget) {
      mouseWorld.lerp(raycastTarget, 0.15);
      mouseWorld.y = Math.max(0.5, Math.min(4, mouseWorld.y));
    }

    mouseGlow.position.copy(mouseWorld);
    mouseGlow.position.y = Math.max(0.2, mouseGlow.position.y);

    forest.update(mouseWorld);
    particleSystem.update(mouseWorld, deltaTime);
  }

  renderer.render(scene, camera);
}

setTimeout(() => {
  app.classList.add('visible');
  setTimeout(() => {
    animationStarted = true;
  }, 1000);
}, 200);

animate();
