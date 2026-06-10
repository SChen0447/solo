export interface UIState {
  isPaused: boolean;
  timeMultiplier: number;
  followPlanetName: string | null;
}

export class UIManager {
  private container: HTMLElement;
  private controlPanel: HTMLElement;
  private statsPanel: HTMLElement;
  private planetSelectContainer: HTMLElement;
  private followPlanetDisplay: HTMLElement;
  private timeDisplay: HTMLElement;
  private avgSpeedDisplay: HTMLElement;
  private eccentricityDisplay: HTMLElement;
  private pauseButton: HTMLButtonElement;
  private resetButton: HTMLButtonElement;
  private timeSlider: HTMLInputElement;
  private timeValueLabel: HTMLElement;
  private planetButtons: HTMLButtonElement[] = [];

  private state: UIState = {
    isPaused: false,
    timeMultiplier: 1.0,
    followPlanetName: null
  };

  private eventTarget: EventTarget;
  private planetNames: string[] = [];

  constructor(container: HTMLElement, planetNames: string[]) {
    this.container = container;
    this.planetNames = planetNames;
    this.eventTarget = new EventTarget();

    this.controlPanel = this.createControlPanel();
    this.statsPanel = this.createStatsPanel();

    this.container.appendChild(this.statsPanel);
    this.container.appendChild(this.controlPanel);

    this.timeDisplay = document.getElementById('time-display') as HTMLElement;
    this.avgSpeedDisplay = document.getElementById('avg-speed-display') as HTMLElement;
    this.eccentricityDisplay = document.getElementById('eccentricity-display') as HTMLElement;
    this.followPlanetDisplay = document.getElementById('follow-planet-display') as HTMLElement;
    this.pauseButton = document.getElementById('pause-btn') as HTMLButtonElement;
    this.resetButton = document.getElementById('reset-btn') as HTMLButtonElement;
    this.timeSlider = document.getElementById('time-slider') as HTMLInputElement;
    this.timeValueLabel = document.getElementById('time-value') as HTMLElement;
    this.planetSelectContainer = document.getElementById('planet-select-container') as HTMLElement;

    this.createPlanetButtons();
    this.bindEvents();
  }

