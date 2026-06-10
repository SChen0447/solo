import {
  TerrainData,
  TerrainType,
  CharacterState,
  CANVAS_WIDTH,
  CANVAS_HEIGHT
} from './terrainData';
import { CollisionManager } from './collisionManager';
import { Renderer } from './renderer';

interface Tool {
  id: string;
  label: string;
  type: TerrainType | null;
  color: string;
  icon: string;
}

const tools: Tool[] = [
  { id: 'platform', label: '静态平台', type: 'platform', color: '#636e72', icon: '▬' },
  { id: 'slope_left_high', label: '左高斜坡', type: 'slope_left_high', color: '#d35400', icon: '◣' },
  { id: 'slope_right_high', label: '右高斜坡', type: 'slope_right_high', color: '#d35400', icon: '◢' },
  { id: 'moving_platform', label: '移动平台', type: 'moving_platform', color: '#3498db', icon: '⇌' },
  { id: 'speed_boost', label: '加速带', type: 'speed_boost', color: '#2ecc71', icon: '»' },
  { id: 'teleport', label: '传送点', type: 'teleport', color: '#9b59b6', icon: '◆' },
  { id: 'obstacle', label: '障碍物', type: 'obstacle', color: '#e74c3c', icon: '✕' }
];

class Application {
  private appContainer: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrainData: TerrainData;
  private collisionManager: CollisionManager;
  private renderer: Renderer;

  private character: CharacterState | null = null;
  private keys: Set<string> = new Set();

  private selectedTool: string | null = null;
  private selectedTerrainId: string | null = null;
  private hoverTerrainId: string | null = null;
  private previewPos: { x: number; y: number } | null = null;

  private isDragging: boolean = false;
  private dragTerrainId: string | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;

  private moveSpeed: number = 3;
  private platformSpeed: number = 2;

  private lastTime: number = 0;

