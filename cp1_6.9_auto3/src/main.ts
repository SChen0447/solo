import * as THREE from 'three';
import { GEAR_PRESETS, Gear, GearConfig } from './gear';
import { Workbench } from './workbench';

let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;
let workbench: Workbench;
let clock: THREE.Clock;
let frameCount: number = 0;

let isDragging: boolean = false;
let draggedGear: Gear | null = null;
let dragConfig: GearConfig | null = null;
let isLibraryDrag: boolean = false;
let dragOffsetX: number = 0;
let dragOffsetY: number = 0;
let ghostMesh: THREE.Group | null = null;

let selectedGear: Gear | null = null;
let lastClickTime: number = 0;
let lastClickGear: Gear | null = null;

let container: HTMLElement;
let canvasRect: DOMRect;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function init(): void {
  container = document.getElementById('canvas-container')!;
  canvasRect = container.getBoundingClientRect();

  const width = container.clientWidth;
  const height = container.clientHeight;
  const aspect = width / height;
  const frustumSize = Math.max(width, height) * 0.7;

  scene = new THREE.Scene();

  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 1024;
  bgCanvas.height = 1024;
  const bgCtx = bgCanvas.getContext('2d')!;
  const bgGradient = bgCtx.createRadialGradient(512, 512, 50, 512, 512, 700);
  bgGradient.addColorStop(0, '#2a2a2a');
  bgGradient.addColorStop(0.5, '#1a1a1a');
  bgGradient.addColorStop(1, '#050505');
  bgCtx.fillStyle = bgGradient;
  bgCtx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = 30 + Math.random() * 150;
    const grad = bgCtx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(60,50,40,${0.03 + Math.random() * 0.04})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    bgCtx.fillStyle = grad;
    bgCtx.beginPath();
    bgCtx.arc(x, y, r, 0, Math.PI * 2);
    bgCtx.fill();
  }
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  scene.background = bgTexture;

  camera = new THREE.OrthographicCamera(
    -frustumSize * aspect / 2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.1,
    5000
  );
  camera.position.z = 1000;
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffeedd, 0.9);
  dirLight.position.set(200, 300, 400);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xb8860b, 0.35);
  fillLight.position.set(-200, -100, 300);
  scene.add(fillLight);

  workbench = new Workbench(scene);
  clock = new THREE.Clock();

  buildGearLibrary();
  setupEventListeners();
  setupSettingsPanel();
  animate();
}

function buildGearLibrary(): void {
  const list = document.getElementById('gear-list')!;
  list.innerHTML = '';
  GEAR_PRESETS.forEach((config, index) => {
    const item = document.createElement('div');
    item.className = 'gear-item';
    item.draggable = true;
    item.dataset.index = String(index);

    const preview = document.createElement('div');
    preview.className = 'gear-preview';
    preview.style.background = `radial-gradient(circle, ${config.colorStart} 0%, ${config.colorEnd} 100%)`;
    preview.style.boxShadow = `0 0 12px ${config.colorStart}80`;

    const info = document.createElement('div');
    info.className = 'gear-info';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = `齿轮 ${index + 1}`;
    const spec = document.createElement('div');
    spec.className = 'spec';
    spec.textContent = `齿数${config.teeth} · 直径${config.diameter}px`;
    info.appendChild(name);
    info.appendChild(spec);

    item.appendChild(preview);
    item.appendChild(info);

    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startLibraryDrag(config, e);
    });

    list.appendChild(item);
  });
}

function startLibraryDrag(config: GearConfig, e: MouseEvent): void {
  isLibraryDrag = true;
  isDragging = true;
  dragConfig = config;

  const ghost = new Gear(config);
  ghost.mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = (child.material as THREE.Material).clone();
      (child.material as THREE.MeshStandardMaterial).transparent = true;
      (child.material as THREE.MeshStandardMaterial).opacity = 0.55;
    }
  });
  ghostMesh = ghost.mesh;
  const pos = screenToWorld(e.clientX, e.clientY);
  ghostMesh.position.set(pos.x, pos.y, 10);
  scene.add(ghostMesh);
}

function startGearDrag(gear: Gear, e: MouseEvent): void {
  isDragging = true;
  isLibraryDrag = false;
  draggedGear = gear;
  const pos = screenToWorld(e.clientX, e.clientY);
  dragOffsetX = gear.mesh.position.x - pos.x;
  dragOffsetY = gear.mesh.position.y - pos.y;
  gear.mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if ('opacity' in child.material) {
        (child.material as THREE.MeshStandardMaterial).transparent = true;
        (child.material as THREE.MeshStandardMaterial).opacity = 0.7;
      }
    }
  });
  scene.attach(gear.mesh);
}

function screenToWorld(screenX: number, screenY: number): THREE.Vector2 {
  canvasRect = container.getBoundingClientRect();
  const x = ((screenX - canvasRect.left) / canvasRect.width) * 2 - 1;
  const y = -((screenY - canvasRect.top) / canvasRect.height) * 2 + 1;
  mouse.set(x, y);
  raycaster.setFromCamera(mouse, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const point = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, point);
  return new THREE.Vector2(point.x, point.y);
}

