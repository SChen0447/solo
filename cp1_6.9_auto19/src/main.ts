import * as THREE from 'three';
import { RobotArm } from './RobotArm';
import { ModuleManager } from './ModuleManager';
import { GameState } from './GameState';

const state = GameState.getInstance();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e1a);
scene.fog = new THREE.Fog(0x0a0e1a, 20, 60);

const container = document.getElementById('canvas-container')!;

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(8, 6, 10);
camera.lookAt(0, 2, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x3a4a6a, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xaac8ff, 0.8);
dirLight.position.set(10, 15, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -15;
dirLight.shadow.camera.right = 15;
dirLight.shadow.camera.top = 15;
dirLight.shadow.camera.bottom = -15;
scene.add(dirLight);

const fillLight = new THREE.PointLight(0x4a8aff, 0.4, 30);
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0xffaa66, 0.3, 25);
rimLight.position.set(-8, 5, 8);
scene.add(rimLight);

function createStationInterior(): void {
  const floorGeo = new THREE.PlaneGeometry(30, 30);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1a2030,
    metalness: 0.6,
    roughness: 0.7,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const floorGrid = new THREE.GridHelper(30, 30, 0x2a3a5a, 0x1a2535);
  (floorGrid.material as THREE.Material).transparent = true;
  (floorGrid.material as THREE.Material).opacity = 0.4;
  scene.add(floorGrid);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x151a28,
    metalness: 0.5,
    roughness: 0.8,
  });

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), wallMat);
  backWall.position.set(0, 6, -15);
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), wallMat);
  leftWall.position.set(-15, 6, 0);
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), wallMat);
  rightWall.position.set(15, 6, 0);
  rightWall.rotation.y = -Math.PI / 2;
  scene.add(rightWall);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), wallMat);
  ceiling.position.set(0, 12, 0);
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x2a3a4a,
    metalness: 0.7,
    roughness: 0.4,
    emissive: 0x1a2a3a,
    emissiveIntensity: 0.2,
  });

  for (let i = -12; i <= 12; i += 6) {
    for (let j = 2; j <= 10; j += 3) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 0.15), panelMat);
      panel.position.set(i, j, -14.9);
      scene.add(panel);

      const panelLight = new THREE.PointLight(0x66aaff, 0.15, 5);
      panelLight.position.set(i, j, -13);
      scene.add(panelLight);
    }
  }

  const beamMat = new THREE.MeshStandardMaterial({
    color: 0x3a4a5a,
    metalness: 0.8,
    roughness: 0.3,
  });

  for (let i = -15; i <= 15; i += 10) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 12, 0.3), beamMat);
    beam.position.set(i, 6, 0);
    scene.add(beam);

    const beamH = new THREE.Mesh(new THREE.BoxGeometry(30, 0.3, 0.3), beamMat);
    beamH.position.set(0, i > -10 && i < 10 ? 6 : 11.8, i);
    scene.add(beamH);
  }
}

createStationInterior();

const robotArm = new RobotArm();
robotArm.group.position.y = 0;
scene.add(robotArm.group);

const moduleManager = new ModuleManager(scene);
moduleManager.setRobotArm(robotArm);

let cameraAngleH = 0.5;
let cameraAngleV = 0.4;
let cameraDistance = 8;
let isRightMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;
let screenShake = 0;
let lastClickTime = 0;

const clock = new THREE.Clock();
let lastCollisionCheck = 0;

