import {
  ComboEditor,
  SkillNode,
  SkillType,
  SKILL_COLORS,
  SKILL_TYPE_NAMES,
  EditorState,
  KeyRecord,
} from './editor';
import { AnimationPlayer } from './animation';
import { TimelinePanel, TimelineKey, KEY_TO_TYPE } from './timeline';

const app = document.getElementById('app')!;

let editor: ComboEditor;
let animationPlayer: AnimationPlayer;
let timeline: TimelinePanel;

let editorCanvas: HTMLCanvasElement;
let previewCanvas: HTMLCanvasElement;

let sidePanel: HTMLElement;
let previewPanel: HTMLElement;
let timelineContainer: HTMLElement;
let editorContainer: HTMLElement;

let sidePanelCollapsed = false;
let previewPanelCollapsed = false;
let isNarrowLayout = false;

let currentFrameDisplay: HTMLElement;
let loopStatusDot: HTMLElement;

function createEl(tag: string, className?: string, parent?: HTMLElement): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (parent) parent.appendChild(el);
  return el;
}

function buildLayout(): void {
  app.style.display = 'flex';
  app.style.flexDirection = 'column';
  app.style.width = '100%';
  app.style.height = '100%';
  app.style.position = 'relative';

  buildToolbar();

  const mainRow = createEl('div', '', app);
  mainRow.style.display = 'flex';
  mainRow.style.flex = '1';
  mainRow.style.minHeight = '0';
  mainRow.style.overflow = 'hidden';

  buildSidePanel(mainRow);

  const editorWrapper = createEl('div', '', mainRow);
  editorWrapper.style.position = 'relative';
  editorWrapper.style.flex = '1';
  editorWrapper.style.minWidth = '0';
  editorWrapper.style.display = 'flex';
  editorWrapper.style.flexDirection = 'column';

  const middleRow = createEl('div', '', editorWrapper);
  middleRow.style.display = 'flex';
  middleRow.style.flex = '1';
  middleRow.style.minHeight = '0';
  middleRow.style.overflow = 'hidden';

  editorContainer = createEl('div', '', middleRow);
  editorContainer.style.position = 'relative';
  editorContainer.style.flex = '1';
  editorContainer.style.minWidth = '0';
  editorContainer.style.overflow = 'hidden';

  editorCanvas = document.createElement('canvas');
  editorCanvas.style.display = 'block';
  editorCanvas.style.width = '100%';
  editorCanvas.style.height = '100%';
  editorCanvas.style.cursor = 'default';
  editorContainer.appendChild(editorCanvas);

  buildPreviewPanel(middleRow);
  buildResizeHandles(mainRow, middleRow);

  timelineContainer = createEl('div', '', editorWrapper);
  timelineContainer.style.height = '120px';
  timelineContainer.style.minHeight = '120px';
  timelineContainer.style.borderTop = '2px solid #3a3a4e';
  timelineContainer.style.position = 'relative';
  timelineContainer.style.background = '#252538';

  buildTimelineControls();
  buildContextMenu();
  buildToast();

  const ro = new ResizeObserver(() => {
    const rect = editorContainer.getBoundingClientRect();
    editor.resize(rect.width, rect.height);
  });
  ro.observe(editorContainer);

  const viewportRo = new ResizeObserver(() => {
    checkResponsiveLayout(mainRow, middleRow);
  });
  viewportRo.observe(document.body);
}

function buildToolbar(): void {
  const toolbar = createEl('div', '', app);
  toolbar.style.height = '50px';
  toolbar.style.minHeight = '50px';
  toolbar.style.display = 'flex';
  toolbar.style.alignItems = 'center';
  toolbar.style.padding = '0 16px 0 200px';
  toolbar.style.gap = '10px';
  toolbar.style.background = '#1a1a2e';
  toolbar.style.borderBottom = '2px solid #3a3a4e';
  toolbar.style.zIndex = '10';

  const exportBtn = createButton('导出', '#6366f1', toolbar);
  exportBtn.addEventListener('click', handleExport);

  const importBtn = createButton('导入', '#a855f7', toolbar);
  importBtn.addEventListener('click', handleImport);

  const spacer = createEl('div', '', toolbar);
  spacer.style.flex = '1';

  const hint = createEl('span', '', toolbar);
  hint.textContent = '右键添加节点 | 滚轮缩放 | 拖拽平移';
  hint.style.color = 'rgba(226,232,240,0.4)';
  hint.style.fontSize = '12px';
  hint.style.fontFamily = "'Courier New', monospace";
}

