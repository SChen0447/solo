export class Tube {
  public readonly id: number;
  public readonly capacity: number;
  public colors: string[];
  public x: number;
  public y: number;
  public width: number;
  public height: number;

  constructor(
    id: number,
    capacity: number,
    x: number,
    y: number,
    width: number,
    height: number,
    colors: string[] = []
  ) {
    this.id = id;
    this.capacity = capacity;
    this.colors = [...colors];
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  isEmpty(): boolean {
    return this.colors.length === 0;
  }

  isFull(): boolean {
    return this.colors.length >= this.capacity;
  }

  topColor(): string | null {
    if (this.isEmpty()) return null;
    return this.colors[this.colors.length - 1];
  }

  consecutiveTopCount(): number {
    if (this.isEmpty()) return 0;
    const top = this.topColor();
    let count = 0;
    for (let i = this.colors.length - 1; i >= 0; i--) {
      if (this.colors[i] === top) count++;
      else break;
    }
    return count;
  }

  isComplete(): boolean {
    if (this.isEmpty()) return false;
    if (!this.isFull()) return false;
    const first = this.colors[0];
    return this.colors.every((c) => c === first);
  }

  canReceive(color: string): boolean {
    if (this.isFull()) return false;
    if (this.isEmpty()) return true;
    return this.topColor() === color;
  }

  pour(layers: number): string[] {
    if (layers <= 0 || this.isEmpty()) return [];
    const actual = Math.min(layers, this.consecutiveTopCount());
    const poured: string[] = [];
    for (let i = 0; i < actual; i++) {
      const color = this.colors.pop();
      if (color !== undefined) poured.push(color);
    }
    return poured;
  }

  receive(colors: string[]): number {
    const spaceLeft = this.capacity - this.colors.length;
    const actual = Math.min(colors.length, spaceLeft);
    for (let i = 0; i < actual; i++) {
      this.colors.push(colors[i]);
    }
    return actual;
  }

  containsPoint(px: number, py: number): boolean {
    const halfW = this.width / 2;
    const top = this.y - this.height;
    if (px < this.x - halfW - 10 || px > this.x + halfW + 10) return false;
    if (py < top - 20 || py > this.y + 10) return false;
    return true;
  }

  clone(): Tube {
    return new Tube(
      this.id,
      this.capacity,
      this.x,
      this.y,
      this.width,
      this.height,
      [...this.colors]
    );
  }

  setColors(colors: string[]): void {
    this.colors = [...colors];
  }
}