const uiElements = {
  targetName: document.getElementById('target-name')!,
  targetColor: document.getElementById('target-color')!,
  installedCount: document.getElementById('installed-count')!,
  currentScore: document.getElementById('current-score')!,
  totalTime: document.getElementById('total-time')!,
  collisionCount: document.getElementById('collision-count')!,
  angleBase: document.getElementById('angle-base')!,
  angleShoulder: document.getElementById('angle-shoulder')!,
  angleElbow: document.getElementById('angle-elbow')!,
  angleWrist: document.getElementById('angle-wrist')!,
  sliderBase: document.getElementById('slider-base') as HTMLInputElement,
  sliderShoulder: document.getElementById('slider-shoulder') as HTMLInputElement,
  sliderElbow: document.getElementById('slider-elbow') as HTMLInputElement,
  sliderWrist: document.getElementById('slider-wrist') as HTMLInputElement,
  gameOverPanel: document.getElementById('game-over-panel')!,
  finalGrade: document.getElementById('final-grade')!,
  finalScore: document.getElementById('final-score')!,
  finalTime: document.getElementById('final-time')!,
  finalInstalled: document.getElementById('final-installed')!,
  finalCollisions: document.getElementById('final-collisions')!,
  restartBtn: document.getElementById('restart-btn')!,
  disturbanceWarning: document.getElementById('disturbance-warning')!,
};

function updateUI(): void {
  const target = state.getCurrentTarget();
  if (target) {
    uiElements.targetName.textContent = target.colorName;
    uiElements.targetColor.style.background = '#' + target.color.toString(16).padStart(6, '0');
    uiElements.targetColor.style.color = '#' + target.color.toString(16).padStart(6, '0');
  } else {
    uiElements.targetName.textContent = '全部完成';
    uiElements.targetColor.style.background = 'transparent';
  }

  uiElements.installedCount.textContent = `${state.getInstalledCount()} / ${state.modules.length}`;
  uiElements.currentScore.textContent = state.totalScore.toString();
  const elapsed = state.phase === 'playing'
    ? (performance.now() - state.startTime) / 1000
    : state.totalElapsed;
  uiElements.totalTime.textContent = state.formatTime(elapsed);
  uiElements.collisionCount.textContent = state.collisionCount.toString();

  const angles = robotArm.getAngles();
  uiElements.angleBase.textContent = ((angles.base * 180) / Math.PI).toFixed(1) + '°';
  uiElements.angleShoulder.textContent = ((angles.shoulder * 180) / Math.PI).toFixed(1) + '°';
  uiElements.angleElbow.textContent = ((angles.elbow * 180) / Math.PI).toFixed(1) + '°';
  uiElements.angleWrist.textContent = ((angles.wrist * 180) / Math.PI).toFixed(1) + '°';

  uiElements.sliderBase.value = ((angles.base * 180) / Math.PI).toString();
  uiElements.sliderShoulder.value = ((angles.shoulder * 180) / Math.PI).toString();
  uiElements.sliderElbow.value = ((angles.elbow * 180) / Math.PI).toString();
  uiElements.sliderWrist.value = ((angles.wrist * 180) / Math.PI).toString();

  if (state.phase === 'finished') {
    uiElements.gameOverPanel.classList.add('show');
    const grade = state.getGrade();
    uiElements.finalGrade.textContent = grade;
    uiElements.finalGrade.className = 'grade-display grade-' + grade;
    uiElements.finalScore.textContent = state.totalScore.toString();
    uiElements.finalTime.textContent = state.formatTime(state.totalElapsed);
    uiElements.finalInstalled.textContent = state.getInstalledCount().toString();
    uiElements.finalCollisions.textContent = state.collisionCount.toString();
  }
}

state.onStateChange = updateUI;

window.addEventListener('keydown', (e) => {
  if (state.phase !== 'playing') return;
  robotArm.setKeyState(e.key, true);

  if (e.code === 'Space') {
    e.preventDefault();
    const gripperPos = robotArm.getGripperWorldPosition();
    if (robotArm.getGripping()) {
      moduleManager.release();
      robotArm.setGripping(false);
    } else {
      if (moduleManager.tryGrab(gripperPos)) {
        robotArm.setGripping(true);
      }
    }
  }
});

window.addEventListener('keyup', (e) => {
  robotArm.setKeyState(e.key, false);
});

