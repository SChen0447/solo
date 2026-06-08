import { TrajectoryManager } from './trajectoryManager';
import { SceneController } from './sceneController';

export type Mode = 'draw' | 'rotate';

export interface UICallbacks {
  onModeChange: (mode: Mode) => void;
  onSymmetricToggle: (enabled: boolean) => void;
  onWidthChange: (width: number) => void;
  onOpacityChange: (opacity: number) => void;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export class UIController {
  private trajectoryManager: TrajectoryManager;
  private sceneController: SceneController;
  private callbacks: UICallbacks;

  private panel: HTMLDivElement;
  private mode: Mode = 'draw';

  private widthSlider: HTMLInputElement | null = null;
  private opacitySlider: HTMLInputElement | null = null;
  private widthValue: HTMLSpanElement | null = null;
  private opacityValue: HTMLSpanElement | null = null;
  private selectedInfo: HTMLDivElement | null = null;
  private statusBar: HTMLDivElement | null = null;

  private fileInput: HTMLInputElement | null = null;

  constructor(
    trajectoryManager: TrajectoryManager,
    sceneController: SceneController,
    callbacks: UICallbacks
  ) {
    this.trajectoryManager = trajectoryManager;
    this.sceneController = sceneController;
    this.callbacks = callbacks;

    this.panel = this.createPanel();
    this.statusBar = document.getElementById('statusBar') as HTMLDivElement;

    this.setupFileDrop();
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'control-panel';

    panel.innerHTML = `
      <div class="panel-title">3D 雕塑控制台</div>

      <div class="panel-section">
        <div class="section-label">操作模式</div>
        <button class="btn btn-primary" id="modeBtn">模式: 绘制</button>
      </div>

      <div class="panel-section">
        <div class="section-label">对称模式</div>
        <div class="toggle-container">
          <span class="toggle-label">启用对称</span>
          <div class="toggle-switch" id="symmetricToggle"></div>
        </div>
      </div>

      <div class="panel-section">
        <div class="section-label">选中轨迹</div>
        <div class="selected-info hidden" id="selectedInfo">
          未选中轨迹
        </div>

        <div class="slider-container" id="widthSliderContainer">
          <div class="slider-label">
            <span>宽度</span>
            <span class="slider-value" id="widthValue">0.05</span>
          </div>
          <input type="range" id="widthSlider" min="0.02" max="0.2" step="0.01" value="0.05">
        </div>

        <div class="slider-container" id="opacitySliderContainer">
          <div class="slider-label">
            <span>透明度</span>
            <span class="slider-value" id="opacityValue">1.00</span>
          </div>
          <input type="range" id="opacitySlider" min="0.3" max="1.0" step="0.05" value="1.0">
        </div>

        <button class="btn btn-danger" id="deleteBtn">删除选中轨迹</button>
      </div>

      <div class="panel-section">
        <div class="section-label">全局操作</div>
        <button class="btn btn-danger" id="clearBtn">清空所有轨迹</button>
      </div>

      <div class="panel-section">
        <div class="section-label">导入导出</div>
        <button class="btn btn-primary" id="exportBtn">导出场景为 JSON</button>
        <button class="btn" id="importBtn">导入 JSON 文件</button>
        <input type="file" id="fileInput" accept=".json" style="display: none;">
      </div>
    `;

    document.body.appendChild(panel);

    this.widthSlider = panel.querySelector('#widthSlider') as HTMLInputElement;
    this.opacitySlider = panel.querySelector('#opacitySlider') as HTMLInputElement;
    this.widthValue = panel.querySelector('#widthValue') as HTMLSpanElement;
    this.opacityValue = panel.querySelector('#opacityValue') as HTMLSpanElement;
    this.selectedInfo = panel.querySelector('#selectedInfo') as HTMLDivElement;
    this.fileInput = panel.querySelector('#fileInput') as HTMLInputElement;

    this.bindEvents(panel);

    return panel;
  }

  private bindEvents(panel: HTMLDivElement): void {
    const modeBtn = panel.querySelector('#modeBtn') as HTMLButtonElement;
    modeBtn.addEventListener('click', () => {
      this.toggleMode();
    });

    const symmetricToggle = panel.querySelector('#symmetricToggle') as HTMLDivElement;
    symmetricToggle.addEventListener('click', () => {
      symmetricToggle.classList.toggle('active');
      const enabled = symmetricToggle.classList.contains('active');
      this.callbacks.onSymmetricToggle(enabled);
    });

    this.widthSlider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.widthValue!.textContent = value.toFixed(2);
      this.callbacks.onWidthChange(value);
    });

