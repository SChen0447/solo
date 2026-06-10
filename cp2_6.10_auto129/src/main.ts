import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ControlPointManager } from './controlPoints';
import {
  computeBezierSurface,
  catmullClarkSubdivide,
  exportToOBJ
} from './bezierSurface';

type SurfaceMode = 'bezier' | 'catmull-clark';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let controlPointManager: ControlPointManager;

let surfaceMesh: THREE.Mesh;
let wireframeMesh: THREE.LineSegments;
let surfaceMaterial: THREE.MeshPhongMaterial;

let bezierResolution = 32;
let subdivisionIterations = 2;
let currentMode: SurfaceMode = 'bezier';

let vertexCountLabel: HTMLElement;

function init(): void {
  const container = document.getElementById('app')!;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(6, 6, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.minDistance = 3;
  controls.maxDistance = 25;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
  dirLight2.position.set(-5, -3, -5);
  scene.add(dirLight2);

  const gridHelper = new THREE.GridHelper(12, 12, 0x333333, 0x222222);
  gridHelper.position.y = -3.01;
  scene.add(gridHelper);

  controlPointManager = new ControlPointManager(scene, camera, renderer, controls);
  controlPointManager.setOnChangeCallback(() => updateSurface());

  initSurface();
  createUIPanel();
  updateSurface();

  window.addEventListener('resize', onWindowResize);
  animate();
}

function initSurface(): void {
  surfaceMaterial = new THREE.MeshPhongMaterial({
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    vertexColors: true,
    shininess: 50,
    specular: 0x222222
  });

  const tempGeo = new THREE.PlaneGeometry(1, 1);
  surfaceMesh = new THREE.Mesh(tempGeo, surfaceMaterial);
  surfaceMesh.visible = false;
  scene.add(surfaceMesh);

  const wireframeMaterial = new THREE.LineBasicMaterial({
    color: 0xaaaaaa,
    transparent: true,
    opacity: 0.35
  });
  wireframeMesh = new THREE.LineSegments(new THREE.WireframeGeometry(tempGeo), wireframeMaterial);
  wireframeMesh.visible = false;
  scene.add(wireframeMesh);
}

function updateSurface(): void {
  const controlPoints = controlPointManager.getControlPoints();

  let geometry: THREE.BufferGeometry;

  if (currentMode === 'bezier') {
    geometry = computeBezierSurface(controlPoints, bezierResolution);
  } else {
    const baseGeometry = computeBezierSurface(controlPoints, 4);
    geometry = catmullClarkSubdivide(baseGeometry, subdivisionIterations);
  }

  if (surfaceMesh.geometry) {
    surfaceMesh.geometry.dispose();
  }
  surfaceMesh.geometry = geometry;
  surfaceMesh.visible = true;

  if (wireframeMesh.geometry) {
    wireframeMesh.geometry.dispose();
  }
  wireframeMesh.geometry = new THREE.WireframeGeometry(geometry);
  wireframeMesh.visible = true;

  if (vertexCountLabel) {
    const count = geometry.attributes.position.count;
    vertexCountLabel.textContent = `顶点数: ${count}`;
  }
}

function createUIPanel(): void {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(30, 30, 30, 0.85);
    backdrop-filter: blur(8px);
    border-radius: 10px;
    padding: 18px;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    min-width: 240px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.08);
    z-index: 1000;
    user-select: none;
  `;

  const title = document.createElement('div');
  title.textContent = '控制面板';
  title.style.cssText = 'font-size: 15px; font-weight: 600; margin-bottom: 14px; color: #58a6ff; letter-spacing: 0.5px;';
  panel.appendChild(title);

  const btnStyle = `
    background: rgba(88, 166, 255, 0.15);
    border: 1px solid rgba(88, 166, 255, 0.3);
    color: #ffffff;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    width: 100%;
    margin-bottom: 8px;
    font-family: inherit;
  `;

  const resetBtn = document.createElement('button');
  resetBtn.textContent = '重置控制点';
  resetBtn.style.cssText = btnStyle;
  resetBtn.onmouseover = () => { resetBtn.style.background = 'rgba(88, 166, 255, 0.3)'; };
  resetBtn.onmouseout = () => { resetBtn.style.background = 'rgba(88, 166, 255, 0.15)'; };
  resetBtn.onclick = () => controlPointManager.reset();
  panel.appendChild(resetBtn);

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = '切换模式: 贝塞尔曲面';
  toggleBtn.style.cssText = btnStyle;
  toggleBtn.onmouseover = () => { toggleBtn.style.background = 'rgba(88, 166, 255, 0.3)'; };
  toggleBtn.onmouseout = () => { toggleBtn.style.background = 'rgba(88, 166, 255, 0.15)'; };
  toggleBtn.onclick = () => {
    currentMode = currentMode === 'bezier' ? 'catmull-clark' : 'bezier';
    toggleBtn.textContent = `切换模式: ${currentMode === 'bezier' ? '贝塞尔曲面' : 'Catmull-Clark细分'}`;
    updateSurface();
  };
  panel.appendChild(toggleBtn);

  const exportBtn = document.createElement('button');
  exportBtn.textContent = '导出为 OBJ';
  exportBtn.style.cssText = btnStyle;
  exportBtn.onmouseover = () => { exportBtn.style.background = 'rgba(88, 166, 255, 0.3)'; };
  exportBtn.onmouseout = () => { exportBtn.style.background = 'rgba(88, 166, 255, 0.15)'; };
  exportBtn.onclick = () => {
    const geometry = surfaceMesh.geometry;
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `bezier_surface_${timestamp}.obj`;
    exportToOBJ(geometry, filename);
  };
  panel.appendChild(exportBtn);

  const divider1 = document.createElement('div');
  divider1.style.cssText = 'height: 1px; background: rgba(255,255,255,0.1); margin: 10px 0;';
  panel.appendChild(divider1);

  const bezierLabel = document.createElement('div');
  bezierLabel.textContent = `贝塞尔细分度: ${bezierResolution}`;
  bezierLabel.style.cssText = 'margin-bottom: 6px; font-size: 12px; color: #c9d1d9;';
  panel.appendChild(bezierLabel);

  const bezierSlider = document.createElement('input');
  bezierSlider.type = 'range';
  bezierSlider.min = '16';
  bezierSlider.max = '64';
  bezierSlider.step = '4';
  bezierSlider.value = String(bezierResolution);
  bezierSlider.style.cssText = 'width: 100%; margin-bottom: 14px; accent-color: #58a6ff;';
  bezierSlider.oninput = () => {
    bezierResolution = parseInt(bezierSlider.value);
    bezierLabel.textContent = `贝塞尔细分度: ${bezierResolution}`;
    if (currentMode === 'bezier') updateSurface();
  };
  panel.appendChild(bezierSlider);

  const subdivLabel = document.createElement('div');
  subdivLabel.textContent = `CC细分迭代次数: ${subdivisionIterations}`;
  subdivLabel.style.cssText = 'margin-bottom: 6px; font-size: 12px; color: #c9d1d9;';
  panel.appendChild(subdivLabel);

  const subdivSlider = document.createElement('input');
  subdivSlider.type = 'range';
  subdivSlider.min = '1';
  subdivSlider.max = '4';
  subdivSlider.step = '1';
  subdivSlider.value = String(subdivisionIterations);
  subdivSlider.style.cssText = 'width: 100%; margin-bottom: 12px; accent-color: #58a6ff;';
  subdivSlider.oninput = () => {
    subdivisionIterations = parseInt(subdivSlider.value);
    subdivLabel.textContent = `CC细分迭代次数: ${subdivisionIterations}`;
    if (currentMode === 'catmull-clark') updateSurface();
  };
  panel.appendChild(subdivSlider);

  const divider2 = document.createElement('div');
  divider2.style.cssText = 'height: 1px; background: rgba(255,255,255,0.1); margin: 10px 0;';
  panel.appendChild(divider2);

  vertexCountLabel = document.createElement('div');
  vertexCountLabel.textContent = '顶点数: 0';
  vertexCountLabel.style.cssText = 'font-size: 12px; color: #8b949e; text-align: right;';
  panel.appendChild(vertexCountLabel);

  document.body.appendChild(panel);
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
