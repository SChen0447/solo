import { Board } from './board';
import {
  BaseElement,
  Direction,
  ELEMENT_CONFIGS,
  ElementType,
  GRID_SIZE,
  TriggerType,
  updateGridPosition,
} from './elements';
import {
  LogicState,
  LogicNode,
  addEdge,
  buildNodesFromElements,
  createState,
  evaluateLogic,
  findEdgeAt,
  findNodeAt,
  removeEdge,
  renderLogicFlow,
} from './logic';
import {
  PuzzleLayout,
  deleteLayout,
  formatTimestamp,
  loadAllLayouts,
  loadLayout,
  saveLayout,
} from './storage';
import { v4 as uuidv4 } from 'uuid';

const elementTypes: ElementType[] = ['box', 'pressurePlate', 'laserEmitter', 'laserReceiver', 'door', 'wall'];

class App {
  board: Board;
  logicState: LogicState = createState();
  selectedElement: BaseElement | null = null;
  isConnectingLaser: boolean = false;
  pendingLaserEmitterId: string | null = null;
  logicCanvas: HTMLCanvasElement | null = null;
  logicCtx: CanvasRenderingContext2D | null = null;
  hoverEdgeId: string | null = null;
  draggingLogicNode: LogicNode | null = null;
  logicNodeDragOffset: { x: number; y: number } = { x: 0, y: 0 };
  lastFrameTime = performance.now();

  constructor() {
    const canvas = document.getElementById('board-canvas') as HTMLCanvasElement;
    this.board = new Board(canvas);
    this.board.onElementSelect = (el) => this.handleElementSelect(el);
    this.board.onElementsChange = () => this.syncLogicNodes();
    this.initUI();
    this.initLogicCanvas();
    this.startGameLoop();
  }

  initUI(): void {
    this.buildElementPanel();
    this.buildControlBar();
    this.bindKeyboard();
    this.refreshPropertiesPanel();
    this.refreshHistoryList();
  }

  buildElementPanel(): void {
    const panel = document.getElementById('element-panel')!;
    panel.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '元件库';
    panel.appendChild(title);

    for (const type of elementTypes) {
      const cfg = ELEMENT_CONFIGS[type];
      const item = document.createElement('div');
      item.className = 'element-item';

      const iconWrap = document.createElement('div');
      iconWrap.className = 'element-icon';
      const icon = document.createElement('canvas');
      icon.width = 40;
      icon.height = 40;
      const ictx = icon.getContext('2d')!;
      ictx.fillStyle = '#2a2b45';
      ictx.fillRect(0, 0, 40, 40);
      const tmp = document.createElement('canvas') as HTMLCanvasElement;
      tmp.width = 32;
      tmp.height = 32;
      const tctx = tmp.getContext('2d')!;
      const elType = type;
      import('./elements').then((mod) => {
        const sample = mod.createElement(elType, 0, 0);
        sample.x = 0;
        sample.y = 0;
        mod.renderElement(tctx, sample, false, 0);
        ictx.drawImage(tmp, 4, 4);
      });
      iconWrap.appendChild(icon);

      const name = document.createElement('div');
      name.className = 'element-name';
      name.textContent = cfg.name;

      const btn = document.createElement('button');
      btn.className = 'add-btn';
      btn.textContent = '添加';
      btn.addEventListener('click', () => {
        this.board.addElement(type);
        this.refreshPropertiesPanel();
        this.syncLogicNodes();
      });

      item.appendChild(iconWrap);
      item.appendChild(name);
      item.appendChild(btn);
      panel.appendChild(item);
    }
  }

  buildControlBar(): void {
    const bar = document.getElementById('control-bar')!;
    bar.innerHTML = '';

    const startBtn = this.makeButton('开始模拟', '#2ecc71', '#27ae60');
    startBtn.id = 'btn-start';
    startBtn.addEventListener('click', () => {
      this.board.startSimulation();
      this.updateButtonStates();
    });

    const stopBtn = this.makeButton('停止', '#e74c3c', '#c0392b');
    stopBtn.id = 'btn-stop';
    stopBtn.disabled = true;
    stopBtn.addEventListener('click', () => {
      this.board.stopSimulation();
      this.updateButtonStates();
    });

    const resetBtn = this.makeButton('重置', '#3498db', '#2980b9');
    resetBtn.addEventListener('click', () => {
      this.board.reset();
      this.updateButtonStates();
      this.refreshPropertiesPanel();
    });

    const saveBtn = this.makeButton('保存', '#00d2ff', '#0099cc');
    saveBtn.addEventListener('click', () => this.handleSave());

    const loadBtn = this.makeButton('加载', '#9b59b6', '#8e44ad');
    loadBtn.addEventListener('click', () => this.toggleHistory());

    bar.appendChild(startBtn);
    bar.appendChild(stopBtn);
    bar.appendChild(resetBtn);
    bar.appendChild(saveBtn);
    bar.appendChild(loadBtn);

    const status = document.createElement('div');
    status.className = 'status-indicator';
    status.id = 'status-indicator';
    status.textContent = '就绪';
    bar.appendChild(status);
  }

