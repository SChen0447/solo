export class CodeExporter {
  private codeDisplay: HTMLElement;
  private copyBtn: HTMLButtonElement;
  private downloadBtn: HTMLButtonElement;
  private currentCode: string = '';
  private copyTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    codeDisplayEl: HTMLElement,
    copyBtnEl: HTMLButtonElement,
    downloadBtnEl: HTMLButtonElement
  ) {
    this.codeDisplay = codeDisplayEl;
    this.copyBtn = copyBtnEl;
    this.downloadBtn = downloadBtnEl;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    this.downloadBtn.addEventListener('click', () => this.downloadCss());
  }

  updateCode(code: string): void {
    this.currentCode = code;
    this.renderHighlightedCode(code);
  }

  private renderHighlightedCode(code: string): void {
    const highlighted = this.highlightSyntax(code);
    const codeEl = this.codeDisplay.querySelector('code');
    if (codeEl) {
      codeEl.innerHTML = highlighted;
    }
  }

  private highlightSyntax(code: string): string {
    const colonIdx = code.indexOf(':');
    const semicolonIdx = code.lastIndexOf(';');

    if (colonIdx === -1 || semicolonIdx === -1) {
      return this.escapeHtml(code);
    }

    const property = code.substring(0, colonIdx);
    const value = code.substring(colonIdx + 1, semicolonIdx);
    const semicolon = code.substring(semicolonIdx);

    return (
      `<span class="syntax-property">${this.escapeHtml(property)}</span>` +
      `: ` +
      `<span class="syntax-value">${this.escapeHtml(value)}</span>` +
      `<span class="syntax-semicolon">${this.escapeHtml(semicolon)}</span>`
    );
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async copyToClipboard(): Promise<void> {
    if (!this.currentCode) return;

    try {
      await navigator.clipboard.writeText(this.currentCode);
      this.showCopiedFeedback();
    } catch {
      this.fallbackCopy();
    }
  }

  private fallbackCopy(): void {
    const textarea = document.createElement('textarea');
    textarea.value = this.currentCode;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      this.showCopiedFeedback();
    } finally {
      document.body.removeChild(textarea);
    }
  }

  private showCopiedFeedback(): void {
    const originalText = this.copyBtn.textContent;
    this.copyBtn.textContent = '已复制！';
    this.copyBtn.classList.add('copied');

    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }

    this.copyTimeout = setTimeout(() => {
      this.copyBtn.textContent = originalText;
      this.copyBtn.classList.remove('copied');
      this.copyTimeout = null;
    }, 1500);
  }

  downloadCss(): void {
    if (!this.currentCode) return;

    const cssContent = `.gradient-element {\n  ${this.currentCode}\n}\n`;
    const blob = new Blob([cssContent], { type: 'text/css;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'gradient.css';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  destroy(): void {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
      this.copyTimeout = null;
    }
  }
}
