import { Pane } from '@tweakpane/core';

export interface ControlParams {
  tension: number;
  damping: number;
  resonanceSensitivity: number;
}

export type RecordingData = any;

export class ControlPanel {
  public params: ControlParams = {
    tension: 1.0,
    damping: 0.98,
    resonanceSensitivity: 0.05,
  };

  public onReset: (() => void) | null = null;
  public onRecordStart: (() => void) | null = null;
  public onRecordStop: ((data: RecordingData) => void) | null = null;

  private container!: HTMLElement;
  private pane!: Pane;
  private mobileToggle!: HTMLElement;
  private mobileOverlay!: HTMLElement;
  private recordBtn!: HTMLElement;
  private isRecording = false;
  private recordingTimeout: ReturnType<typeof setTimeout> | null = null;
  private pulseInterval: ReturnType<typeof setInterval> | null = null;

  private isMobile = window.innerWidth < 768;

  constructor() {
    this.createPanel();
    this.createRecordButton();
    this.setupResponsive();
    window.addEventListener('resize', () => this.setupResponsive());
  }

  private createPanel(): void {
    this.container = document.createElement('div');
    this.container.id = 'control-panel';
    this.container.style.cssText = `
      position: fixed;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      width: 280px;
      padding: 20px;
      background: rgba(10, 10, 30, 0.6);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      z-index: 100;
      color: #d0d0ff;
      font-size: 14px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;

    const title = document.createElement('div');
    title.textContent = '🎵 琴弦控制台';
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #fff;
      text-align: center;
      letter-spacing: 1px;
    `;
    this.container.appendChild(title);

    this.pane = new Pane({
      container: this.container,
      title: '',
    });

    const tensionInput = this.pane.addBinding(this.params, 'tension', {
      label: '琴弦张力',
      min: 0.1,
      max: 2.0,
      step: 0.01,
    });
    tensionInput.on('change', () => {
      tensionValue.textContent = this.params.tension.toFixed(2);
    });

    const tensionValue = this.createValueDisplay(this.container, '1.00');

    const dampingInput = this.pane.addBinding(this.params, 'damping', {
      label: '阻尼系数',
      min: 0.9,
      max: 0.99,
      step: 0.001,
    });
    dampingInput.on('change', () => {
      dampingValue.textContent = this.params.damping.toFixed(3);
    });

    const dampingValue = this.createValueDisplay(this.container, '0.980');

    const sensitivityInput = this.pane.addBinding(this.params, 'resonanceSensitivity', {
      label: '共振灵敏度',
      min: 0.01,
      max: 0.1,
      step: 0.001,
    });
    sensitivityInput.on('change', () => {
      sensitivityValue.textContent = this.params.resonanceSensitivity.toFixed(3);
    });

    const sensitivityValue = this.createValueDisplay(this.container, '0.050');

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '🔄 重置全部';
    resetBtn.style.cssText = `
      width: 100%;
      padding: 10px;
      margin-top: 15px;
      background: rgba(255, 107, 107, 0.3);
      border: 1px solid rgba(255, 107, 107, 0.5);
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s;
    `;
    resetBtn.onmouseenter = () => {
      resetBtn.style.background = 'rgba(255, 107, 107, 0.5)';
    };
    resetBtn.onmouseleave = () => {
      resetBtn.style.background = 'rgba(255, 107, 107, 0.3)';
    };
    resetBtn.onclick = () => {
      this.params.tension = 1.0;
      this.params.damping = 0.98;
      this.params.resonanceSensitivity = 0.05;
      this.pane.refresh();
      tensionValue.textContent = '1.00';
      dampingValue.textContent = '0.980';
      sensitivityValue.textContent = '0.050';
      if (this.onReset) this.onReset();
    };
    this.container.appendChild(resetBtn);

    const instruction = document.createElement('div');
    instruction.style.cssText = `
      margin-top: 15px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.6;
      color: rgba(208, 208, 255, 0.8);
    `;
    instruction.innerHTML = `
      <strong>操作说明：</strong><br>
      🖱️ 拖拽旋转视角<br>
      👆 点击琴弦触发振动<br>
      🎯 触发频率比 2:1 / 3:2 / 4:3 产生共振
    `;
    this.container.appendChild(instruction);

    document.body.appendChild(this.container);
  }

