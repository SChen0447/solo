import * as THREE from 'three';
import { Plant } from './Plant';
import { ParticleSystem } from './ParticleSystem';
import gsap from 'gsap';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let plant: Plant;
let particleSystem: ParticleSystem;

let mouseScreenPos = { x: 0, y: 0 };
let mouseNDC = new THREE.Vector2();
let mouseWorldPos = new THREE.Vector3();
let mousePrevWorldPos = new THREE.Vector3();
let mouseSpeed = 0;
let mouseDirection = new THREE.Vector3(0, 1, 0);
let isMouseDown = false;

let lastTime = 0;
let lastMouseMoveTime = 0;

const container = document.getElementById('canvas-container')!;
const cursor = document.getElementById('custom-cursor')!;
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const colorPicker = document.getElementById('color-picker') as HTMLInputElement;
const resetBtn = document.getElementById('reset-btn')!;

function init(): void {
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 0, 400);
  camera.lookAt(0, 0, 0);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const pointLight = new THREE.PointLight(0x88ccff, 1, 800);
  pointLight.position.set(100, 200, 200);
  scene.add(pointLight);
  
  const pointLight2 = new THREE.PointLight(0xcc88ff, 0.8, 600);
  pointLight2.position.set(-100, 100, 150);
  scene.add(pointLight2);
  
  particleSystem = new ParticleSystem(scene);
  
  plant = new Plant(scene, camera, particleSystem);
  
  positionPlant();
  
  setupEventListeners();
  
  animate(0);
}

function positionPlant(): void {
  const plantContainer = plant.getPlantContainer();
  const bottomY = -window.innerHeight / 2 + 80;
  plantContainer.position.y = bottomY + 200;
}

function setupEventListeners(): void {
  window.addEventListener('resize', onWindowResize);
  
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('mouseleave', onMouseLeave);
  renderer.domElement.addEventListener('mouseenter', onMouseEnter);
  
  speedSlider.addEventListener('input', onSpeedChange);
  colorPicker.addEventListener('input', onColorChange);
  resetBtn.addEventListener('click', onReset);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  positionPlant();
}

function updateMouseWorldPosition(clientX: number, clientY: number): void {
  mouseNDC.x = (clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(clientY / window.innerHeight) * 2 + 1;
  
  const vector = new THREE.Vector3(mouseNDC.x, mouseNDC.y, 0.5);
  vector.unproject(camera);
  
  const dir = vector.sub(camera.position).normalize();
  const distance = -camera.position.z / dir.z;
  const pos = camera.position.clone().add(dir.multiplyScalar(distance));
  
  mousePrevWorldPos.copy(mouseWorldPos);
  mouseWorldPos.copy(pos);
}

function calculateMouseSpeed(deltaTime: number): void {
  const distance = mouseWorldPos.distanceTo(mousePrevWorldPos);
  const currentSpeed = distance / Math.max(deltaTime, 0.001) / 100;
  mouseSpeed = currentSpeed;
  
  if (distance > 0.1) {
    mouseDirection.copy(mouseWorldPos).sub(mousePrevWorldPos).normalize();
  }
}

function onMouseMove(event: MouseEvent): void {
  mouseScreenPos.x = event.clientX;
  mouseScreenPos.y = event.clientY;
  
  cursor.style.left = event.clientX + 'px';
  cursor.style.top = event.clientY + 'px';
  
  const currentTime = performance.now();
  const deltaTime = (currentTime - lastMouseMoveTime) / 1000;
  lastMouseMoveTime = currentTime;
  
  updateMouseWorldPosition(event.clientX, event.clientY);
  calculateMouseSpeed(deltaTime);
  
  updateCursorStyle();
  
  if (isMouseDown || mouseSpeed > 0.05) {
    plant.onMouseMove(mouseWorldPos, mouseNDC, mouseSpeed, deltaTime);
  }
}

function onMouseDown(event: MouseEvent): void {
  isMouseDown = true;
  updateMouseWorldPosition(event.clientX, event.clientY);
  plant.onMouseDown(mouseWorldPos, mouseNDC);
}

function onMouseUp(): void {
  isMouseDown = false;
  plant.onMouseUp();
}

function onMouseLeave(): void {
  isMouseDown = false;
  plant.onMouseUp();
  cursor.style.opacity = '0';
}

function onMouseEnter(): void {
  cursor.style.opacity = '1';
}

function updateCursorStyle(): void {
  const speedFactor = Math.min(1, mouseSpeed * 2);
  const size = 12 + speedFactor * 4;
  
  cursor.style.width = size + 'px';
  cursor.style.height = size + 'px';
  
  const hue = 200 + speedFactor * 80;
  const color = `hsla(${hue}, 100%, 75%, 0.5)`;
  cursor.style.backgroundColor = color;
  cursor.style.boxShadow = `0 0 ${20 + speedFactor * 15}px ${5 + speedFactor * 5}px hsla(${hue}, 100%, 75%, ${0.3 + speedFactor * 0.2})`;
}

function onSpeedChange(event: Event): void {
  const value = parseFloat((event.target as HTMLInputElement).value);
  plant.setGrowthSpeed(value);
}

function onColorChange(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  const color = new THREE.Color(value);
  plant.setFlowerColor(color);
  particleSystem.setFlowerColor(color);
}

function onReset(): void {
  plant.reset();
  particleSystem.reset();
}

function animate(time: number): void {
  requestAnimationFrame(animate);
  
  const currentTime = time / 1000;
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  
  plant.update(currentTime, deltaTime);
  
  particleSystem.updateMouse(mouseWorldPos, mouseSpeed, mouseDirection);
  particleSystem.update(deltaTime);
  
  renderer.render(scene, camera);
}

init();