function createButton(text: string, bg: string, parent: HTMLElement): HTMLElement {
  const btn = createEl('button', '', parent);
  btn.textContent = text;
  btn.style.background = bg;
  btn.style.color = '#ffffff';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.padding = '8px 16px';
  btn.style.fontSize = '14px';
  btn.style.fontFamily = "'Courier New', monospace";
  btn.style.cursor = 'pointer';
  btn.style.fontWeight = 'bold';
  btn.style.transition = 'all 0.2s ease';
  btn.addEventListener('mouseenter', () => {
    btn.style.filter = 'brightness(1.2)';
    btn.style.transform = 'scale(1.03)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.filter = 'brightness(1)';
    btn.style.transform = 'scale(1)';
  });
  btn.addEventListener('mousedown', () => {
    btn.style.transform = 'translateY(2px) scale(1)';
  });
  btn.addEventListener('mouseup', () => {
    btn.style.transform = 'scale(1.03)';
  });
  return btn;
}

function buildSidePanel(parent: HTMLElement): void {
  sidePanel = createEl('div', '', parent);
  sidePanel.style.width = '280px';
  sidePanel.style.minWidth = '280px';
  sidePanel.style.background = '#2a2a3e';
  sidePanel.style.borderRight = '2px solid #3a3a4e';
  sidePanel.style.display = 'flex';
  sidePanel.style.flexDirection = 'column';
  sidePanel.style.position = 'relative';
  sidePanel.style.zIndex = '5';
  sidePanel.style.transition = 'margin-left 0.3s ease';

  const header = createEl('div', '', sidePanel);
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.padding = '14px 16px';
  header.style.borderBottom = '1px solid #3a3a4e';

  const title = createEl('span', '', header);
  title.textContent = '属性编辑';
  title.style.color = '#e2e8f0';
  title.style.fontSize = '14px';
  title.style.fontWeight = 'bold';
  title.style.fontFamily = "'Courier New', monospace";

  const collapseBtn = createCollapseButton(header);
  collapseBtn.addEventListener('click', () => toggleSidePanel());

  const content = createEl('div', '', sidePanel);
  content.style.flex = '1';
  content.style.overflowY = 'auto';
  content.style.padding = '16px';
  content.id = 'side-panel-content';
  content.style.fontFamily = "'Courier New', monospace";
  content.style.fontSize = '12px';

  const emptyHint = createEl('div', '', content);
  emptyHint.id = 'empty-hint';
  emptyHint.textContent = '点击画布上的节点以编辑属性';
  emptyHint.style.color = 'rgba(226,232,240,0.4)';
  emptyHint.style.textAlign = 'center';
  emptyHint.style.padding = '40px 0';
  emptyHint.style.fontSize = '12px';
}

function buildPreviewPanel(parent: HTMLElement): void {
  previewPanel = createEl('div', '', parent);
  previewPanel.style.width = '300px';
  previewPanel.style.minWidth = '300px';
  previewPanel.style.background = '#2a2a3e';
  previewPanel.style.borderRadius = '12px';
  previewPanel.style.margin = '10px';
  previewPanel.style.marginLeft = '0';
  previewPanel.style.display = 'flex';
  previewPanel.style.flexDirection = 'column';
  previewPanel.style.overflow = 'hidden';
  previewPanel.style.position = 'relative';
  previewPanel.style.zIndex = '5';

  const header = createEl('div', '', previewPanel);
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.padding = '12px 14px';
  header.style.borderBottom = '1px solid #3a3a4e';

  const title = createEl('span', '', header);
  title.id = 'preview-title';
  title.textContent = '动画预览';
  title.style.color = '#e2e8f0';
  title.style.fontSize = '13px';
  title.style.fontWeight = 'bold';
  title.style.fontFamily = "'Courier New', monospace";

  const collapseBtn = createCollapseButton(header);
  collapseBtn.addEventListener('click', () => togglePreviewPanel());

  const info = createEl('div', '', previewPanel);
  info.id = 'preview-info';
  info.style.padding = '8px 14px';
  info.style.fontSize = '11px';
  info.style.color = 'rgba(226,232,240,0.6)';
  info.style.fontFamily = "'Courier New', monospace";
  info.style.lineHeight = '1.6';
  info.textContent = '选中节点以查看详情';

  const canvasWrap = createEl('div', '', previewPanel);
  canvasWrap.style.position = 'relative';
  canvasWrap.style.padding = '10px 14px';
  canvasWrap.style.display = 'flex';
  canvasWrap.style.justifyContent = 'center';

  previewCanvas = document.createElement('canvas');
  previewCanvas.width = 200;
  previewCanvas.height = 200;
  previewCanvas.style.borderRadius = '8px';
  previewCanvas.style.display = 'block';
  canvasWrap.appendChild(previewCanvas);

  currentFrameDisplay = createEl('div', '', canvasWrap);
  currentFrameDisplay.style.position = 'absolute';
  currentFrameDisplay.style.top = '18px';
  currentFrameDisplay.style.left = '22px';
  currentFrameDisplay.style.color = '#ffffff';
  currentFrameDisplay.style.fontSize = '12px';
  currentFrameDisplay.style.fontFamily = "'Courier New', monospace";
  currentFrameDisplay.style.fontWeight = 'bold';
  currentFrameDisplay.style.textShadow = '0 1px 3px rgba(0,0,0,0.8)';
  currentFrameDisplay.textContent = 'Frame: 0';

  loopStatusDot = createEl('div', '', canvasWrap);
  loopStatusDot.style.position = 'absolute';
  loopStatusDot.style.top = '20px';
  loopStatusDot.style.right = '22px';
  loopStatusDot.style.width = '10px';
  loopStatusDot.style.height = '10px';
  loopStatusDot.style.borderRadius = '50%';
  loopStatusDot.style.background = '#ef4444';
  loopStatusDot.style.boxShadow = '0 0 6px rgba(239,68,68,0.6)';

  const controls = createEl('div', '', previewPanel);
  controls.style.display = 'flex';
  controls.style.gap = '8px';
  controls.style.padding = '10px 14px 16px';
  controls.style.justifyContent = 'center';

  const playBtn = createIconButton('▶', '#22c55e', controls);
  playBtn.addEventListener('click', () => animationPlayer.play());

  const stopBtn = createIconButton('■', '#ef4444', controls);
  stopBtn.addEventListener('click', () => animationPlayer.stop());

  const comboBtn = createButton('连招演示', '#6366f1', controls);
  comboBtn.style.padding = '6px 12px';
  comboBtn.style.fontSize = '12px';
  comboBtn.addEventListener('click', handlePlayCombo);
}

