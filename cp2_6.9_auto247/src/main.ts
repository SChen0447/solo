import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createTopologyGeometry, updateMorphGeometry, MorphParams } from './topology';
import { createControls, ControlValues } from './controls';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let mesh: THREE.Mesh;
let wireframe: THREE.LineSegments;
let gridHelper: THREE.GridHelper;
let geometry: THREE.BufferGeometry;

let isWireframeMode = false;

const morphParams: MorphParams = {
  progress: 0,
  twist: 0,
  subdivision: 32
};

const INITIAL_CAMERA_DISTANCE = 5;
const INITIAL_ELEVATION = 30;

function init(): void {
  const app = document.getElementById('app');
  if (!app) return;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  setCameraToInitial();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0A0E27, 1);
  app.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 3;
  controls.maxDistance = 10;
  controls.enablePan = false;

  addLights();
  createGrid();
  createTopologyMesh();
  setupUI();

  window.addEventListener('resize', onWindowResize);
  animate();
}

function setCameraToInitial(): void {
  const elevationRad = (INITIAL_ELEVATION * Math.PI) / 180;
  const x = 0;
  const y = INITIAL_CAMERA_DISTANCE * Math.sin(elevationRad);
  const z = INITIAL_CAMERA_DISTANCE * Math.cos(elevationRad);
  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);
}

function addLights(): void {
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.9);
  mainLight.position.set(5, 5, 3);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x8888ff, 0.35);
  fillLight.position.set(-3, -2, -4);
  scene.add(fillLight);
}

function createGrid(): void {
  gridHelper = new THREE.GridHelper(10, 10, 0xffffff, 0xffffff);
  const gridMaterial = gridHelper.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.3;
  (gridHelper.material as THREE.Material).color.set(0xffffff);
  scene.add(gridHelper);
}

function createTopologyMesh(): void {
  geometry = createTopologyGeometry(morphParams.subdivision);
  updateMorphGeometry(geometry, morphParams);

  const material = new THREE.MeshStandardMaterial({
    color: 0x4FC3F7,
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const wireGeo = new THREE.WireframeGeometry(geometry);
  const wireMat = new THREE.LineBasicMaterial({
    color: 0x00E5FF,
    transparent: true,
    opacity: 0.6,
    visible: false
  });
  wireframe = new THREE.LineSegments(wireGeo, wireMat);
  scene.add(wireframe);
}

function regenerateMesh(): void {
  scene.remove(mesh);
  scene.remove(wireframe);
  geometry.dispose();

  geometry = createTopologyGeometry(morphParams.subdivision);
  updateMorphGeometry(geometry, morphParams);

  const material = new THREE.MeshStandardMaterial({
    color: 0x4FC3F7,
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  mesh = new THREE.Mesh(geometry, material);
  mesh.visible = !isWireframeMode;
  scene.add(mesh);

  const wireGeo = new THREE.WireframeGeometry(geometry);
  const wireMat = new THREE.LineBasicMaterial({
    color: 0x00E5FF,
    transparent: true,
    opacity: 0.6,
    visible: isWireframeMode
  });
  wireframe = new THREE.LineSegments(wireGeo, wireMat);
  scene.add(wireframe);
}

function setupUI(): void {
  const sliderContainer = document.getElementById('slider-container');
  const buttonContainer = document.getElementById('button-container');
  if (!sliderContainer || !buttonContainer) return;

  const initialValues: ControlValues = {
    progress: morphParams.progress,
    twist: morphParams.twist,
    subdivision: morphParams.subdivision
  };

  const ui = createControls(
    sliderContainer,
    buttonContainer,
    initialValues,
    {
      onProgressChange: (value: number) => {
        morphParams.progress = value;
        updateMorph();
        updateGridOpacity();
      },
      onTwistChange: (value: number) => {
        morphParams.twist = value;
        updateMorph();
      },
      onSubdivisionChange: (value: number) => {
        morphParams.subdivision = Math.round(value);
        regenerateMesh();
      },
      onResetCamera: () => {
        setCameraToInitial();
        controls.target.set(0, 0, 0);
        controls.update();
      },
      onToggleWireframe: () => {
        isWireframeMode = !isWireframeMode;
        mesh.visible = !isWireframeMode;
        (wireframe.material as THREE.LineBasicMaterial).visible = isWireframeMode;
        ui.updateWireframeButton(isWireframeMode);
      }
    }
  );
}

function updateMorph(): void {
  updateMorphGeometry(geometry, morphParams);
  const wireGeo = new THREE.WireframeGeometry(geometry);
  wireframe.geometry.dispose();
  wireframe.geometry = wireGeo;
}

function updateGridOpacity(): void {
  const t = morphParams.progress;
  if (t <= 0.5) {
    (gridHelper.material as THREE.Material).opacity = 0.3;
  } else {
    const opacity = 0.3 * (1 - (t - 0.5) * 2);
    (gridHelper.material as THREE.Material).opacity = Math.max(0, opacity);
  }
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

init();
