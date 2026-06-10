import { MapEditor, EditorMode } from './MapEditor';
import { Island, ResourceType } from './IslandGenerator';

const RESOURCE_LABELS: Record<string, string> = {
  wood: '木材',
  ore: '矿石',
  crystal: '水晶'
};

function init(): void {
  const canvas = document.getElementById('map-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const editor = new MapEditor(canvas);
  setupUI(editor);
}

function setupUI(editor: MapEditor): void {
  const generateBtn = document.getElementById('btn-generate') as HTMLButtonElement;
  const editBtn = document.getElementById('btn-edit') as HTMLButtonElement;
  const panel = document.getElementById('resource-panel') as HTMLElement;
  const statsBar = document.getElementById('stats-bar') as HTMLElement;
  const exportBtn = document.getElementById('btn-export') as HTMLButtonElement;
  const closePanelBtn = document.getElementById('btn-close-panel') as HTMLButtonElement;
  const monsterSlider = document.getElementById('monster-slider') as HTMLInputElement;
  const monsterLevelValue = document.getElementById('monster-level-value') as HTMLElement;
  const currentModeEl = document.getElementById('current-mode') as HTMLElement;
  const selectedInfoEl = document.getElementById('selected-info') as HTMLElement;

  function setMode(mode: EditorMode): void {
    editor.setMode(mode);
    if (generateBtn && editBtn) {
      generateBtn.classList.toggle('active', mode === 'generate');
      editBtn.classList.toggle('active', mode === 'edit');
    }
    if (currentModeEl) {
      currentModeEl.textContent = mode === 'generate' ? '生成模式' : '编辑模式';
    }
  }

  generateBtn?.addEventListener('click', () => setMode('generate'));
  editBtn?.addEventListener('click', () => setMode('edit'));
  setMode('generate');

  editor.on('islandSelected', (island: Island | null) => {
    if (island && panel) {
      panel.classList.add('visible');
      updateResourceButtons(editor, island);
      if (monsterSlider) {
        monsterSlider.value = String(island.monsterLevel);
      }
      if (monsterLevelValue) {
        monsterLevelValue.textContent = String(island.monsterLevel);
      }
    } else if (panel) {
      panel.classList.remove('visible');
    }
    updateSelectedInfo(island);
  });

  editor.on('islandsChanged', (islands: Island[]) => {
    updateStats(islands);
  });

  const resourceBtns = document.querySelectorAll('[data-resource]');
  resourceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const resource = (btn as HTMLElement).dataset.resource as ResourceType;
      const selected = editor.getSelectedIsland();
      if (selected) {
        editor.setIslandResource(selected.id, selected.resource === resource ? null : resource);
        updateResourceButtons(editor, editor.getSelectedIsland());
      }
    });
  });

  closePanelBtn?.addEventListener('click', () => {
    editor.selectIsland(null);
  });

  monsterSlider?.addEventListener('input', () => {
    const level = parseInt(monsterSlider.value, 10);
    if (monsterLevelValue) {
      monsterLevelValue.textContent = String(level);
    }
    const selected = editor.getSelectedIsland();
    if (selected) {
      editor.setIslandMonsterLevel(selected.id, level);
      updateSelectedInfo(editor.getSelectedIsland());
    }
  });

  exportBtn?.addEventListener('click', () => {
    const json = editor.exportToJSON();
    downloadJSON(json, `floating-islands-map-${Date.now()}.json`);
  });

  function updateResourceButtons(editor: MapEditor, island: Island | null): void {
    resourceBtns.forEach(btn => {
      const resource = (btn as HTMLElement).dataset.resource;
      if (island && island.resource === resource) {
        (btn as HTMLElement).classList.add('active');
      } else {
        (btn as HTMLElement).classList.remove('active');
      }
    });
  }

  function updateStats(islands: Island[]): void {
    if (!statsBar) return;

    const total = islands.length;
    const woodCount = islands.filter(i => i.resource === 'wood').length;
    const oreCount = islands.filter(i => i.resource === 'ore').length;
    const crystalCount = islands.filter(i => i.resource === 'crystal').length;
    const avgLevel = total > 0
      ? (islands.reduce((sum, i) => sum + i.monsterLevel, 0) / total).toFixed(1)
      : '0.0';

    statsBar.innerHTML = `
      <span>岛屿总数: <strong>${total}</strong></span>
      <span style="color: #8B4513;">木材: <strong>${woodCount}</strong></span>
      <span style="color: #708090;">矿石: <strong>${oreCount}</strong></span>
      <span style="color: #9b59b6;">水晶: <strong>${crystalCount}</strong></span>
      <span>平均怪物等级: <strong>${avgLevel}</strong></span>
    `;
  }

  function updateSelectedInfo(island: Island | null): void {
    if (!selectedInfoEl) return;
    if (!island) {
      selectedInfoEl.innerHTML = '<span class="muted">未选中岛屿</span>';
      return;
    }
    const resourceText = island.resource ? RESOURCE_LABELS[island.resource] : '无';
    selectedInfoEl.innerHTML = `
      <div><strong>ID:</strong> ${island.id.substring(0, 8)}...</div>
      <div><strong>坐标:</strong> (${Math.round(island.x)}, ${Math.round(island.y)})</div>
      <div><strong>半径:</strong> ${Math.round(island.radius)}px</div>
      <div><strong>资源:</strong> ${resourceText}</div>
      <div><strong>怪物等级:</strong> ${island.monsterLevel}</div>
    `;
  }

  updateStats([]);
  updateSelectedInfo(null);
}

function downloadJSON(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
