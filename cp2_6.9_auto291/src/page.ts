export interface CharacterData {
  id: number;
  char: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  offsetX: number;
  offsetY: number;
  fontSize: number;
  baseColor: string;
  currentColor: string;
  glowIntensity: number;
  targetGlow: number;
  glowStartTime: number;
  rotation: number;
  opacity: number;
  element: HTMLSpanElement | null;
  inParagraphMode: boolean;
  paragraphX: number;
  paragraphY: number;
  paragraphIndex: number;
}

export type LayoutMode = 'cloud' | 'paragraph';

const CHAR_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
const BASE_COLOR = '#3A2E28';
const GLOW_COLOR = '#66CCFF';

export class Page {
  private container: HTMLElement;
  private width: number = 0;
  private height: number = 0;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private paperElement: HTMLDivElement;
  private noiseCanvas: HTMLCanvasElement | null = null;
  private charactersContainer: HTMLDivElement;
  private signatureElement: HTMLDivElement;
  private characters: CharacterData[] = [];
  private charCount: number = 0;
  private cloudCenter: { x: number; y: number } = { x: 0, y: 0 };
  private layoutMode: LayoutMode = 'cloud';
  private paragraphLines: string[] = [];
  private onRenderCallback: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.charCount = 300 + Math.floor(Math.random() * 101);

    this.paperElement = document.createElement('div');
    this.paperElement.className = 'paper-page';
    this.paperElement.style.cssText = `
      position: relative;
      background: #F5E6C8;
      overflow: hidden;
      box-shadow: 0 10px 60px rgba(0,0,0,0.5);
    `;

    this.noiseCanvas = document.createElement('canvas');
    this.noiseCanvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;

    const vignette = document.createElement('div');
    vignette.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      background: radial-gradient(ellipse at center, transparent 55%, rgba(58, 46, 40, 0.35) 100%);
      z-index: 5;
    `;

    this.charactersContainer = document.createElement('div');
    this.charactersContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
    `;

    this.signatureElement = document.createElement('div');
    this.signatureElement.textContent = '信风之书——风之笔';
    this.signatureElement.style.cssText = `
      position: absolute;
      left: 40px;
      bottom: 60px;
      font-family: 'Ma Shan Zheng', 'ZCOOL XiaoWei', cursive;
      font-size: 26px;
      color: #8B5A2B;
      opacity: 0;
      pointer-events: none;
      z-index: 8;
      transition: opacity 1.5s ease-out;
    `;

    this.paperElement.appendChild(this.noiseCanvas);
    this.paperElement.appendChild(vignette);
    this.paperElement.appendChild(this.charactersContainer);
    this.paperElement.appendChild(this.signatureElement);
    this.container.appendChild(this.paperElement);

