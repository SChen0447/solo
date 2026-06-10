import {
  PaletteManager,
  BuildingType,
  getTypeLabel,
  getTypePrimaryColor,
  generateSimilarColors
} from './paletteManager';
import { LightingSimulator } from './lightingSimulator';

interface Ripple {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  startTime: number;
  blockIndex: number;
}

interface HoverState {
  blockIndex: number | null;
}

const GRID_COLS = 4;
const GRID_GAP = 2;
const BLOCK_SIZE_DESKTOP = 80;
const BLOCK_SIZE_MOBILE = 60;
const LABEL_FONT_SIZE = 6;
const BREAKPOINT = 768;

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private paletteManager: PaletteManager;
  private lightingSimulator: LightingSimulator;

  private blockSize: number = BLOCK_SIZE_DESKTOP;
  private hoverState: HoverState = { blockIndex: null };
  private ripples: Ripple[] = [];
  private animationFrameId: number | null = null;
  private colorPickerPopup: HTMLDivElement | null = null;
  private editingBlockId: string | null = null;
  private renderPending: boolean = false;

  constructor() {
    this.canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文');
    }
    this.ctx = ctx;

    this.paletteManager = new PaletteManager();
    this.lightingSimulator = new LightingSimulator({ color: '#f1c40f', intensity: 40 });

    this.updateBlockSize();
    this.bindEvents();
    this.render();
    this.updateStats();
    this.startAnimationLoop();
  }

  private updateBlockSize(): void {
    this.blockSize = window.innerWidth < BREAKPOINT ? BLOCK_SIZE_MOBILE : BLOCK_SIZE_DESKTOP;
  }

  private getCanvasDimensions(): { width: number; height: number } {
    const blocks = this.paletteManager.getBlocks();
    const cols = GRID_COLS;
    const rows = Math.ceil(blocks.length / cols);
    return {
      width: cols * this.blockSize + (cols - 1) * GRID_GAP,
      height: rows * this.blockSize + (rows - 1) * GRID_GAP
    };
  }

  private resizeCanvas(): void {
    const { width, height } = this.getCanvasDimensions();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(dpr, dpr);
  }

  private render(): void {
    if (this.renderPending) return;
    this.renderPending = true;
    requestAnimationFrame(() => {
      this.doRender();
      this.renderPending = false;
    });
  }

  private doRender(): void {
    this.resizeCanvas();
    const blocks = this.paletteManager.getBlocks();
    const { width, height } = this.getCanvasDimensions();

    this.ctx.fillStyle = '#2c3e50';
    this.ctx.fillRect(0, 0, width, height);

    const baseColors = blocks.map((b) => b.color);
    const imageData = this.lightingSimulator.renderBlocksToImageData(
      this.ctx,
      baseColors,
      GRID_COLS,
      this.blockSize,
      GRID_GAP
    );
    this.ctx.putImageData(imageData, 0, 0);

    this.ctx.font = `${LABEL_FONT_SIZE * (this.blockSize / BLOCK_SIZE_DESKTOP)}px 'Courier New', monospace`;
    this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    blocks.forEach((block, idx) => {
      const col = idx % GRID_COLS;
      const row = Math.floor(idx / GRID_COLS);
      const x = col * (this.blockSize + GRID_GAP);
      const y = row * (this.blockSize + GRID_GAP);
      const labelY = y + 4 * (this.blockSize / BLOCK_SIZE_DESKTOP);
      const centerX = x + this.blockSize / 2;
      this.ctx.fillText(getTypeLabel(block.type), centerX, labelY);

      if (this.hoverState.blockIndex === idx) {
        this.ctx.save();
        const cx = x + this.blockSize / 2;
        const cy = y + this.blockSize / 2;
        this.ctx.translate(cx, cy);
        this.ctx.scale(1.1, 1.1);
        this.ctx.translate(-cx, -cy);
        this.ctx.shadowColor = 'rgba(255,255,255,0.4)';
        this.ctx.shadowBlur = 12;
        const blendedColor = this.lightingSimulator.applyToColor(block.color);
        this.ctx.fillStyle = blendedColor;
        this.ctx.fillRect(x, y, this.blockSize, this.blockSize);
        this.ctx.restore();
      }
    });

    this.renderRipples();
  }

  private renderRipples(): void {
    const now = performance.now();
    const blocks = this.paletteManager.getBlocks();

    this.ripples = this.ripples.filter((ripple) => {
      const elapsed = now - ripple.startTime;
      const duration = 300;
      if (elapsed >= duration) return false;

      const progress = elapsed / duration;
      const block = blocks[ripple.blockIndex];
      if (!block) return false;

      const col = ripple.blockIndex % GRID_COLS;
      const row = Math.floor(ripple.blockIndex / GRID_COLS);
      const bx = col * (this.blockSize + GRID_GAP);
      const by = row * (this.blockSize + GRID_GAP);

      const currentRadius = ripple.maxRadius * progress;
      const currentAlpha = 1 - progress;

      const gradient = this.ctx.createRadialGradient(
        bx + ripple.x,
        by + ripple.y,
        0,
        bx + ripple.x,
        by + ripple.y,
        currentRadius
      );
      gradient.addColorStop(0, `rgba(255,255,255,${0.6 * currentAlpha})`);
      gradient.addColorStop(1, `rgba(255,255,255,0)`);

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(bx, by, this.blockSize, this.blockSize);

      return true;
    });
  }

  private startAnimationLoop(): void {
    const loop = () => {
      if (this.ripples.length > 0) {
        this.render();
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private getBlockIndexAtPosition(clientX: number, clientY: number): number | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const blocks = this.paletteManager.getBlocks();

    for (let i = 0; i < blocks.length; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const bx = col * (this.blockSize + GRID_GAP);
      const by = row * (this.blockSize + GRID_GAP);
      if (x >= bx && x < bx + this.blockSize && y >= by && y < by + this.blockSize) {
        return i;
      }
    }
    return null;
  }

  private spawnRipple(blockIndex: number, localX: number, localY: number): void {
    this.ripples.push({
      id: `ripple_${Date.now()}_${Math.random()}`,
      x: localX,
      y: localY,
      radius: 0,
      maxRadius: this.blockSize,
      alpha: 1,
      startTime: performance.now(),
      blockIndex
    });
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const blockIndex = this.getBlockIndexAtPosition(e.clientX, e.clientY);
      this.hoverState.blockIndex = blockIndex;
      this.canvas.style.cursor = blockIndex !== null ? 'pointer' : 'default';
      this.render();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverState.blockIndex = null;
      this.render();
    });

    this.canvas.addEventListener('click', (e) => {
      const blockIndex = this.getBlockIndexAtPosition(e.clientX, e.clientY);
      if (blockIndex !== null) {
        const rect = this.canvas.getBoundingClientRect();
        const col = blockIndex % GRID_COLS;
        const row = Math.floor(blockIndex / GRID_COLS);
        const bx = col * (this.blockSize + GRID_GAP);
        const by = row * (this.blockSize + GRID_GAP);
        const localX = e.clientX - rect.left - bx;
        const localY = e.clientY - rect.top - by;
        this.spawnRipple(blockIndex, localX, localY);

        const blocks = this.paletteManager.getBlocks();
        const block = blocks[blockIndex];
        this.showColorPicker(block.id, e.clientX, e.clientY);
      }
    });

    document.querySelectorAll('.toolbox button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (!action) return;

        switch (action) {
          case 'add-residential':
            this.paletteManager.addBlock('residential');
            break;
          case 'add-commercial':
            this.paletteManager.addBlock('commercial');
            break;
          case 'add-industrial':
            this.paletteManager.addBlock('industrial');
            break;
          case 'reset':
            this.paletteManager.resetToDefault();
            break;
          case 'random':
            this.paletteManager.randomize();
            break;
        }
        this.render();
        this.updateStats();
      });
    });

    document.querySelector('[data-action="export"]')?.addEventListener('click', () => {
      this.paletteManager.exportToJson();
    });

    const lightColorSelect = document.getElementById('light-color-select') as HTMLSelectElement;
    lightColorSelect.addEventListener('change', () => {
      this.lightingSimulator.setLightColor(lightColorSelect.value);
      this.render();
    });

    const lightIntensity = document.getElementById('light-intensity') as HTMLInputElement;
    const intensityDisplay = document.getElementById('intensity-display') as HTMLSpanElement;
    lightIntensity.addEventListener('input', () => {
      const value = parseInt(lightIntensity.value, 10);
      this.lightingSimulator.setIntensity(value);
      intensityDisplay.textContent = `${value}%`;
      this.render();
    });

    window.addEventListener('resize', () => {
      this.updateBlockSize();
      this.render();
    });

    document.addEventListener('click', (e) => {
      if (
        this.colorPickerPopup &&
        !this.colorPickerPopup.contains(e.target as Node) &&
        e.target !== this.canvas
      ) {
        this.hideColorPicker();
      }
    });
  }

  private showColorPicker(blockId: string, clientX: number, clientY: number): void {
    this.hideColorPicker();
    this.editingBlockId = blockId;

    const block = this.paletteManager.getBlockById(blockId);
    if (!block) return;

    const popup = document.createElement('div');
    popup.className = 'color-picker-popup';
    popup.style.left = `${Math.min(clientX, window.innerWidth - 260)}px`;
    popup.style.top = `${Math.min(clientY, window.innerHeight - 220)}px`;

    const presetColors = this.getPresetColorsForType(block.type);

    popup.innerHTML = `
      <h4>选择颜色</h4>
      <div class="preset-colors">
        ${presetColors.map((c) => `<div class="preset-color" style="background:${c}" data-color="${c}"></div>`).join('')}
      </div>
      <div class="custom-picker">
        <input type="color" id="custom-color-input" value="${block.color}" />
        <input type="text" id="custom-color-text" value="${block.color}" maxlength="7" />
      </div>
    `;

    document.body.appendChild(popup);
    this.colorPickerPopup = popup;

    popup.querySelectorAll('.preset-color').forEach((el) => {
      el.addEventListener('click', () => {
        const color = (el as HTMLElement).getAttribute('data-color');
        if (color && this.editingBlockId) {
          this.paletteManager.updateBlockColor(this.editingBlockId, color);
          this.render();
          this.hideColorPicker();
        }
      });
    });

    const colorInput = popup.querySelector('#custom-color-input') as HTMLInputElement;
    const colorText = popup.querySelector('#custom-color-text') as HTMLInputElement;

    colorInput.addEventListener('input', () => {
      colorText.value = colorInput.value;
      if (this.editingBlockId) {
        this.paletteManager.updateBlockColor(this.editingBlockId, colorInput.value);
        this.render();
      }
    });

    colorText.addEventListener('change', () => {
      let value = colorText.value.trim();
      if (!value.startsWith('#')) value = '#' + value;
      if (/^#[0-9a-fA-F]{6}$/.test(value)) {
        colorInput.value = value;
        if (this.editingBlockId) {
          this.paletteManager.updateBlockColor(this.editingBlockId, value);
          this.render();
        }
      }
    });
  }

  private hideColorPicker(): void {
    if (this.colorPickerPopup) {
      this.colorPickerPopup.remove();
      this.colorPickerPopup = null;
      this.editingBlockId = null;
    }
  }

  private getPresetColorsForType(type: BuildingType): string[] {
    const primaryColor = getTypePrimaryColor(type);
    return generateSimilarColors(primaryColor, 12, 45);
  }

  private updateStats(): void {
    const counts = this.paletteManager.getCounts();
    const content = document.getElementById('stats-content');
    if (!content) return;

    content.innerHTML = `
      <div class="stat-row">
        <span>住宅</span>
        <span class="stat-badge residential">${counts.residential}</span>
      </div>
      <div class="stat-row">
        <span>商业</span>
        <span class="stat-badge commercial">${counts.commercial}</span>
      </div>
      <div class="stat-row">
        <span>工业</span>
        <span class="stat-badge industrial">${counts.industrial}</span>
      </div>
      <div class="stat-row stat-total">
        <span>总计</span>
        <span class="stat-badge total">${counts.total}</span>
      </div>
    `;
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.hideColorPicker();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