function createIconButton(icon: string, bg: string, parent: HTMLElement): HTMLElement {
  const btn = createEl('button', '', parent);
  btn.textContent = icon;
  btn.style.width = '36px';
  btn.style.height = '36px';
  btn.style.borderRadius = '50%';
  btn.style.background = bg;
  btn.style.color = '#ffffff';
  btn.style.border = 'none';
  btn.style.cursor = 'pointer';
  btn.style.fontSize = '14px';
  btn.style.fontWeight = 'bold';
  btn.style.transition = 'all 0.2s ease';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.addEventListener('mouseenter', () => {
    btn.style.filter = 'brightness(1.2)';
    btn.style.transform = 'scale(1.1)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.filter = 'brightness(1)';
    btn.style.transform = 'scale(1)';
  });
  btn.addEventListener('mousedown', () => {
    btn.style.transform = 'translateY(2px) scale(1)';
  });
  return btn;
}

function createCollapseButton(parent: HTMLElement): HTMLElement {
  const btn = createEl('button', '', parent);
  btn.innerHTML = '◀';
  btn.style.background = 'transparent';
  btn.style.border = 'none';
  btn.style.color = 'rgba(226,232,240,0.6)';
  btn.style.cursor = 'pointer';
  btn.style.fontSize = '14px';
  btn.style.padding = '4px 8px';
  btn.style.borderRadius = '4px';
  btn.style.transition = 'all 0.2s ease';
  btn.addEventListener('mouseenter', () => {
    btn.style.color = '#e2e8f0';
    btn.style.background = 'rgba(255,255,255,0.05)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.color = 'rgba(226,232,240,0.6)';
    btn.style.background = 'transparent';
  });
  return btn;
}

function buildResizeHandles(mainRow: HTMLElement, middleRow: HTMLElement): void {
  const sideHandle = createEl('div', '', mainRow);
  sideHandle.style.width = '2px';
  sideHandle.style.cursor = 'col-resize';
  sideHandle.style.background = '#3a3a4e';
  sideHandle.style.flexShrink = '0';
  sideHandle.style.zIndex = '20';

  let sideDragging = false;
  sideHandle.addEventListener('mousedown', () => {
    sideDragging = true;
    document.body.style.cursor = 'col-resize';
  });
  document.addEventListener('mousemove', (e) => {
    if (!sideDragging) return;
    const w = Math.max(200, Math.min(400, e.clientX - sidePanel.getBoundingClientRect().left));
    sidePanel.style.width = w + 'px';
    sidePanel.style.minWidth = w + 'px';
  });
  document.addEventListener('mouseup', () => {
    sideDragging = false;
    document.body.style.cursor = '';
  });

  const previewHandle = createEl('div', '', middleRow);
  previewHandle.style.width = '2px';
  previewHandle.style.cursor = 'col-resize';
  previewHandle.style.background = '#3a3a4e';
  previewHandle.style.flexShrink = '0';
  previewHandle.style.zIndex = '20';

  let previewDragging = false;
  previewHandle.addEventListener('mousedown', () => {
    previewDragging = true;
    document.body.style.cursor = 'col-resize';
  });
  document.addEventListener('mousemove', (e) => {
    if (!previewDragging) return;
    const rect = previewPanel.getBoundingClientRect();
    const w = Math.max(250, Math.min(450, rect.right - e.clientX));
    previewPanel.style.width = w + 'px';
    previewPanel.style.minWidth = w + 'px';
  });
  document.addEventListener('mouseup', () => {
    previewDragging = false;
    document.body.style.cursor = '';
  });
}