    this.resize();
    this.generateNoiseTexture();
    this.generateCharacters();
    this.paragraphLines = this.generateParagraphLines();

    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    this.resize();
    this.generateNoiseTexture();
    if (this.layoutMode === 'cloud') {
      this.updateCloudCenter();
      this.repositionCharactersForCloud();
    } else {
      this.layoutAsParagraph();
    }
  };

  resize(): void {
    const containerW = this.container.clientWidth;
    const containerH = this.container.clientHeight;
    const isMobile = containerW < 768;

    let paperW: number;
    let paperH: number;

    if (isMobile) {
      paperW = containerW * 0.9;
    } else {
      paperW = Math.min(containerW * 0.85, containerH * 0.85 / 1.414;
    }
    paperH = paperW * 1.414;

    if (paperH > containerH * 0.92) {
      paperH = containerH * 0.92;
      paperW = paperH / 1.414;
    }

    this.canvasWidth = paperW;
    this.canvasHeight = paperH;
    this.width = paperW;
    this.height = paperH;

    this.paperElement.style.width = `${paperW}px`;
    this.paperElement.style.height = `${paperH}px`;
    this.paperElement.style.borderRadius = isMobile ? '6px' : '10px';
  }

  private generateNoiseTexture(): void {
    if (!this.noiseCanvas) return;
    const scale = window.devicePixelRatio || 1;
    this.noiseCanvas.width = this.canvasWidth * scale;
    this.noiseCanvas.height = this.canvasHeight * scale;
    const ctx = this.noiseCanvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);

    const imageData = ctx.createImageData(this.canvasWidth, this.canvasHeight);
    const data = imageData.data;
    const density = 0.08;
    const totalPixels = this.canvasWidth * this.canvasHeight;
    const noisePixels = Math.floor(totalPixels * density);

    for (let i = 0; i < noisePixels; i++) {
      const idx = Math.floor(Math.random() * totalPixels) * 4;
      const gray = 120 + Math.floor(Math.random() * 60);
      data[idx] = gray;
      data[idx + 1] = gray - 20;
      data[idx + 2] = gray - 40;
      data[idx + 3] = 25 + Math.floor(Math.random() * 35);
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private updateCloudCenter(): void {
    const cx = this.width * (0.3 + Math.random() * 0.4);
    const cy = this.height * (0.3 + Math.random() * 0.4);
    this.cloudCenter = { x: cx, y: cy };
  }

  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private generateCharacters(): void {
    this.updateCloudCenter();
    const stdDev = this.width * 0.15;

    for (let i = 0; i < this.charCount; i++) {
      const char = CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];
      const fontSize = 16 + Math.random() * 8;
      let x: number, y: number;
      let attempts = 0;
      do {
        x = this.cloudCenter.x + this.gaussianRandom() * stdDev;
        y = this.cloudCenter.y + this.gaussianRandom() * stdDev;
        attempts++;
      } while ((x < 20 || x > this.width - 20 || y < 20 || y > this.height - 20) && attempts < 20);

      x = Math.max(20, Math.min(this.width - 20, x));
      y = Math.max(20, Math.min(this.height - 20, y));

      const charData: CharacterData = {
        id: i,
        char,
        x,
        y,
        targetX: x,
        targetY: y,
        offsetX: 0,
        offsetY: 0,
        fontSize,
        baseColor: BASE_COLOR,
        currentColor: BASE_COLOR,
        glowIntensity: 0,
        targetGlow: 0,
        glowStartTime: 0,
        rotation: (Math.random() - 0.5) * 0.3,
        opacity: 0.85 + Math.random() * 0.15,
        element: null,
        inParagraphMode: false,
        paragraphX: 0,
        paragraphY: 0,
        paragraphIndex: i,
      };

      const span = document.createElement('span');
      span.textContent = char;
      span.style.cssText = `
        position: absolute;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: ${fontSize}px;
        color: ${BASE_COLOR};
        pointer-events: none;
        will-change: transform, color, text-shadow, opacity;
        transform-origin: center center;
        transition: color 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: ${charData.opacity};
      `;
      charData.element = span;
      this.charactersContainer.appendChild(span);
      this.characters.push(charData);
    }
  }

  private repositionCharactersForCloud(): void {
    this.updateCloudCenter();
    const stdDev = this.width * 0.15;

    for (const c of this.characters) {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = this.cloudCenter.x + this.gaussianRandom() * stdDev;
        y = this.cloudCenter.y + this.gaussianRandom() * stdDev;
        attempts++;
      } while ((x < 20 || x > this.width - 20 || y < 20 || y > this.height - 20) && attempts < 20);

      x = Math.max(20, Math.min(this.width - 20, x));
      y = Math.max(20, Math.min(this.height - 20, y));

      c.x = x;
      c.y = y;
      c.targetX = x;
      c.targetY = y;
      c.offsetX = 0;
      c.offsetY = 0;
      c.rotation = (Math.random() - 0.5) * 0.3;
    }
  }

  private generateParagraphLines(): string[] {
    const words: string[] = [];
    const allChars = this.characters.map(c => c.char).join('');
    const total = allChars.length;
    const lineCharsPerLine = Math.floor(this.width / 14);

    let idx = 0;
    while (idx < total) {
      const lineLen = lineCharsPerLine + Math.floor(Math.random() * 6) - 3;
      const end = Math.min(idx + lineLen, total);
      words.push(allChars.slice(idx, end));
      idx = end;
    }
    return words;
  }

  layoutAsParagraph(): void {
    this.layoutMode = 'paragraph';
    this.paragraphLines = this.generateParagraphLines();

    const paddingX = this.width * 0.12;
    const startY = this.height * 0.15;
    const lineHeight = 20 * 1.8;
    const paragraphSpacing = 20 * 2.4;
    const charWidth = 14;

    let charIndex = 0;
    const lines = this.paragraphLines;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const isNewParagraph = lineIdx % 4 === 0;
      const indentX = isNewParagraph ? charWidth * 2 : 0;

      for (let col = 0; col < line.length && charIndex < this.characters.length; col++) {
        const c = this.characters[charIndex];
        c.targetX = paddingX + indentX + col * charWidth;
        c.targetY = startY + lineIdx * lineHeight + Math.floor(lineIdx / 4) * paragraphSpacing;
        c.paragraphX = c.targetX;
        c.paragraphY = c.targetY;
        c.paragraphIndex = charIndex;
        c.inParagraphMode = true;
        c.rotation = 0;
        charIndex++;
      }
    }

    this.signatureElement.style.opacity = '0.7';
  }

  scatter(): void {
    this.layoutMode = 'cloud';
    this.repositionCharactersForCloud();
    this.signatureElement.style.opacity = '0';
    for (const c of this.characters) {
      c.inParagraphMode = false;
    }
  }

  updateCharacters(deltaTime: number): void {
    const now = performance.now();

    for (const c of this.characters) {
      c.x += (c.targetX - c.x) * Math.min(1, deltaTime * 0.006);
      c.y += (c.targetY - c.y) * Math.min(1, deltaTime * 0.006);

      if (c.glowIntensity > 0 && now - c.glowStartTime > 500) {
        c.targetGlow = 0;
      }

      const glowSpeed = c.targetGlow > 0 ? 0.15 : 0.03;
      c.glowIntensity += (c.targetGlow - c.glowIntensity) * glowSpeed;

      if (c.glowIntensity > 0.01) {
        const r = Math.round(58 + (102 - 58) * c.glowIntensity);
        const g = Math.round(46 + (204 - 46) * c.glowIntensity);
        const b = Math.round(40 + (255 - 40) * c.glowIntensity);
        c.currentColor = `rgb(${r},${g},${b})`;
      } else {
        c.currentColor = c.baseColor;
      }

      if (!c.element) continue;

      const displayX = c.x + c.offsetX;
      const displayY = c.y + c.offsetY;

      let transform = `translate(${displayX}px, ${displayY}px) translate(-50%, -50%) rotate(${c.rotation}rad)`;

      if (c.inParagraphMode) {
        c.element.style.transform = transform;
      } else {
        const sway = Math.sin(now * 0.001 + c.id * 0.5) * 0.05;
        transform += ` rotate(${sway}rad) translateY(${Math.cos(now * 0.0013 + c.id * 0.3) * 1.5}px)`;
        c.element.style.transform = transform;
      }

      c.element.style.color = c.currentColor;

      if (c.glowIntensity > 0.1) {
        c.element.style.textShadow = `0 0 ${8 * c.glowIntensity}px rgba(102, 204, 255, ${c.glowIntensity * 0.8}), 0 0 ${16 * c.glowIntensity}px rgba(102, 204, 255, ${c.glowIntensity * 0.4})`;
      } else {
        c.element.style.textShadow = 'none';
      }
    }
  }

  getCharacters(): CharacterData[] {
    return this.characters;
  }

  getPaperElement(): HTMLElement {
    return this.paperElement;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getLayoutMode(): LayoutMode {
    return this.layoutMode;
  }

  setRenderCallback(cb: () => void): void {
    this.onRenderCallback = cb;
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize);
  }
}
