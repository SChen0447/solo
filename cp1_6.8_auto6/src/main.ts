import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MoleculeData } from './molecule.types';
import { buildMolecule, setMoleculeOpacity, setWireframeMode } from './moleculeBuilder';

const MOLECULES: Record<string, MoleculeData> = {
  C4H8: {
    name: 'C4H8',
    formula: 'C₄H₈',
    atoms: [
      { id: 'C1', element: 'C', position: { x: -1.5, y: 0, z: 0 } },
      { id: 'C2', element: 'C', position: { x: -0.5, y: 0, z: 0 } },
      { id: 'C3', element: 'C', position: { x: 0.5, y: 0, z: 0 } },
      { id: 'C4', element: 'C', position: { x: 1.5, y: 0, z: 0 } },
      { id: 'H1', element: 'H', position: { x: -2.0, y: 0.9, z: 0 } },
      { id: 'H2', element: 'H', position: { x: -2.0, y: -0.9, z: 0 } },
      { id: 'H3', element: 'H', position: { x: -0.5, y: 1.0, z: 0 } },
      { id: 'H4', element: 'H', position: { x: 0.5, y: -1.0, z: 0 } },
      { id: 'H5', element: 'H', position: { x: 1.5, y: 0.9, z: 0.5 } },
      { id: 'H6', element: 'H', position: { x: 1.5, y: 0.9, z: -0.5 } },
      { id: 'H7', element: 'H', position: { x: 1.5, y: -0.9, z: 0.5 } },
      { id: 'H8', element: 'H', position: { x: 1.5, y: -0.9, z: -0.5 } }
    ],
    bonds: [
      { from: 'C1', to: 'C2', order: 2 },
      { from: 'C2', to: 'C3', order: 1 },
      { from: 'C3', to: 'C4', order: 1 },
      { from: 'C1', to: 'H1', order: 1 },
      { from: 'C1', to: 'H2', order: 1 },
      { from: 'C2', to: 'H3', order: 1 },
      { from: 'C3', to: 'H4', order: 1 },
      { from: 'C4', to: 'H5', order: 1 },
      { from: 'C4', to: 'H6', order: 1 },
      { from: 'C4', to: 'H7', order: 1 },
      { from: 'C4', to: 'H8', order: 1 }
    ]
  },
  C6H6: {
    name: 'C6H6',
    formula: 'C₆H₆',
    atoms: (() => {
      const atoms: Array<{ id: string; element: string; position: { x: number; y: number; z: number } }> = [];
      const cRadius = 1.4;
      const hRadius = 2.5;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        atoms.push({
          id: `C${i + 1}`,
          element: 'C',
          position: { x: Math.cos(angle) * cRadius, y: Math.sin(angle) * cRadius, z: 0 }
        });
      }
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        atoms.push({
          id: `H${i + 1}`,
          element: 'H',
          position: { x: Math.cos(angle) * hRadius, y: Math.sin(angle) * hRadius, z: 0 }
        });
      }
      return atoms;
    })(),
    bonds: [
      { from: 'C1', to: 'C2', order: 2 },
      { from: 'C2', to: 'C3', order: 1 },
      { from: 'C3', to: 'C4', order: 2 },
      { from: 'C4', to: 'C5', order: 1 },
      { from: 'C5', to: 'C6', order: 2 },
      { from: 'C6', to: 'C1', order: 1 },
      { from: 'C1', to: 'H1', order: 1 },
      { from: 'C2', to: 'H2', order: 1 },
      { from: 'C3', to: 'H3', order: 1 },
      { from: 'C4', to: 'H4', order: 1 },
      { from: 'C5', to: 'H5', order: 1 },
      { from: 'C6', to: 'H6', order: 1 }
    ]
  }
};

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let currentMoleculeGroup: THREE.Group | null = null;
let stars: THREE.Points;
let isRotating = true;
let wireframeMode = false;
let currentMoleculeKey = 'C4H8';
let isTransitioning = false;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedAtom: THREE.Mesh | null = null;

const rotationSpeed = (10 * Math.PI) / 180;

let lastTime = performance.now();
let fpsLastTime = performance.now();
let frameCount = 0;
let fps = 0;

const container = document.getElementById('canvas-container')!;
const atomLabel = document.getElementById('atom-label')!;
const atomTypeEl = atomLabel.querySelector('.atom-type')!;
const atomCoordsEl = atomLabel.querySelector('.atom-coords')!;
const fpsEl = document.querySelector('.status-bar .fps')!;
const atomCountEl = document.querySelector('.status-bar .atom-count')!;
const moleculeNameEl = document.querySelector('.status-bar .molecule-name')!;
const moleculeSelect = document.getElementById('molecule-select') as HTMLSelectElement;
const toggleRotationBtn = document.getElementById('toggle-rotation') as HTMLButtonElement;
const wireframeToggle = document.getElementById('wireframe-toggle') as HTMLDivElement;
const clearLabelBtn = document.getElementById('clear-label-btn') as HTMLButtonElement;

init();
animate();

