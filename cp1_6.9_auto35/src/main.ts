import p5 from 'p5';
import { Bubble } from './bubble';
import { Environment } from './physics';

const MAX_BUBBLES = 80;
const DRAG_INTERVAL = 100;

class BubbleApp {
  private bubbles: Bubble[] = [];
  private environment!: Environment;
  private p: p5 | null = null;
  private isDragging: boolean = false;
  private lastBubbleTime: number = 0;
  private panelExpanded: boolean = true;
  private panelX: number = 0;
  private panelY: number = 0;
  private panelDragging: boolean = false;
  private panelDragOffsetX: number = 0;
  private panelDragOffsetY: number = 0;
  private panelWidth: number = 260;
  private panelHeight: number = 0;
  private windRotation: number = 0;
  private windSliderEl: HTMLInputElement | null = null;
  private tempSliderEl: HTMLInputElement | null = null;
  private windValueEl: HTMLSpanElement | null = null;
  private tempValueEl: HTMLSpanElement | null = null;
  private panelContainer: HTMLDivElement | null = null;

  constructor() {
    this.initP5();
  }

  private initP5(): void {
    const sketch = (p: p5) => {
      this.p = p;
      this.environment = new Environment(p);

      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent('app');
        p.colorMode(p.HSB, 360, 100, 100, 1);
        p.pixelDensity(1);
        this.panelX = p.windowWidth - this.panelWidth - 24;
        this.panelY = 24;
        this.createControlPanel();
      };

      p.draw = () => {
        p.clear();
        this.environment.update();
        this.windRotation += this.environment.getWindSpeed() * 0.05;
        this.updateWindIconRotation();
        this.updateAndDrawBubbles();
        this.handleBubbleGeneration();
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        if (this.panelX + this.panelWidth > p.windowWidth) {
          this.panelX = p.windowWidth - this.panelWidth - 24;
        }
        if (this.panelY + 50 > p.windowHeight) {
          this.panelY = p.windowHeight - 100;
        }
        this.updatePanelPosition();
      };

      p.mousePressed = () => {
        if (this.isOnPanel(p.mouseX, p.mouseY)) return;
        this.isDragging = true;
        this.tryCreateBubble(p.mouseX, p.mouseY);
      };

      p.mouseReleased = () => {
        this.isDragging = false;
      };

      p.mouseDragged = () => {
        if (this.isDragging && !this.isOnPanel(p.mouseX, p.mouseY)) {
          const now = p.millis();
          if (now - this.lastBubbleTime >= DRAG_INTERVAL) {
            this.tryCreateBubble(p.mouseX, p.mouseY);
            this.lastBubbleTime = now;
          }
        }
      };

      p.touchStarted = () => {
        if (this.isOnPanel(p.mouseX, p.mouseY)) return;
        this.isDragging = true;
        this.tryCreateBubble(p.mouseX, p.mouseY);
      };

      p.touchEnded = () => {
        this.isDragging = false;
      };

      p.touchMoved = () => {
        if (this.isDragging && !this.isOnPanel(p.mouseX, p.mouseY)) {
          const now = p.millis();
          if (now - this.lastBubbleTime >= DRAG_INTERVAL) {
            this.tryCreateBubble(p.mouseX, p.mouseY);
            this.lastBubbleTime = now;
          }
        }
      };
    };

