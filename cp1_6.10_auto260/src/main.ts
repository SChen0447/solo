import { SceneManager } from './scene';
import { AtomVisualizer } from './atomVisual';
import { CrystalVisualizer, CrystalAtom } from './crystalVisual';
import { ELEMENTS, ElementData, getElementBySymbol } from './elementData';

let sceneMgr: SceneManager;
let atomVisual: AtomVisualizer;
let crystalVisual: CrystalVisualizer;
let currentElement: ElementData;

function init(): void {
  sceneMgr = new SceneManager('canvas-container');
  atomVisual = new AtomVisualizer(sceneMgr);
  crystalVisual = new CrystalVisualizer(sceneMgr);

  crystalVisual.setOnAtomClick((atom: CrystalAtom) => {
    showAtomInfoPopup(atom);
  });

  buildPeriodicTable();

  const fe = ELEMENTS.find(e => e.symbol === 'Fe') || ELEMENTS[0];
  selectElement(fe);

  bindUIEvents();
}

function buildPeriodicTable(): void {
  const grid = document.getElementById('periodic-grid')!;
  grid.innerHTML = '';

  ELEMENTS.forEach((el) => {
    const btn = document.createElement('button');
    btn.className = 'element-btn';
    btn.dataset.symbol = el.symbol;
    btn.innerHTML = `
      <span>${el.symbol}</span>
      <span class="atomic-num">${el.atomicNumber}</span>
    `;
    btn.addEventListener('click', () => selectElement(el));
    grid.appendChild(btn);
  });
}

function selectElement(element: ElementData): void {
  currentElement = element;

  document.querySelectorAll('.element-btn').forEach(btn => {
    const b = btn as HTMLButtonElement;
    b.classList.toggle('selected', b.dataset.symbol === element.symbol);
  });

  updateElementInfo(element);

  atomVisual.dispose();
  crystalVisual.dispose();
  sceneMgr.clearAnimationCallbacks();

  sceneMgr.transitionToElement(
    () => {
      atomVisual = new AtomVisualizer(sceneMgr);
      atomVisual.build(element);
    },
    () => {
      crystalVisual = new CrystalVisualizer(sceneMgr);
      crystalVisual.setOnAtomClick((atom: CrystalAtom) => showAtomInfoPopup(atom));
      crystalVisual.build(element);
    }
  );
}

function updateElementInfo(el: ElementData): void {
  (document.getElementById('el-symbol') as HTMLElement).textContent = el.symbol;
  (document.getElementById('el-name') as HTMLElement).textContent = el.name;
  (document.getElementById('el-number') as HTMLElement).textContent = String(el.atomicNumber);
  (document.getElementById('el-mass') as HTMLElement).textContent = el.atomicMass.toFixed(3);
  (document.getElementById('el-crystal') as HTMLElement).textContent = el.crystalName;

  const shellsContainer = document.getElementById('el-shells')!;
  shellsContainer.innerHTML = '';
  el.electronShells.forEach((count, idx) => {
    const badge = document.createElement('span');
    badge.className = 'shell-badge';
    const shells = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];
    badge.textContent = `${shells[idx] || idx + 1}: ${count}`;
    shellsContainer.appendChild(badge);
  });

  const isoContainer = document.getElementById('el-isotopes')!;
  isoContainer.innerHTML = '';
  el.isotopes.slice(0, 3).forEach(iso => {
    const row = document.createElement('div');
    row.className = 'isotope-row';
    row.innerHTML = `
      <span class="info-label">${el.symbol}-${iso.mass}</span>
      <span class="info-value">${iso.abundance.toFixed(2)}%</span>
    `;
    isoContainer.appendChild(row);
  });
}

function showAtomInfoPopup(atom: CrystalAtom): void {
  const siteNames: Record<string, string> = {
    corner: '角原子',
    face: '面心原子',
    body: '体心原子',
    edge: '棱心原子',
    internal: '内部原子'
  };
  const msg = `原子坐标: (${atom.position.x.toFixed(2)}, ${atom.position.y.toFixed(2)}, ${atom.position.z.toFixed(2)})\n占位类型: ${siteNames[atom.siteType]}`;
  alert(msg);
}

function bindUIEvents(): void {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  searchInput.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value.trim();
    if (val) {
      const found = getElementBySymbol(val);
      if (found) {
        selectElement(found);
        const btn = document.querySelector(`.element-btn[data-symbol="${found.symbol}"]`) as HTMLElement;
        if (btn) {
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  });

  const resetBtn = document.getElementById('reset-view')!;
  resetBtn.addEventListener('click', () => {
    sceneMgr.resetView();
  });

  const autoRotateToggle = document.getElementById('auto-rotate-toggle')!;
  autoRotateToggle.addEventListener('click', () => {
    autoRotateToggle.classList.toggle('active');
    sceneMgr.settings.autoRotate = autoRotateToggle.classList.contains('active');
  });

  const electronSpeedSlider = document.getElementById('electron-speed') as HTMLInputElement;
  const electronSpeedValue = document.getElementById('electron-speed-value')!;
  electronSpeedSlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    sceneMgr.settings.electronSpeed = val;
    electronSpeedValue.textContent = val.toFixed(1);
  });

  const crystalOpacitySlider = document.getElementById('crystal-opacity') as HTMLInputElement;
  const crystalOpacityValue = document.getElementById('crystal-opacity-value')!;
  crystalOpacitySlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    sceneMgr.settings.crystalOpacity = val;
    crystalOpacityValue.textContent = val.toFixed(2);
    crystalVisual.applyOpacity();
  });

  const exportBtn = document.getElementById('export-snapshot')!;
  exportBtn.addEventListener('click', () => {
    sceneMgr.exportSnapshot(1920, 1080);
  });

  const toggleLeft = document.getElementById('toggle-left')!;
  const toggleRight = document.getElementById('toggle-right')!;
  const controlPanel = document.getElementById('control-panel')!;
  const periodicPanel = document.getElementById('periodic-panel')!;

  toggleLeft.addEventListener('click', () => {
    controlPanel.classList.toggle('open');
  });
  toggleRight.addEventListener('click', () => {
    periodicPanel.classList.toggle('open');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
