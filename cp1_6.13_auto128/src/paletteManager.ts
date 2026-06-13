import { ParticleEngine } from './particleEngine';

export interface ColorBlock {
  r: number;
  g: number;
  b: number;
  name: string;
  el: HTMLElement | null;
  originalIndex: number;
}

const NEBULA_COLORS: Array<{ r: number; g: number; b: number; name: string }> = [
  { r: 155, g: 89, b: 182, name: '星云紫' },
  { r: 233, g: 30, b: 156, name: '星云粉' },
  { r: 52, g: 152, b: 219, name: '星云蓝' },
  { r: 26, g: 188, b: 156, name: '星云青' },
  { r: 243, g: 156, b: 18, name: '星云金' },
  { r: 230, g: 126, b: 34, name: '星云橙' },
  { r: 231, g: 76, b: 60, name: '星云红' },
  { r: 46, g: 204, b: 113, name: '星云绿' },
  { r: 74, g: 84, b: 225, name: '星云靛' },
  { r: 255, g: 107, b: 157, name: '星云玫' },
  { r: 205, g: 128, b: 50, name: '星云铜' },
  { r: 192, g: 192, b: 192, name: '星云银' },
];

export class PaletteManager {
  private blocks: ColorBlock[] = [];
  private barEl: HTMLElement;
  private particleEngine: ParticleEngine;
  private draggingBlock: ColorBlock | null = null;
  private dragGhost: HTMLElement | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private lastMouseTime = 0;
  private isDragging = false;

  constructor(barEl: HTMLElement, particleEngine: ParticleEngine) {
    this.barEl = barEl;
    this.particleEngine = particleEngine;
    this.initBlocks();
  }

  private initBlocks(): void {
    const shuffled = [...NEBULA_COLORS].sort(() => Math.random() - 0.5);

    for (let i = 0; i < 12; i++) {
      const color = shuffled[i];
      const block: ColorBlock = {
        r: color.r,
        g: color.g,
        b: color.b,
        name: color.name,
        el: null,
        originalIndex: i,
      };

      const el = document.createElement('div');
      el.className = 'color-block';
      el.title = color.name;
      el.style.background = `radial-gradient(circle at 35% 35%, 
        rgba(255,255,255,0.3) 0%, 
        rgb(${color.r},${color.g},${color.b}) 50%, 
        rgba(${color.r},${color.g},${color.b},0.6) 100%)`;
      el.style.boxShadow = `0 0 10px rgba(${color.r},${color.g},${color.b},0.5), 
        0 0 20px rgba(${color.r},${color.g},${color.b},0.2)`;

      el.addEventListener('mouseenter', () => {
        if (!this.isDragging) {
          el.style.boxShadow = `0 0 15px rgba(${color.r},${color.g},${color.b},0.8), 
            0 0 30px rgba(${color.r},${color.g},${color.b},0.4)`;
        }
      });

      el.addEventListener('mouseleave', () => {
        if (!this.isDragging) {
          el.style.boxShadow = `0 0 10px rgba(${color.r},${color.g},${color.b},0.5), 
            0 0 20px rgba(${color.r},${color.g},${color.b},0.2)`;
        }
      });

      el.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        this.startDrag(block, e.clientX, e.clientY);
      });

      block.el = el;
      this.blocks.push(block);
      this.barEl.appendChild(el);
    }
  }

  private startDrag(block: ColorBlock, x: number, y: number): void {
    this.draggingBlock = block;
    this.isDragging = true;
    this.dragStartX = x;
    this.dragStartY = y;
    this.lastMouseX = x;
    this.lastMouseY = y;
    this.lastMouseTime = performance.now();

    const ghost = document.createElement('div');
    ghost.className = 'color-block dragging';
    ghost.style.background = `radial-gradient(circle at 35% 35%, 
      rgba(255,255,255,0.2) 0%, 
      rgba(${block.r},${block.g},${block.b},0.7) 50%, 
      rgba(${block.r},${block.g},${block.b},0.4) 100%)`;
    ghost.style.boxShadow = `0 0 20px rgba(${block.r},${block.g},${block.b},0.6)`;
    ghost.style.width = '40px';
    ghost.style.height = '40px';
    ghost.style.left = `${x - 20}px`;
    ghost.style.top = `${y - 20}px`;
    document.body.appendChild(ghost);
    this.dragGhost = ghost;
  }

  onMouseMove(x: number, y: number): void {
    if (!this.isDragging || !this.dragGhost || !this.draggingBlock) return;

    this.dragGhost.style.left = `${x - 20}px`;
    this.dragGhost.style.top = `${y - 20}px`;

    this.lastMouseX = x;
    this.lastMouseY = y;
    this.lastMouseTime = performance.now();
  }

  onMouseUp(x: number, y: number): void {
    if (!this.isDragging || !this.draggingBlock) return;

    const barRect = this.barEl.getBoundingClientRect();
    const isAboveBar = y < barRect.top;

    if (isAboveBar) {
      const now = performance.now();
      const dt = Math.max(1, now - this.lastMouseTime);
      const dx = x - this.lastMouseX;
      const dy = y - this.lastMouseY;
      const speed = Math.sqrt(dx * dx + dy * dy) / dt;

      const count = Math.round(10 + Math.min(speed * 2, 10));
      const clampedCount = Math.max(10, Math.min(20, count));

      const speedMult = 0.5 + speed * 0.5;
      const clampedSpeed = Math.min(speedMult, 2.0);

      this.particleEngine.injectParticles(
        x, y,
        this.draggingBlock.r,
        this.draggingBlock.g,
        this.draggingBlock.b,
        clampedCount,
        clampedSpeed
      );
    }

    if (this.dragGhost) {
      document.body.removeChild(this.dragGhost);
      this.dragGhost = null;
    }

    this.draggingBlock = null;
    this.isDragging = false;
  }

  updateFromMixedColors(colors: Array<{ r: number; g: number; b: number }>): void {
    if (colors.length === 0) return;

    for (let i = 0; i < this.blocks.length; i++) {
      const colorIdx = i % colors.length;
      const c = colors[colorIdx];
      const block = this.blocks[i];

      const blendFactor = 0.05;
      block.r = block.r * (1 - blendFactor) + c.r * blendFactor;
      block.g = block.g * (1 - blendFactor) + c.g * blendFactor;
      block.b = block.b * (1 - blendFactor) + c.b * blendFactor;

      if (block.el && !this.isDragging) {
        block.el.style.background = `radial-gradient(circle at 35% 35%, 
          rgba(255,255,255,0.3) 0%, 
          rgb(${Math.round(block.r)},${Math.round(block.g)},${Math.round(block.b)}) 50%, 
          rgba(${Math.round(block.r)},${Math.round(block.g)},${Math.round(block.b)},0.6) 100%)`;
        block.el.style.boxShadow = `0 0 10px rgba(${Math.round(block.r)},${Math.round(block.g)},${Math.round(block.b)},0.5), 
          0 0 20px rgba(${Math.round(block.r)},${Math.round(block.g)},${Math.round(block.b)},0.2)`;
      }
    }
  }

  getAllColors(): Array<{ r: number; g: number; b: number }> {
    return this.blocks.map(b => ({ r: b.r, g: b.g, b: b.b }));
  }

  get isDragActive(): boolean {
    return this.isDragging;
  }
}
