import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { createTerrain } from './terrain';
import { createAurora } from './aurora';
import { createIceCrystals } from './iceCrystals';
import { createUI, UIConfig } from './ui';

const container = document.getElementById('canvas-container')!;
const loadingEl = document.getElementById('loading')!;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0f24');
scene.fog = new THREE.FogExp2('#0b0f24', 0.0035);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 55, 150);
camera.lookAt(0, 10, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.5;
controls.enablePan = false;
controls.minDistance = 30;
controls.maxDistance = 280;
controls.minPolarAngle = Math.PI * 0.15;
controls.maxPolarAngle = Math.PI * 0.48;
controls.rotateSpeed = 0.6;
controls.zoomSpeed = 0.8;
controls.target.set(0, 8, 0);

const ambientLight = new THREE.AmbientLight(0x4455aa, 0.45);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0xcfe5ff, 0.6);
moonLight.position.set(80, 120, 60);
scene.add(moonLight);

const rimLight = new THREE.DirectionalLight(0x7fff00, 0.15);
rimLight.position.set(-60, 80, -40);
scene.add(rimLight);

const purpleLight = new THREE.PointLight(0xdda0dd, 0.8, 300, 2);
purpleLight.position.set(-40, 90, -60);
scene.add(purpleLight);

const cyanLight = new THREE.PointLight(0x87ceeb, 0.7, 300, 2);
cyanLight.position.set(50, 85, -30);
scene.add(cyanLight);

function createStars(): THREE.Points {
  const count = 2500;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const baseColor = new THREE.Color('#ffffff');
  const tintColors = [
    new THREE.Color('#b0e0ff'),
    new THREE.Color('#fff8dc'),
    new THREE.Color('#e8d0ff'),
    new THREE.Color('#ffffff')
  ];
  for (let i = 0; i < count; i++) {
    const radius = 700 + Math.random() * 400;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1) * 0.55 + 0.05;
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    const tint = tintColors[Math.floor(Math.random() * tintColors.length)];
    const c = baseColor.clone().lerp(tint, Math.random() * 0.6);
    const brightness = 0.5 + Math.random() * 0.5;
    colors[i * 3] = c.r * brightness;
    colors[i * 3 + 1] = c.g * brightness;
    colors[i * 3 + 2] = c.b * brightness;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  return new THREE.Points(geo, mat);
}
const stars = createStars();
scene.add(stars);

const terrain = createTerrain();
scene.add(terrain.mesh);

const aurora = createAurora();
scene.add(aurora.group);

const iceCrystals = createIceCrystals(terrain.getHeightAt);
scene.add(iceCrystals.group);

const reflectionPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshBasicMaterial({
    color: 0x87ceeb,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  })
);
reflectionPlane.rotation.x = -Math.PI / 2;
reflectionPlane.position.y = 0.15;
scene.add(reflectionPlane);

const uiConfig: UIConfig = {
  windDirection: 45,
  brightness: 0.75
};

iceCrystals.setWindDirection(uiConfig.windDirection);

createUI({
  config: uiConfig,
  onWindChange: (deg: number) => {
    iceCrystals.setWindDirection(deg);
  },
  onBrightnessChange: (val: number) => {
    renderer.toneMappingExposure = 0.8 + val * 0.8;
    ambientLight.intensity = 0.3 + val * 0.3;
  }
});

const clock = new THREE.Clock();

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

gsap.to({}, {
  duration: 1.2,
  onComplete: () => {
    if (loadingEl && loadingEl.parentNode) {
      gsap.to(loadingEl, {
        opacity: 0,
        duration: 0.6,
        onComplete: () => loadingEl.remove()
      });
    }
  }
});

const camDistInitial = camera.position.distanceTo(controls.target);

function animate(): void {
  const delta = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  controls.update();

  const camDist = camera.position.distanceTo(controls.target);
  terrain.update(camDist / camDistInitial);

  aurora.update(time, uiConfig.brightness);
  iceCrystals.update(time, delta, uiConfig.windDirection);

  stars.rotation.y = time * 0.003;

  const pulseR = 0.5 + 0.5 * Math.sin(time * 0.8);
  const pulseP = 0.5 + 0.5 * Math.sin(time * 0.6 + 1.2);
  purpleLight.intensity = 0.5 + pulseP * 0.6 * uiConfig.brightness;
  cyanLight.intensity = 0.4 + pulseR * 0.55 * uiConfig.brightness;

  const refMat = reflectionPlane.material as THREE.MeshBasicMaterial;
  const refCol = new THREE.Color();
  refCol.setRGB(
    0.45 * uiConfig.brightness * (0.5 + 0.5 * pulseR),
    0.65 * uiConfig.brightness * (0.5 + 0.5 * pulseP),
    0.95 * uiConfig.brightness
  );
  refMat.color.copy(refCol);
  refMat.opacity = 0.04 + (0.5 + 0.5 * pulseR) * 0.08 * uiConfig.brightness;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
