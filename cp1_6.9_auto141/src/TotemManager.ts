export type ElementType = 'fire' | 'water' | 'wind' | 'earth';

export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#ff4422',
  water: '#4488ff',
  wind: '#88ff44',
  earth: '#cc8844'
};

export const ELEMENT_SYMBOLS: Record<ElementType, string> = {
  fire: '火',
  water: '水',
  wind: '风',
  earth: '地'
};

export interface Totem {
  id: number;
  element: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  isActivated: boolean;
  pressOffset: number;
  pressTimer: number;
}

export type ActivateEvent =
  | { type: 'success'; totem: Totem; index: number }
  | { type: 'failure'; totem: Totem }
  | { type: 'complete' };

export class TotemManager {
  private totems: Totem[] = [];
  private correctSequence: ElementType[] = [];
  private currentStep: number = 0;
  private listeners: ((e: ActivateEvent) => void)[] = [];

  constructor(private canvasWidth: number, private canvasHeight: number) {
    this.generateTotems();
    this.generateSequence();
  }

  private generateTotems(): void {
    const elements: ElementType[] = ['fire', 'water', 'wind', 'earth'];
    const quadrants = [
      { xMin: 0.1, xMax: 0.4, yMin: 0.1, yMax: 0.4 },
      { xMin: 0.6, xMax: 0.9, yMin: 0.1, yMax: 0.4 },
      { xMin: 0.1, xMax: 0.4, yMin: 0.6, yMax: 0.9 },
      { xMin: 0.6, xMax: 0.9, yMin: 0.6, yMax: 0.9 }
    ];

    const shuffledElements = [...elements].sort(() => Math.random() - 0.5);

    for (let i = 0; i < 4; i++) {
      const q = quadrants[i];
      this.totems.push({
        id: i,
        element: shuffledElements[i],
        x: (q.xMin + Math.random() * (q.xMax - q.xMin)) * this.canvasWidth,
        y: (q.yMin + Math.random() * (q.yMax - q.yMin)) * this.canvasHeight,
        width: 80,
        height: 120,
        isActivated: false,
        pressOffset: 0,
        pressTimer: 0
      });
    }
  }

  private generateSequence(): void {
    const elements: ElementType[] = ['fire', 'water', 'wind', 'earth'];
    this.correctSequence = [...elements].sort(() => Math.random() - 0.5);
    this.currentStep = 0;
  }

  public getTotems(): Totem[] {
    return this.totems;
  }

  public getCurrentStep(): number {
    return this.currentStep;
  }

  public getCorrectSequence(): ElementType[] {
    return this.correctSequence;
  }

  public onEvent(listener: (e: ActivateEvent) => void): void {
    this.listeners.push(listener);
  }

  private emit(event: ActivateEvent): void {
    this.listeners.forEach(l => l(event));
  }

  public handleClick(clickX: number, clickY: number): void {
    const totem = this.findTotemAt(clickX, clickY);
    if (!totem || totem.isActivated) return;

    totem.pressOffset = 3;
    totem.pressTimer = 0.1;

    const expectedElement = this.correctSequence[this.currentStep];

    if (totem.element === expectedElement) {
      totem.isActivated = true;
      this.currentStep++;
      this.emit({ type: 'success', totem, index: this.currentStep - 1 });

      if (this.currentStep === this.correctSequence.length) {
        this.emit({ type: 'complete' });
      }
    } else {
      this.emit({ type: 'failure', totem });
      this.resetAll();
    }
  }

  public isHoveringTotem(x: number, y: number): boolean {
    return this.findTotemAt(x, y) !== null;
  }

  private findTotemAt(x: number, y: number): Totem | null {
    for (const t of this.totems) {
      if (
        x >= t.x - t.width / 2 &&
        x <= t.x + t.width / 2 &&
        y >= t.y - t.height / 2 &&
        y <= t.y + t.height / 2
      ) {
        return t;
      }
    }
    return null;
  }

  public resetAll(): void {
    this.totems.forEach(t => {
      t.isActivated = false;
      t.pressOffset = 0;
      t.pressTimer = 0;
    });
    this.currentStep = 0;
  }

  public update(dt: number): void {
    this.totems.forEach(t => {
      if (t.pressTimer > 0) {
        t.pressTimer -= dt;
        if (t.pressTimer <= 0) {
          t.pressOffset = 0;
          t.pressTimer = 0;
        }
      }
    });
  }
}
