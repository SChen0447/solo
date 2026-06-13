export class UI {
  private container: HTMLElement;
  private panel: HTMLElement;
  private fpsElement: HTMLElement;
  private linesElement: HTMLElement;
  private strengthElement: HTMLElement;
  private stardustButton: HTMLElement;
  private showGrid: boolean = false;
  private onGridToggle: (show: boolean) => void;

  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;

  constructor(container: HTMLElement, totalLines: number, onGridToggle: (show: boolean) => void) {
    this.container = container;
    this.onGridToggle = onGridToggle;

    this.panel = this.createPanel();
    this.fpsElement = this.createStatRow('FPS', '60');
    this.linesElement = this.createStatRow('线条数', totalLines.toString());
    this.strengthElement = this.createStatRow('交互强度', '0%');

    this.panel.appendChild(this.fpsElement);
    this.panel.appendChild(this.linesElement);
    this.panel.appendChild(this.strengthElement);
    this.container.appendChild(this.panel);

    this.stardustButton = this.createStardustButton();
    this.container.appendChild(this.stardustButton);
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.top = '20px';
    panel.style.left = '20px';
    panel.style.padding = '16px 20px';
    panel.style.background = 'rgba(200, 200, 210, 0.08)';
    panel.style.backdropFilter = 'blur(12px)';
    panel.style.borderRadius = '12px';
    panel.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    panel.style.color = 'rgba(255, 255, 255, 0.7)';
    panel.style.fontSize = '12px';
    panel.style.fontFamily = 'monospace';
    panel.style.zIndex = '100';
    panel.style.minWidth = '140px';
    panel.style.userSelect = 'none';
    return panel;
  }

  private createStatRow(label: string, value: string): HTMLElement {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.marginBottom = '6px';

    const labelEl = document.createElement('span');
    labelEl.style.opacity = '0.6';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.style.color = 'rgba(200, 220, 255, 0.9)';
    valueEl.style.fontWeight = 'bold';
    valueEl.textContent = value;

    row.appendChild(labelEl);
    row.appendChild(valueEl);

    return row;
  }

  private createStardustButton(): HTMLElement {
    const button = document.createElement('div');
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.width = '40px';
    button.style.height = '40px';
    button.style.borderRadius = '50%';
    button.style.background = 'radial-gradient(circle, rgba(150, 200, 255, 0.3) 0%, rgba(100, 150, 200, 0.1) 70%)';
    button.style.border = '1px solid rgba(150, 200, 255, 0.3)';
    button.style.cursor = 'pointer';
    button.style.opacity = '0.3';
    button.style.transition = 'opacity 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease';
    button.style.zIndex = '100';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.color = 'rgba(200, 230, 255, 0.8)';
    button.style.fontSize = '16px';
    button.style.userSelect = 'none';
    button.innerHTML = '✧';

    button.addEventListener('mouseenter', () => {
      button.style.opacity = '0.8';
      button.style.boxShadow = '0 0 20px rgba(150, 200, 255, 0.5), 0 0 40px rgba(150, 200, 255, 0.2)';
      this.startPulse(button);
    });

    button.addEventListener('mouseleave', () => {
      button.style.opacity = '0.3';
      button.style.boxShadow = 'none';
      this.stopPulse(button);
    });

    button.addEventListener('click', () => {
      this.showGrid = !this.showGrid;
      this.onGridToggle(this.showGrid);
      button.style.transform = 'scale(0.9)';
      setTimeout(() => {
        button.style.transform = 'scale(1)';
      }, 150);
    });

    return button;
  }

  private pulseAnimationId: number | null = null;

  private startPulse(element: HTMLElement): void {
    let t = 0;
    const animate = () => {
      t += 0.05;
      const pulse = 1 + Math.sin(t) * 0.15;
      element.style.boxShadow = `0 0 ${20 * pulse}px rgba(150, 200, 255, 0.5), 0 0 ${40 * pulse}px rgba(150, 200, 255, 0.2)`;
      this.pulseAnimationId = requestAnimationFrame(animate);
    };
    animate();
  }

  private stopPulse(_element: HTMLElement): void {
    if (this.pulseAnimationId !== null) {
      cancelAnimationFrame(this.pulseAnimationId);
      this.pulseAnimationId = null;
    }
  }

  public updateFps(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      const valueEl = this.fpsElement.querySelector('span:last-child');
      if (valueEl) {
        valueEl.textContent = this.currentFps.toString();
      }
    }
  }

  public updateInteractionStrength(strength: number): void {
    const valueEl = this.strengthElement.querySelector('span:last-child');
    if (valueEl) {
      const percent = Math.round(strength * 100);
      valueEl.textContent = `${percent}%`;
    }
  }

  public dispose(): void {
    if (this.pulseAnimationId !== null) {
      cancelAnimationFrame(this.pulseAnimationId);
    }
    this.panel.remove();
    this.stardustButton.remove();
  }
}
