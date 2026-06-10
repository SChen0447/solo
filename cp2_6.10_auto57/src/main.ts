import { TextRenderer, TypographyParams } from './renderer';
import { ControlPanel, DEFAULT_PARAMS } from './controls';

class TypographyApp {
  private renderer: TextRenderer;
  private controls: ControlPanel;
  private state: TypographyParams;

  private modalOverlay: HTMLElement;
  private modalClose: HTMLElement;
  private cssCodeEl: HTMLElement;
  private copyBtn: HTMLElement;
  private copyStatus: HTMLElement;

  constructor() {
    this.state = { ...DEFAULT_PARAMS };

    this.renderer = new TextRenderer();
    this.controls = new ControlPanel({
      onLetterSpacingChange: (val) => this.updateState('letterSpacing', val),
      onLineHeightChange: (val) => this.updateState('lineHeight', val),
      onFontWeightChange: (val) => this.updateState('fontWeight', val),
      onFontSizeChange: (val) => this.updateState('fontSize', val),
      onTextAlignChange: (val) => this.updateState('textAlign', val),
      onFontFamilyChange: (val) => this.updateState('fontFamily', val),
      onThemeChange: (val) => this.updateState('isDarkMode', val),
      onReset: () => this.resetState(),
      onExport: () => this.showExportModal()
    });

    this.modalOverlay = document.getElementById('modal-overlay') as HTMLElement;
    this.modalClose = document.getElementById('modal-close') as HTMLElement;
    this.cssCodeEl = document.getElementById('css-code') as HTMLElement;
    this.copyBtn = document.getElementById('copy-btn') as HTMLElement;
    this.copyStatus = document.getElementById('copy-status') as HTMLElement;

    if (!this.modalOverlay || !this.modalClose || !this.cssCodeEl || !this.copyBtn || !this.copyStatus) {
      throw new Error('Modal elements not found');
    }

    this.bindTextInput();
    this.bindModalEvents();
    this.renderer.updateParams(this.state);
  }

  private updateState<K extends keyof TypographyParams>(key: K, value: TypographyParams[K]): void {
    this.state[key] = value;
    this.renderer.updateParams(this.state);
  }

  private resetState(): void {
    this.state = { ...DEFAULT_PARAMS };
    this.renderer.updateParams(this.state);
  }

  private bindTextInput(): void {
    const textInput = document.getElementById('text-input') as HTMLTextAreaElement;
    if (!textInput) return;

    let typingTimeout: number | null = null;

    textInput.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLTextAreaElement;
      this.renderer.setText(target.value);

      if (typingTimeout !== null) {
        clearTimeout(typingTimeout);
      }
      typingTimeout = window.setTimeout(() => {
        typingTimeout = null;
      }, 16);
    });
  }

  private bindModalEvents(): void {
    this.modalClose.addEventListener('click', () => this.hideExportModal());

    this.modalOverlay.addEventListener('click', (e: Event) => {
      if (e.target === this.modalOverlay) {
        this.hideExportModal();
      }
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.modalOverlay.classList.contains('active')) {
        this.hideExportModal();
      }
    });

    this.copyBtn.addEventListener('click', () => this.copyCSS());
  }

  private showExportModal(): void {
    const css = this.renderer.generateCSS(this.state);
    this.cssCodeEl.textContent = css;
    this.modalOverlay.classList.add('active');
    this.copyBtn.classList.remove('copied');
    this.copyBtn.textContent = '复制代码';
    this.copyStatus.classList.remove('show');
  }

  private hideExportModal(): void {
    this.modalOverlay.classList.remove('active');
  }

  private async copyCSS(): Promise<void> {
    const css = this.cssCodeEl.textContent || '';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(css);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = css;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      this.copyBtn.classList.add('copied');
      this.copyBtn.textContent = '已复制';
      this.copyStatus.classList.add('show');
      setTimeout(() => {
        this.copyBtn.classList.remove('copied');
        this.copyBtn.textContent = '复制代码';
        this.copyStatus.classList.remove('show');
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      this.copyBtn.textContent = '复制失败';
      setTimeout(() => {
        this.copyBtn.textContent = '复制代码';
      }, 2000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TypographyApp();
});