function buildTimelineControls(): void {
  const controls = createEl('div', '', timelineContainer);
  controls.style.position = 'absolute';
  controls.style.top = '8px';
  controls.style.left = '12px';
  controls.style.display = 'flex';
  controls.style.gap = '8px';
  controls.style.zIndex = '5';
  controls.style.alignItems = 'center';

  const recordBtn = createEl('button', '', controls);
  recordBtn.id = 'record-btn';
  recordBtn.style.width = '20px';
  recordBtn.style.height = '20px';
  recordBtn.style.borderRadius = '50%';
  recordBtn.style.background = '#ef4444';
  recordBtn.style.border = '2px solid rgba(255,255,255,0.3)';
  recordBtn.style.cursor = 'pointer';
  recordBtn.style.transition = 'all 0.2s ease';
  recordBtn.addEventListener('mouseenter', () => recordBtn.style.transform = 'scale(1.15)');
  recordBtn.addEventListener('mouseleave', () => recordBtn.style.transform = 'scale(1)');
  recordBtn.addEventListener('click', () => {
    if (timeline.getIsRecording()) {
      timeline.stopRecording();
    } else {
      timeline.startRecording();
    }
  });

  const playBtn = createEl('button', '', controls);
  playBtn.id = 'playback-btn';
  playBtn.innerHTML = '▶';
  playBtn.style.width = '26px';
  playBtn.style.height = '26px';
  playBtn.style.borderRadius = '50%';
  playBtn.style.background = '#22c55e';
  playBtn.style.color = '#ffffff';
  playBtn.style.border = 'none';
  playBtn.style.cursor = 'pointer';
  playBtn.style.fontSize = '11px';
  playBtn.style.fontWeight = 'bold';
  playBtn.style.display = 'flex';
  playBtn.style.alignItems = 'center';
  playBtn.style.justifyContent = 'center';
  playBtn.style.transition = 'all 0.2s ease';
  playBtn.addEventListener('mouseenter', () => playBtn.style.filter = 'brightness(1.2)');
  playBtn.addEventListener('mouseleave', () => playBtn.style.filter = 'brightness(1)');
  playBtn.addEventListener('click', () => {
    if (timeline.getIsPlaying()) {
      timeline.stopPlayback();
    } else {
      timeline.startPlayback();
    }
  });

  const clearBtn = createButton('清空', '#475569', controls);
  clearBtn.style.padding = '4px 10px';
  clearBtn.style.fontSize = '11px';
  clearBtn.addEventListener('click', () => {
    timeline.clear();
  });

  const label = createEl('span', '', controls);
  label.textContent = 'A/B/X/Y 录制';
  label.style.color = 'rgba(226,232,240,0.5)';
  label.style.fontSize = '11px';
  label.style.fontFamily = "'Courier New', monospace";
  label.style.marginLeft = '4px';
}

let contextMenu: HTMLElement;

function buildContextMenu(): void {
  contextMenu = createEl('div', '', app);
  contextMenu.style.position = 'fixed';
  contextMenu.style.display = 'none';
  contextMenu.style.background = '#2a2a3e';
  contextMenu.style.border = '1px solid #3a3a4e';
  contextMenu.style.borderRadius = '8px';
  contextMenu.style.padding = '6px 0';
  contextMenu.style.minWidth = '160px';
  contextMenu.style.zIndex = '1000';
  contextMenu.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
  contextMenu.style.fontFamily = "'Courier New', monospace";
  contextMenu.style.fontSize = '12px';

  document.addEventListener('click', () => hideContextMenu());
}

function showContextMenu(x: number, y: number, type: 'canvas' | 'node', node?: SkillNode): void {
  contextMenu.innerHTML = '';
  contextMenu.style.display = 'block';
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';

  if (type === 'canvas') {
    addContextItem('添加技能节点', () => {
      showAddNodeSubmenu(x, y);
    });
  } else if (node) {
    addContextItem('连接至...', () => {
      editor.startConnection(node.id);
    });
    addContextItem('编辑属性', () => {
      editor.selectNode(node.id);
    });
    addContextSeparator();
    addContextItem('删除节点', () => {
      editor.deleteNode(node.id);
    }, '#ef4444');
  }
}

