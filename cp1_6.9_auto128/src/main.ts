import * as THREE from 'three';
import { createEnvironment, Environment, updateEnvironment, createLabScene, LabScene, triggerGoldBurst } from './environment';
import { createRobot, Robot, updateRobot, tryGrabMineral } from './robot';
import { MineralConfig, createMinerals, Mineral, updateInventoryUI, getInventoryUniqueCount, getInventoryColors, clearInventory } from './minerals';

export type SceneMode = 'ocean' | 'lab';

const MAX_PARTICLES = 1500;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let clock: THREE.Clock;

let mode: SceneMode = 'ocean';
let environment: Environment;
let robot: Robot;
let minerals: Mineral[] = [];
let labScene: LabScene | null = null;

let allParticleCount = 0;

function init() {
  const container = document.getElementById('three-canvas')!;
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);
  
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 12, 18);
  camera.lookAt(0, 2, 0);
  
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);
  
  clock = new THREE.Clock();
  
  environment = createEnvironment(scene);
  robot = createRobot(scene);
  minerals = createMinerals(scene, environment.volcano);
  
  setupInput();
  setupUI();
  
  window.addEventListener('resize', onWindowResize);
  
  updateInventoryUI();
  animate();
}

function setupInput() {
  const keys: Record<string, boolean> = {};
  
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
  });
  
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });
  
  (window as any).__robotKeys = keys;
  
  renderer.domElement.addEventListener('mousedown', (e) => {
    if (e.button === 0 && mode === 'ocean') {
      const grabbed = tryGrabMineral(robot, minerals, camera, renderer);
      if (grabbed) {
        updateInventoryUI();
        checkSynthesizeAvailable();
      }
    }
  });
}

function setupUI() {
  const synthesizeBtn = document.getElementById('synthesize-btn')!;
  synthesizeBtn.addEventListener('click', onSynthesize);
}

function checkSynthesizeAvailable() {
  const btn = document.getElementById('synthesize-btn')!;
  if (getInventoryUniqueCount() >= 5 && mode === 'ocean') {
    btn.classList.add('active');
  }
}

function showNotification(message: string, duration = 3000) {
  const notification = document.getElementById('notification')!;
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, duration);
}

function transitionScene(targetMode: SceneMode, callback: () => void) {
  const overlay = document.getElementById('scene-overlay')!;
  overlay.classList.add('transitioning');
  
  setTimeout(() => {
    callback();
    setTimeout(() => {
      overlay.classList.remove('transitioning');
    }, 150);
  }, 300);
}

function switchToLab() {
  mode = 'lab';
  
  environment.group.visible = false;
  robot.group.visible = false;
  minerals.forEach(m => m.group.visible = false);
  
  document.getElementById('hud-panel')!.style.display = 'none';
  document.getElementById('synthesize-btn')!.classList.remove('active');
  document.querySelector('.controls-hint')!.setAttribute('style', 'display:none');
  
  const collectedColors = getInventoryColors();
  labScene = createLabScene(scene, collectedColors);
}

function switchToOcean() {
  mode = 'ocean';
  
  if (labScene) {
    scene.remove(labScene.group);
    labScene = null;
  }
  
  environment.group.visible = true;
  robot.group.visible = true;
  minerals.forEach(m => m.group.visible = true);
  
  document.getElementById('hud-panel')!.style.display = 'block';
  document.querySelector('.controls-hint')!.removeAttribute('style');
  
  clearInventory();
  minerals = createMinerals(scene, environment.volcano);
  updateInventoryUI();
}

function onSynthesize() {
  if (getInventoryUniqueCount() < 5) return;
  
  transitionScene('lab', () => {
    switchToLab();
    
    setTimeout(() => {
      if (labScene) {
        triggerGoldBurst(scene, labScene.alloy.position);
        showNotification('🎉 合金合成成功！\n发现了珍贵的深海特殊合金！', 3500);
      }
    }, 800);
    
    setTimeout(() => {
      transitionScene('ocean', () => {
        switchToOcean();
      });
    }, 6000);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;
  
  if (mode === 'ocean') {
    updateRobot(robot, delta);
    
    const target = robot.group.position.clone();
    target.y += 2;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, target.x, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, target.y + 10, 0.05);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, target.z + 15, 0.05);
    camera.lookAt(target);
    
    const particlesDelta = updateEnvironment(environment, delta, elapsed, MAX_PARTICLES - allParticleCount);
    allParticleCount = Math.max(0, allParticleCount + particlesDelta);
  } else if (labScene) {
    labScene.alloy.rotation.y += 0.5 * delta;
    labScene.updateParticles(delta);
  }
  
  renderer.render(scene, camera);
}

init();
