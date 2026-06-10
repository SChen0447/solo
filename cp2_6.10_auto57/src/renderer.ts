export interface TypographyParams {
  letterSpacing: number;
  lineHeight: number;
  fontWeight: number;
  fontSize: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  fontFamily: string;
  isDarkMode: boolean;
  customClasses?: string[];
}

const DEFAULT_TEXT = 'Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed.';

export class TextRenderer {
  private previewEl: HTMLElement;
  private textInputEl: HTMLTextAreaElement;
  private previewSectionEl: HTMLElement;
  private charCountEl: HTMLElement;
  private currentText: string = DEFAULT_TEXT;
  private rafId: number | null = null;
  private pendingParams: TypographyParams | null = null;

  constructor() {
    this.previewEl = document.getElementById('preview-text') as HTMLElement;
    this.textInputEl = document.getElementById('text-input') as HTMLTextAreaElement;
    this.previewSectionEl = document.getElementById('preview-section') as HTMLElement;
    this.charCountEl = document.getElementById('char-count') as HTMLElement;

    if (!this.previewEl || !this.textInputEl || !this.previewSectionEl || !this.charCountEl) {
      throw new Error('Required DOM elements not found');
    }

    this.currentText = this.textInputEl.value || DEFAULT_TEXT;
    this.updateCharCount();
    this.previewEl.textContent = this.currentText;
  }

  public setText(text: string): void {
    this.currentText = text.slice(0, 200);
    this.updateCharCount();
    this.scheduleRender();
  }

  public getText(): string {
    return this.currentText;
  }

  private updateCharCount(): void {
    const len = this.currentText.length;
    this.charCountEl.textContent = `${len} / 200`;
  }

  public updateParams(params: TypographyParams): void {
    this.pendingParams = { ...params };
    this.scheduleRender();
  }

  public addCustomClass(className: string): void {
    this.previewEl.classList.add(className);
  }

  public removeCustomClass(className: string): void {
    this.previewEl.classList.remove(className);
  }

  public generateCSS(params: TypographyParams): string {
    const lines: string[] = [
      '.typography-preview {',
      `  -webkit-font-smoothing: antialiased;`,
      `  -moz-osx-font-smoothing: grayscale;`,
      `  -webkit-text-size-adjust: 100%;`,
      `  font-family: ${params.fontFamily};`,
      `  font-size: ${params.fontSize}px;`,
      `  font-weight: ${params.fontWeight};`,
      `  line-height: ${params.lineHeight};`,
      `  letter-spacing: ${params.letterSpacing}px;`,
      `  text-align: ${params.textAlign};`,
      `  -webkit-hyphens: auto;`,
      `  -ms-hyphens: auto;`,
      `  hyphens: auto;`,
      '}'
    ];
    return lines.join('\n');
  }

  private scheduleRender(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = requestAnimationFrame(() => this.render());
  }

  private render(): void {
    this.rafId = null;
    this.previewEl.textContent = this.currentText;

    if (this.pendingParams) {
      const params = this.pendingParams;
      this.pendingParams = null;

      const style = this.previewEl.style;
      style.fontFamily = params.fontFamily;
      style.fontSize = `${params.fontSize}px`;
      style.fontWeight = String(params.fontWeight);
      style.lineHeight = String(params.lineHeight);
      style.letterSpacing = `${params.letterSpacing}px`;
      style.textAlign = params.textAlign;

      this.updateGridOpacity(params.fontSize);

      if (params.customClasses) {
        this.previewEl.className = '';
        params.customClasses.forEach(cls => this.previewEl.classList.add(cls));
      }
    }
  }

  private updateGridOpacity(fontSize: number): void {
    if (fontSize < 36) {
      this.previewSectionEl.style.opacity = '1';
    } else {
      const opacity = Math.max(0.3, 1 - (fontSize - 36) / 100);
      this.previewSectionEl.style.opacity = String(opacity);
    }
  }
}