uiElements.sliderBase.addEventListener('input', (e) => {
  robotArm.setJointAngle('base', parseFloat((e.target as HTMLInputElement).value));
});
uiElements.sliderShoulder.addEventListener('input', (e) => {
  robotArm.setJointAngle('shoulder', parseFloat((e.target as HTMLInputElement).value));
});
uiElements.sliderElbow.addEventListener('input', (e) => {
  robotArm.setJointAngle('elbow', parseFloat((e.target as HTMLInputElement).value));
});
uiElements.sliderWrist.addEventListener('input', (e) => {
  robotArm.setJointAngle('wrist', parseFloat((e.target as HTMLInputElement).value));
});

renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button === 2) {
    isRightMouseDown = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }

  if (e.button === 0 && state.phase === 'playing') {
    const now = performance.now();
    if (now - lastClickTime < 400) {
      const gripperPos = robotArm.getGripperWorldPosition();
      if (moduleManager.tryInstall(gripperPos)) {
        robotArm.setGripping(false);
      }
    }
    lastClickTime = now;
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 2) {
    isRightMouseDown = false;
  }
});

window.addEventListener('mousemove', (e) => {
  if (isRightMouseDown) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    cameraAngleH -= dx * 0.005;
    cameraAngleV = Math.max(0.1, Math.min(1.4, cameraAngleV - dy * 0.005));
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

renderer.domElement.addEventListener('wheel', (e) => {
  cameraDistance = Math.max(4, Math.min(15, cameraDistance + e.deltaY * 0.01));
});

uiElements.restartBtn.addEventListener('click', () => {
  uiElements.gameOverPanel.classList.remove('show');
  state.reset();
  GameState.getInstance().startGame();
  moduleManager.reset();
  moduleManager.setRobotArm(robotArm);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateCamera(): void {
  const target = robotArm.getEndEffectorWorldPosition();
  const camX = target.x + Math.sin(cameraAngleH) * Math.cos(cameraAngleV) * cameraDistance;
  const camY = target.y + Math.sin(cameraAngleV) * cameraDistance;
  const camZ = target.z + Math.cos(cameraAngleH) * Math.cos(cameraAngleV) * cameraDistance;

  let shakeX = 0, shakeY = 0, shakeZ = 0;
  if (screenShake > 0) {
    shakeX = (Math.random() - 0.5) * screenShake * 0.3;
    shakeY = (Math.random() - 0.5) * screenShake * 0.2;
    shakeZ = (Math.random() - 0.5) * screenShake * 0.3;
    screenShake *= 0.9;
    if (screenShake < 0.01) screenShake = 0;
  }

  camera.position.lerp(new THREE.Vector3(camX + shakeX, camY + shakeY, camZ + shakeZ), 0.08);
  camera.lookAt(target.x + shakeX, target.y + shakeY, target.z + shakeZ);
}

function animate(): void {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);
  const time = clock.getElapsedTime();
  const now = performance.now();

  if (state.phase === 'playing') {
    if (state.checkDisturbance(now)) {
      screenShake = 2;
      uiElements.disturbanceWarning.classList.add('show');
    }
    if (!state.disturbanceActive) {
      uiElements.disturbanceWarning.classList.remove('show');
    } else {
      screenShake = Math.max(screenShake, 0.5);
    }
  }

  if (state.phase === 'playing' || state.phase === 'idle') {
    robotArm.update(delta);
  }

  const gripperPos = robotArm.getGripperWorldPosition();
  moduleManager.update(delta, time, gripperPos, state.disturbanceActive);

  const nearestMod = moduleManager.getNearestModule(gripperPos);
  if (nearestMod && state.phase === 'playing') {
    robotArm.updateLaser(nearestMod.mesh.position);
  } else {
    robotArm.updateLaser(null);
  }

  if (state.phase === 'playing') {
    lastCollisionCheck += delta;
    if (lastCollisionCheck > 0.2) {
      lastCollisionCheck = 0;
      const armSegments: THREE.Object3D[] = [
        robotArm.shoulder,
        robotArm.elbow,
        robotArm.wrist,
        robotArm.endEffector,
      ];
      const collisions = moduleManager.checkCollisions(armSegments);
      if (collisions > 0) {
        state.recordCollision();
      }
    }
  }

  updateCamera();
  updateUI();
  renderer.render(scene, camera);
}

state.startGame();
animate();