function showAddNodeSubmenu(x: number, y: number): void {
  contextMenu.innerHTML = '';
  const types: SkillType[] = ['light', 'heavy', 'upper', 'down'];
  const keys: Record<SkillType, string> = { light: 'A', heavy: 'B', upper: 'X', down: 'Y' };
  for (const t of types) {
    addContextItem(SKILL_TYPE_NAMES[t] + ' (' + keys[t] + ')', () => {
      editor.addNode(x, y, t, keys[t]);
    }, SKILL_COLORS[t]);
  }
}

function addContextItem(label: string, onClick: () => void, color?: string): void {
  const item = createEl('div', '', contextMenu);
  item.textContent = label;
  item.style.padding = '8px 14px';
  item.style.cursor = 'pointer';
  item.style.color = color || '#e2e8f0';
  item.style.transition = 'background 0.15s';
  item.addEventListener('mouseenter', () => {
    item.style.background = 'rgba(255,255,255,0.06)';
  });
  item.addEventListener('mouseleave', () => {
    item.style.background = 'transparent';
  });
  item.addEventListener('click', () => {
    onClick();
    hideContextMenu();
  });
}

function addContextSeparator(): void {
  const sep = createEl('div', '', contextMenu);
  sep.style.height = '1px';
  sep.style.background = '#3a3a4e';
  sep.style.margin = '4px 0';
}

function hideContextMenu(): void {
  contextMenu.style.display = 'none';
}

let toastEl: HTMLElement;

function buildToast(): void {
  toastEl = createEl('div', '', app);
  toastEl.style.position = 'fixed';
  toastEl.style.top = '70px';
  toastEl.style.right = '20px';
  toastEl.style.background = '#f87171';
  toastEl.style.color = '#ffffff';
  toastEl.style.padding = '12px 20px';
  toastEl.style.borderRadius = '8px';
  toastEl.style.fontSize = '13px';
  toastEl.style.fontFamily = "'Courier New', monospace";
  toastEl.style.zIndex = '2000';
  toastEl.style.display = 'none';
  toastEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  toastEl.style.maxWidth = '320px';
}

function showToast(msg: string, isError: boolean = true): void {
  toastEl.textContent = msg;
  toastEl.style.background = isError ? '#f87171' : '#22c55e';
  toastEl.style.display = 'block';
  setTimeout(() => {
    toastEl.style.display = 'none';
  }, 3000);
}

function toggleSidePanel(): void {
  sidePanelCollapsed = !sidePanelCollapsed;
  if (sidePanelCollapsed) {
    sidePanel.style.marginLeft = '-' + sidePanel.offsetWidth + 'px';
  } else {
    sidePanel.style.marginLeft = '0';
  }
}

function togglePreviewPanel(): void {
  previewPanelCollapsed = !previewPanelCollapsed;
  if (previewPanelCollapsed) {
    previewPanel.style.display = 'none';
  } else {
    previewPanel.style.display = 'flex';
  }
  setTimeout(() => {
    const rect = editorContainer.getBoundingClientRect();
    editor.resize(rect.width, rect.height);
  }, 350);
}

function checkResponsiveLayout(mainRow: HTMLElement, middleRow: HTMLElement): void {
  const narrow = window.innerWidth < 900;
  if (narrow === isNarrowLayout) return;
  isNarrowLayout = narrow;

  if (narrow) {
    sidePanel.style.position = 'absolute';
    sidePanel.style.top = '50px';
    sidePanel.style.left = '0';
    sidePanel.style.height = 'calc(100% - 170px)';
    sidePanel.style.background = 'rgba(42,42,62,0.95)';
    sidePanel.style.borderRadius = '0 16px 16px 0';
    sidePanel.style.backdropFilter = 'blur(10px)';
    sidePanel.style.zIndex = '100';
    sidePanel.style.width = '280px';
    sidePanel.style.minWidth = '280px';

    const handle = createEl('div', '', sidePanel);
    handle.style.position = 'absolute';
    handle.style.top = '0';
    handle.style.left = '0';
    handle.style.width = '100%';
    handle.style.height = '20px';
    handle.style.cursor = 'move';

    let dragging = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;
    handle.addEventListener('mousedown', (e) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = sidePanel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      sidePanel.style.left = (startLeft + e.clientX - startX) + 'px';
      sidePanel.style.top = (startTop + e.clientY - startY) + 'px';
    });
    document.addEventListener('mouseup', () => (dragging = false));

    if (middleRow.contains(previewPanel)) {
      middleRow.removeChild(previewPanel);
    }
    previewPanel.style.margin = '10px';
    previewPanel.style.width = 'auto';
    previewPanel.style.minWidth = 'auto';
    previewPanel.style.maxWidth = '400px';
    mainRow.appendChild(previewPanel);
    mainRow.style.flexDirection = 'column';
  } else {
    sidePanel.style.position = 'relative';
    sidePanel.style.top = '';
    sidePanel.style.left = '';
    sidePanel.style.height = '';
    sidePanel.style.background = '#2a2a3e';
    sidePanel.style.borderRadius = '';
    sidePanel.style.backdropFilter = '';
    sidePanel.style.zIndex = '5';
    mainRow.style.flexDirection = '';
    if (mainRow.contains(previewPanel)) {
      mainRow.removeChild(previewPanel);
    }
    previewPanel.style.width = '300px';
    previewPanel.style.minWidth = '300px';
    previewPanel.style.maxWidth = '';
    previewPanel.style.margin = '10px';
    previewPanel.style.marginLeft = '0';
    middleRow.appendChild(previewPanel);
  }
  setTimeout(() => {
    const rect = editorContainer.getBoundingClientRect();
    editor.resize(rect.width, rect.height);
  }, 100);
}

