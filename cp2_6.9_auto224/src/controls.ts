import { Flame, FunctionType, FUNCTION_LABELS } from './flame';

export type RenderCallback = () => void;

export class Controls {
  private flame: Flame;
  private root: HTMLElement;
  private onRender: RenderCallback;
  private debounceTimer: number | null = null;
  private readonly DEBOUNCE_MS = 300;

  private pointsSlider: HTMLInputElement;
  private pointsValue: HTMLElement;
  private functionSelectors: HTMLSelectElement[] = [];
  private colorStartInput: HTMLInputElement;
  private colorEndInput: HTMLInputElement;
  private randomColorBtn: HTMLButtonElement;
  private rotationSlider: HTMLInputElement;
  private rotationValue: HTMLElement;
  private leftToggle: HTMLButtonElement;
  private rightToggle: HTMLButtonElement;
  private leftPanel: HTMLElement;
  private rightPanel: HTMLElement;

  constructor(flame: Flame, root: HTMLElement, onRender: RenderCallback) {
    this.flame = flame;
    this.root = root;
    this.onRender = onRender;

    this.pointsSlider = root.querySelector('#points-slider') as HTMLInputElement;
    this.pointsValue = root.querySelector('#points-value') as HTMLElement;
    this.colorStartInput = root.querySelector('#color-start') as HTMLInputElement;
    this.colorEndInput = root.querySelector('#color-end') as HTMLInputElement;
    this.randomColorBtn = root.querySelector('#random-color') as HTMLButtonElement;
    this.rotationSlider = root.querySelector('#rotation-slider') as HTMLInputElement;
    this.rotationValue = root.querySelector('#rotation-value') as HTMLElement;
    this.leftToggle = root.querySelector('#toggle-left') as HTMLButtonElement;
    this.rightToggle = root.querySelector('#toggle-right') as HTMLButtonElement;
    this.leftPanel = root.querySelector('#left-panel') as HTMLElement;
    this.rightPanel = root.querySelector('#right-panel') as HTMLElement;

    for (let i = 1; i <= 4; i++) {
      const sel = root.querySelector(`#function-${i}`) as HTMLSelectElement;
      this.functionSelectors.push(sel);
    }

    this.populateFunctionSelectors();
    this.bindEvents();
  }

  private populateFunctionSelectors(): void {
    const defaults: FunctionType[] = ['linear', 'sinusoidal', 'spherical', 'heart'];
    this.functionSelectors.forEach((sel, idx) => {
      (Object.keys(FUNCTION_LABELS) as FunctionType[]).forEach((key) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = FUNCTION_LABELS[key];
        if (key === defaults[idx]) opt.selected = true;
        sel.appendChild(opt);
      });
    });
  }

  private bindEvents(): void {
    this.pointsSlider.addEventListener('input', () => {
      this.pointsValue.textContent = this.pointsSlider.value;
      const n = parseInt(this.pointsSlider.value, 10);
      this.flame.setPoints(n);
      this.debounceRender();
    });

    this.functionSelectors.forEach((sel) => {
      sel.addEventListener('change', () => {
        const types = this.functionSelectors.map((s) => s.value as FunctionType);
        this.flame.setFunctions(types);
        this.debounceRender();
      });
    });

    const colorHandler = () => {
      this.flame.setColors(this.colorStartInput.value, this.colorEndInput.value);
      this.debounceRender();
    };
    this.colorStartInput.addEventListener('input', colorHandler);
    this.colorEndInput.addEventListener('input', colorHandler);

    this.randomColorBtn.addEventListener('click', () => {
      const pair = this.randomVibrantPair();
      this.colorStartInput.value = pair[0];
      this.colorEndInput.value = pair[1];
      this.flame.setColors(pair[0], pair[1]);
      this.debounceRender();
    });

    this.rotationSlider.addEventListener('input', () => {
      const val = parseFloat(this.rotationSlider.value);
      this.rotationValue.textContent = val.toFixed(1);
      this.flame.setRotationSpeed(val);
    });

    this.leftToggle.addEventListener('click', () => {
      this.leftPanel.classList.toggle('collapsed');
    });
    this.rightToggle.addEventListener('click', () => {
      this.rightPanel.classList.toggle('collapsed');
    });
  }

  private randomVibrantPair(): [string, string] {
    const randomVibrant = (): string => {
      const h = Math.floor(Math.random() * 360);
      const s = 80 + Math.floor(Math.random() * 20);
      const l = 60 + Math.floor(Math.random() * 15);
      return this.hslToHex(h, s, l);
    };
    const c1 = randomVibrant();
    let c2 = randomVibrant();
    let attempts = 0;
    while (this.colorDistance(c1, c2) < 80 && attempts < 10) {
      c2 = randomVibrant();
      attempts++;
    }
    return [c1, c2];
  }

  private hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x: number) =>
      Math.round(255 * x)
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

  private colorDistance(c1: string, c2: string): number {
    const r1 = parseInt(c1.substring(1, 3), 16);
    const g1 = parseInt(c1.substring(3, 5), 16);
    const b1 = parseInt(c1.substring(5, 7), 16);
    const r2 = parseInt(c2.substring(1, 3), 16);
    const g2 = parseInt(c2.substring(3, 5), 16);
    const b2 = parseInt(c2.substring(5, 7), 16);
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  }

  private debounceRender(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.flame.invalidate();
      this.flame.iterate();
      this.onRender();
      this.debounceTimer = null;
    }, this.DEBOUNCE_MS);
  }

  triggerImmediate(): void {
    this.flame.iterate();
    this.onRender();
  }
}
