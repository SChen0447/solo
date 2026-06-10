import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createTerrain } from './terrain';
import { TreeVegetation, BushVegetation, RockVegetation } from './vegetation';
import { createControls } from './controls';
import { createStats } from './stats';

const app = document.getElementById('app')!;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1a1a2e');
scene.fog = new THREE.Fog('#1a1a2e', 20, 50);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.15;
controls.minDistance = 5;
controls.maxDistance = 40;
controls.target.set(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
scene.add(directionalLight);

const { terrain, grid } = createTerrain(Date.now());
scene.add(terrain);
scene.add(grid);

const trees = new TreeVegetation(terrain);
const bushes = new BushVegetation(terrain);
const rocks = new RockVegetation(terrain);
scene.add(trees.group);
scene.add(bushes.group);
scene.add(rocks.group);

const stats = createStats(app, renderer);

let lastWarningTime = 0;

const handleExport = () => {
  const originalSize = renderer.getSize(new THREE.Vector2());
  const originalPixelRatio = renderer.getPixelRatio();

  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.render(scene, camera);

  const dataURL = renderer.domElement.toDataURL('image/png');

  renderer.setSize(originalSize.x, originalSize.y, false);
  renderer.setPixelRatio(originalPixelRatio);

  const link = document.createElement('a');
  link.download = `terrain-${Date.now()}.png`;
  link.href = dataURL;
  link.click();
};

const uiControls = createControls(app, trees, bushes, rocks, handleExport);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  trees.update();
  bushes.update();
  rocks.update();

  stats.update();

  const currentFps = stats.getFps();
  const now = performance.now();
  if (currentFps < 24 && now - lastWarningTime > 5000) {
    uiControls.showFpsWarning();
    lastWarningTime = now;
  }

  renderer.render(scene, camera);
}

animate();