function renderSidePanel(node: SkillNode | null): void {
  const content = document.getElementById('side-panel-content');
  if (!content) return;
  content.innerHTML = '';

  if (!node) {
    const empty = createEl('div', '', content);
    empty.textContent = '点击画布上的节点以编辑属性';
    empty.style.color = 'rgba(226,232,240,0.4)';
    empty.style.textAlign = 'center';
    empty.style.padding = '40px 0';
    empty.style.fontSize = '12px';
    return;
  }

  const color = SKILL_COLORS[node.type];

  const header = createEl('div', '', content);
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.gap = '10px';
  header.style.marginBottom = '18px';

  const dot = createEl('div', '', header);
  dot.style.width = '14px';
  dot.style.height = '14px';
  dot.style.borderRadius = '50%';
  dot.style.background = color;
  dot.style.boxShadow = `0 0 8px ${color}66`;

  const title = createEl('span', '', header);
  title.textContent = node.name;
  title.style.fontSize = '15px';
  title.style.fontWeight = 'bold';
  title.style.color = '#e2e8f0';

  addTextField(content, '技能名称', node.name, (v) => editor.updateNode(node.id, { name: v }));
  addSelectField(content, '技能类型', SKILL_TYPE_NAMES, node.type, (v) =>
    editor.updateNode(node.id, { type: v as SkillType })
  );
  addSelectField(
    content,
    '按键',
    { A: 'A', B: 'B', X: 'X', Y: 'Y' } as Record<string, string>,
    node.key,
    (v) => editor.updateNode(node.id, { key: v })
  );
  addSliderField(content, '前摇时长', 0.1, 0.5, 0.05, node.startup, 's', (v) =>
    editor.updateNode(node.id, { startup: v })
  );
  addSliderField(content, '后摇时长', 0.1, 0.6, 0.05, node.recovery, 's', (v) =>
    editor.updateNode(node.id, { recovery: v })
  );
  addCheckboxField(content, '是否可取消', node.cancelable, (v) =>
    editor.updateNode(node.id, { cancelable: v })
  );
  if (node.cancelable) {
    addSliderField(content, '取消窗口', 0.05, 0.2, 0.05, node.cancelWindow, 's', (v) =>
      editor.updateNode(node.id, { cancelWindow: v })
    );
  }
  addSliderFieldInt(content, '伤害值', 1, 50, node.damage, (v) =>
    editor.updateNode(node.id, { damage: v })
  );
  addSliderFieldInt(content, '精灵帧索引', 0, 10, node.spriteFrame, (v) =>
    editor.updateNode(node.id, { spriteFrame: v })
  );
}

function addFieldWrap(parent: HTMLElement, label: string): HTMLElement {
  const wrap = createEl('div', '', parent);
  wrap.style.marginBottom = '14px';

  const lbl = createEl('div', '', wrap);
  lbl.textContent = label;
  lbl.style.color = 'rgba(226,232,240,0.7)';
  lbl.style.fontSize = '11px';
  lbl.style.marginBottom = '6px';
  lbl.style.textTransform = 'uppercase';
  lbl.style.letterSpacing = '0.5px';

  return wrap;
}