function init(): void {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0e1a, 0.02);

  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 2, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 3;
  controls.maxDistance = 30;

  addLighting();
  addStars();
  loadMolecule('C4H8');
  updateStatusBar();

  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('click', onMouseClick);
  renderer.domElement.addEventListener('mousemove', onMouseMove);

  moleculeSelect.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    switchMolecule(target.value);
  });

  toggleRotationBtn.addEventListener('click', toggleRotation);

  wireframeToggle.addEventListener('click', toggleWireframe);

  clearLabelBtn.addEventListener('click', hideAtomLabel);
}

function addLighting(): void {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
  mainLight.position.set(5, 10, 5);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x88aaff, 0.4);
  fillLight.position.set(-5, -3, -5);
  scene.add(fillLight);
}

function addStars(): void {
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 300;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 100;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    transparent: true,
    opacity: 0.6
  });

  stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

function loadMolecule(key: string): void {
  const data = MOLECULES[key];
  if (!data) return;

  const group = buildMolecule(data);
  scene.add(group);
  currentMoleculeGroup = group;
  currentMoleculeKey = key;

  if (wireframeMode) {
    setWireframeMode(group, true);
  }

  updateStatusBar();
}

function switchMolecule(key: string): void {
  if (isTransitioning || key === currentMoleculeKey) return;
  isTransitioning = true;

  const oldGroup = currentMoleculeGroup;
  const data = MOLECULES[key];
  if (!data) {
    isTransitioning = false;
    return;
  }

  const newGroup = buildMolecule(data);
  setMoleculeOpacity(newGroup, 0);
  scene.add(newGroup);

  if (wireframeMode) {
    setWireframeMode(newGroup, true);
  }

  const duration = 0.8;
  const startTime = performance.now();

  function fadeTick(): void {
    const elapsed = (performance.now() - startTime) / 1000;
    const progress = Math.min(elapsed / duration, 1);

    if (oldGroup) {
      setMoleculeOpacity(oldGroup, 1 - progress);
    }
    setMoleculeOpacity(newGroup, progress);

    if (progress < 1) {
      requestAnimationFrame(fadeTick);
    } else {
      if (oldGroup) {
        scene.remove(oldGroup);
        disposeGroup(oldGroup);
      }
      currentMoleculeGroup = newGroup;
      currentMoleculeKey = key;
      isTransitioning = false;
      updateStatusBar();
    }
  }

  fadeTick();
}

function disposeGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    }
  });
}

function toggleRotation(): void {
  isRotating = !isRotating;
  toggleRotationBtn.textContent = isRotating ? '暂停旋转' : '恢复旋转';
}

function toggleWireframe(): void {
  wireframeMode = !wireframeMode;
  wireframeToggle.classList.toggle('active', wireframeMode);

  if (currentMoleculeGroup) {
    setWireframeMode(currentMoleculeGroup, wireframeMode);
  }
}

function onWindowResize(): void {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function onMouseClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  if (currentMoleculeGroup) {
    const intersects = raycaster.intersectObjects(currentMoleculeGroup.children, true);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData.isAtom) {
        obj = obj.parent;
      }

      if (obj && obj.userData.isAtom) {
        selectedAtom = obj as THREE.Mesh;
        showAtomLabel(selectedAtom.userData.atom);
        updateLabelPosition(event);
      }
    }
  }
}

function onMouseMove(event: MouseEvent): void {
  if (selectedAtom) {
    updateLabelPosition(event);
  }
}

function showAtomLabel(atom: any): void {
  atomTypeEl.textContent = atom.element;
  atomCoordsEl.textContent = `(${atom.position.x.toFixed(2)}, ${atom.position.y.toFixed(2)}, ${atom.position.z.toFixed(2)})`;
  atomLabel.style.display = 'block';
}

function hideAtomLabel(): void {
  selectedAtom = null;
  atomLabel.style.display = 'none';
}

function updateLabelPosition(event: MouseEvent): void {
  const padding = 10;
  const labelRect = atomLabel.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = event.clientX + padding;
  let top = event.clientY + padding;

  if (left + labelRect.width > viewportWidth) {
    left = event.clientX - labelRect.width - padding;
  }
  if (top + labelRect.height > viewportHeight) {
    top = event.clientY - labelRect.height - padding;
  }

  atomLabel.style.left = `${left}px`;
  atomLabel.style.top = `${top}px`;
}

function updateStatusBar(): void {
  const data = MOLECULES[currentMoleculeKey];
  if (data) {
    atomCountEl.textContent = `原子数: ${data.atoms.length}`;
    moleculeNameEl.textContent = `分子: ${data.formula}`;
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  const currentTime = performance.now();
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  frameCount++;
  if (currentTime - fpsLastTime >= 500) {
    fps = Math.round((frameCount * 1000) / (currentTime - fpsLastTime));
    fpsEl.textContent = `FPS: ${fps}`;
    frameCount = 0;
    fpsLastTime = currentTime;
  }

  if (isRotating && currentMoleculeGroup && !isTransitioning) {
    currentMoleculeGroup.rotation.y += rotationSpeed * deltaTime;
  }

  if (stars) {
    stars.rotation.y += 0.0002;
    const positions = stars.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(currentTime * 0.0001 + i) * 0.001;
    }
    stars.geometry.attributes.position.needsUpdate = true;
  }

  controls.update();
  renderer.render(scene, camera);
}
