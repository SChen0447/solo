import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateOceanData, type OceanDataset } from './dataGenerator';
import { buildSurface, type ColorMapType, type SurfaceBuilderResult } from './surfaceBuilder';
import { createUIControls, type UIHandlers } from './uiControls';

interface ResetAnimation {
  active: boolean;
  startTime: number;
  duration: number;
  startPos: THREE.Vector3;
  startTarget: THREE.Vector3;
  endPos: THREE.Vector3;
  endTarget: THREE.Vector3;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  const defaultCamPos = new THREE.Vector3(0, 14, 14);
  const defaultCamTarget = new THREE.Vector3(0, 0, 0);
  camera.position.copy(defaultCamPos);
  camera.lookAt(defaultCamTarget);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x6688aa, 0.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x88aacc, 0.3);
  fillLight.position.set(-5, 5, -7);
  scene.add(fillLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 40;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.target.copy(defaultCamTarget);

  const dataset: OceanDataset = generateOceanData(100, 100);
  const surfaceResult: SurfaceBuilderResult = buildSurface(dataset, 'blue-red', 0.85);
  scene.add(surfaceResult.group);

  const resetAnim: ResetAnimation = {
    active: false,
    startTime: 0,
    duration: 500,
    startPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endPos: defaultCamPos.clone(),
    endTarget: defaultCamTarget.clone()
  };

  const uiHandlers: UIHandlers = createUIControls({
    onColorMapChange: (colorMap: ColorMapType) => {
      surfaceResult.updateColors(colorMap);
    },
    onOpacityChange: (opacity: number) => {
      surfaceResult.updateOpacity(opacity);
    },
    onResetView: () => {
      resetAnim.active = true;
      resetAnim.startTime = performance.now();
      resetAnim.startPos.copy(camera.position);
      resetAnim.startTarget.copy(controls.target);
      resetAnim.endPos.copy(defaultCamPos);
      resetAnim.endTarget.copy(defaultCamTarget);
    }
  });

  const raycaster = new THREE.Raycaster();
  const mouseNdc = new THREE.Vector2();
  let lastClickTime = 0;

  renderer.domElement.addEventListener('click', (event: MouseEvent) => {
    const now = performance.now();
    if (now - lastClickTime < 200) return;
    lastClickTime = now;

    const rect = renderer.domElement.getBoundingClientRect();
    mouseNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouseNdc, camera);
    const mesh = surfaceResult.getMesh();
    const intersects = raycaster.intersectObject(mesh);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const point = hit.point;
      const lon = ((point.x + 5) / 10) * 360 - 180;
      const lat = 90 - ((point.y + 5) / 10) * 180;
      const idx = hit.faceIndex !== undefined ? hit.faceIndex : 0;
      const positions = mesh.geometry.attributes.position;
      const vertIdx = positions.index ? positions.index.getX(idx * 3) : idx * 3;
      const ix = vertIdx % dataset.width;
      const iy = Math.floor(vertIdx / dataset.width);
      const pointIdx = iy * dataset.width + ix;
      const value = dataset.points[pointIdx]?.value ?? point.z / 5;
      uiHandlers.showTooltip(event.clientX, event.clientY, lon, lat, value);
    } else {
      uiHandlers.hideTooltip();
    }
  });

  renderer.domElement.addEventListener('mousemove', (event: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouseNdc, camera);
    const mesh = surfaceResult.getMesh();
    const intersects = raycaster.intersectObject(mesh);
    renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
  });

  let frameCount = 0;
  let lastFpsTime = performance.now();
  let currentFps = 0;

  const vertexCount = surfaceResult.getVertexCount();

  function animate(): void {
    requestAnimationFrame(animate);

    const now = performance.now();

    if (resetAnim.active) {
      const t = Math.min(1, (now - resetAnim.startTime) / resetAnim.duration);
      const eased = easeOutCubic(t);
      camera.position.lerpVectors(resetAnim.startPos, resetAnim.endPos, eased);
      controls.target.lerpVectors(resetAnim.startTarget, resetAnim.endTarget, eased);
      if (t >= 1) {
        resetAnim.active = false;
        camera.position.copy(resetAnim.endPos);
        controls.target.copy(resetAnim.endTarget);
      }
    }

    controls.update();

    frameCount++;
    if (now - lastFpsTime >= 500) {
      currentFps = (frameCount * 1000) / (now - lastFpsTime);
      frameCount = 0;
      lastFpsTime = now;
      uiHandlers.updateStats(currentFps, vertexCount);
    }

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

init();