  private createValueDisplay(parent: HTMLElement, initialValue: string): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = `
      text-align: right;
      font-size: 12px;
      color: #d0d0ff;
      margin-top: -8px;
      margin-bottom: 12px;
      font-family: 'SF Mono', Consolas, monospace;
    `;
    el.textContent = initialValue;
    parent.appendChild(el);
    return el;
  }

  private createRecordButton(): void {
    this.recordBtn = document.createElement('div');
    this.recordBtn.id = 'record-btn';
    this.recordBtn.style.cssText = `
      position: fixed;
      right: 30px;
      bottom: 30px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.5);
      border: 2px solid rgba(255, 255, 255, 0.8);
      cursor: pointer;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    `;

    const inner = document.createElement('div');
    inner.id = 'record-inner';
    inner.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      transition: all 0.3s ease;
    `;
    this.recordBtn.appendChild(inner);

    this.recordBtn.onmouseenter = () => {
      this.recordBtn.style.background = this.isRecording
        ? 'rgba(255, 50, 50, 0.8)'
        : 'rgba(255, 255, 255, 0.7)';
    };
    this.recordBtn.onmouseleave = () => {
      this.recordBtn.style.background = this.isRecording
        ? 'rgba(255, 50, 50, 0.6)'
        : 'rgba(255, 255, 255, 0.5)';
    };
    this.recordBtn.onclick = () => this.toggleRecording();

    document.body.appendChild(this.recordBtn);
  }

  private toggleRecording(): void {
    if (this.isRecording) return;

    this.isRecording = true;
    const inner = document.getElementById('record-inner')!;
    inner.style.borderRadius = '2px';
    inner.style.background = '#ff3333';
    this.recordBtn.style.background = 'rgba(255, 50, 50, 0.6)';
    this.recordBtn.style.borderColor = 'rgba(255, 100, 100, 0.9)';

    this.pulseInterval = setInterval(() => {
      this.recordBtn.style.boxShadow = this.recordBtn.style.boxShadow.includes('0 0 20px')
        ? '0 4px 16px rgba(0, 0, 0, 0.3)'
        : '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 50, 50, 0.6)';
    }, 400);

    if (this.onRecordStart) this.onRecordStart();

    this.recordingTimeout = setTimeout(() => {
      this.stopRecording();
    }, 3000);
  }

  public stopRecording(data?: RecordingData): void {
    this.isRecording = false;
    const inner = document.getElementById('record-inner');
    if (inner) {
      inner.style.borderRadius = '50%';
      inner.style.background = 'rgba(255, 255, 255, 0.9)';
    }
    this.recordBtn.style.background = 'rgba(255, 255, 255, 0.5)';
    this.recordBtn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
    this.recordBtn.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';

    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
      this.pulseInterval = null;
    }
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }

    if (this.onRecordStop && data) this.onRecordStop(data);
  }

  private setupResponsive(): void {
    this.isMobile = window.innerWidth < 768;

    if (this.isMobile) {
      this.container.style.display = 'none';
      this.createMobileToggle();
    } else {
      this.container.style.display = 'block';
      if (this.mobileToggle) this.mobileToggle.style.display = 'none';
      if (this.mobileOverlay) this.mobileOverlay.style.display = 'none';
    }
  }

  private createMobileToggle(): void {
    if (this.mobileToggle) {
      this.mobileToggle.style.display = 'flex';
      return;
    }

    this.mobileToggle = document.createElement('div');
    this.mobileToggle.id = 'mobile-toggle';
    this.mobileToggle.textContent = '⚙️';
    this.mobileToggle.style.cssText = `
      position: fixed;
      left: 20px;
      top: 20px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(10, 10, 30, 0.8);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      cursor: pointer;
      z-index: 101;
      color: #fff;
    `;
    this.mobileToggle.onclick = () => this.openMobileOverlay();
    document.body.appendChild(this.mobileToggle);

    this.mobileOverlay = document.createElement('div');
    this.mobileOverlay.id = 'mobile-overlay';
    this.mobileOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 200;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;
    this.mobileOverlay.onclick = (e) => {
      if (e.target === this.mobileOverlay) this.closeMobileOverlay();
    };

    const closeBtn = document.createElement('div');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      cursor: pointer;
      font-size: 18px;
    `;
    closeBtn.onclick = () => this.closeMobileOverlay();
    this.mobileOverlay.appendChild(closeBtn);

    this.mobileOverlay.appendChild(this.container.cloneNode(true));

    document.body.appendChild(this.mobileOverlay);
  }

  private openMobileOverlay(): void {
    this.mobileOverlay.style.display = 'flex';
  }

  private closeMobileOverlay(): void {
    this.mobileOverlay.style.display = 'none';
  }

  public getParams(): ControlParams {
    return { ...this.params };
  }

  public getRecordingState(): boolean {
    return this.isRecording;
  }
}
