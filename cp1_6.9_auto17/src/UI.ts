export interface UIData {
  glowState: string;
  glowColor: string;
  speedMultiplier: number;
  position: { x: number; y: number; z: number };
}

export class UI {
  private panel: HTMLElement;
  private instruction: HTMLElement;
  private stateElement: HTMLElement;
  private speedElement: HTMLElement;
  private coordsElement: HTMLElement;
  private speedChangeCallback: ((delta: number) => void) | null;
  private clickCallback: ((event: MouseEvent) => void) | null;

  constructor() {
    this.speedChangeCallback = null;
    this.clickCallback = null;

    this.instruction = this.createInstruction();
    this.panel = this.createPanel();
    this.stateElement = document.createElement('div');
    this.speedElement = document.createElement('div');
    this.coordsElement = document.createElement('div');

    this.setupPanelContent();
    this.bindEvents();
    this.setPanelVisible(false);
  }

  private createInstruction(): HTMLElement {
    const el = document.createElement('div');
    el.textContent = '点击水母追踪，+/-调节速度';
    el.style.cssText = `
      position: fixed;
      top: 16px;
      left: 16px;
      color: #ffffff;
      font-size: 14px;
      font-family: monospace, sans-serif;
      text-shadow: 0 0 8px #00ffff;
      pointer-events: none;
      user-select: none;
      z-index: 100;
      opacity: 0;
      animation: fadeIn 0.3s ease-out forwards;
    `;
    document.body.appendChild(el);
    return el;
  }

  private createPanel(): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: 220px;
      padding: 16px;
      background: rgba(0, 10, 20, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 12px;
      font-family: monospace, sans-serif;
      font-size: 13px;
      color: #ffffff;
      pointer-events: none;
      user-select: none;
      z-index: 100;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.3s ease-out, transform 0.3s ease-out;
    `;
    document.body.appendChild(el);
    return el;
  }

  private setupPanelContent(): void {
    const title = document.createElement('div');
    title.textContent = '● 追踪水母';
    title.style.cssText = `
      color: #ffff00;
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 12px;
      text-shadow: 0 0 6px #ffff00;
    `;
    this.panel.appendChild(title);

    const stateLabel = document.createElement('div');
    stateLabel.textContent = '发光状态';
    stateLabel.style.cssText = 'color: #88aacc; margin-top: 8px; font-size: 11px;';
    this.panel.appendChild(stateLabel);

    this.stateElement.style.cssText = `
      font-size: 15px;
      font-weight: bold;
      margin-bottom: 12px;
      transition: color 0.2s;
    `;
    this.panel.appendChild(this.stateElement);

    const speedLabel = document.createElement('div');
    speedLabel.textContent = '游动速度';
    speedLabel.style.cssText = 'color: #88aacc; margin-top: 8px; font-size: 11px;';
    this.panel.appendChild(speedLabel);

    this.speedElement.style.cssText = `
      font-size: 15px;
      color: #00ffff;
      font-weight: bold;
      margin-bottom: 12px;
      text-shadow: 0 0 6px #00ffff;
    `;
    this.panel.appendChild(this.speedElement);

    const coordsLabel = document.createElement('div');
    coordsLabel.textContent = '坐标';
    coordsLabel.style.cssText = 'color: #88aacc; margin-top: 8px; font-size: 11px;';
    this.panel.appendChild(coordsLabel);

    this.coordsElement.style.cssText = `
      font-size: 13px;
      color: #aaddff;
    `;
    this.panel.appendChild(this.coordsElement);
  }

  private bindEvents(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        this.speedChangeCallback?.(0.1);
      } else if (e.key === '-' || e.key === '_') {
        this.speedChangeCallback?.(-0.1);
      }
    });

    window.addEventListener('click', (e: MouseEvent) => {
      if (e.target === document.body || e.target === document.getElementById('app')) {
        this.clickCallback?.(e);
      }
    });
  }

  public updateTrackedData(data: UIData): void {
    this.stateElement.textContent = data.glowState;
    this.stateElement.style.color = data.glowColor;
    this.stateElement.style.textShadow = `0 0 8px ${data.glowColor}`;
    this.speedElement.textContent = `×${data.speedMultiplier.toFixed(2)}`;
    this.coordsElement.textContent = `X: ${data.position.x.toFixed(2)}  Y: ${data.position.y.toFixed(2)}  Z: ${data.position.z.toFixed(2)}`;
  }

  public setPanelVisible(visible: boolean): void {
    if (visible) {
      this.panel.style.opacity = '1';
      this.panel.style.transform = 'translateY(0)';
    } else {
      this.panel.style.opacity = '0';
      this.panel.style.transform = 'translateY(10px)';
    }
  }

  public onSpeedChange(callback: (delta: number) => void): void {
    this.speedChangeCallback = callback;
  }

  public onClick(callback: (event: MouseEvent) => void): void {
    this.clickCallback = callback;
  }

  public updateSpeedOnly(speedMultiplier: number): void {
    this.speedElement.textContent = `×${speedMultiplier.toFixed(2)}`;
  }
}