function setupEventListeners(): void {
  const canvas = renderer.domElement;

  window.addEventListener('resize', onResize);

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const pos = screenToWorld(e.clientX, e.clientY);
    if (isLibraryDrag && ghostMesh) {
      ghostMesh.position.x = pos.x;
      ghostMesh.position.y = pos.y;
    } else if (draggedGear) {
      draggedGear.mesh.position.x = pos.x + dragOffsetX;
      draggedGear.mesh.position.y = pos.y + dragOffsetY;
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    const pos = screenToWorld(e.clientX, e.clientY);

    if (isLibraryDrag) {
      if (ghostMesh && dragConfig) {
        if (pos.x > -2000 && pos.x < 2000 && pos.y > -2000 && pos.y < 2000) {
          workbench.addGear(dragConfig, pos.x, pos.y);
        }
        scene.remove(ghostMesh);
        ghostMesh = null;
      }
      dragConfig = null;
    } else if (draggedGear) {
      workbench.updateGearPosition(draggedGear, pos.x + dragOffsetX, pos.y + dragOffsetY);
      draggedGear.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if ('opacity' in child.material) {
            (child.material as THREE.MeshStandardMaterial).opacity = 1;
            (child.material as THREE.MeshStandardMaterial).transparent = false;
          }
        }
      });
      draggedGear = null;
    }
    isDragging = false;
    isLibraryDrag = false;
  });

  canvas.addEventListener('mousedown', (e) => {
    if (isDragging) return;
    const pos = screenToWorld(e.clientX, e.clientY);
    const gear = workbench.getGearAtPosition(pos.x, pos.y);

    if (e.button === 2) {
      if (gear) {
        workbench.removeGear(gear);
        if (selectedGear === gear) {
          hideSettingsPanel();
          selectedGear = null;
        }
      }
      return;
    }

    if (gear) {
      const now = Date.now();
      if (now - lastClickTime < 350 && lastClickGear === gear) {
        openSettingsPanel(gear, e.clientX, e.clientY);
        lastClickTime = 0;
        lastClickGear = null;
      } else {
        lastClickTime = now;
        lastClickGear = gear;
        startGearDrag(gear, e);
      }
    } else {
      lastClickTime = 0;
      lastClickGear = null;
      hideSettingsPanel();
    }
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  canvas.addEventListener('dblclick', (e) => {
    const pos = screenToWorld(e.clientX, e.clientY);
    const gear = workbench.getGearAtPosition(pos.x, pos.y);
    if (gear) {
      openSettingsPanel(gear, e.clientX, e.clientY);
    }
  });
}

function setupSettingsPanel(): void {
  const closeBtn = document.getElementById('close-settings')!;
  closeBtn.addEventListener('click', hideSettingsPanel);

  const rpmSlider = document.getElementById('rpm-slider') as HTMLInputElement;
  rpmSlider.addEventListener('input', () => {
    if (selectedGear) {
      const rpm = parseInt(rpmSlider.value, 10);
      document.getElementById('rpm-value')!.textContent = String(rpm);
      selectedGear.setRPM(rpm);
      selectedGear.setDriving(rpm > 0);
      workbench.updateDriveChain();
    }
  });

  const dirBtns = document.querySelectorAll('.direction-btn');
  dirBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!selectedGear) return;
      dirBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const dir = (btn as HTMLElement).dataset.direction === 'cw' ? 1 : -1;
      selectedGear.setDirection(dir as 1 | -1);
      workbench.updateDriveChain();
    });
  });
}

function openSettingsPanel(gear: Gear, x: number, y: number): void {
  selectedGear = gear;
  const panel = document.getElementById('settings-panel')!;
  document.getElementById('gear-id')!.textContent = String(gear.id);
  document.getElementById('gear-teeth')!.textContent = String(gear.teeth);
  document.getElementById('gear-diameter')!.textContent = String(gear.diameter);
  document.getElementById('mesh-status')!.textContent = gear.getMeshStatusText();

  const rpmSlider = document.getElementById('rpm-slider') as HTMLInputElement;
  rpmSlider.value = String(gear.baseRpm);
  document.getElementById('rpm-value')!.textContent = String(gear.baseRpm);

  const dirBtns = document.querySelectorAll('.direction-btn');
  dirBtns.forEach((b) => b.classList.remove('active'));
  const activeBtn = gear.direction === 1
    ? document.querySelector('.direction-btn[data-direction="cw"]')
    : document.querySelector('.direction-btn[data-direction="ccw"]');
  activeBtn?.classList.add('active');

  const panelWidth = 300;
  const panelHeight = 320;
  let px = x + 20;
  let py = y - 20;
  if (px + panelWidth > window.innerWidth) px = x - panelWidth - 20;
  if (py + panelHeight > window.innerHeight) py = window.innerHeight - panelHeight - 20;
  if (py < 10) py = 10;
  if (px < 250) px = 250;

  panel.style.left = px + 'px';
  panel.style.top = py + 'px';
  panel.classList.add('active');
}

function hideSettingsPanel(): void {
  const panel = document.getElementById('settings-panel')!;
  panel.classList.remove('active');
  selectedGear = null;
}

function onResize(): void {
  if (!container || !camera || !renderer) return;
  canvasRect = container.getBoundingClientRect();
  const width = container.clientWidth;
  const height = container.clientHeight;
  const aspect = width / height;
  const frustumSize = Math.max(width, height) * 0.7;

  camera.left = -frustumSize * aspect / 2;
  camera.right = frustumSize * aspect / 2;
  camera.top = frustumSize / 2;
  camera.bottom = -frustumSize / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate(): void {
  requestAnimationFrame(animate);
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  frameCount++;

  workbench.update(deltaTime, frameCount);

  if (selectedGear) {
    document.getElementById('mesh-status')!.textContent = selectedGear.getMeshStatusText();
  }

  renderer.render(scene, camera);
}

init();