function addTextField(parent: HTMLElement, label: string, value: string, onChange: (v: string) => void): void {
  const wrap = addFieldWrap(parent, label);
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.style.width = '100%';
  input.style.background = '#1e1e2e';
  input.style.border = '1px solid #3a3a4e';
  input.style.borderRadius = '6px';
  input.style.padding = '8px 10px';
  input.style.color = '#e2e8f0';
  input.style.fontFamily = "'Courier New', monospace";
  input.style.fontSize = '13px';
  input.style.outline = 'none';
  input.addEventListener('focus', () => (input.style.borderColor = '#6366f1'));
  input.addEventListener('blur', () => (input.style.borderColor = '#3a3a4e'));
  input.addEventListener('change', () => onChange(input.value));
  wrap.appendChild(input);
}

function addSelectField(
  parent: HTMLElement,
  label: string,
  options: Record<string, string>,
  value: string,
  onChange: (v: string) => void
): void {
  const wrap = addFieldWrap(parent, label);
  const select = document.createElement('select');
  select.style.width = '100%';
  select.style.background = '#1e1e2e';
  select.style.border = '1px solid #3a3a4e';
  select.style.borderRadius = '6px';
  select.style.padding = '8px 10px';
  select.style.color = '#e2e8f0';
  select.style.fontFamily = "'Courier New', monospace";
  select.style.fontSize = '13px';
  select.style.outline = 'none';
  select.style.cursor = 'pointer';
  for (const key of Object.keys(options)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = options[key];
    opt.style.background = '#1e1e2e';
    if (key === value) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('focus', () => (select.style.borderColor = '#6366f1'));
  select.addEventListener('blur', () => (select.style.borderColor = '#3a3a4e'));
  select.addEventListener('change', () => onChange(select.value));
  wrap.appendChild(select);
}

function addSliderField(
  parent: HTMLElement,
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  unit: string,
  onChange: (v: number) => void
): void {
  const wrap = addFieldWrap(parent, label);
  const row = createEl('div', '', wrap);
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = '10px';

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.style.flex = '1';
  input.style.cursor = 'pointer';
  input.style.accentColor = '#6366f1';

  const val = createEl('span', '', row);
  val.textContent = value.toFixed(2) + unit;
  val.style.color = '#e2e8f0';
  val.style.fontSize = '12px';
  val.style.minWidth = '50px';
  val.style.textAlign = 'right';
  val.style.fontWeight = 'bold';

  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    val.textContent = v.toFixed(2) + unit;
    onChange(v);
  });
  row.appendChild(input);
}

function addSliderFieldInt(
  parent: HTMLElement,
  label: string,
  min: number,
  max: number,
  value: number,
  onChange: (v: number) => void
): void {
  const wrap = addFieldWrap(parent, label);
  const row = createEl('div', '', wrap);
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = '10px';

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.value = String(value);
  input.style.flex = '1';
  input.style.cursor = 'pointer';
  input.style.accentColor = '#6366f1';

  const val = createEl('span', '', row);
  val.textContent = String(value);
  val.style.color = '#e2e8f0';
  val.style.fontSize = '12px';
  val.style.minWidth = '30px';
  val.style.textAlign = 'right';
  val.style.fontWeight = 'bold';

  input.addEventListener('input', () => {
    const v = parseInt(input.value);
    val.textContent = String(v);
    onChange(v);
  });
  row.appendChild(input);
}

function addCheckboxField(parent: HTMLElement, label: string, value: boolean, onChange: (v: boolean) => void): void {
  const wrap = createEl('div', '', parent);
  wrap.style.marginBottom = '14px';
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '10px';
  wrap.style.cursor = 'pointer';

  const box = createEl('div', '', wrap);
  box.style.width = '18px';
  box.style.height = '18px';
  box.style.borderRadius = '4px';
  box.style.border = '2px solid #3a3a4e';
  box.style.background = value ? '#6366f1' : 'transparent';
  box.style.borderColor = value ? '#6366f1' : '#3a3a4e';
  box.style.display = 'flex';
  box.style.alignItems = 'center';
  box.style.justifyContent = 'center';
  box.style.flexShrink = '0';
  box.style.transition = 'all 0.15s';

  if (value) {
    const check = createEl('span', '', box);
    check.textContent = '✓';
    check.style.color = '#ffffff';
    check.style.fontSize = '12px';
    check.style.fontWeight = 'bold';
  }

  const lbl = createEl('span', '', wrap);
  lbl.textContent = label;
  lbl.style.color = 'rgba(226,232,240,0.8)';
  lbl.style.fontSize = '12px';

  const toggle = () => {
    const nv = !value;
    onChange(nv);
    renderSidePanel(editor.getSelectedNode());
  };
  wrap.addEventListener('click', toggle);
}

