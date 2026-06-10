import { Animator } from './animator.js';
import { hasCharacter, getAvailableCharacters } from './strokeData.js';

class UIController {
  private canvas: HTMLCanvasElement;
  private animator: Animator;
  private charInput: HTMLInputElement;
  private writeBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private palette: HTMLElement;
  private hint: HTMLElement;
  private selectedColor: string = '#1a1a1a';

  constructor() {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    const charInput = document.getElementById('charInput') as HTMLInputElement;
    const writeBtn = document.getElementById('writeBtn') as HTMLButtonElement;
    const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
    const palette = document.getElementById('palette') as HTMLElement;
    const hint = document.getElementById('hint') as HTMLElement;

    if (!canvas || !charInput || !writeBtn || !exportBtn || !palette || !hint) {
      throw new Error('必要的DOM元素未找到');
    }

    this.canvas = canvas;
    this.charInput = charInput;
    this.writeBtn = writeBtn;
    this.exportBtn = exportBtn;
    this.palette = palette;
    this.hint = hint;

    this.animator = new Animator(this.canvas);
    this.bindEvents();
  }

  private bindEvents(): void {
    this.writeBtn.addEventListener('click', () => this.handleWrite());

    this.charInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.handleWrite();
      }
    });

    this.charInput.addEventListener('input', () => {
      const val = this.charInput.value;
      if (val.length > 0) {
        const firstChar = val.charAt(0);
        this.charInput.value = firstChar;
      }
    });

    const swatches = this.palette.querySelectorAll('.swatch');
    swatches.forEach((swatch) => {
      swatch.addEventListener('click', () => this.handleColorSelect(swatch as HTMLElement));
    });

    this.exportBtn.addEventListener('click', () => this.handleExport());
  }

  private handleColorSelect(swatch: HTMLElement): void {
    const color = swatch.dataset.color;
    if (!color) return;
    this.selectedColor = color;
    this.animator.setInkColor(color);
    const swatches = this.palette.querySelectorAll('.swatch');
    swatches.forEach((s) => s.classList.remove('selected'));
    swatch.classList.add('selected');
  }

  private handleWrite(): void {
    const character = this.charInput.value.trim();
    if (!character) {
      this.charInput.focus();
      return;
    }
    const firstChar = character.charAt(0);
    this.hideHint();
    this.animator.startWriting(firstChar);
    if (!hasCharacter(firstChar)) {
      const available = getAvailableCharacters().join('、');
      console.log(`提示：当前收录汉字：${available}。未收录汉字将显示默认笔画。`);
    }
  }

  private handleExport(): void {
    if (this.animator.getState() === 'idle') {
      console.log('请先书写一个汉字再导出');
      return;
    }
    const dataUrl = this.animator.exportPNG(1920, 1080, 2);
    this.downloadDataUrl(dataUrl, '笔锋诗痕.png');
  }

  private downloadDataUrl(dataUrl: string, filename: string): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private hideHint(): void {
    if (!this.hint.classList.contains('hidden')) {
      this.hint.classList.add('hidden');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new UIController();
  } catch (e) {
    console.error('初始化失败：', e);
  }
});
