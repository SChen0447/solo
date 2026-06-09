import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { StarNetwork } from './starNetwork';
import { UIManager } from './ui';

const appContainer = document.getElementById('app')!;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let composer: EffectComposer;
let bloomPass: UnrealBloomPass;
let network: StarNetwork;
let uiManager: UIManager;
let starField: THREE.Points;
let referenceSphere: THREE.LineSegments;

const clock = new THREE.Clock();
const starCount = 500;

interface StarData {
  baseOpacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  size: number;
}

const starDataArray: StarData[] = [];

function init() {
  initScene();
  initCamera();
  initRenderer();
  initControls();
  initPostProcessing();
  initBackground();
  initStarField();
  initReferenceSphere();
  initNetwork();
  initUI();
  handleResize();
  window.addEventListener('resize', handleResize);
  animate();
}

function initScene() {
  scene = new THREE.Scene();
}

function initCamera() {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
}

function initRenderer() {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x070515, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  appContainer.appendChild(renderer.domElement);
}

function initControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 20;
  controls.target.set(0, 0, 0);
  controls.update();
}

function initPostProcessing() {
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0,
    0.5,
    0.6
  );
  composer.addPass(bloomPass);
}

function initBackground() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(
    256, 256, 0,
    256, 256, 362
  );
  gradient.addColorStop(0, '#120a1f');
  gradient.addColorStop(1, '#070515');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  scene.background = texture;
}

function initStarField() {
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const radius = 15 + Math.random() * 30;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    const brightness = 0.5 + Math.random() * 0.5;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness;

    const size = 1 + Math.random() * 2;
    sizes[i] = size;

    starDataArray.push({
      baseOpacity: 0.3 + Math.random() * 0.5,
      twinkleSpeed: 0.5 + Math.random() * 1.5,
      twinkleOffset: Math.random() * Math.PI * 2,
      size
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: `
      attribute float aSize;
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uTime;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * (300.0 / -mvPosition.z);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        gl_FragColor = vec4(vColor, alpha * 0.8);
      }
    `,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  starField = new THREE.Points(geometry, material);
  scene.add(starField);
}

function initReferenceSphere() {
  const geometry = new THREE.SphereGeometry(4, 16, 12);
  const wireframeGeometry = new THREE.WireframeGeometry(geometry);

  const material = new THREE.LineBasicMaterial({
    color: 0x3355aa,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  referenceSphere = new THREE.LineSegments(wireframeGeometry, material);
  scene.add(referenceSphere);
}

function initNetwork() {
  network = new StarNetwork(scene);
}

function initUI() {
  uiManager = new UIManager(
    appContainer,
    network,
    camera,
    renderer
  );
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.1);
  const elapsedTime = clock.getElapsedTime();

  controls.update();
  referenceSphere.rotation.y += deltaTime * 0.05;
  referenceSphere.rotation.x += deltaTime * 0.02;

  (starField.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime;
  updateStarTwinkling(elapsedTime);

  network.update(deltaTime);
  uiManager.update();

  bloomPass.strength = network.getBloomIntensity();

  composer.render();
}

function updateStarTwinkling(time: number) {
  const colors = starField.geometry.attributes.color as THREE.BufferAttribute;

  for (let i = 0; i < starCount; i++) {
    const data = starDataArray[i];
    const twinkle = 0.5 + 0.5 * Math.sin(time * data.twinkleSpeed + data.twinkleOffset);
    const brightness = data.baseOpacity * (0.6 + 0.4 * twinkle);

    colors.array[i * 3] = brightness;
    colors.array[i * 3 + 1] = brightness;
    colors.array[i * 3 + 2] = brightness;
  }
  colors.needsUpdate = true;
}

init();
