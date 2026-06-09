export class UI {
  private container: HTMLElement;
  private compassContainer: HTMLElement;
  private compassNeedle: HTMLElement;
  private codeDisplay: HTMLElement;
  private codeInterval: number | null = null;
  private isMobile: boolean = false;
  private targetRotation: number = 0;
  private currentRotation: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private compassCenterX: number = 0;
  private compassCenterY: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;

    this.compassContainer = document.createElement('div');
    this.compassContainer.id = 'compass';
    this.compassContainer.style.cssText = `
      position: fixed;
      width: 40px;
      height: 40px;
      border: 2px solid rgba(58, 46, 40, 0.5);
      border-radius: 50%;
      z-index: 100;
      pointer-events: none;
      transition: all 0.4s ease-out;
    `;

    const compassRing = document.createElement('div');
    compassRing.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 70%;
      height: 70%;
      border: 1px solid rgba(58, 46, 40, 0.35);
      border-radius: 50%;
      transform: translate(-50%, -50%);
    `;
    this.compassContainer.appendChild(compassRing);

    const nMark = this.createMark('N', 'top');
    const sMark = this.createMark('S', 'bottom');
    const eMark = this.createMark('E', 'right');
    const wMark = this.createMark('W', 'left');
    this.compassContainer.appendChild(nMark);
    this.compassContainer.appendChild(sMark);
    this.compassContainer.appendChild(eMark);
    this.compassContainer.appendChild(wMark);

    this.compassNeedle = document.createElement('div');
    this.compassNeedle.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 2px;
      height: 60%;
      transform-origin: center center;
      transform: translate(-50%, -50%) rotate(0deg);
      will-change: transform;
    `;

    const needleTop = document.createElement('div');
    needleTop.style.cssText = `
      position: absolute;
      top: 0;
      left: 50%;
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-bottom: 10px solid #8B2500;
      transform: translateX(-50%);
    `;

    const needleBottom = document.createElement('div');
    needleBottom.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 10px solid #3A2E28;
      transform: translateX(-50%);
    `;

    const needleCenter = document.createElement('div');
    needleCenter.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 6px;
      height: 6px;
      background: #3A2E28;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    `;

    this.compassNeedle.appendChild(needleTop);
    this.compassNeedle.appendChild(needleBottom);
    this.compassNeedle.appendChild(needleCenter);
    this.compassContainer.appendChild(this.compassNeedle);

    this.codeDisplay = document.createElement('div');
    this.codeDisplay.id = 'numeric-code';
    this.codeDisplay.style.cssText = `
      position: fixed;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #5C4033;
      z-index: 100;
      pointer-events: none;
      letter-spacing: 1px;
      transition: all 0.4s ease-out;
    `;

    this.container.appendChild(this.compassContainer);
    this.container.appendChild(this.codeDisplay);

    this.resize();
    this.startCodeUpdater();

    window.addEventListener('resize', this.handleResize);
  }

  private createMark(label: string, position: 'top' | 'bottom' | 'left' | 'right'): HTMLElement {
    const mark = document.createElement('div');
    mark.textContent = label;
    const baseStyle: Record<string, string> = {
      position: 'absolute',
      fontSize: '8px',
      color: 'rgba(58, 46, 40, 0.6)',
      fontFamily: 'Georgia, serif',
      fontWeight: 'bold',
    };

    switch (position) {
      case 'top':
        Object.assign(baseStyle, { top: '2px', left: '50%', transform: 'translateX(-50%)' });
        break;
      case 'bottom':
        Object.assign(baseStyle, { bottom: '2px', left: '50%', transform: 'translateX(-50%)' });
        break;
      case 'left':
        Object.assign(baseStyle, { left: '4px', top: '50%', transform: 'translateY(-50%)' });
        break;
      case 'right':
        Object.assign(baseStyle, { right: '4px', top: '50%', transform: 'translateY(-50%)' });
        break;
    }

    mark.style.cssText = Object.entries(baseStyle).map(([k, v]) => `${k}: ${v}`).join('; ');
    return mark;
  }

  private handleResize = (): void => {
    this.resize();
  };

  resize(): void {
    const width = window.innerWidth;
    this.isMobile = width < 768;

    if (this.isMobile) {
      this.compassContainer.style.width = '25px';
      this.compassContainer.style.height = '25px';
      this.compassContainer.style.top = '12px';
      this.compassContainer.style.left = '50%';
      this.compassContainer.style.transform = 'translateX(-50%)';
      this.codeDisplay.style.bottom = '10px';
      this.codeDisplay.style.left = '50%';
      this.codeDisplay.style.transform = 'translateX(-50%)';
      this.codeDisplay.style.fontSize = '10px';
    } else {
      this.compassContainer.style.width = '40px';
      this.compassContainer.style.height = '40px';
      this.compassContainer.style.top = '20px';
      this.compassContainer.style.left = '20px';
      this.compassContainer.style.transform = 'none';
      this.codeDisplay.style.bottom = '20px';
      this.codeDisplay.style.right = '20px';
      this.codeDisplay.style.left = 'auto';
      this.codeDisplay.style.transform = 'none';
      this.codeDisplay.style.fontSize = '12px';
    }

    const rect = this.compassContainer.getBoundingClientRect();
    this.compassCenterX = rect.left + rect.width / 2;
    this.compassCenterY = rect.top + rect.height / 2;
  }

  private startCodeUpdater(): void {
    this.updateCode();
    this.codeInterval = window.setInterval(() => this.updateCode(), 1000);
  }

  private updateCode(): void {
    const lat = (Math.random() * 180 - 90).toFixed(6);
    const lon = (Math.random() * 360 - 180).toFixed(6);
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    this.codeDisplay.textContent = `${lat}°N ${lon}°E | ${timestamp}`;
  }

  updateMousePosition(x: number, y: number): void {
    this.lastMouseX = x;
    this.lastMouseY = y;

    const rect = this.compassContainer.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    this.targetRotation = Math.atan2(dy, dx) * 180 / Math.PI + 90;
  }

  update(deltaTime: number): void {
    const ease = Math.min(1, deltaTime * 0.003);
    let diff = this.targetRotation - this.currentRotation;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    this.currentRotation += diff * ease;

    this.compassNeedle.style.transform = `translate(-50%, -50%) rotate(${this.currentRotation}deg)`;
  }

  destroy(): void {
    if (this.codeInterval) {
      clearInterval(this.codeInterval);
    }
    window.removeEventListener('resize', this.handleResize);
  }
}