function updatePreviewPanel(node: SkillNode | null): void {
  const title = document.getElementById('preview-title');
  const info = document.getElementById('preview-info');

  if (!node) {
    if (title) title.textContent = '动画预览';
    if (info) info.textContent = '选中节点以查看详情';
    animationPlayer.setFrame(0);
    return;
  }

  if (title) title.textContent = node.name + ' (' + node.key + ')';
  if (info) {
    info.innerHTML =
      '前摇: ' +
      node.startup.toFixed(2) +
      's | 后摇: ' +
      node.recovery.toFixed(2) +
      's<br>' +
      '伤害: ' +
      node.damage +
      ' | 帧: ' +
      node.spriteFrame +
      (node.cancelable ? ' | ✓可取消' : '');
  }
  animationPlayer.setSkillType(node.type);
  animationPlayer.setFrame(node.spriteFrame);
}

function handlePlayCombo(): void {
  const selected = editor.getSelectedNode();
  if (!selected) {
    showToast('请先选中一个节点', true);
    return;
  }
  const connected = editor.getConnectedNodes(selected.id);
  const sequence: { frameStart: number; frameEnd: number }[] = [
    { frameStart: 0, frameEnd: AnimationPlayer.TOTAL_FRAMES - 1 },
  ];
  if (connected.length > 0) {
    sequence.push({ frameStart: 0, frameEnd: AnimationPlayer.TOTAL_FRAMES - 1 });
  }
  animationPlayer.playComboSequence(sequence);
}

function handleExport(): void {
  const json = editor.exportToJSON(timeline.getKeySequence());
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'combo-tree-' + Date.now() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('导出成功', false);
}

function handleImport(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = editor.importFromJSON(String(reader.result));
      if (result.success) {
        timeline.setKeySequence(result.keySequence);
        showToast('导入成功', false);
      } else {
        showToast('导入失败: ' + (result.error || '未知错误'), true);
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

function init(): void {
  buildLayout();

  editor = new ComboEditor(editorCanvas);
  animationPlayer = new AnimationPlayer(previewCanvas);
  timeline = new TimelinePanel(timelineContainer, {
    onRecordKey: () => {
      animationPlayer.stop();
      animationPlayer.play();
    },
    onPlaybackKey: () => {
      animationPlayer.stop();
      animationPlayer.play();
    },
    onRecordingChange: (rec) => {
      const btn = document.getElementById('record-btn') as HTMLElement;
      if (btn) {
        btn.style.boxShadow = rec ? '0 0 0 4px rgba(239,68,68,0.3), 0 0 12px rgba(239,68,68,0.6)' : '';
        btn.style.animation = rec ? 'pulse 1s infinite' : '';
      }
    },
    onPlaybackChange: (playing) => {
      const btn = document.getElementById('playback-btn');
      if (btn) btn.innerHTML = playing ? '⏸' : '▶';
    },
  });

  editor.setNodeSelectListener((node) => {
    renderSidePanel(node);
    updatePreviewPanel(node);
  });

  editor.setStateChangeListener((_s: EditorState) => {
    const selected = editor.getSelectedNode();
    if (selected) {
      updatePreviewPanel(selected);
    }
  });

  editor.setContextMenuListener((x, y, type, node) => {
    const rect = editorCanvas.getBoundingClientRect();
    showContextMenu(rect.left + x, rect.top + y, type, node);
  });

  animationPlayer.setOnFrameChange((frame) => {
    currentFrameDisplay.textContent = 'Frame: ' + frame;
  });
  animationPlayer.setOnStop(() => {
    currentFrameDisplay.textContent = 'Frame: 0';
    loopStatusDot.style.background = '#ef4444';
    loopStatusDot.style.boxShadow = '0 0 6px rgba(239,68,68,0.6)';
  });

  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    const key = e.key.toUpperCase();
    if (key === 'A' || key === 'B' || key === 'X' || key === 'Y') {
      if (timeline.getIsRecording()) {
        timeline.recordKey(key as TimelineKey);
      } else {
        const selected = editor.getSelectedNode();
        if (selected) {
          editor.updateNode(selected.id, {
            key,
            type: KEY_TO_TYPE[key as TimelineKey],
          });
        }
      }
    }
    if (e.key === 'Escape') {
      editor.cancelConnection();
      timeline.stopRecording();
      timeline.stopPlayback();
      hideContextMenu();
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selected = editor.getSelectedNode();
      if (selected && !timeline.getIsRecording()) {
        editor.deleteNode(selected.id);
      }
    }
  });

  renderSidePanel(null);
  updatePreviewPanel(null);

  setInterval(() => {
    if (animationPlayer.getIsPlaying()) {
      loopStatusDot.style.background = '#22c55e';
      loopStatusDot.style.boxShadow = '0 0 6px rgba(34,197,94,0.6)';
    }
  }, 100);

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(styleEl);
}

document.addEventListener('DOMContentLoaded', init);
