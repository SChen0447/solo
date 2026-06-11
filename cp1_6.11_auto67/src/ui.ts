export interface UICallbacks {
  onWindSpeedChange: (speed: number) => void;
  onWindDirectionChange: (angleDeg: number) => void;
  onSwitchView: () => void;
  onReset: () => void;
  onSeedChange?: (seed: number) => void;
}

export class UIManager {
  private container: HTMLElement;
  private callbacks: UICallbacks;
  private panel!: HTMLDivElement;
  private windSpeedSlider!: HTMLInputElement;
  private windSpeedValue!: HTMLSpanElement;
  private windDirSlider!: HTMLInputElement;
  private windDirValue!: HTMLSpanElement;
  private viewModeLabel!: HTMLSpanElement;
  private fpsCounter!: HTMLSpanElement;
  private fireCountLabel!: HTMLSpanElement;

  private currentViewMode: number = 2;
  private readonly viewModeNames: string[] = ['第一人称', '第二人称', '第三人称'];

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.createStyles();
    this.createPanel();
    this.bindEvents();
  }

  private createStyles() {
    const styleId = 'ff-sim-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .ff-panel {
        position: absolute;
        top: 20px;
        left: 20px;
        width: 300px;
        padding: 20px 22px;
        background: rgba(40, 56, 78, 0.55);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 100;
        user-select: none;
      }
      .ff-panel h2 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 18px;
        color: #e0e6ed;
        letter-spacing: 1px;
        border-bottom: 1px solid rgba(255,255,255,0.12);
        padding-bottom: 10px;
      }
      .ff-control-group {
        margin-bottom: 16px;
      }
      .ff-control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        color: #b0bec5;
        margin-bottom: 7px;
      }
      .ff-control-value {
        color: #4fc3f7;
        font-weight: 600;
        font-size: 13px;
      }
      .ff-slider {
        width: 100%;
        -webkit-appearance: none;
        appearance: none;
        height: 6px;
        background: rgba(255,255,255,0.12);
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }
      .ff-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #4fc3f7, #29b6f6);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(79, 195, 247, 0.5);
        transition: transform 0.15s ease;
      }
      .ff-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      .ff-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #4fc3f7, #29b6f6);
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 8px rgba(79, 195, 247, 0.5);
      }
      .ff-btn-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 18px;
      }
      .ff-btn {
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 600;
        color: #e0e6ed;
        background: rgba(79, 195, 247, 0.15);
        border: 1px solid rgba(79, 195, 247, 0.4);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1);
        font-family: inherit;
        letter-spacing: 0.5px;
      }
      .ff-btn:hover {
        background: rgba(79, 195, 247, 0.28);
        border-color: rgba(79, 195, 247, 0.6);
      }
      .ff-btn:active {
        transform: translateY(2px);
        transition-duration: 0.1s;
      }
      .ff-btn.reset-btn {
        background: rgba(239, 83, 80, 0.15);
        border-color: rgba(239, 83, 80, 0.4);
      }
      .ff-btn.reset-btn:hover {
        background: rgba(239, 83, 80, 0.28);
        border-color: rgba(239, 83, 80, 0.6);
      }
      .ff-hint {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid rgba(255,255,255,0.1);
        font-size: 11px;
        color: #78909c;
        line-height: 1.6;
      }
      .ff-hint kbd {
        display: inline-block;
        padding: 1px 6px;
        background: rgba(255,255,255,0.08);
        border-radius: 3px;
        border: 1px solid rgba(255,255,255,0.15);
        font-family: inherit;
        color: #b0bec5;
        font-size: 10px;
      }
      .ff-stats {
        margin-top: 14px;
        padding: 10px 12px;
        background: rgba(0,0,0,0.2);
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.06);
      }
      .ff-stat-row {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #90a4ae;
        margin-bottom: 4px;
      }
      .ff-stat-row:last-child {
        margin-bottom: 0;
      }
      .ff-stat-value {
        color: #81c784;
        font-weight: 600;
      }
      .ff-stat-value.warn {
        color: #ffb74d;
      }
      .ff-stat-value.danger {
        color: #ef5350;
      }
      .ff-wind-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 8px 0 4px 0;
      }
      .ff-wind-arrow {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      .ff-wind-arrow svg {
        position: absolute;
        transition: transform 0.25s ease;
      }
      .ff-title-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
      }
      .ff-title-icon {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }

  private createPanel() {
    this.panel = document.createElement('div');
    this.panel.className = 'ff-panel';
    this.panel.innerHTML = `
      <div class="ff-title-bar">
        <svg class="ff-title-icon" viewBox="0 0 24 24" fill="none" stroke="#ef5350" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1.5.5-2.5 1-3.5"/>
          <path d="M12 22c5.5 0 8-4 8-8 0-3-1.5-5-3.5-7-2 2-3.5 4-3.5 7 0 3 1 5 1 5s-1-3-4-3-2.5 6-2.5 6z"/>
        </svg>
        <h2 style="margin:0;border:none;padding:0;">森林火灾模拟系统</h2>
      </div>

      <div class="ff-control-group">
        <div class="ff-control-label">
          <span>风速 (m/s)</span>
          <span class="ff-control-value" id="ff-wind-speed-val">1.0</span>
        </div>
        <input type="range" class="ff-slider" id="ff-wind-speed" min="0" max="5" step="0.1" value="1.0">
      </div>

      <div class="ff-control-group">
        <div class="ff-control-label">
          <span>风向 (°)</span>
          <span class="ff-control-value" id="ff-wind-dir-val">0°</span>
        </div>
        <div class="ff-wind-indicator">
          <div class="ff-wind-arrow" id="ff-wind-arrow-box">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" id="ff-wind-arrow">
              <path d="M12 2L5 9h4v11h6V9h4z"/>
            </svg>
          </div>
        </div>
        <input type="range" class="ff-slider" id="ff-wind-dir" min="0" max="359" step="1" value="0">
      </div>

      <div class="ff-btn-row">
        <button class="ff-btn" id="ff-view-btn">切换视角</button>
        <button class="ff-btn reset-btn" id="ff-reset-btn">重置</button>
      </div>

      <div class="ff-stats">
        <div class="ff-stat-row">
          <span>当前视角</span>
          <span class="ff-stat-value" id="ff-view-mode">第三人称</span>
        </div>
        <div class="ff-stat-row">
          <span>帧率 FPS</span>
          <span class="ff-stat-value" id="ff-fps">60</span>
        </div>
        <div class="ff-stat-row">
          <span>燃烧区域</span>
          <span class="ff-stat-value" id="ff-fire-count">0</span>
        </div>
      </div>

      <div class="ff-hint">
        <div><kbd>鼠标点击</kbd> 地形放置火源</div>
        <div><kbd>鼠标拖拽</kbd> 旋转视角</div>
        <div><kbd>滚轮</kbd> 缩放场景</div>
        <div><kbd>空格</kbd> 循环切换视角</div>
      </div>
    `;
    this.container.appendChild(this.panel);

    this.windSpeedSlider = this.panel.querySelector('#ff-wind-speed') as HTMLInputElement;
    this.windSpeedValue = this.panel.querySelector('#ff-wind-speed-val') as HTMLSpanElement;
    this.windDirSlider = this.panel.querySelector('#ff-wind-dir') as HTMLInputElement;
    this.windDirValue = this.panel.querySelector('#ff-wind-dir-val') as HTMLSpanElement;
    this.viewModeLabel = this.panel.querySelector('#ff-view-mode') as HTMLSpanElement;
    this.fpsCounter = this.panel.querySelector('#ff-fps') as HTMLSpanElement;
    this.fireCountLabel = this.panel.querySelector('#ff-fire-count') as HTMLSpanElement;
  }

  private bindEvents() {
    this.windSpeedSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.windSpeedValue.textContent = val.toFixed(1);
      this.callbacks.onWindSpeedChange(val);
    });

    this.windDirSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      this.windDirValue.textContent = val + '°';
      this.updateWindArrow(val);
      this.callbacks.onWindDirectionChange(val);
    });

    const viewBtn = this.panel.querySelector('#ff-view-btn') as HTMLButtonElement;
    viewBtn.addEventListener('click', () => this.handleViewSwitch());

    const resetBtn = this.panel.querySelector('#ff-reset-btn') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => this.callbacks.onReset());
  }

  private updateWindArrow(angleDeg: number) {
    const arrow = this.panel.querySelector('#ff-wind-arrow') as SVGElement;
    arrow.style.transform = `rotate(${angleDeg}deg)`;
  }

  private handleViewSwitch() {
    this.currentViewMode = (this.currentViewMode + 1) % 3;
    this.viewModeLabel.textContent = this.viewModeNames[this.currentViewMode];
    this.callbacks.onSwitchView();
  }

  public cycleViewMode() {
    this.handleViewSwitch();
  }

  public setViewMode(mode: number) {
    this.currentViewMode = ((mode % 3) + 3) % 3;
    this.viewModeLabel.textContent = this.viewModeNames[this.currentViewMode];
  }

  public getViewMode(): number {
    return this.currentViewMode;
  }

  public updateFPS(fps: number) {
    this.fpsCounter.textContent = fps.toFixed(0);
    if (fps >= 40) {
      this.fpsCounter.className = 'ff-stat-value';
    } else if (fps >= 25) {
      this.fpsCounter.className = 'ff-stat-value warn';
    } else {
      this.fpsCounter.className = 'ff-stat-value danger';
    }
  }

  public updateFireCount(count: number) {
    this.fireCountLabel.textContent = count.toString();
    if (count > 50) {
      this.fireCountLabel.className = 'ff-stat-value danger';
    } else if (count > 20) {
      this.fireCountLabel.className = 'ff-stat-value warn';
    } else {
      this.fireCountLabel.className = 'ff-stat-value';
    }
  }

  public getWindSpeed(): number {
    return parseFloat(this.windSpeedSlider.value);
  }

  public getWindDirection(): number {
    return parseInt(this.windDirSlider.value);
  }
}