    new p5(sketch);
  }

  private createControlPanel(): void {
    const container = document.createElement('div');
    container.id = 'bubble-control-panel';
    Object.assign(container.style, {
      position: 'fixed',
      left: `${this.panelX}px`,
      top: `${this.panelY}px`,
      width: `${this.panelWidth}px`,
      background: 'rgba(26, 26, 46, 0.8)',
      backdropFilter: 'blur(10px)',
      borderRadius: '10px',
      padding: '16px',
      color: '#ffffff',
      fontFamily: '"Segoe UI", -apple-system, sans-serif',
      fontSize: '13px',
      boxShadow: '0 4px 20px rgba(124, 58, 237, 0.25), 0 0 40px rgba(124, 58, 237, 0.1)',
      zIndex: '1000',
      userSelect: 'none',
      transition: 'width 0.3s ease, padding 0.3s ease'
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'move',
      marginBottom: '12px'
    });

    const title = document.createElement('span');
    title.textContent = '🎨 环境控制';
    Object.assign(title.style, {
      fontWeight: '600',
      fontSize: '14px',
      color: '#a78bfa',
      textShadow: '0 0 10px rgba(167, 139, 250, 0.5)'
    });

    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = '▼';
    Object.assign(toggleBtn.style, {
      background: 'none',
      border: 'none',
      color: '#a78bfa',
      cursor: 'pointer',
      fontSize: '12px',
      padding: '4px 8px',
      borderRadius: '4px',
      transition: 'transform 0.3s ease, background 0.2s'
    });
    toggleBtn.addEventListener('mouseenter', () => {
      toggleBtn.style.background = 'rgba(167, 139, 250, 0.2)';
    });
    toggleBtn.addEventListener('mouseleave', () => {
      toggleBtn.style.background = 'none';
    });

    header.appendChild(title);
    header.appendChild(toggleBtn);

    const content = document.createElement('div');
    content.id = 'panel-content';
    Object.assign(content.style, {
      overflow: 'hidden',
      transition: 'max-height 0.3s ease, opacity 0.3s ease'
    });

    const windControl = this.createSliderControl(
      'wind',
      '风速',
      0,
      10,
      0.5,
      2,
      '💨',
      (val) => `${val.toFixed(1)}`
    );

    const tempControl = this.createSliderControl(
      'temp',
      '温度',
      0,
      40,
      1,
      20,
      '🌡️',
      (val) => `${val.toFixed(0)}°C`
    );

    content.appendChild(windControl);
    content.appendChild(tempControl);

    container.appendChild(header);
    container.appendChild(content);
    document.body.appendChild(container);

    this.panelContainer = container;

    header.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      this.panelDragging = true;
      const rect = container.getBoundingClientRect();
      this.panelDragOffsetX = e.clientX - rect.left;
      this.panelDragOffsetY = e.clientY - rect.top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (this.panelDragging && this.p) {
        this.panelX = e.clientX - this.panelDragOffsetX;
        this.panelY = e.clientY - this.panelDragOffsetY;
        this.panelX = Math.max(0, Math.min(this.p.windowWidth - this.panelWidth, this.panelX));
        this.panelY = Math.max(0, Math.min(this.p.windowHeight - 50, this.panelY));
        this.updatePanelPosition();
      }
    });

    document.addEventListener('mouseup', () => {
      this.panelDragging = false;
    });

    toggleBtn.addEventListener('click', () => {
      this.panelExpanded = !this.panelExpanded;
      if (this.panelExpanded) {
        toggleBtn.innerHTML = '▼';
        toggleBtn.style.transform = 'rotate(0deg)';
        content.style.maxHeight = '200px';
        content.style.opacity = '1';
        content.style.marginTop = '0';
        container.style.padding = '16px';
      } else {
        toggleBtn.innerHTML = '▼';
        toggleBtn.style.transform = 'rotate(-90deg)';
        content.style.maxHeight = '0px';
        content.style.opacity = '0';
        content.style.marginTop = '-12px';
        container.style.padding = '8px 16px';
      }
    });

    this.panelHeight = container.offsetHeight;
    content.style.maxHeight = '200px';
  }

  private createSliderControl(
    id: string,
    label: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
    icon: string,
    formatValue: (v: number) => string
  ): HTMLDivElement {
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      marginBottom: '16px'
    });

    const labelRow = document.createElement('div');
    Object.assign(labelRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    });

    const labelSpan = document.createElement('span');
    const iconSpan = document.createElement('span');
    iconSpan.textContent = icon;
    iconSpan.style.marginRight = '6px';
    if (id === 'wind') {
      iconSpan.style.display = 'inline-block';
      iconSpan.id = 'wind-icon';
    }
    const textSpan = document.createElement('span');
    textSpan.textContent = label;
    labelSpan.appendChild(iconSpan);
    labelSpan.appendChild(textSpan);

    const valueSpan = document.createElement('span');
    valueSpan.textContent = formatValue(defaultValue);
    Object.assign(valueSpan.style, {
      color: '#a78bfa',
      fontWeight: '600',
      textShadow: '0 0 8px rgba(167, 139, 250, 0.4)'
    });

    labelRow.appendChild(labelSpan);
    labelRow.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(defaultValue);

    Object.assign(slider.style, {
      width: '100%',
      height: '6px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: '#3a3a5e',
      borderRadius: '3px',
      outline: 'none',
      cursor: 'pointer'
    });

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueSpan.textContent = formatValue(val);
      if (id === 'wind') {
        this.environment.setWindSpeed(val);
      } else if (id === 'temp') {
        this.environment.setTemperature(val);
      }
    });

    wrapper.appendChild(labelRow);
    wrapper.appendChild(slider);

    if (id === 'wind') {
      this.windSliderEl = slider;
      this.windValueEl = valueSpan;
    } else if (id === 'temp') {
      this.tempSliderEl = slider;
      this.tempValueEl = valueSpan;
    }

    this.injectSliderStyles();
    return wrapper;
  }

  private injectSliderStyles(): void {
    if (document.getElementById('bubble-slider-styles')) return;
    const style = document.createElement('style');
    style.id = 'bubble-slider-styles';
    style.textContent = `
      #bubble-control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #7c3aed;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(124, 58, 237, 0.6);
        transition: all 0.2s ease;
        border: none;
      }
      #bubble-control-panel input[type="range"]::-webkit-slider-thumb:hover {
        background: #a78bfa;
        box-shadow: 0 0 15px rgba(167, 139, 250, 0.8);
        transform: scale(1.1);
      }
      #bubble-control-panel input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #7c3aed;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(124, 58, 237, 0.6);
        transition: all 0.2s ease;
        border: none;
      }
      #bubble-control-panel input[type="range"]::-moz-range-thumb:hover {
        background: #a78bfa;
        box-shadow: 0 0 15px rgba(167, 139, 250, 0.8);
      }
    `;
    document.head.appendChild(style);
  }

  private updateWindIconRotation(): void {
    const icon = document.getElementById('wind-icon');
    if (icon) {
      icon.style.transform = `rotate(${this.windRotation}rad)`;
    }
  }

  private updatePanelPosition(): void {
    if (this.panelContainer) {
      this.panelContainer.style.left = `${this.panelX}px`;
      this.panelContainer.style.top = `${this.panelY}px`;
    }
  }

  private isOnPanel(mx: number, my: number): boolean {
    return (
      mx >= this.panelX &&
      mx <= this.panelX + this.panelWidth &&
      my >= this.panelY &&
      my <= this.panelY + this.panelHeight
    );
  }

  private tryCreateBubble(x: number, y: number): void {
    if (!this.p) return;
    if (this.bubbles.length >= MAX_BUBBLES) {
      this.bubbles.shift();
    }
    const bubble = new Bubble(this.p, x, y, this.environment);
    this.bubbles.push(bubble);
    this.lastBubbleTime = this.p.millis();
  }

  private handleBubbleGeneration(): void {
    if (!this.p || !this.isDragging) return;
    const now = this.p.millis();
    if (now - this.lastBubbleTime >= DRAG_INTERVAL) {
      this.tryCreateBubble(this.p.mouseX, this.p.mouseY);
    }
  }

  private updateAndDrawBubbles(): void {
    if (!this.p) return;

    const mx = this.p.mouseX;
    const my = this.p.mouseY;

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      if (!this.bubbles[i].isAlive && this.bubbles[i].particles.length === 0) {
        this.bubbles.splice(i, 1);
      }
    }

    for (let i = 0; i < this.bubbles.length; i++) {
      for (let j = i + 1; j < this.bubbles.length; j++) {
        const a = this.bubbles[i];
        const b = this.bubbles[j];
        if (a.checkCollision(b)) {
          if (a.radius >= b.radius) {
            a.startMerge(b);
          } else {
            b.startMerge(a);
          }
        }
      }
    }

    for (const bubble of this.bubbles) {
      bubble.update(this.environment, mx, my);
      bubble.draw();
    }
  }
}

new BubbleApp();
