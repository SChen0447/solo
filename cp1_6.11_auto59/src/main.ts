import { MoleculeRenderer, AtomInfo } from './renderer';
import { CAFFEINE_MOLECULE } from './data';

let renderer: MoleculeRenderer;
let fpsElement: HTMLElement;
let infoCard: HTMLElement;
let infoCardTimer: number | null = null;

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  renderer = new MoleculeRenderer(container);
  renderer.loadMolecule(CAFFEINE_MOLECULE);

  fpsElement = document.getElementById('fps-counter')!;
  infoCard = document.getElementById('atom-info-card')!;

  renderer.setOnAtomClick((info: AtomInfo, screenX: number, screenY: number) => {
    showAtomInfo(info, screenX, screenY);
  });

  setupControls();
  startAnimationLoop();
}

function setupControls(): void {
  const btnReset = document.getElementById('btn-reset');
  const toggleHydrogen = document.getElementById('toggle-hydrogen');
  const btnExportSvg = document.getElementById('btn-export-svg');

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      renderer.resetView();
    });
  }

  if (toggleHydrogen) {
    toggleHydrogen.addEventListener('click', () => {
      const isActive = toggleHydrogen.classList.toggle('active');
      renderer.toggleHydrogen(isActive);
    });
  }

  if (btnExportSvg) {
    btnExportSvg.addEventListener('click', () => {
      renderer.downloadSVG();
    });
  }
}

function showAtomInfo(info: AtomInfo, screenX: number, screenY: number): void {
  const cardWidth = 220;
  const cardHeight = 180;
  const padding = 16;

  let posX = screenX + 20;
  let posY = screenY + 20;

  if (posX + cardWidth > window.innerWidth - padding) {
    posX = screenX - cardWidth - 20;
  }
  if (posY + cardHeight > window.innerHeight - padding) {
    posY = window.innerHeight - cardHeight - padding;
  }
  if (posX < padding) posX = padding;
  if (posY < padding) posY = padding;

  infoCard.style.left = `${posX}px`;
  infoCard.style.top = `${posY}px`;

  const symbolColor: Record<string, string> = {
    'C': '#606060',
    'H': '#ffffff',
    'O': '#ff4040',
    'N': '#4060ff',
    'S': '#ffff40',
    'P': '#ff8000'
  };

  const color = symbolColor[info.type] || '#888888';

  infoCard.innerHTML = `
    <div class="info-title" style="color: ${color};">
      ${info.typeName}原子 (${info.type})
    </div>
    <div class="info-row"><span>类型</span><span>${info.type}</span></div>
    <div class="info-row"><span>坐标 X</span><span>${info.x.toFixed(3)}</span></div>
    <div class="info-row"><span>坐标 Y</span><span>${info.y.toFixed(3)}</span></div>
    <div class="info-row"><span>坐标 Z</span><span>${info.z.toFixed(3)}</span></div>
    <div class="info-row"><span>连接键数</span><span>${info.bondCount}</span></div>
    <div class="info-row"><span>价电子数</span><span>${info.valenceElectrons}</span></div>
  `;

  infoCard.style.display = 'block';

  if (infoCardTimer) {
    window.clearTimeout(infoCardTimer);
  }
  infoCardTimer = window.setTimeout(() => {
    infoCard.style.display = 'none';
    infoCardTimer = null;
  }, 3500);
}

function startAnimationLoop(): void {
  let fpsCounter = 0;
  let fpsLastUpdate = performance.now();

  function loop(): void {
    renderer.animate();

    const now = performance.now();
    fpsCounter++;
    if (now - fpsLastUpdate >= 250) {
      const fps = Math.round((fpsCounter * 1000) / (now - fpsLastUpdate));
      if (fpsElement) {
        fpsElement.textContent = `FPS: ${fps}`;
      }
      fpsCounter = 0;
      fpsLastUpdate = now;
    }

    requestAnimationFrame(loop);
  }

  loop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
