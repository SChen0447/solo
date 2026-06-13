import * as THREE from 'three';
import { gsap } from 'gsap';
import { ParticleSystem } from './particleSystem';
import { LightSculpture } from './lightSculpture';

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.0015);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 0, 300);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);

const container = document.getElementById('canvas-container')!;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

const particleSystem = new ParticleSystem(scene, {
  maxParticles: 3000,
  particleLifetime: 1.5,
  startColor: new THREE.Color(0xFFD700),
  endColor: new THREE.Color(0x00FFFF),
  minSize: 2,
  maxSize: 6
});

const lightSculpture = new LightSculpture(scene, {
  gridCellSize: 30,
  densityThreshold: 8,
  clusterInterval: 0.5,
  shrinkFactor: 0.7
});

let isMouseDown = false;
let canRotate = false;
let isFrozen = false;
let releaseTime = 0;
const freezeDelay = 3.0;

let lastMouseX = 0;

let cameraAngleY = 0;
let cameraTargetAngleY = 0;
const cameraDistance = 300;
const rotationSensitivity = 0.002;
const minAngleY = -Math.PI;
const maxAngleY = Math.PI;

let stars: THREE.Points;

function createStars(): void {
  const starCount = 100;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  
  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    const radius = 500 + Math.random() * 500;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);
    
    const brightness = 0.3 + Math.random() * 0.7;
    colors[i3] = brightness;
    colors[i3 + 1] = brightness;
    colors[i3 + 2] = brightness;
    
    sizes[i] = 1 + Math.random() * 1;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.PointsMaterial({
    size: 1,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true
  });
  
  stars = new THREE.Points(geometry, material);
  scene.add(stars);
}

createStars();

function screenToWorld(clientX: number, clientY: number): THREE.Vector3 {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;
  
  const vector = new THREE.Vector3(x, y, 0.5);
  vector.unproject(camera);
  
  const dir = vector.sub(camera.position).normalize();
  const distance = -camera.position.z / dir.z;
  const pos = camera.position.clone().add(dir.multiplyScalar(distance));
  
  return pos;
}

function onMouseDown(event: MouseEvent): void {
  if (event.button !== 0) return;
  
  if (isFrozen && canRotate) {
    lastMouseX = event.clientX;
  } else {
    isMouseDown = true;
    canRotate = false;
    isFrozen = false;
    releaseTime = 0;
    particleSystem.startDrawing();
    
    const worldPos = screenToWorld(event.clientX, event.clientY);
    particleSystem.emit(worldPos, 5);
  }
}

function onMouseMove(event: MouseEvent): void {
  if (isMouseDown && !isFrozen) {
    const worldPos = screenToWorld(event.clientX, event.clientY);
    particleSystem.emit(worldPos, 2);
  }
  
  if (isFrozen && canRotate && event.buttons === 1) {
    const deltaX = event.clientX - lastMouseX;
    cameraTargetAngleY += deltaX * rotationSensitivity;
    cameraTargetAngleY = Math.max(minAngleY, Math.min(maxAngleY, cameraTargetAngleY));
    lastMouseX = event.clientX;
  }
}

function onMouseUp(event: MouseEvent): void {
  if (event.button !== 0) return;
  
  if (isMouseDown) {
    isMouseDown = false;
    particleSystem.stopDrawing();
    releaseTime = performance.now() / 1000;
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.code === 'Space') {
    event.preventDefault();
    resetAll();
  }
}

function resetAll(): void {
  particleSystem.explodeAll();
  
  gsap.delayedCall(0.5, () => {
    particleSystem.reset();
    isFrozen = false;
    canRotate = false;
    isMouseDown = false;
    releaseTime = 0;
  });
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);
window.addEventListener('keydown', onKeyDown);
window.addEventListener('resize', onWindowResize);

const clock = new THREE.Clock();
let elapsedTime = 0;

function animate(): void {
  requestAnimationFrame(animate);
  
  const deltaTime = Math.min(clock.getDelta(), 0.1);
  elapsedTime += deltaTime;
  
  const currentTime = performance.now() / 1000;
  
  if (!isMouseDown && releaseTime > 0 && !isFrozen) {
    const timeSinceRelease = currentTime - releaseTime;
    if (timeSinceRelease >= freezeDelay) {
      isFrozen = true;
      canRotate = true;
    }
  }
  
  if (!isFrozen) {
    particleSystem.update(deltaTime);
    
    const particles = particleSystem.getParticles();
    lightSculpture.update(particles, elapsedTime, deltaTime);
    
    const clusterColors = lightSculpture.getClusterColors();
    particleSystem.applyClusterColors(clusterColors);
  }
  
  cameraAngleY += (cameraTargetAngleY - cameraAngleY) * 0.1;
  
  if (Math.abs(cameraAngleY) > 0.001 || !canRotate) {
    camera.position.x = Math.sin(cameraAngleY) * cameraDistance;
    camera.position.z = Math.cos(cameraAngleY) * cameraDistance;
    camera.lookAt(0, 0, 0);
    
    if (stars) {
      stars.rotation.y += deltaTime * 0.02;
      const starColors = stars.geometry.attributes.color as THREE.BufferAttribute;
      for (let i = 0; i < starColors.count; i++) {
        const flicker = 0.8 + Math.sin(elapsedTime * 2 + i * 0.5) * 0.2;
        starColors.setX(i, flicker * 0.6);
        starColors.setY(i, flicker * 0.6);
        starColors.setZ(i, flicker * 0.7);
      }
      starColors.needsUpdate = true;
    }
  }
  
  renderer.render(scene, camera);
}

animate();

export { scene, camera, renderer, particleSystem, lightSculpture };
