import { SceneManager } from './sceneManager';
import { parseMolecule } from './parseMolecule';
import type { AtomData } from './parseMolecule';
import type { RenderMode } from './renderModels';
import './style.css';

const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
const labelContainer = document.getElementById('label-renderer') as HTMLElement;

const infoPanel = document.getElementById('info-panel') as HTMLElement;
const infoSymbol = document.getElementById('info-symbol') as HTMLElement;
const infoCoords = document.getElementById('info-coords') as HTMLElement;

const wireframeBtn = document.getElementById('wireframe-btn') as HTMLButtonElement;
const ballstickBtn = document.getElementById('ballstick-btn') as HTMLButtonElement;
const moleculeSelect = document.getElementById('molecule-select') as HTMLSelectElement;
const labelToggle = document.getElementById('label-toggle') as HTMLInputElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const autorotateBtn = document.getElementById('autorotate-btn') as HTMLButtonElement;
const panelToggle = document.getElementById('panel-toggle') as HTMLButtonElement;
const controlPanel = document.getElementById('control-panel') as HTMLElement;

function handleAtomHover(atomData: AtomData | null): void {
  if (atomData) {
    infoSymbol.textContent = atomData.symbol;
    infoCoords.textContent = `x: ${atomData.position[0].toFixed(2)}, y: ${atomData.position[1].toFixed(2)}, z: ${atomData.position[2].toFixed(2)}`;
    infoPanel.classList.remove('hidden');
  } else {
    infoPanel.classList.add('hidden');
  }
}

const sceneManager = new SceneManager(canvas, labelContainer, {
  onAtomHover: handleAtomHover,
});

let currentMoleculeId = 'H2O';
let currentMode: RenderMode = 'ballstick';
let autoRotateEnabled = false;
let panelOpen = false;

function loadMolecule(id: string): void {
  currentMoleculeId = id;
  const data = parseMolecule(id);
  sceneManager.loadMolecule(data);
}

function setMode(mode: RenderMode): void {
  if (mode === currentMode) return;
  currentMode = mode;
  sceneManager.setRenderMode(mode);

  wireframeBtn.classList.toggle('active', mode === 'wireframe');
  ballstickBtn.classList.toggle('active', mode === 'ballstick');
}

function toggleAutoRotate(): void {
  autoRotateEnabled = !autoRotateEnabled;
  sceneManager.setAutoRotate(autoRotateEnabled);
  autorotateBtn.classList.toggle('active', autoRotateEnabled);
  autorotateBtn.textContent = autoRotateEnabled ? '自动旋转：开' : '自动旋转：关';
}

function togglePanel(): void {
  panelOpen = !panelOpen;
  controlPanel.classList.toggle('open', panelOpen);
}

wireframeBtn.addEventListener('click', () => setMode('wireframe'));
ballstickBtn.addEventListener('click', () => setMode('ballstick'));

moleculeSelect.addEventListener('change', (e) => {
  const target = e.target as HTMLSelectElement;
  loadMolecule(target.value);
});

labelToggle.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  sceneManager.setLabelsVisible(target.checked);
});

resetBtn.addEventListener('click', () => {
  sceneManager.resetCamera();
});

autorotateBtn.addEventListener('click', toggleAutoRotate);
panelToggle.addEventListener('click', togglePanel);

loadMolecule(currentMoleculeId);