    this.opacitySlider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.opacityValue!.textContent = value.toFixed(2);
      this.callbacks.onOpacityChange(value);
    });

    const deleteBtn = panel.querySelector('#deleteBtn') as HTMLButtonElement;
    deleteBtn.addEventListener('click', () => {
      this.callbacks.onDeleteSelected();
    });

    const clearBtn = panel.querySelector('#clearBtn') as HTMLButtonElement;
    clearBtn.addEventListener('click', () => {
      if (confirm('确定要清空所有轨迹吗？')) {
        this.callbacks.onClearAll();
      }
    });

    const exportBtn = panel.querySelector('#exportBtn') as HTMLButtonElement;
    exportBtn.addEventListener('click', () => {
      this.callbacks.onExport();
    });

    const importBtn = panel.querySelector('#importBtn') as HTMLButtonElement;
    importBtn.addEventListener('click', () => {
      this.fileInput?.click();
    });

    this.fileInput?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.callbacks.onImport(file);
      }
      if (this.fileInput) {
        this.fileInput.value = '';
      }
    });
  }

  private toggleMode(): void {
    this.mode = this.mode === 'draw' ? 'rotate' : 'draw';
    const modeBtn = this.panel.querySelector('#modeBtn') as HTMLButtonElement;
    modeBtn.textContent = `模式: ${this.mode === 'draw' ? '绘制' : '旋转视角'}`;

    const canvas = this.sceneController.getRendererDomElement();
    canvas.style.cursor = this.mode === 'draw' ? 'crosshair' : 'grab';

    this.callbacks.onModeChange(this.mode);
  }

  public getMode(): Mode {
    return this.mode;
  }

  public updateSelectedInfo(): void {
    const selected = this.trajectoryManager.getSelectedTrajectory();

    if (selected) {
      this.selectedInfo?.classList.remove('hidden');
      this.selectedInfo!.textContent = `已选中 (${selected.points.length} 个点)`;

      if (this.widthSlider) {
        this.widthSlider.value = selected.width.toString();
        this.widthValue!.textContent = selected.width.toFixed(2);
      }
      if (this.opacitySlider) {
        this.opacitySlider.value = selected.opacity.toString();
        this.opacityValue!.textContent = selected.opacity.toFixed(2);
      }
    } else {
      this.selectedInfo?.classList.add('hidden');
    }
  }

  public updateStatusBar(): void {
    if (!this.statusBar) return;

    const count = this.trajectoryManager.getTrajectoryCount();
    const modeText = this.mode === 'draw' ? '绘制' : '旋转视角';
    this.statusBar.textContent = `模式: ${modeText} | 轨迹数: ${count}`;
  }

  private setupFileDrop(): void {
    const overlay = document.getElementById('fileDropOverlay') as HTMLDivElement;
    const canvas = this.sceneController.getRendererDomElement();

    let dragCounter = 0;

    canvas.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        overlay.classList.add('active');
      }
    });

    canvas.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        overlay.classList.remove('active');
      }
    });

    canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      overlay.classList.remove('active');

      const file = e.dataTransfer?.files?.[0];
      if (file && file.name.endsWith('.json')) {
        this.callbacks.onImport(file);
      }
    });
  }

  public showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(-100px);
      padding: 12px 24px;
      background: rgba(0, 210, 255, 0.9);
      color: #fff;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000;
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 20px rgba(0, 210, 255, 0.4);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      notification.style.transform = 'translateX(-50%) translateY(-100px)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 2000);
  }

  public dispose(): void {
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
  }
}