  constructor() {
    this.appContainer = document.getElementById('app')!;
    this.terrainData = new TerrainData();
    this.collisionManager = new CollisionManager(this.terrainData);

    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.canvas.style.borderRadius = '8px';
    this.canvas.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    this.canvas.style.cursor = 'crosshair';

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.renderer = new Renderer(this.ctx, this.terrainData);

    this.buildUI();
    this.bindEvents();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  private buildUI(): void {
    const style = document.createElement('style');
    style.textContent = `
      .editor-container {
        display: flex;
        gap: 16px;
        padding: 16px;
        background: #0f0f1a;
        border-radius: 12px;
        align-items: flex-start;
      }

      .sidebar {
        background: #1a1a2e;
        border-radius: 16px;
        padding: 16px;
        box-shadow: 2px 2px 8px rgba(0,0,0,0.3);
        min-width: 180px;
      }

      .sidebar-title {
        font-size: 14px;
        font-weight: 600;
        color: #ecf0f1;
        margin-bottom: 12px;
        letter-spacing: 0.5px;
      }

      .tool-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .tool-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        background: #252540;
        border: 2px solid transparent;
        border-radius: 10px;
        color: #ecf0f1;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
      }

      .tool-btn:hover {
        transform: scale(1.05);
        background: #2d2d50;
        border-color: rgba(255,255,255,0.2);
      }

      .tool-btn.active {
        border-color: #f1c40f;
        background: #2d2d50;
        box-shadow: 0 0 10px rgba(241,196,15,0.3);
      }

      .tool-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        font-size: 14px;
        color: #fff;
        flex-shrink: 0;
      }

      .canvas-wrapper {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .canvas-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #1a1a2e;
        border-radius: 12px;
        box-shadow: 2px 2px 8px rgba(0,0,0,0.3);
      }

      .canvas-title {
        font-size: 15px;
        font-weight: 600;
        color: #ecf0f1;
      }

      .hint {
        font-size: 12px;
        color: #7f8c8d;
      }

      .right-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .panel {
        background: #1a1a2e;
        border-radius: 16px;
        padding: 16px;
        box-shadow: 2px 2px 8px rgba(0,0,0,0.3);
        min-width: 220px;
      }

      .panel-title {
        font-size: 14px;
        font-weight: 600;
        color: #ecf0f1;
        margin-bottom: 12px;
      }

      .control-group {
        margin-bottom: 14px;
      }

      .control-label {
        display: block;
        font-size: 12px;
        color: #95a5a6;
        margin-bottom: 6px;
      }

      .control-value {
        font-size: 11px;
        color: #f1c40f;
        margin-left: 6px;
      }

      .slider {
        width: 100%;
        height: 6px;
        -webkit-appearance: none;
        background: #252540;
        border-radius: 3px;
        outline: none;
      }

      .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: #f1c40f;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.2s;
      }

      .slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }

      .btn {
        width: 100%;
        padding: 10px 16px;
        background: linear-gradient(135deg, #3498db, #2980b9);
        border: none;
        border-radius: 10px;
        color: white;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 8px;
      }

      .btn:hover {
        transform: scale(1.05);
        background: linear-gradient(135deg, #3da0e3, #3498db);
      }

      .btn-secondary {
        background: linear-gradient(135deg, #636e72, #2d3436);
      }

      .btn-secondary:hover {
        background: linear-gradient(135deg, #7f8c8d, #636e72);
      }

      .btn-danger {
        background: linear-gradient(135deg, #e74c3c, #c0392b);
      }

      .btn-danger:hover {
        background: linear-gradient(135deg, #ec7063, #e74c3c);
      }

      .info-text {
        font-size: 12px;
        color: #95a5a6;
        line-height: 1.6;
      }

      .key {
        display: inline-block;
        padding: 2px 6px;
        background: #252540;
        border-radius: 4px;
        font-family: monospace;
        font-size: 11px;
        color: #f1c40f;
      }

      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal {
        background: #1a1a2e;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
      }

      .modal-title {
        font-size: 18px;
        font-weight: 600;
        color: #ecf0f1;
        margin-bottom: 16px;
      }

      .modal-textarea {
        flex: 1;
        min-height: 300px;
        padding: 12px;
        background: #0f0f1a;
        border: 1px solid #252540;
        border-radius: 8px;
        color: #ecf0f1;
        font-family: 'Consolas', monospace;
        font-size: 12px;
        resize: none;
        outline: none;
      }

      .modal-actions {
        display: flex;
        gap: 10px;
        margin-top: 16px;
      }

      @media (max-width: 1024px) {
        .editor-container {
          flex-direction: column;
          width: 100%;
          height: auto;
        }
        .sidebar, .panel {
          width: 100%;
        }
        .right-panel {
          width: 100%;
          flex-direction: row;
          flex-wrap: wrap;
        }
        canvas {
          max-width: 100%;
          height: auto;
        }
      }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.className = 'editor-container';

    const leftSidebar = document.createElement('div');
    leftSidebar.className = 'sidebar';

    const toolTitle = document.createElement('div');
    toolTitle.className = 'sidebar-title';
    toolTitle.textContent = '🗺️ 地形工具';
    leftSidebar.appendChild(toolTitle);

    const toolList = document.createElement('div');
    toolList.className = 'tool-list';

    for (const tool of tools) {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.dataset.tool = tool.id;
      btn.innerHTML = `
        <span class="tool-icon" style="background: ${tool.color}">${tool.icon}</span>
        <span>${tool.label}</span>
      `;
      btn.addEventListener('click', () => this.selectTool(tool.id));
      toolList.appendChild(btn);
    }

    leftSidebar.appendChild(toolList);

    const canvasWrapper = document.createElement('div');
    canvasWrapper.className = 'canvas-wrapper';

    const canvasHeader = document.createElement('div');
    canvasHeader.className = 'canvas-header';
    canvasHeader.innerHTML = `
      <div class="canvas-title">🎮 关卡画布 (800 × 600)</div>
      <div class="hint">点击工具后在画布上放置 | 按 <span class="key">R</span> 生成角色</div>
    `;
    canvasWrapper.appendChild(canvasHeader);
    canvasWrapper.appendChild(this.canvas);

    const rightPanel = document.createElement('div');
    rightPanel.className = 'right-panel';

    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'panel';
    settingsPanel.innerHTML = `
      <div class="panel-title">⚙️ 参数设置</div>
      <div class="control-group">
        <label class="control-label">
          角色移动速度
          <span class="control-value" id="speedValue">3.0</span>
        </label>
        <input type="range" class="slider" id="speedSlider" min="1" max="8" step="0.5" value="3">
      </div>
      <div class="control-group">
        <label class="control-label">
          移动平台周期(秒)
          <span class="control-value" id="platformSpeedValue">2.0</span>
        </label>
        <input type="range" class="slider" id="platformSpeedSlider" min="0.5" max="3" step="0.1" value="2">
      </div>
    `;

    const actionsPanel = document.createElement('div');
    actionsPanel.className = 'panel';
    actionsPanel.innerHTML = `
      <div class="panel-title">📋 操作</div>
      <button class="btn" id="exportBtn">📤 导出碰撞体</button>
      <button class="btn btn-secondary" id="spawnBtn">👤 生成角色 (R)</button>
      <button class="btn btn-secondary" id="clearBtn">🗑️ 清空画布</button>
      <button class="btn btn-danger" id="deleteSelectedBtn">❌ 删除选中</button>
    `;

    const helpPanel = document.createElement('div');
    helpPanel.className = 'panel';
    helpPanel.innerHTML = `
      <div class="panel-title">⌨️ 操作说明</div>
      <div class="info-text">
        <p><span class="key">W A S D</span> 控制角色移动</p>
        <p><span class="key">R</span> 在画布中心生成角色</p>
        <p>点击工具 → 画布点击放置</p>
        <p>长按组件可拖拽调整位置</p>
        <p>单击选中后可删除</p>
      </div>
    `;

    rightPanel.appendChild(settingsPanel);
    rightPanel.appendChild(actionsPanel);
    rightPanel.appendChild(helpPanel);

    container.appendChild(leftSidebar);
    container.appendChild(canvasWrapper);
    container.appendChild(rightPanel);

    this.appContainer.appendChild(container);

    this.bindUIActions();
  }

  private bindUIActions(): void {
    const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
    const speedValue = document.getElementById('speedValue')!;
    speedSlider.addEventListener('input', () => {
      this.moveSpeed = parseFloat(speedSlider.value);
      speedValue.textContent = this.moveSpeed.toFixed(1);
      if (this.character) {
        this.character.speed = this.moveSpeed;
      }
    });

    const platformSlider = document.getElementById('platformSpeedSlider') as HTMLInputElement;
    const platformValue = document.getElementById('platformSpeedValue')!;
    platformSlider.addEventListener('input', () => {
      this.platformSpeed = parseFloat(platformSlider.value);
      platformValue.textContent = this.platformSpeed.toFixed(1);
      for (const t of this.terrainData.getTerrains()) {
        if (t.type === 'moving_platform') {
          (t as any).period = this.platformSpeed;
        }
      }
    });

    document.getElementById('exportBtn')!.addEventListener('click', () => this.exportCollisionData());
    document.getElementById('spawnBtn')!.addEventListener('click', () => this.spawnCharacter());
    document.getElementById('clearBtn')!.addEventListener('click', () => {
      if (confirm('确定要清空所有地形吗？')) {
        this.terrainData.clear();
        this.selectedTerrainId = null;
      }
    });
    document.getElementById('deleteSelectedBtn')!.addEventListener('click', () => {
      if (this.selectedTerrainId) {
        this.terrainData.removeTerrain(this.selectedTerrainId);
        this.selectedTerrainId = null;
      }
    });
  }

  private selectTool(toolId: string): void {
    if (this.selectedTool === toolId) {
      this.selectedTool = null;
    } else {
      this.selectedTool = toolId;
    }
    this.selectedTerrainId = null;
    this.updateToolButtons();
  }

  private updateToolButtons(): void {
    document.querySelectorAll('.tool-btn').forEach((btn) => {
      const el = btn as HTMLElement;
      if (el.dataset.tool === this.selectedTool) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  private spawnCharacter(): void {
    this.character = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: 12,
      speed: this.moveSpeed,
      isOnGround: false,
      isOnSlope: false,
      isOnMovingPlatform: false,
      attachedPlatformId: null,
      stunned: false,
      stunTimer: 0,
      blinkTimer: 0
    };
  }

  private exportCollisionData(): void {
    const json = this.collisionManager.exportCollisionData();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-title">📄 碰撞体数据 (JSON)</div>
      <textarea class="modal-textarea" readonly>${json}</textarea>
      <div class="modal-actions">
        <button class="btn" id="copyBtn">📋 复制到剪贴板</button>
        <button class="btn btn-secondary" id="closeModalBtn">关闭</button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const textarea = modal.querySelector('.modal-textarea') as HTMLTextAreaElement;

    document.getElementById('copyBtn')!.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(json);
        textarea.select();
        alert('已复制到剪贴板！');
      } catch {
        textarea.select();
        document.execCommand('copy');
        alert('已复制到剪贴板！');
      }
    });

    const close = () => backdrop.remove();
    document.getElementById('closeModalBtn')!.addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.dragTerrainId = null;
      this.previewPos = null;
      this.hoverTerrainId = null;
    });

    document.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
      if (e.key === 'r' || e.key === 'R') {
        this.spawnCharacter();
      }
      if (e.key === 'Delete' && this.selectedTerrainId) {
        this.terrainData.removeTerrain(this.selectedTerrainId);
        this.selectedTerrainId = null;
      }
      if (e.key === 'Escape') {
        this.selectedTool = null;
        this.selectedTerrainId = null;
        this.updateToolButtons();
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });
  }

  private onMouseDown(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);

    const terrain = this.terrainData.getTerrainAt(x, y);

    if (this.selectedTool) {
      const tool = tools.find((t) => t.id === this.selectedTool);
      if (tool && tool.type) {
        let w = 100;
        let h = 20;
        if (tool.type === 'obstacle') {
          w = 30;
          h = 30;
        }
        if (tool.type === 'teleport') {
          w = 40;
          h = 40;
        }
        const newTerrain = this.terrainData.addTerrain(
          tool.type,
          x - w / 2,
          y - h / 2,
          w,
          h
        );
        if (newTerrain.type === 'moving_platform') {
          (newTerrain as any).period = this.platformSpeed;
        }
        this.selectedTerrainId = newTerrain.id;
        this.dragTerrainId = newTerrain.id;
        this.dragOffsetX = w / 2;
        this.dragOffsetY = h / 2;
        this.isDragging = true;
        return;
      }
    }

    if (terrain) {
      this.selectedTerrainId = terrain.id;
      this.dragTerrainId = terrain.id;
      this.dragOffsetX = x - terrain.x;
      this.dragOffsetY = y - terrain.y;
      this.isDragging = true;
    } else {
      this.selectedTerrainId = null;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);

    if (this.isDragging && this.dragTerrainId) {
      this.terrainData.moveTerrain(
        this.dragTerrainId,
        x - this.dragOffsetX,
        y - this.dragOffsetY
      );
    } else {
      const terrain = this.terrainData.getTerrainAt(x, y);
      this.hoverTerrainId = terrain ? terrain.id : null;
    }

    if (this.selectedTool && !this.isDragging) {
      this.previewPos = { x, y };
    } else {
      this.previewPos = null;
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isDragging = false;
    this.dragTerrainId = null;
  }

  private loop(currentTime: number): void {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.terrainData.updateMovingPlatforms(deltaTime);

    if (this.character) {
      this.collisionManager.updateCharacter(this.character, this.keys, deltaTime);
    }

    this.renderer.render(
      this.character,
      this.selectedTool,
      this.selectedTerrainId,
      this.hoverTerrainId,
      this.previewPos
    );

    requestAnimationFrame(this.loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Application();
});
