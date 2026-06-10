import * as THREE from 'three';
import { FateSymbol, FORTUNE_TEXTS, MAX_LABELS } from './symbol';

export interface UIState {
  energyBar: HTMLElement | null;
  fortunePanel: HTMLElement | null;
  fortuneTitle: HTMLElement | null;
  fortuneText: HTMLElement | null;
  energy: number;
  maxEnergy: number;
  labels: { symbolId: number; element: HTMLElement; obj: THREE.Object3D }[];
  panelTimeoutId: number | null;
}

export function createUIState(): UIState {
  return {
    energyBar: document.getElementById('energy-bar'),
    fortunePanel: document.getElementById('fortune-panel'),
    fortuneTitle: document.getElementById('fortune-title'),
    fortuneText: document.getElementById('fortune-text'),
    energy: 50,
    maxEnergy: 100,
    labels: [],
    panelTimeoutId: null
  };
}

export function updateEnergyBar(state: UIState): void {
  if (state.energyBar) {
    const pct = Math.max(0, Math.min(100, (state.energy / state.maxEnergy) * 100));
    state.energyBar.style.width = pct + '%';
  }
}

export function modifyEnergy(state: UIState, delta: number): boolean {
  state.energy = Math.max(0, Math.min(state.maxEnergy, state.energy + delta));
  updateEnergyBar(state);
  return state.energy <= 0;
}

export function createSymbolLabel(
  symbol: FateSymbol,
  uiState: UIState,
  scene: THREE.Scene
): void {
  if (uiState.labels.length >= MAX_LABELS) {
    const oldest = uiState.labels.shift();
    if (oldest) {
      scene.remove(oldest.obj);
    }
  }

  const div = document.createElement('div');
  div.textContent = symbol.name;
  div.style.cssText = `
    color: #ffffff;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    text-shadow: 0 0 0.2px rgba(180, 140, 255, 0.8), 0 0 4px rgba(180, 140, 255, 0.5);
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.4s ease;
  `;

  const obj = new THREE.Object3D();
  obj.position.copy(symbol.center);
  obj.position.y += 3;
  (obj as any).element = div;
  (obj as any).isCustomLabel = true;

  scene.add(obj);
  uiState.labels.push({ symbolId: symbol.id, element: div, obj });

  requestAnimationFrame(() => {
    div.style.opacity = '1';
  });

  symbol.label = obj;
}

export function removeSymbolLabel(symbol: FateSymbol, uiState: UIState, scene: THREE.Scene): void {
  const idx = uiState.labels.findIndex((l) => l.symbolId === symbol.id);
  if (idx >= 0) {
    const label = uiState.labels[idx];
    scene.remove(label.obj);
    uiState.labels.splice(idx, 1);
  }
  symbol.label = null;
}

export function renderLabels(
  uiState: UIState,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): void {
  const widthHalf = renderer.domElement.clientWidth / 2;
  const heightHalf = renderer.domElement.clientHeight / 2;

  uiState.labels.forEach(({ element, obj }) => {
    const pos = obj.position.clone();
    pos.project(camera);
    const x = (pos.x * widthHalf) + widthHalf;
    const y = -(pos.y * heightHalf) + heightHalf;
    const visible = pos.z < 1 && pos.z > -1;
    element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    element.style.position = 'absolute';
    element.style.top = '0';
    element.style.left = '0';
    element.style.display = visible ? 'block' : 'none';
    if (!element.parentElement && renderer.domElement.parentElement) {
      renderer.domElement.parentElement.appendChild(element);
    }
  });
}

export function showFortune(uiState: UIState, symbolName: string): string {
  const text = FORTUNE_TEXTS[Math.floor(Math.random() * FORTUNE_TEXTS.length)];
  if (uiState.fortuneTitle && uiState.fortunePanel && uiState.fortuneText) {
    uiState.fortuneTitle.textContent = `${symbolName} · 命运启示`;
    uiState.fortuneText.textContent = text;
    uiState.fortunePanel.classList.add('visible');

    if (uiState.panelTimeoutId !== null) {
      window.clearTimeout(uiState.panelTimeoutId);
    }
    uiState.panelTimeoutId = window.setTimeout(() => {
      hideFortune(uiState);
    }, 5000);
  }
  return text;
}

export function hideFortune(uiState: UIState): void {
  if (uiState.fortunePanel) {
    uiState.fortunePanel.classList.remove('visible');
  }
  uiState.panelTimeoutId = null;
}

export function setupPanelCloseHandler(uiState: UIState, container: HTMLElement): void {
  container.addEventListener('click', (e) => {
    if (uiState.fortunePanel && uiState.fortunePanel.classList.contains('visible')) {
      const rect = uiState.fortunePanel.getBoundingClientRect();
      const cx = e.clientX;
      const cy = e.clientY;
      const inside = cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom;
      if (!inside) {
        hideFortune(uiState);
      }
    }
  });
}

export function resizeCanvas(
  container: HTMLElement,
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera
): void {
  const containerW = container.clientWidth;
  const containerH = container.clientHeight;
  const targetRatio = 16 / 9;
  let width = containerW;
  let height = containerW / targetRatio;
  if (height > containerH) {
    height = containerH;
    width = containerH * targetRatio;
  }
  renderer.setSize(width, height, false);
  renderer.domElement.style.width = width + 'px';
  renderer.domElement.style.height = height + 'px';
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
