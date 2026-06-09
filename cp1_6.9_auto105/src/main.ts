import * as THREE from 'three';
import { buildScene } from './sceneBuilder';
import { setupLightBeam, setupFishSchool, setupInteractionPoints, setupIntroAnimation } from './effects';
import { setupUI } from './ui';

export interface AppState {
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  controls: OrbitControlsState;
  beamIntensity: number;
  isAnimatingIntro: boolean;
}

export interface OrbitControlsState {
  radius: number;
  theta: number;
  phi: number;
  targetRadius: number;
  targetTheta: number;
  targetPhi: number;
  center: THREE.Vector3;
  minRadius: number;
  maxRadius: number;
}

function createOrbitControls(): OrbitControlsState {
  return {
    radius: 20,
    theta: Math.PI / 2,
    phi: Math.PI / 3,
    targetRadius: 20,
    targetTheta: Math.PI / 2,
    targetPhi: Math.PI / 3,
    center: new THREE.Vector3(0, 2, 0),
    minRadius: 5,
    maxRadius: 30
  };
}

function updateCameraFromControls(camera: THREE.PerspectiveCamera, controls: OrbitControlsState) {
  const x = controls.center.x + controls.radius * Math.sin(controls.phi) * Math.cos(controls.theta);
  const y = controls.center.y + controls.radius * Math.cos(controls.phi);
  const z = controls.center.z + controls.radius * Math.sin(controls.phi) * Math.sin(controls.theta);
  camera.position.set(x, y, z);
  camera.lookAt(controls.center);
}

function init() {
  const container = document.getElementById('app') as HTMLElement;
  
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x051a2a);
  scene.fog = new THREE.FogExp2(0x051a2a, 0.015);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x446677, 0.6);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0x88ccdd, 0x0a1a2a, 0.5);
  scene.add(hemiLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  const controls = createOrbitControls();
  updateCameraFromControls(camera, controls);

  buildScene(scene);

  const appState: AppState = {
    camera,
    renderer,
    scene,
    controls,
    beamIntensity: 50,
    isAnimatingIntro: true
  };

  const lightBeamAPI = setupLightBeam(scene, camera, appState);
  const fishSchoolAPI = setupFishSchool(scene);
  const interactionAPI = setupInteractionPoints(scene, camera, renderer);
  setupUI(camera, controls, appState, lightBeamAPI);

  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  renderer.domElement.addEventListener('mousedown', (e) => {
    if (appState.isAnimatingIntro) return;
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (appState.isAnimatingIntro) return;
    if (isDragging) {
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      controls.targetTheta -= deltaX * 0.005;
      controls.targetPhi -= deltaY * 0.005;
      controls.targetPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, controls.targetPhi));
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
    
    if (lightBeamAPI) {
      lightBeamAPI.updateMousePosition(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
    }
  });

  renderer.domElement.addEventListener('wheel', (e) => {
    if (appState.isAnimatingIntro) return;
    e.preventDefault();
    controls.targetRadius += e.deltaY * 0.02;
    controls.targetRadius = Math.max(controls.minRadius, Math.min(controls.maxRadius, controls.targetRadius));
  }, { passive: false });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  setupIntroAnimation(appState);

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    const lerpFactor = 0.08;
    controls.radius += (controls.targetRadius - controls.radius) * lerpFactor;
    controls.theta += (controls.targetTheta - controls.theta) * lerpFactor;
    controls.phi += (controls.targetPhi - controls.phi) * lerpFactor;

    updateCameraFromControls(camera, controls);

    if (lightBeamAPI) {
      lightBeamAPI.update(elapsed);
    }
    if (fishSchoolAPI) {
      fishSchoolAPI.update(elapsed, delta);
    }
    if (interactionAPI) {
      interactionAPI.update(elapsed, delta);
    }

    renderer.render(scene, camera);
  }

  animate();
}

init();
