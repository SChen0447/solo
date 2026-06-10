export interface RadialGradientParams {
  hue: number;
  saturation: number;
  lightness: number;
  contrast: number;
}

export interface ConicGradientParams {
  hue: number;
  saturation: number;
  lightness: number;
  angle: number;
}

export class CssGradientPreview {
  private radialCanvas: HTMLElement;
  private conicCanvas: HTMLElement;
  private radialCodeEl: HTMLElement;
  private conicCodeEl: HTMLElement;

  private radialParams: RadialGradientParams = {
    hue: 210,
    saturation: 70,
    lightness: 50,
    contrast: 50
  };

  private conicParams: ConicGradientParams = {
    hue: 280,
    saturation: 70,
    lightness: 50,
    angle: 0
  };

  private rafId: number | null = null;
  private pendingUpdate = false;

  constructor(
    radialCanvas: HTMLElement,
    conicCanvas: HTMLElement,
    radialCodeEl: HTMLElement,
    conicCodeEl: HTMLElement
  ) {
    this.radialCanvas = radialCanvas;
    this.conicCanvas = conicCanvas;
    this.radialCodeEl = radialCodeEl;
    this.conicCodeEl = conicCodeEl;
  }

  public updateRadial(params: Partial<RadialGradientParams>): void {
    this.radialParams = { ...this.radialParams, ...params };
    this.scheduleUpdate();
  }

  public updateConic(params: Partial<ConicGradientParams>): void {
    this.conicParams = { ...this.conicParams, ...params };
    this.scheduleUpdate();
  }

  public getRadialCss(): string {
    const { hue, saturation, lightness, contrast } = this.radialParams;
    const centerLightness = Math.min(100, lightness + contrast * 0.4);
    const edgeLightness = Math.max(0, lightness - contrast * 0.4);
    const edgeHue = (hue + 40) % 360;

    const centerColor = `hsl(${hue}, ${saturation}%, ${centerLightness}%)`;
    const midColor = `hsl(${(hue + 20) % 360}, ${saturation}%, ${lightness}%)`;
    const edgeColor = `hsl(${edgeHue}, ${saturation}%, ${edgeLightness}%)`;

    return `radial-gradient(circle at center, ${centerColor} 0%, ${midColor} 50%, ${edgeColor} 100%)`;
  }

  public getConicCss(): string {
    const { hue, saturation, lightness, angle } = this.conicParams;

    const colors: string[] = [];
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const stepHue = (hue + (i * 360) / steps) % 360;
      const stepLightness = lightness + Math.sin((i / steps) * Math.PI * 2) * 15;
      colors.push(`hsl(${stepHue}, ${saturation}%, ${Math.max(0, Math.min(100, stepLightness))}%) ${(i * 100) / steps}%`);
    }
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%) 100%`);

    return `conic-gradient(from ${angle}deg at center, ${colors.join(', ')})`;
  }

  private scheduleUpdate(): void {
    this.pendingUpdate = true;
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.performUpdate());
    }
  }

  private performUpdate(): void {
    this.rafId = null;
    if (!this.pendingUpdate) return;
    this.pendingUpdate = false;

    const radialCss = this.getRadialCss();
    const conicCss = this.getConicCss();

    this.radialCanvas.style.background = radialCss;
    this.conicCanvas.style.background = conicCss;

    this.radialCodeEl.textContent = `background: ${radialCss};`;
    this.conicCodeEl.textContent = `background: ${conicCss};`;
  }

  public forceUpdate(): void {
    this.scheduleUpdate();
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
