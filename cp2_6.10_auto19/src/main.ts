import './styles.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TShirt, TSHIRT_COLORS } from './tshirt';
import { DesignManager, TextElement, ImageElement } from './design';
import { UIManager } from './ui';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let tshirt: TShirt;
let designManager: DesignManager;
let uiManager: UIManager;
let imageCache: Map<string, HTMLImageElement> = new Map();
let isDragging: boolean = false;
let dragElementId: string | null = null;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let frontDesignMesh: THREE.Mesh | null = null;

const clock = new THREE.Clock();

init();
animate();

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('找不到 canvas-container 元素');
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.target.set(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(5, 5, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const frontLight = new THREE.DirectionalLight(0xffffff, 0.6);
  frontLight.position.set(0, 2, 5);
  scene.add(frontLight);

  const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
  backLight.position.set(-5, 3, -5);
  scene.add(backLight);

  tshirt = new TShirt();
  scene.add(tshirt.group);

  frontDesignMesh = tshirt.group.getObjectByName('frontDesign') as THREE.Mesh | null;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  designManager = new DesignManager();

  const savedColor = designManager.getColor();
  if (savedColor) {
    tshirt.setColor(savedColor);
  }

  uiManager = new UIManager(
    document.getElementById('control-panel')!,
    designManager,
    {
      onColorChange: handleColorChange,
      onAddText: handleAddText,
      onAddImage: handleAddImage,
      onUpdateText: handleUpdateText,
      onDeleteElement: handleDeleteElement,
      onSelectElement: handleSelectElement,
      onUndo: handleUndo,
      onRestoreSnapshot: handleRestoreSnapshot
    }
  );

  designManager.subscribe(() => {
    renderDesignToTexture();
  });

  loadImagesForElements();
  renderDesignToTexture();

  window.addEventListener('resize', onWindowResize);
  setupDragInteraction(container);
}

function loadImagesForElements(): void {
  const elements = designManager.getElements();
  elements.forEach(el => {
    if (el.type === 'image') {
      loadImage((el as ImageElement).dataUrl);
    }
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const cached = imageCache.get(dataUrl);
    if (cached) {
      resolve(cached);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(dataUrl, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function renderDesignToTexture(): Promise<void> {
  const elements = designManager.getElements();
  const imagesToLoad: Promise<void>[] = [];

  elements.forEach(el => {
    if (el.type === 'image' && !imageCache.has((el as ImageElement).dataUrl)) {
      imagesToLoad.push(
        loadImage((el as ImageElement).dataUrl).then(() => {})
      );
    }
  });

  if (imagesToLoad.length > 0) {
    await Promise.all(imagesToLoad);
  }

  tshirt.redrawFrontTexture((ctx, canvas) => {
    const { width, height } = canvas;

    elements.forEach(el => {
      if (el.type === 'text') {
        drawText(ctx, el as TextElement, width, height);
      } else if (el.type === 'image') {
        drawImage(ctx, el as ImageElement, width, height);
      }
    });

    const selectedId = designManager.getSelectedElementId();
    if (selectedId) {
      const selected = elements.find(e => e.id === selectedId);
      if (selected) {
        drawSelectionOutline(ctx, selected, width, height);
      }
    }
  });
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: TextElement,
  canvasWidth: number,
  canvasHeight: number
): void {
  const scale = canvasWidth / 1024;
  const fontSize = text.fontSize * scale * 2;
  const x = text.x * canvasWidth;
  const y = text.y * canvasHeight;

  ctx.save();
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  ctx.fillStyle = text.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.content, x, y);
  ctx.restore();
}

function drawImage(
  ctx: CanvasRenderingContext2D,
  img: ImageElement,
  canvasWidth: number,
  canvasHeight: number
): void {
  const image = imageCache.get(img.dataUrl);
  if (!image) return;

  const scale = canvasWidth / 1024;
  const w = img.width * scale * 1.5;
  const h = img.height * scale * 1.5;
  const x = img.x * canvasWidth - w / 2;
  const y = img.y * canvasHeight - h / 2;

  ctx.save();
  ctx.drawImage(image, x, y, w, h);
  ctx.restore();
}

function drawSelectionOutline(
  ctx: CanvasRenderingContext2D,
  element: TextElement | ImageElement,
  canvasWidth: number,
  canvasHeight: number
): void {
  let w: number, h: number;
  const scale = canvasWidth / 1024;

  if (element.type === 'text') {
    const text = element as TextElement;
    const fontSize = text.fontSize * scale * 2;
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    const metrics = ctx.measureText(text.content);
    w = metrics.width + 20;
    h = fontSize + 20;
  } else {
    const img = element as ImageElement;
    w = img.width * scale * 1.5 + 10;
    h = img.height * scale * 1.5 + 10;
  }

  const x = element.x * canvasWidth - w / 2;
  const y = element.y * canvasHeight - h / 2;

  const time = Date.now() / 1500;
  const alpha = 0.5 + 0.5 * Math.sin(time * Math.PI * 2);

  ctx.save();
  ctx.strokeStyle = `rgba(233, 69, 96, ${alpha})`;
  ctx.lineWidth = 4 * scale;
  ctx.setLineDash([10 * scale, 5 * scale]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function setupDragInteraction(container: HTMLElement): void {
  container.addEventListener('mousedown', onMouseDown);
  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('mouseup', onMouseUp);
  container.addEventListener('mouseleave', onMouseUp);

  container.addEventListener('touchstart', onTouchStart, { passive: false });
  container.addEventListener('touchmove', onTouchMove, { passive: false });
  container.addEventListener('touchend', onTouchEnd);
}

function getUVFromEvent(event: MouseEvent | Touch): { u: number; v: number } | null {
  const container = document.getElementById('canvas-container');
  if (!container || !frontDesignMesh) return null;

  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(frontDesignMesh);

  if (intersects.length > 0 && intersects[0].uv) {
    return { u: intersects[0].uv.x, v: 1 - intersects[0].uv.y };
  }
  return null;
}

function findElementAtUV(u: number, v: number): TextElement | ImageElement | null {
  const elements = designManager.getElements();
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    let halfW: number, halfH: number;

    if (el.type === 'text') {
      const text = el as TextElement;
      const scale = 1 / 1024;
      const fontSize = text.fontSize * scale * 2;
      halfW = fontSize * text.content.length * 0.35;
      halfH = fontSize * 0.7;
    } else {
      const img = el as ImageElement;
      const scale = 1 / 1024;
      halfW = (img.width * scale * 1.5) / 2;
      halfH = (img.height * scale * 1.5) / 2;
    }

    if (
      u >= el.x - halfW &&
      u <= el.x + halfW &&
      v >= el.y - halfH &&
      v <= el.y + halfH
    ) {
      return el;
    }
  }
  return null;
}

function onMouseDown(event: MouseEvent): void {
  const uv = getUVFromEvent(event);
  if (uv) {
    const element = findElementAtUV(uv.u, uv.v);
    if (element) {
      isDragging = true;
      dragElementId = element.id;
      controls.enabled = false;
      designManager.selectElement(element.id);
      event.preventDefault();
      return;
    }
  }
  designManager.selectElement(null);
}

function onMouseMove(event: MouseEvent): void {
  if (!isDragging || !dragElementId) return;

  const uv = getUVFromEvent(event);
  if (uv) {
    designManager.moveElement(dragElementId, uv.u, uv.v);
  }
}

function onMouseUp(): void {
  if (isDragging) {
    isDragging = false;
    dragElementId = null;
    controls.enabled = true;
  }
}

function onTouchStart(event: TouchEvent): void {
  if (event.touches.length !== 1) return;
  const touch = event.touches[0];
  const uv = getUVFromEvent(touch);
  if (uv) {
    const element = findElementAtUV(uv.u, uv.v);
    if (element) {
      isDragging = true;
      dragElementId = element.id;
      controls.enabled = false;
      designManager.selectElement(element.id);
      event.preventDefault();
    }
  }
}

function onTouchMove(event: TouchEvent): void {
  if (!isDragging || !dragElementId || event.touches.length !== 1) return;
  event.preventDefault();

  const touch = event.touches[0];
  const uv = getUVFromEvent(touch);
  if (uv) {
    designManager.moveElement(dragElementId, uv.u, uv.v);
  }
}

function onTouchEnd(): void {
  if (isDragging) {
    isDragging = false;
    dragElementId = null;
    controls.enabled = true;
  }
}

function handleColorChange(color: string): void {
  designManager.setColor(color);
  tshirt.setColor(color);
}

function handleAddText(content: string, fontSize: number, color: string): void {
  designManager.addText(content, fontSize, color);
}

function handleAddImage(file: File): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string;
    const img = new Image();
    img.onload = () => {
      designManager.addImage(dataUrl, img.width, img.height);
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function handleUpdateText(id: string, updates: Partial<Omit<TextElement, 'id' | 'type'>>): void {
  designManager.updateText(id, updates);
}

function handleDeleteElement(id: string): void {
  designManager.deleteElement(id);
}

function handleSelectElement(id: string | null): void {
  designManager.selectElement(id);
}

function handleUndo(): void {
  designManager.undo();
  tshirt.setColor(designManager.getColor());
}

function handleRestoreSnapshot(snapshotId: string): void {
  designManager.restoreSnapshot(snapshotId);
  tshirt.setColor(designManager.getColor());
}

function onWindowResize(): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  tshirt.update(deltaTime);
  controls.update();

  if (designManager.getSelectedElementId()) {
    renderDesignToTexture();
  }

  renderer.render(scene, camera);
}
