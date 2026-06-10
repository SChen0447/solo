import type { StoneShape } from './sandManager';

const STONE_CONFIGS: { shape: StoneShape; label: string }[] = [
  { shape: 'circle', label: '圆形石' },
  { shape: 'ellipse', label: '椭圆石' },
  { shape: 'triangle', label: '三角石' },
  { shape: 'rectangle', label: '矩形石' },
  { shape: 'irregular', label: '异形石' },
];

export class ToolPanel {
  private container: HTMLDivElement;
  private currentStone: StoneShape | null = null;
  private stoneButtons: HTMLButtonElement[] = [];

  constructor() {
    this.container = document.createElement('div');
    this.buildUI();
    this.attachStyles();
    this.bindResponsive();
    document.body.appendChild(this.container);
    this.bindSandEvents();
  }

  private bindSandEvents(): void {
    window.addEventListener('sand:stoneSelect', ((e: CustomEvent<{ shape: StoneShape | null }>) => {
      this.setStoneSelection(e.detail.shape);
    }) as EventListener);
  }

  private buildUI(): void {
    this.container.className = 'tool-panel';

    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'slider-wrap';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '10';
    slider.max = '100';
    slider.value = '50';
    slider.className = 'brush-slider';
    slider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      window.dispatchEvent(new CustomEvent('sand:brushWidthChange', { detail: { width: val } }));
    });
    sliderWrap.appendChild(slider);

    const stoneRow = document.createElement('div');
    stoneRow.className = 'stone-row';

    for (const cfg of STONE_CONFIGS) {
      const btn = document.createElement('button');
      btn.className = 'stone-btn';
      btn.dataset.shape = cfg.shape;
      btn.title = cfg.label;
      btn.appendChild(this.createStoneIcon(cfg.shape));
      btn.addEventListener('click', () => {
        const newShape = this.currentStone === cfg.shape ? null : cfg.shape;
        this.setStoneSelection(newShape);
        window.dispatchEvent(new CustomEvent('sand:stoneSelect', { detail: { shape: newShape } }));
      });
      this.stoneButtons.push(btn);
      stoneRow.appendChild(btn);
    }

    const resetBtn = document.createElement('button');
    resetBtn.className = 'reset-btn';
    resetBtn.textContent = '重置';
    resetBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('sand:reset'));
    });

    this.container.appendChild(sliderWrap);
    this.container.appendChild(stoneRow);
    this.container.appendChild(resetBtn);
  }

  private setStoneSelection(shape: StoneShape | null): void {
    this.currentStone = shape;
    for (const btn of this.stoneButtons) {
      if (btn.dataset.shape === shape) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  }

  private createStoneIcon(shape: StoneShape): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    let path: SVGElement;
    switch (shape) {
      case 'circle':
        path = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        path.setAttribute('cx', '16');
        path.setAttribute('cy', '16');
        path.setAttribute('r', '11');
        break;
      case 'ellipse':
        path = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        path.setAttribute('cx', '16');
        path.setAttribute('cy', '16');
        path.setAttribute('rx', '12');
        path.setAttribute('ry', '8');
        break;
      case 'triangle':
        path = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        path.setAttribute('points', '16,5 28,27 4,27');
        break;
      case 'rectangle':
        path = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        path.setAttribute('x', '5');
        path.setAttribute('y', '10');
        path.setAttribute('width', '22');
        path.setAttribute('height', '14');
        path.setAttribute('rx', '2');
        break;
      case 'irregular':
        path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M6,20 Q5,8 16,7 Q28,6 27,16 Q26,27 14,27 Z');
        break;
    }
    path.setAttribute('fill', '#525252');
    svg.appendChild(path);
    return svg;
  }

  private bindResponsive(): void {
    const apply = () => {
      if (window.innerWidth < 768) {
        this.container.classList.add('narrow');
      } else {
        this.container.classList.remove('narrow');
      }
    };
    apply();
    window.addEventListener('resize', apply);
  }

  private attachStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .tool-panel {
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: 200px;
        padding: 16px;
        background: rgba(210, 180, 140, 0.2);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        z-index: 10;
        box-sizing: border-box;
      }

      .tool-panel.narrow {
        width: 140px;
        padding: 12px;
        gap: 10px;
      }

      .slider-wrap {
        display: flex;
        align-items: center;
      }

      .brush-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        background: #8c663a;
        border-radius: 2px;
        outline: none;
        cursor: pointer;
      }

      .brush-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: #d4a373;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.15s ease;
      }

      .brush-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }

      .brush-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: #d4a373;
        border-radius: 50%;
        cursor: pointer;
        border: none;
      }

      .stone-row {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
      }

      .stone-btn {
        width: 32px;
        height: 32px;
        border: 1px solid #8b7355;
        border-radius: 6px;
        background: rgba(212, 201, 168, 0.3);
        cursor: pointer;
        padding: 4px;
        transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      .tool-panel.narrow .stone-btn {
        width: 24px;
        height: 24px;
        padding: 2px;
      }

      .stone-btn:hover {
        transform: scale(1.1);
      }

      .stone-btn:hover::after {
        content: attr(title);
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
        background: rgba(74, 74, 74, 0.9);
        color: #d4c9a8;
        font-size: 12px;
        padding: 3px 6px;
        border-radius: 4px;
        white-space: nowrap;
        pointer-events: none;
      }

      .stone-btn.active {
        background: #d4a373;
        border-color: #d4a373;
      }

      .stone-btn.active svg * {
        fill: #d4c9a8 !important;
      }

      .reset-btn {
        width: 100%;
        padding: 8px;
        background: transparent;
        border: 1px solid #a0522d;
        border-radius: 6px;
        color: #a0522d;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
        font-family: inherit;
      }

      .reset-btn:hover {
        background: #a0522d;
        color: #d4c9a8;
      }
    `;
    document.head.appendChild(style);
  }
}
