import { formatTime } from './dayCycle';

export interface ControlState {
  time: number;
  speed: number;
  ambientIntensity: number;
  isPlaying: boolean;
}

export type ControlEvent = 'timeChange' | 'speedChange' | 'ambientChange' | 'playToggle' | 'presetJump' | 'saveScreenshot';

export type EventCallback = (value: number | boolean | ControlState) => void;

export class Controls {
  private container: HTMLElement;
  private state: ControlState;
  private subscribers: Map<ControlEvent, EventCallback[]> = new Map();
  private timeSlider!: HTMLInputElement;
  private timeDisplay!: HTMLElement;
  private speedSelect!: HTMLSelectElement;
  private playToggleBtn!: HTMLButtonElement;
  private ambientSlider!: HTMLInputElement;
  private ambientDisplay!: HTMLElement;

  constructor(container: HTMLElement, initialState: ControlState) {
    this.container = container;
    this.state = { ...initialState };
    this.render();
    this.bindEvents();
  }

  subscribe(event: ControlEvent, callback: EventCallback): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);
  }

  private emit(event: ControlEvent, value: number | boolean | ControlState): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(value));
    }
  }

  getState(): ControlState {
    return { ...this.state };
  }

  setTime(time: number, emitEvent = true): void {
    this.state.time = ((time % 24) + 24) % 24;
    this.timeSlider.value = this.state.time.toString();
    this.timeDisplay.textContent = formatTime(this.state.time);
    if (emitEvent) {
      this.emit('timeChange', this.state.time);
    }
  }

  setPlaying(playing: boolean): void {
    this.state.isPlaying = playing;
    this.updatePlayButton();
    this.emit('playToggle', playing);
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="control-panel">
        <div class="panel-title">昼夜循环控制面板</div>

        <div class="control-group">
          <div class="group-title">时间控制</div>
          <div class="time-display" id="timeDisplay">08:00</div>
          <input type="range" id="timeSlider" class="slider time-slider" min="0" max="24" step="0.01" value="8" />
          <div class="slider-labels">
            <span>00:00</span>
            <span>12:00</span>
            <span>24:00</span>
          </div>
        </div>

        <div class="control-group">
          <div class="group-title">时间加速</div>
          <div class="speed-row">
            <select id="speedSelect" class="speed-select">
              <option value="1" selected>1x</option>
              <option value="2">2x</option>
              <option value="5">5x</option>
              <option value="10">10x</option>
            </select>
            <button id="playToggleBtn" class="play-btn">
              <span class="play-icon">▶</span>
            </button>
          </div>
        </div>

        <div class="control-group">
          <div class="group-title">环境光强度</div>
          <div class="ambient-display" id="ambientDisplay">1.0</div>
          <input type="range" id="ambientSlider" class="slider ambient-slider" min="0.5" max="1.5" step="0.1" value="1" />
          <div class="slider-labels">
            <span>0.5</span>
            <span>1.0</span>
            <span>1.5</span>
          </div>
        </div>

        <div class="control-group">
          <div class="group-title">预设时间</div>
          <div class="preset-buttons">
            <button class="preset-btn sunrise" data-time="6">日出 06:00</button>
            <button class="preset-btn noon" data-time="12">正午 12:00</button>
            <button class="preset-btn sunset" data-time="18">黄昏 18:00</button>
          </div>
        </div>

        <div class="control-group">
          <button id="saveBtn" class="save-btn">保存预览</button>
        </div>
      </div>

      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .control-panel {
          width: 280px;
          background: #1a1a2e;
          color: #e0e0e0;
          padding: 20px;
          border-radius: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .panel-title {
          font-size: 16px;
          font-weight: 600;
          text-align: center;
          margin-bottom: 20px;
          text-shadow: 0 0 8px #00b894, 0 0 16px rgba(0, 184, 148, 0.4);
          letter-spacing: 1px;
        }

        .control-group {
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #2d3436;
        }

        .control-group:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .group-title {
          font-size: 13px;
          color: #b0b0b0;
          margin-bottom: 10px;
          font-weight: 500;
        }

        .time-display, .ambient-display {
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          color: #00b894;
          margin-bottom: 10px;
          font-variant-numeric: tabular-nums;
          letter-spacing: 2px;
        }

        .ambient-display {
          font-size: 18px;
          color: #74b9ff;
        }

        .slider {
          width: 100%;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          border-radius: 3px;
          outline: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .slider:hover {
          box-shadow: 0 0 0 2px rgba(0, 184, 148, 0.3);
        }

        .time-slider {
          background: linear-gradient(to right,
            #0a0a2e 0%,
            #ff9f43 25%,
            #87ceeb 50%,
            #ff9f43 75%,
            #0a0a2e 100%);
        }

        .ambient-slider {
          background: linear-gradient(to right, #2d3436, #74b9ff);
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #00b894;
          cursor: pointer;
          border: 2px solid #fff;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 0 0 3px rgba(0, 184, 148, 0.4), 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        .slider::-webkit-slider-thumb:active {
          transform: scale(1.05);
        }

        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #00b894;
          cursor: pointer;
          border: 2px solid #fff;
          transition: all 0.2s ease;
        }

        .slider-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #808080;
          margin-top: 6px;
        }

        .speed-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .speed-select {
          flex: 1;
          padding: 8px 12px;
          background: #2d3436;
          color: #e0e0e0;
          border: 2px solid transparent;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          outline: none;
        }

        .speed-select:hover {
          border-color: #00b894;
        }

        .speed-select:focus {
          border-color: #00b894;
          box-shadow: 0 0 0 3px rgba(0, 184, 148, 0.2);
        }

        .play-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #00b894;
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 184, 148, 0.4);
        }

        .play-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 4px 12px rgba(0, 184, 148, 0.6);
        }

        .play-btn:active {
          transform: scale(1.02);
        }

        .play-btn.paused {
          background: #636e72;
          box-shadow: 0 2px 8px rgba(99, 110, 114, 0.4);
        }

        .play-btn.paused:hover {
          box-shadow: 0 4px 12px rgba(99, 110, 114, 0.6);
        }

        .play-icon {
          font-size: 14px;
          line-height: 1;
        }

        .preset-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .preset-btn {
          padding: 10px 14px;
          border: 2px solid transparent;
          border-radius: 8px;
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .preset-btn:hover {
          transform: scale(1.02);
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .preset-btn:active {
          transform: scale(0.98);
        }

        .preset-btn.sunrise { background: #ff9f43; }
        .preset-btn.sunrise:hover { background: #ffbe76; }

        .preset-btn.noon { background: #f39c12; }
        .preset-btn.noon:hover { background: #f1c40f; }

        .preset-btn.sunset { background: #e17055; }
        .preset-btn.sunset:hover { background: #fab1a0; }

        .save-btn {
          width: 100%;
          padding: 12px;
          background: #0984e3;
          color: #fff;
          border: 2px solid transparent;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .save-btn:hover {
          background: #74b9ff;
          transform: scale(1.02);
          box-shadow: 0 4px 16px rgba(9, 132, 227, 0.5);
        }

        .save-btn:active {
          transform: scale(0.98);
        }
      </style>
    `;

    this.timeSlider = this.container.querySelector('#timeSlider') as HTMLInputElement;
    this.timeDisplay = this.container.querySelector('#timeDisplay') as HTMLElement;
    this.speedSelect = this.container.querySelector('#speedSelect') as HTMLSelectElement;
    this.playToggleBtn = this.container.querySelector('#playToggleBtn') as HTMLButtonElement;
    this.ambientSlider = this.container.querySelector('#ambientSlider') as HTMLInputElement;
    this.ambientDisplay = this.container.querySelector('#ambientDisplay') as HTMLElement;
  }

  private bindEvents(): void {
    this.timeSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.setTime(val);
    });

    this.speedSelect.addEventListener('change', (e) => {
      const val = parseInt((e.target as HTMLSelectElement).value, 10);
      this.state.speed = val;
      this.emit('speedChange', val);
    });

    this.playToggleBtn.addEventListener('click', () => {
      this.setPlaying(!this.state.isPlaying);
    });

    this.ambientSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.state.ambientIntensity = val;
      this.ambientDisplay.textContent = val.toFixed(1);
      this.emit('ambientChange', val);
    });

    const presetBtns = this.container.querySelectorAll('.preset-btn');
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const time = parseFloat(target.dataset.time || '12');
        this.emit('presetJump', time);
      });
    });

    const saveBtn = this.container.querySelector('#saveBtn');
    saveBtn?.addEventListener('click', () => {
      this.emit('saveScreenshot', true);
    });
  }

  private updatePlayButton(): void {
    const icon = this.playToggleBtn.querySelector('.play-icon') as HTMLElement;
    if (this.state.isPlaying) {
      this.playToggleBtn.classList.remove('paused');
      icon.textContent = '⏸';
    } else {
      this.playToggleBtn.classList.add('paused');
      icon.textContent = '▶';
    }
  }
}