  makeButton(text: string, bg: string, bgHover: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'ctrl-btn';
    btn.textContent = text;
    btn.style.background = `linear-gradient(180deg, ${bg}, ${bgHover})`;
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.95)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
    });
    return btn;
  }

  updateButtonStates(): void {
    const startBtn = document.getElementById('btn-start') as HTMLButtonElement;
    const stopBtn = document.getElementById('btn-stop') as HTMLButtonElement;
    const indicator = document.getElementById('status-indicator')!;
    if (this.board.isSimulating) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      indicator.textContent = '运行中';
      indicator.style.color = '#2ecc71';
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      indicator.textContent = '已停止';
      indicator.style.color = '#e74c3c';
    }
  }

  bindKeyboard(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedElement && document.activeElement?.tagName !== 'INPUT') {
          this.board.removeElement(this.selectedElement.id);
          this.selectedElement = null;
          this.refreshPropertiesPanel();
          this.syncLogicNodes();
        }
      }
      if (e.key === 'Escape') {
        this.isConnectingLaser = false;
        this.pendingLaserEmitterId = null;
        this.refreshPropertiesPanel();
      }
    });
  }

  handleElementSelect(el: BaseElement | null): void {
    this.selectedElement = el;

    if (this.isConnectingLaser && el) {
      if (this.pendingLaserEmitterId && el.type === 'laserReceiver') {
        const exists = this.board.laserConnections.some(
          (c) => c.emitterId === this.pendingLaserEmitterId && c.receiverId === el.id,
        );
        if (!exists) {
          this.board.laserConnections.push({
            id: uuidv4(),
            emitterId: this.pendingLaserEmitterId,
            receiverId: el.id,
          });
        }
        this.isConnectingLaser = false;
        this.pendingLaserEmitterId = null;
        this.showToast('激光连线已创建');
      } else if (el.type === 'laserEmitter') {
        this.pendingLaserEmitterId = el.id;
        this.showToast('请点击激光接收器完成连线');
      }
    }

    this.refreshPropertiesPanel();
  }

  refreshPropertiesPanel(): void {
    const panel = document.getElementById('properties-panel')!;
    panel.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '属性面板';
    panel.appendChild(title);

    if (!this.selectedElement) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = '请在画布上选择一个元件';
      panel.appendChild(hint);
      return;
    }

    const el = this.selectedElement;
    const cfg = ELEMENT_CONFIGS[el.type];

    const typeInfo = document.createElement('div');
    typeInfo.className = 'prop-row';
    typeInfo.innerHTML = `<span class="prop-label">类型</span><span class="prop-value">${cfg.name}</span>`;
    panel.appendChild(typeInfo);

    const idInfo = document.createElement('div');
    idInfo.className = 'prop-row';
    idInfo.innerHTML = `<span class="prop-label">ID</span><span class="prop-value small">${el.id.slice(0, 8)}...</span>`;
    panel.appendChild(idInfo);

    panel.appendChild(this.createNumberInput('X 坐标', el.x, (v) => {
      el.x = Math.max(0, Math.min(400 - GRID_SIZE, v));
      updateGridPosition(el);
      this.board.render();
    }));

    panel.appendChild(this.createNumberInput('Y 坐标', el.y, (v) => {
      el.y = Math.max(0, Math.min(400 - GRID_SIZE, v));
      updateGridPosition(el);
      this.board.render();
    }));

    if (el.type === 'laserEmitter') {
      panel.appendChild(this.createSelect('朝向', ['up', 'down', 'left', 'right'], el.direction || 'right', (v) => {
        el.direction = v as Direction;
        this.board.render();
      }));
    }

    if (el.type === 'pressurePlate' || el.type === 'laserReceiver' || el.type === 'door') {
      panel.appendChild(this.createSelect(
        '触发类型',
        ['manual', 'touched', 'laserHit'],
        el.triggerType || 'manual',
        (v) => {
          el.triggerType = v as TriggerType;
        },
      ));
    }

    if (el.type === 'laserEmitter' || el.type === 'laserReceiver') {
      const connectBtn = document.createElement('button');
      connectBtn.className = 'connect-btn';
      connectBtn.textContent = this.isConnectingLaser && this.pendingLaserEmitterId ? '取消连线 (Esc)' : '连线';
      connectBtn.addEventListener('click', () => {
        if (el.type === 'laserEmitter') {
          this.isConnectingLaser = true;
          this.pendingLaserEmitterId = el.id;
          this.showToast('请点击激光接收器完成连线');
        } else if (el.type === 'laserReceiver' && this.pendingLaserEmitterId) {
          this.board.laserConnections.push({
            id: uuidv4(),
            emitterId: this.pendingLaserEmitterId,
            receiverId: el.id,
          });
          this.isConnectingLaser = false;
          this.pendingLaserEmitterId = null;
          this.showToast('激光连线已创建');
        } else {
          this.showToast('请先选择激光发射器');
        }
        this.refreshPropertiesPanel();
      });
      panel.appendChild(connectBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '删除元件';
    deleteBtn.addEventListener('click', () => {
      this.board.removeElement(el.id);
      this.selectedElement = null;
      this.refreshPropertiesPanel();
      this.syncLogicNodes();
    });
    panel.appendChild(deleteBtn);
  }

  createNumberInput(label: string, value: number, onChange: (v: number) => void): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'prop-row';
    const lbl = document.createElement('span');
    lbl.className = 'prop-label';
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '32';
    input.min = '0';
    input.max = '384';
    input.value = String(value);
    input.addEventListener('change', () => {
      const v = parseInt(input.value, 10);
      if (!isNaN(v)) onChange(v);
    });
    row.appendChild(lbl);
    row.appendChild(input);
    return row;
  }

  createSelect(label: string, options: string[], value: string, onChange: (v: string) => void): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'prop-row';
    const lbl = document.createElement('span');
    lbl.className = 'prop-label';
    lbl.textContent = label;
    const sel = document.createElement('select');
    const labelMap: Record<string, string> = {
      up: '上', down: '下', left: '左', right: '右',
      manual: '手动点击', touched: '被触碰', laserHit: '激光照射',
    };
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = labelMap[opt] || opt;
      if (opt === value) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => onChange(sel.value));
    row.appendChild(lbl);
    row.appendChild(sel);
    return row;
  }

  initLogicCanvas(): void {
    this.logicCanvas = document.getElementById('logic-canvas') as HTMLCanvasElement;
    this.logicCtx = this.logicCanvas.getContext('2d')!;
    this.resizeLogicCanvas();
    window.addEventListener('resize', () => this.resizeLogicCanvas());

    this.logicCanvas.addEventListener('mousedown', this.handleLogicMouseDown);
    this.logicCanvas.addEventListener('mousemove', this.handleLogicMouseMove);
    this.logicCanvas.addEventListener('mouseup', this.handleLogicMouseUp);
    this.logicCanvas.addEventListener('mouseleave', this.handleLogicMouseUp);
    this.logicCanvas.addEventListener('click', this.handleLogicClick);
  }

  resizeLogicCanvas(): void {
    if (!this.logicCanvas) return;
    const parent = this.logicCanvas.parentElement!;
    const rect = parent.getBoundingClientRect();
    this.logicCanvas.width = rect.width;
    this.logicCanvas.height = rect.height;
  }

  getLogicMousePos(e: MouseEvent): { x: number; y: number } {
    if (!this.logicCanvas) return { x: 0, y: 0 };
    const rect = this.logicCanvas.getBoundingClientRect();
    const scaleX = this.logicCanvas.width / rect.width;
    const scaleY = this.logicCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  handleLogicMouseDown = (e: MouseEvent): void => {
    const pos = this.getLogicMousePos(e);
    const node = findNodeAt(this.logicState, pos.x, pos.y);
    if (node) {
      this.draggingLogicNode = node;
      this.logicNodeDragOffset = { x: pos.x - node.x, y: pos.y - node.y };
    }
  };

  handleLogicMouseMove = (e: MouseEvent): void => {
    const pos = this.getLogicMousePos(e);
    if (this.draggingLogicNode) {
      this.draggingLogicNode.x = pos.x - this.logicNodeDragOffset.x;
      this.draggingLogicNode.y = pos.y - this.logicNodeDragOffset.y;
    } else {
      this.hoverEdgeId = findEdgeAt(this.logicState, pos.x, pos.y);
    }
  };

  handleLogicMouseUp = (): void => {
    this.draggingLogicNode = null;
  };

  handleLogicClick = (e: MouseEvent): void => {
    const pos = this.getLogicMousePos(e);
    const edgeId = findEdgeAt(this.logicState, pos.x, pos.y);
    if (edgeId) {
      removeEdge(this.logicState, edgeId);
      this.hoverEdgeId = null;
      this.showToast('已删除逻辑连线');
      return;
    }
    const node = findNodeAt(this.logicState, pos.x, pos.y);
    if (node) {
      if (node.type === 'condition') {
        const resultNode = this.logicState.nodes.find((n) => n.type === 'result');
        if (resultNode) {
          const edge = addEdge(this.logicState, node.id, resultNode.id);
          if (edge) this.showToast('已添加逻辑连线');
        }
      }
    }
  };

  syncLogicNodes(): void {
    this.logicState.nodes = buildNodesFromElements(this.board.elements, this.logicState.nodes);
    this.logicState.edges = this.logicState.edges.filter((edge) => {
      const from = this.logicState.nodes.find((n) => n.id === edge.fromNodeId);
      const to = this.logicState.nodes.find((n) => n.id === edge.toNodeId);
      return !!from && !!to;
    });
  }

  handleSave(): void {
    const name = prompt('请输入布局名称:', `布局 ${new Date().toLocaleString()}`);
    if (!name) return;
    saveLayout(name, this.board.elements, this.board.laserConnections);
    this.showToast('已保存');
    this.refreshHistoryList();
  }

  toggleHistory(): void {
    const panel = document.getElementById('history-panel')!;
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    this.refreshHistoryList();
  }

  refreshHistoryList(): void {
    const list = document.getElementById('history-list')!;
    list.innerHTML = '';
    const layouts = loadAllLayouts();
    if (layouts.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-hint';
      empty.textContent = '暂无保存的布局';
      list.appendChild(empty);
      return;
    }
    for (const layout of layouts) {
      const item = document.createElement('div');
      item.className = 'history-item';

      const info = document.createElement('div');
      info.className = 'history-info';
      const nameEl = document.createElement('div');
      nameEl.className = 'history-name';
      nameEl.textContent = layout.name;
      const timeEl = document.createElement('div');
      timeEl.className = 'history-time';
      timeEl.textContent = formatTimestamp(layout.timestamp);
      info.appendChild(nameEl);
      info.appendChild(timeEl);

      const actions = document.createElement('div');
      actions.className = 'history-actions';

      const loadBtn = document.createElement('button');
      loadBtn.className = 'mini-btn';
      loadBtn.textContent = '加载';
      loadBtn.style.background = 'linear-gradient(180deg, #3498db, #2980b9)';
      loadBtn.addEventListener('click', () => this.handleLoad(layout));

      const delBtn = document.createElement('button');
      delBtn.className = 'mini-btn';
      delBtn.textContent = '删除';
      delBtn.style.background = 'linear-gradient(180deg, #e74c3c, #c0392b)';
      delBtn.addEventListener('click', () => {
        deleteLayout(layout.id);
        this.refreshHistoryList();
        this.showToast('已删除');
      });

      actions.appendChild(loadBtn);
      actions.appendChild(delBtn);

      item.appendChild(info);
      item.appendChild(actions);
      list.appendChild(item);
    }
  }

  handleLoad(layout: PuzzleLayout): void {
    this.board.elements = JSON.parse(JSON.stringify(layout.elements));
    this.board.laserConnections = JSON.parse(JSON.stringify(layout.laserConnections));
    this.board.selectedElementId = null;
    this.selectedElement = null;
    this.board.isSimulating = false;
    this.syncLogicNodes();
    this.refreshPropertiesPanel();
    this.updateButtonStates();
    this.board.render();
    this.showToast(`已加载: ${layout.name}`);
    document.getElementById('history-panel')!.style.display = 'none';
  }

  showToast(msg: string): void {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 1800);
  }

  startGameLoop(): void {
    const loop = (now: number) => {
      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.board.tick(delta);
      if (this.board.isSimulating) {
        evaluateLogic(this.board.elements, this.logicState);
      }
      if (this.logicCtx && this.logicCanvas) {
        renderLogicFlow(
          this.logicCtx,
          this.logicState,
          this.board.elements,
          this.logicCanvas.width,
          this.logicCanvas.height,
          this.hoverEdgeId,
        );
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