  private createStatsPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'stats-panel';
    panel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(10, 10, 30, 0.75);
      padding: 16px 20px;
      border-radius: 12px;
      color: white;
      font-family: 'Segoe UI', Arial, sans-serif;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(100, 150, 255, 0.2);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      min-width: 220px;
      z-index: 100;
    `;
    panel.innerHTML = `
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #7cb8ff;">
        实时运行参数
      </div>
      <div id="time-display" style="font-size: 13px; margin-bottom: 8px; line-height: 1.6;">
        模拟时间: <span style="color: #ffd166;">Day 0</span>
      </div>
      <div id="avg-speed-display" style="font-size: 13px; margin-bottom: 8px; line-height: 1.6;">
        平均速度: <span style="color: #06d6a0;">0.00</span>
      </div>
      <div id="eccentricity-display" style="font-size: 13px; line-height: 1.6;">
        离心率变化: <span style="color: #ef476f;">0.00%</span>
      </div>
    `;
    return panel;
  }

  private createControlPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(10, 10, 30, 0.8);
      padding: 20px;
      border-radius: 12px;
      color: white;
      font-family: 'Segoe UI', Arial, sans-serif;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(100, 150, 255, 0.2);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      width: 260px;
      z-index: 100;
    `;
    panel.innerHTML = `
      <div style="font-size: 15px; font-weight: 600; margin-bottom: 16px; color: #7cb8ff; text-align: center;">
        控制面板
      </div>
      
      <div style="display: flex; gap: 10px; margin-bottom: 18px;">
        <button id="pause-btn" style="flex: 1; padding: 8px 12px; background: #2d6cdf; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s;">
          暂停
        </button>
        <button id="reset-btn" style="flex: 1; padding: 8px 12px; background: #555; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s;">
          重置
        </button>
      </div>

      <div style="margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; color: #aaa;">
          <span>时间加速</span>
          <span id="time-value" style="color: #ffd166; font-weight: 600;">1.0x</span>
        </div>
        <input id="time-slider" type="range" min="0.1" max="10" step="0.1" value="1" 
          style="width: 100%; height: 6px; -webkit-appearance: none; background: #333; border-radius: 3px; outline: none;">
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12px; color: #aaa; margin-bottom: 8px;">选择跟随行星</div>
        <div id="planet-select-container" style="display: flex; flex-direction: column; gap: 6px;">
        </div>
      </div>

      <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 12px;">
        <div style="font-size: 12px; color: #aaa;">当前跟随</div>
        <div id="follow-planet-display" style="font-size: 14px; color: #06d6a0; font-weight: 500; margin-top: 4px;">
          无
        </div>
      </div>
    `;
    return panel;
  }

  private createPlanetButtons(): void {
    const noneBtn = document.createElement('button');
    noneBtn.textContent = '不跟随';
    noneBtn.dataset.planet = '';
    noneBtn.style.cssText = `
      padding: 6px 10px;
      background: #444;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    `;
    this.planetButtons.push(noneBtn);
    this.planetSelectContainer.appendChild(noneBtn);

    for (const name of this.planetNames) {
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.dataset.planet = name;
      btn.style.cssText = `
        padding: 6px 10px;
        background: #444;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      `;
      this.planetButtons.push(btn);
      this.planetSelectContainer.appendChild(btn);
    }
  }

  private bindEvents(): void {
    this.pauseButton.addEventListener('click', () => {
      this.state.isPaused = !this.state.isPaused;
      this.pauseButton.textContent = this.state.isPaused ? '继续' : '暂停';
      this.pauseButton.style.background = this.state.isPaused ? '#22a06b' : '#2d6cdf';
      this.emit('statechange', this.state);
    });

    this.resetButton.addEventListener('click', () => {
      this.emit('reset', null);
    });

    this.timeSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.state.timeMultiplier = parseFloat(target.value);
      this.timeValueLabel.textContent = this.state.timeMultiplier.toFixed(1) + 'x';
      this.emit('statechange', this.state);
    });

    for (const btn of this.planetButtons) {
      btn.addEventListener('click', () => {
        const planetName = btn.dataset.planet || null;
        this.state.followPlanetName = planetName;
        this.followPlanetDisplay.textContent = planetName || '无';
        
        for (const b of this.planetButtons) {
          b.style.background = '#444';
        }
        btn.style.background = '#2d6cdf';
        
        this.emit('followchange', planetName);
      });
    }
  }

  public updateStats(
    simulationDay: number,
    avgSpeed: number,
    eccentricityChanges: Map<string, number>
  ): void {
    this.timeDisplay.innerHTML = `模拟时间: <span style="color: #ffd166;">Day ${Math.floor(simulationDay)}</span>`;
    this.avgSpeedDisplay.innerHTML = `平均速度: <span style="color: #06d6a0;">${avgSpeed.toFixed(3)}</span>`;

    let avgEccChange = 0;
    let count = 0;
    eccentricityChanges.forEach((value) => {
      avgEccChange += Math.abs(value);
      count++;
    });
    if (count > 0) {
      avgEccChange /= count;
    }
    this.eccentricityDisplay.innerHTML = `离心率变化: <span style="color: ${avgEccChange > 5 ? '#ef476f' : '#06d6a0'};">${avgEccChange.toFixed(2)}%</span>`;
  }

  public on(event: string, callback: (data: any) => void): void {
    this.eventTarget.addEventListener(event, (e) => {
      callback((e as CustomEvent).detail);
    });
  }

  private emit(event: string, data: any): void {
    this.eventTarget.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  public getState(): UIState {
    return { ...this.state };
  }
}