export class Minimap {
  private container: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private panel!: HTMLDivElement;
  private size: number = 180;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createMinimap();
  }

  private createMinimap() {
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: ${this.size + 24}px;
      padding: 12px;
      background: rgba(20, 30, 45, 0.65);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
      z-index: 100;
      user-select: none;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 12px;
      color: #b0bec5;
      margin-bottom: 8px;
      font-weight: 600;
      letter-spacing: 0.5px;
    `;
    title.textContent = '小地图';

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.cssText = `
      display: block;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08);
    `;
    this.ctx = this.canvas.getContext('2d')!;

    this.panel.appendChild(title);
    this.panel.appendChild(this.canvas);
    this.container.appendChild(this.panel);
  }

  public update(
    heightField: number[][],
    fireFront: Set<string>,
    burnGrid: { burning: boolean; burnTime: number }[][],
    gridCols: number,
    gridRows: number,
    cameraPosition: { x: number; z: number },
    cameraAngle: number,
    terrainSize: number
  ) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cellW = w / gridCols;
    const cellH = h / gridRows;

    const segStep = heightField.length - 1;
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const hr = Math.min(segStep, Math.floor((r / gridRows) * segStep));
        const hc = Math.min(segStep, Math.floor((c / gridCols) * segStep));
        const rawH = heightField[hr]?.[hc] ?? 5;
        const normalizedH = Math.max(0, Math.min(1, (rawH - 5) / 30));

        let rC: number, gC: number, bC: number;
        if (normalizedH < 0.15) {
          const t = normalizedH / 0.15;
          rC = Math.floor(143 - 30 * t);
          gC = Math.floor(188 - 20 * t);
          bC = Math.floor(143 - 30 * t);
        } else if (normalizedH < 0.5) {
          const t = (normalizedH - 0.15) / 0.35;
          rC = Math.floor(60 - 20 * t);
          gC = Math.floor(179 - 50 * t);
          bC = Math.floor(113 - 50 * t);
        } else if (normalizedH < 0.75) {
          const t = (normalizedH - 0.5) / 0.25;
          rC = Math.floor(34 + 70 * t);
          gC = Math.floor(139 - 30 * t);
          bC = Math.floor(34 + 10 * t);
        } else {
          const t = (normalizedH - 0.75) / 0.25;
          rC = Math.floor(107 + 80 * t);
          gC = Math.floor(142 - 40 * t);
          bC = Math.floor(35);
        }

        const cell = burnGrid[r]?.[c];
        if (cell) {
          if (cell.burning) {
            rC = Math.floor(220 + 30 * Math.random());
            gC = Math.floor(50 + 60 * Math.random());
            bC = 20;
          } else if (cell.burnTime > 0) {
            rC = 80; gC = 55; bC = 40;
          }
        }

        ctx.fillStyle = `rgb(${rC},${gC},${bC})`;
        ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    ctx.strokeStyle = 'rgba(255, 120, 40, 0.95)';
    ctx.lineWidth = 1.5;
    for (const key of fireFront) {
      const [rowStr, colStr] = key.split(',');
      const row = parseInt(rowStr);
      const col = parseInt(colStr);
      ctx.strokeRect(col * cellW + 0.5, row * cellH + 0.5, cellW - 1, cellH - 1);
    }

    const camX = ((cameraPosition.x + terrainSize / 2) / terrainSize) * w;
    const camZ = ((cameraPosition.z + terrainSize / 2) / terrainSize) * h;
    const indicatorR = Math.min(w, h) * 0.05;

    ctx.save();
    ctx.translate(camX, camZ);
    ctx.rotate(cameraAngle);
    ctx.fillStyle = 'rgba(79, 195, 247, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -indicatorR);
    ctx.lineTo(-indicatorR * 0.7, indicatorR * 0.7);
    ctx.lineTo(indicatorR * 0.7, indicatorR * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(camX, camZ, indicatorR * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  public setSize(size: number) {
    this.size = size;
    this.canvas.width = size;
    this.canvas.height = size;
    this.panel.style.width = (size + 24) + 'px';
  }
}
