import { PanelWorkspace } from './PanelWorkspace';
import type { ExportTemplate } from './types';
import './styles.css';

function createApp(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="app-container">
      <div class="sidebar-left">
        <div class="panel-title">排版参数</div>
        <div class="control-group">
          <label class="control-label">格子间距 <span class="value-label" id="gapValue">10px</span></label>
          <input type="range" id="gapSlider" min="0" max="40" value="10" class="slider" />
        </div>
        <div class="control-group">
          <label class="control-label">外边框距 <span class="value-label" id="paddingValue">20px</span></label>
          <input type="range" id="paddingSlider" min="0" max="80" value="20" class="slider" />
        </div>
        <div class="control-group">
          <label class="control-label">排列方向</label>
          <div class="toggle-group" id="directionToggle">
            <button class="toggle-btn active" data-dir="vertical">竖排</button>
            <button class="toggle-btn" data-dir="horizontal">横排</button>
          </div>
        </div>
        <div class="control-group">
          <label class="control-label">
            <input type="checkbox" id="autoHeight" checked />
            画布高度自适应
          </label>
        </div>
        <div class="control-group">
          <button class="secondary-btn" id="autoLayoutBtn">自动排版</button>
        </div>
        <div class="control-group">
          <button class="secondary-btn" id="resetViewBtn">重置视图</button>
        </div>
      </div>

      <div class="main-area">
        <div class="toolbar">
          <button class="primary-btn" id="addPanelBtn">
            <span class="btn-icon">+</span>添加格子
          </button>
          <button class="primary-btn" id="cropModeBtn">
            <span class="btn-icon">✂</span>裁切模式
          </button>
          <button class="primary-btn" id="exportBtn">
            <span class="btn-icon">⬇</span>导出
          </button>
          <div class="toolbar-spacer"></div>
          <div class="hint-text">双击格子进入裁切 · Alt+拖动平移 · 滚轮缩放</div>
        </div>

        <div class="canvas-wrapper" id="canvasWrapper"></div>

        <div class="timeline" id="timeline">
          <div class="timeline-label">格子列表</div>
          <div class="timeline-track" id="timelineTrack"></div>
        </div>
      </div>

      <div class="sidebar-right" id="sidebarRight">
        <button class="collapse-btn" id="collapseRightBtn" title="隐藏/显示">«</button>
        <div class="panel-title">素材库</div>
        <div class="library-empty">
          <div class="empty-icon">📁</div>
          <div class="empty-text">素材库预留区</div>
        </div>
      </div>

      <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp" multiple style="display:none" />

      <div class="modal-overlay" id="exportModal" style="display:none">
        <div class="modal">
          <div class="modal-header">
            <h3>选择导出模板</h3>
            <button class="modal-close" id="closeExportModal">×</button>
          </div>
          <div class="modal-body" id="exportTemplates"></div>
        </div>
      </div>
    </div>
  `;

  const canvasWrapper = document.getElementById('canvasWrapper')!;
  const workspace = new PanelWorkspace(canvasWrapper);

  setupEventListeners(workspace);
  setupTimeline(workspace);
  setupExportModal(workspace);
}

function setupEventListeners(workspace: PanelWorkspace): void {
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const addPanelBtn = document.getElementById('addPanelBtn')!;
  const cropModeBtn = document.getElementById('cropModeBtn')!;
  const exportBtn = document.getElementById('exportBtn')!;
  const gapSlider = document.getElementById('gapSlider') as HTMLInputElement;
  const paddingSlider = document.getElementById('paddingSlider') as HTMLInputElement;
  const gapValue = document.getElementById('gapValue')!;
  const paddingValue = document.getElementById('paddingValue')!;
  const directionToggle = document.getElementById('directionToggle')!;
  const autoHeight = document.getElementById('autoHeight') as HTMLInputElement;
  const autoLayoutBtn = document.getElementById('autoLayoutBtn')!;
  const resetViewBtn = document.getElementById('resetViewBtn')!;
  const collapseRightBtn = document.getElementById('collapseRightBtn')!;
  const sidebarRight = document.getElementById('sidebarRight')!;
  const canvasWrapper = document.getElementById('canvasWrapper')!;

  addPanelBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      for (let i = 0; i < input.files.length; i++) {
        await workspace.addImage(input.files[i]);
      }
      input.value = '';
    }
  });

  canvasWrapper.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    canvasWrapper.classList.add('drag-over');
  });

  canvasWrapper.addEventListener('dragleave', () => {
    canvasWrapper.classList.remove('drag-over');
  });

  canvasWrapper.addEventListener('drop', async (e: DragEvent) => {
    e.preventDefault();
    canvasWrapper.classList.remove('drag-over');
    if (e.dataTransfer?.files) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          await workspace.addImage(file);
        }
      }
    }
  });

  cropModeBtn.addEventListener('click', () => {
    const selected = workspace.getSelectedPanelId();
    if (!selected) {
      alert('请先选择一个格子');
      return;
    }
    const panel = workspace.getPanels().find((p) => p.id === selected);
    if (panel && panel.imageData) {
      workspace.selectPanel(selected);
    }
  });

  exportBtn.addEventListener('click', () => {
    const modal = document.getElementById('exportModal')!;
    modal.style.display = 'flex';
  });

  gapSlider.addEventListener('input', () => {
    const value = parseInt(gapSlider.value);
    gapValue.textContent = `${value}px`;
    workspace.setLayoutConfig({ gap: value });
  });

  paddingSlider.addEventListener('input', () => {
    const value = parseInt(paddingSlider.value);
    paddingValue.textContent = `${value}px`;
    workspace.setLayoutConfig({ padding: value });
  });

  directionToggle.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('toggle-btn')) {
      directionToggle.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
      target.classList.add('active');
      const dir = target.dataset.dir as 'vertical' | 'horizontal';
      workspace.setLayoutConfig({ direction: dir });
    }
  });

  autoHeight.addEventListener('change', () => {
    workspace.setLayoutConfig({ autoHeight: autoHeight.checked });
  });

  autoLayoutBtn.addEventListener('click', () => {
    workspace.autoLayout();
  });

  resetViewBtn.addEventListener('click', () => {
    workspace.resetView();
  });

  let rightCollapsed = false;
  collapseRightBtn.addEventListener('click', () => {
    rightCollapsed = !rightCollapsed;
    sidebarRight.classList.toggle('collapsed', rightCollapsed);
    collapseRightBtn.textContent = rightCollapsed ? '»' : '«';
  });

  document.getElementById('closeExportModal')!.addEventListener('click', () => {
    document.getElementById('exportModal')!.style.display = 'none';
  });

  document.getElementById('exportModal')!.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      (e.currentTarget as HTMLElement).style.display = 'none';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }
      const selected = workspace.getSelectedPanelId();
      if (selected) {
        workspace.deletePanel(selected);
      }
    }
  });
}

function setupTimeline(workspace: PanelWorkspace): void {
  const track = document.getElementById('timelineTrack')!;

  const renderTimeline = () => {
    const panels = workspace.getPanels();
    const selectedId = workspace.getSelectedPanelId();

    track.innerHTML = '';

    panels.forEach((panel, index) => {
      const thumb = document.createElement('div');
      thumb.className = 'timeline-item';
      thumb.draggable = true;
      thumb.dataset.index = String(index);
      if (panel.id === selectedId) {
        thumb.classList.add('selected');
      }

      const indexLabel = document.createElement('div');
      indexLabel.className = 'timeline-index';
      indexLabel.textContent = String(index + 1);
      thumb.appendChild(indexLabel);

      const thumbCanvas = workspace.getThumbnail(panel.id);
      if (thumbCanvas) {
        const canvasClone = thumbCanvas.cloneNode(true) as HTMLCanvasElement;
        canvasClone.className = 'timeline-thumb';
        thumb.appendChild(canvasClone);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'timeline-placeholder';
        placeholder.textContent = '?';
        thumb.appendChild(placeholder);
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'timeline-delete';
      deleteBtn.innerHTML = '×';
      deleteBtn.title = '删除格子';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        workspace.deletePanel(panel.id);
      });
      thumb.appendChild(deleteBtn);

      thumb.addEventListener('click', () => {
        workspace.selectPanel(panel.id);
      });

      thumb.addEventListener('dragstart', (e) => {
        e.dataTransfer!.setData('text/plain', String(index));
        thumb.classList.add('dragging');
      });

      thumb.addEventListener('dragend', () => {
        thumb.classList.remove('dragging');
      });

      thumb.addEventListener('dragover', (e) => {
        e.preventDefault();
        thumb.classList.add('drag-over');
      });

      thumb.addEventListener('dragleave', () => {
        thumb.classList.remove('drag-over');
      });

      thumb.addEventListener('drop', (e) => {
        e.preventDefault();
        thumb.classList.remove('drag-over');
        const fromIndex = parseInt(e.dataTransfer!.getData('text/plain'));
        const toIndex = parseInt(thumb.dataset.index!);
        if (!isNaN(fromIndex) && !isNaN(toIndex) && fromIndex !== toIndex) {
          workspace.reorderPanels(fromIndex, toIndex);
        }
      });

      track.appendChild(thumb);
    });

    if (panels.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'timeline-empty';
      empty.textContent = '点击「添加格子」或拖入图片开始';
      track.appendChild(empty);
    }
  };

  workspace.onPanelsChange = renderTimeline;
  workspace.onSelectionChange = renderTimeline;
  renderTimeline();
}

function setupExportModal(workspace: PanelWorkspace): void {
  const container = document.getElementById('exportTemplates')!;
  const templates = workspace.getExportTemplates();

  container.innerHTML = '';

  templates.forEach((tpl: ExportTemplate) => {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.innerHTML = `
      <div class="template-icon">${tpl.id === 'vertical-strip' ? '📱' : '📄'}</div>
      <div class="template-info">
        <div class="template-name">${tpl.name}</div>
        <div class="template-desc">${tpl.description}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      workspace.export(tpl);
      document.getElementById('exportModal')!.style.display = 'none';
    });
    container.appendChild(card);
  });
}

createApp();
