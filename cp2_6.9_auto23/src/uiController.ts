import type { StyleType } from './svgConverter';

export interface UICallbacks {
  onConvert: () => void;
  onUndo: () => void;
  onClear: () => void;
  onStyleChange: (style: StyleType) => void;
  onStrokeWidthChange: (width: number) => void;
  onCopyCode: () => void;
  onDownload: () => void;
}

export class UIController {
  private strokeWidthSlider: HTMLInputElement;
  private strokeWidthValue: HTMLElement;
  private styleButtons: NodeListOf<HTMLButtonElement>;
  private convertBtn: HTMLButtonElement;
  private undoBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private copyBtn: HTMLButtonElement;
  private downloadBtn: HTMLButtonElement;
  private svgCodeTextarea: HTMLTextAreaElement;
  private progressGroup: HTMLElement;
  private progressFill: HTMLElement;
  private progressText: HTMLElement;

  private currentStyle: StyleType = 'sketch';

  constructor(private callbacks: UICallbacks) {
    this.strokeWidthSlider = document.getElementById('strokeWidth') as HTMLInputElement;
    this.strokeWidthValue = document.getElementById('strokeWidthValue') as HTMLElement;
    this.styleButtons = document.querySelectorAll('.style-btn') as NodeListOf<HTMLButtonElement>;
    this.convertBtn = document.getElementById('convertBtn') as HTMLButtonElement;
    this.undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
    this.clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    this.copyBtn = document.getElementById('copyBtn') as HTMLButtonElement;
    this.downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
    this.svgCodeTextarea = document.getElementById('svgCode') as HTMLTextAreaElement;
    this.progressGroup = document.getElementById('progressGroup') as HTMLElement;
    this.progressFill = document.getElementById('progressFill') as HTMLElement;
    this.progressText = document.getElementById('progressText') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.strokeWidthSlider.addEventListener('input', () => {
      const width = parseInt(this.strokeWidthSlider.value, 10);
      this.strokeWidthValue.textContent = `${width}px`;
      this.callbacks.onStrokeWidthChange(width);
    });

    this.styleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const style = btn.dataset.style as StyleType;
        if (style && style !== this.currentStyle) {
          this.setActiveStyle(style);
          this.callbacks.onStyleChange(style);
        }
      });
    });

    this.convertBtn.addEventListener('click', () => {
      this.callbacks.onConvert();
    });

    this.undoBtn.addEventListener('click', () => {
      this.callbacks.onUndo();
    });

    this.clearBtn.addEventListener('click', () => {
      this.callbacks.onClear();
    });

    this.copyBtn.addEventListener('click', () => {
      this.callbacks.onCopyCode();
    });

    this.downloadBtn.addEventListener('click', () => {
      this.callbacks.onDownload();
    });
  }

  private setActiveStyle(style: StyleType): void {
    this.currentStyle = style;
    this.styleButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === style);
    });
  }

  public getCurrentStyle(): StyleType {
    return this.currentStyle;
  }

  public setSVGCode(code: string): void {
    this.svgCodeTextarea.value = code;
  }

  public getSVGCode(): string {
    return this.svgCodeTextarea.value;
  }

  public showProgress(): void {
    this.progressGroup.style.display = 'flex';
    this.progressFill.style.width = '0%';
    this.progressText.textContent = '转换中...';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.progressFill.style.width = '100%';
      });
    });
  }

  public hideProgress(delayed = true): Promise<void> {
    const delay = delayed ? 850 : 0;
    return new Promise(resolve => {
      setTimeout(() => {
        this.progressText.textContent = '转换完成!';
        setTimeout(() => {
          this.progressGroup.style.display = 'none';
          resolve();
        }, 300);
      }, delay);
    });
  }

  public copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
        .then(() => true)
        .catch(() => this.fallbackCopy(text));
    }
    return Promise.resolve(this.fallbackCopy(text));
  }

  private fallbackCopy(text: string): boolean {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }

  public downloadSVG(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }

  public setButtonDisabled(button: 'convert' | 'undo' | 'clear', disabled: boolean): void {
    switch (button) {
      case 'convert':
        this.convertBtn.disabled = disabled;
        break;
      case 'undo':
        this.undoBtn.disabled = disabled;
        break;
      case 'clear':
        this.clearBtn.disabled = disabled;
        break;
    }
  }

  public showCopyFeedback(): void {
    const originalText = this.copyBtn.textContent;
    this.copyBtn.textContent = '已复制!';
    setTimeout(() => {
      this.copyBtn.textContent = originalText;
    }, 1000);
  }
}
