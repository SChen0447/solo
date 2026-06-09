import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createKiln,
  createSupports,
  createTestPiece,
  updatePieceFlowAnimation,
  MAX_TEST_PIECES,
  TestPieceData,
  NUM_SUPPORTS,
  PIECE_WIDTH,
  PIECE_HEIGHT,
  lerpColor,
  elasticOut
} from './kiln';
import {
  GlazeRecipe,
  CurvePoint,
  calculateFinalColor,
  createCrackLines
} from './glaze';
import { initUI, setFireButtonEnabled, getCurvePoints } from './ui';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let supportPositions: THREE.Vector3[] = [];
let testPieces: TestPieceData[] = [];
let draggedRecipe: GlazeRecipe | null = null;
let reductionValue = 30;
let isKilnFiring = false;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let fireStartTime = 0;
const FIRE_DURATION = 3000;

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0b0a);
  scene.fog = new THREE.Fog(0x0d0b0a, 8, 20);

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(3.5, 3.2, 5.5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI / 2 + 0.2;
  controls.target.set(0, 1.2, 0);

  setupLighting();
  createKiln(scene);
  supportPositions = createSupports(scene);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  initUI({
    onGlazeDragStart: handleGlazeDragStart,
    onFireKiln: handleFireKiln,
    onReductionChange: handleReductionChange,
    onCurveChange: handleCurveChange
  });

  setupDropListeners(container);

  window.addEventListener('resize', onWindowResize);

  animate();
}

function setupLighting(): void {
  const ambient = new THREE.AmbientLight(0x2a1f14, 0.5);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xfff5e6, 0.8);
  mainLight.position.set(5, 8, 6);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 20;
  mainLight.shadow.camera.left = -5;
  mainLight.shadow.camera.right = 5;
  mainLight.shadow.camera.top = 5;
  mainLight.shadow.camera.bottom = -5;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x5d8a8a, 0.25);
  fillLight.position.set(-4, 3, -3);
  scene.add(fillLight);

  const fireLight = new THREE.PointLight(0xff6633, 0.8, 6, 2);
  fireLight.position.set(0, 0.6, -1.4);
  fireLight.name = 'fireLight';
  scene.add(fireLight);

  const rimLight = new THREE.PointLight(0xc9a96e, 0.3, 8);
  rimLight.position.set(-3, 5, 2);
  scene.add(rimLight);
}

function setupDropListeners(container: HTMLElement): void {
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!draggedRecipe) return;
    if (testPieces.length >= MAX_TEST_PIECES) {
      draggedRecipe = null;
      return;
    }

    const rect = container.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.25);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersect);

    if (intersect) {
      const idx = findNearestFreeSupport(intersect);
      if (idx >= 0) {
        addTestPiece(draggedRecipe, idx);
      }
    }
    draggedRecipe = null;
  });
}

function findNearestFreeSupport(point: THREE.Vector3): number {
  const occupied = new Set(testPieces.map((p) => p.supportIndex));
  let nearest = -1;
  let minDist = Infinity;

  supportPositions.forEach((pos, i) => {
    if (occupied.has(i)) return;
    if (pos.z > 1.2) return;
    const d = point.distanceTo(pos);
    if (d < minDist && d < 1.2) {
      minDist = d;
      nearest = i;
    }
  });

  if (nearest < 0) {
    for (let i = 0; i < NUM_SUPPORTS; i++) {
      if (!occupied.has(i) && supportPositions[i].z <= 1.2) {
        return i;
      }
    }
  }
  return nearest;
}

function handleGlazeDragStart(recipe: GlazeRecipe, _e: DragEvent): void {
  if (testPieces.length >= MAX_TEST_PIECES) return;
  draggedRecipe = recipe;
}

function handleReductionChange(value: number): void {
  reductionValue = value;
}

function handleCurveChange(_points: CurvePoint[]): void {}

