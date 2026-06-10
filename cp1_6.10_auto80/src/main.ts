import { SceneManager, type SimulationMode, type SceneState } from './scene';
import { PlateManager } from './plateManager';
import { EffectsSystem } from './effects';

const MODE_NAMES: Record<SimulationMode, string> = {
  idle: '自由模式',
  collision: '碰撞模式',
  separation: '分离模式',
  subduction: '俯冲模式',
};

let sceneManager: SceneManager;
let plateManager: PlateManager;
let effectsSystem: EffectsSystem;

function formatGeologicalTime(frameCount: number): string {
  const ma = frameCount * 0.001;
  return ma.toFixed(3) + ' Ma';
}

function updateHUD(state: SceneState): void {
  const modeEl = document.getElementById('hud-mode');
  const timeEl = document.getElementById('hud-time');
  const collisionEl = document.getElementById('hud-collisions');

  if (modeEl) {
    const displayMode = state.transitionProgress < 1 ? state.targetMode : state.mode;
    modeEl.textContent = MODE_NAMES[displayMode];
  }
  if (timeEl) {
    timeEl.textContent = formatGeologicalTime(state.frameCount);
  }
  if (collisionEl) {
    collisionEl.textContent = state.collisionCount.toString();
  }
}

function updateActiveButton(mode: SimulationMode): void {
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    const btnMode = (btn as HTMLElement).dataset.mode as SimulationMode;
    if (btnMode === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function showPlateInfo(
  name: string,
  speed: number,
  boundaryType: string,
  screenX: number,
  screenY: number
): void {
  const infoPanel = document.getElementById('plate-info');
  const nameEl = document.getElementById('info-name');
  const speedEl = document.getElementById('info-speed');
  const boundaryEl = document.getElementById('info-boundary');

  if (!infoPanel || !nameEl || !speedEl || !boundaryEl) return;

  nameEl.textContent = name;
  speedEl.textContent = speed.toFixed(2) + ' 厘米/年';
  boundaryEl.textContent = boundaryType;

  const panelWidth = 240;
  const panelHeight = 140;
  let x = screenX + 20;
  let y = screenY - 20;

  if (x + panelWidth > window.innerWidth - 20) {
    x = screenX - panelWidth - 20;
  }
  if (y + panelHeight > window.innerHeight - 20) {
    y = window.innerHeight - panelHeight - 20;
  }
  if (x < 20) x = 20;
  if (y < 20) y = 20;

  infoPanel.style.left = x + 'px';
  infoPanel.style.top = y + 'px';
  infoPanel.classList.add('visible');
}

function hidePlateInfo(): void {
  const infoPanel = document.getElementById('plate-info');
  if (infoPanel) {
    infoPanel.classList.remove('visible');
  }
}

function setupUI(): void {
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = (btn as HTMLElement).dataset.mode as SimulationMode;
      if (mode) {
        sceneManager.setMode(mode);
        updateActiveButton(mode);
      }
    });
  });

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      sceneManager.resetSimulation();
      updateActiveButton('idle');
      hidePlateInfo();
    });
  }

  const closeInfoBtn = document.getElementById('close-info');
  if (closeInfoBtn) {
    closeInfoBtn.addEventListener('click', hidePlateInfo);
  }

  document.addEventListener('click', (e) => {
    const infoPanel = document.getElementById('plate-info');
    if (infoPanel && infoPanel.classList.contains('visible')) {
      if (!infoPanel.contains(e.target as Node)) {
        const canvasContainer = document.getElementById('canvas-container');
        if (!canvasContainer?.contains(e.target as Node)) {
          hidePlateInfo();
        }
      }
    }
  });
}

export function run(): void {
  sceneManager = new SceneManager('canvas-container');
  plateManager = new PlateManager(sceneManager.scene);
  effectsSystem = new EffectsSystem(sceneManager.scene, plateManager);

  sceneManager.setPlateManager(plateManager);
  sceneManager.setEffectsSystem(effectsSystem);

  sceneManager.onPlateClick((event) => {
    showPlateInfo(event.name, event.speed, event.boundaryType, event.screenX, event.screenY);
  });

  sceneManager.onFrame((state) => {
    updateHUD(state);
  });

  setupUI();
  sceneManager.start();
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', run);
}