function handleFireKiln(): void {
  if (isKilnFiring || testPieces.length === 0) return;

  isKilnFiring = true;
  setFireButtonEnabled(false);
  fireStartTime = performance.now();

  const curve = getCurvePoints();
  testPieces.forEach((piece) => {
    const result = calculateFinalColor(piece.recipe, reductionValue, curve);
    piece.targetColor = result.color;
    piece.finalName = result.name;
    piece.isAnimating = true;
    piece.animationProgress = 0;

    const fireLight = scene.getObjectByName('fireLight') as THREE.PointLight | undefined;
    if (fireLight) {
      fireLight.intensity = 2.0;
    }
  });
}

function addTestPiece(recipe: GlazeRecipe, supportIndex: number): void {
  const pos = supportPositions[supportIndex];
  const piece = createTestPiece(recipe, pos, supportIndex);

  piece.mesh.scale.set(0.01, 0.01, 0.01);
  scene.add(piece.mesh);
  testPieces.push(piece);

  const start = performance.now();
  const DUR = 450;
  const animateIn = () => {
    const t = Math.min(1, (performance.now() - start) / DUR);
    const s = elasticOut(t);
    piece.mesh.scale.set(s, s, s);
    if (t < 1) requestAnimationFrame(animateIn);
  };
  animateIn();
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateLabels(): void {
  testPieces.forEach((piece) => {
    if (!piece.labelElement) return;
    const v = piece.mesh.position.clone();
    v.y += 0.5;
    v.project(camera);
    const x = (v.x + 1) / 2 * window.innerWidth;
    const y = (-v.y + 1) / 2 * window.innerHeight;
    piece.labelElement.style.left = `${x}px`;
    piece.labelElement.style.top = `${y}px`;
    piece.labelElement.style.transform = 'translate(-50%, -100%)';
  });
}

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  controls.update();

  if (isKilnFiring) {
    const now = performance.now();
    const prog = Math.min(1, (now - fireStartTime) / FIRE_DURATION);

    testPieces.forEach((piece) => {
      if (!piece.isAnimating) return;
      piece.animationProgress = prog;

      updatePieceFlowAnimation(piece, elapsed, prog);

      const mat = piece.mesh.material as THREE.MeshStandardMaterial;
      const newColor = lerpColor(piece.initialColor, piece.targetColor, prog);
      mat.color.copy(newColor);

      if (prog > 0.5 && !piece.crackLines) {
        piece.crackLines = createCrackLines(PIECE_WIDTH * 0.9, PIECE_HEIGHT * 0.9, piece.recipe.crackDensity);
        piece.crackLines.position.copy(piece.mesh.position);
        piece.crackLines.visible = false;
        scene.add(piece.crackLines);
      }

      if (piece.crackLines && prog > 0.6) {
        piece.crackLines.visible = true;
        const crackMat = piece.crackLines.material as THREE.LineBasicMaterial;
        crackMat.opacity = Math.min(0.5, (prog - 0.6) * 3) * (0.3 + Math.random() * 0.3);
      }

      if (prog > 0.85 && piece.labelElement && piece.finalName) {
        piece.labelElement.textContent = piece.finalName;
        piece.labelElement.classList.add('visible');
      }
    });

    const fireLight = scene.getObjectByName('fireLight') as THREE.PointLight | undefined;
    if (fireLight) {
      fireLight.intensity = 2.0 - prog * 1.2 + Math.sin(elapsed * 10) * 0.15;
    }

    if (prog >= 1) {
      isKilnFiring = false;
      setFireButtonEnabled(true);
      testPieces.forEach((p) => {
        p.isAnimating = false;
      });
    }
  } else {
    testPieces.forEach((piece) => {
      if (piece.animationProgress > 0) {
        updatePieceFlowAnimation(piece, elapsed, piece.animationProgress * 0.3);
      }
    });
  }

  const fireGlow = scene.getObjectByName('fireGlow') as THREE.Mesh | undefined;
  if (fireGlow) {
    const s = 1 + Math.sin(elapsed * 3) * 0.08;
    fireGlow.scale.set(s, s, s);
  }

  updateLabels();

  renderer.render(scene, camera);
}

init();
