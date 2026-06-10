export class InputHandler {
  private keysDown: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Space'].includes(e.key)) {
      e.preventDefault();
    }
    const key = this.normalizeKey(e.key);
    if (!this.keysDown.has(key)) {
      this.keysJustPressed.add(key);
    }
    this.keysDown.add(key);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = this.normalizeKey(e.key);
    this.keysDown.delete(key);
  }

  private normalizeKey(key: string): string {
    if (key === ' ') return 'Space';
    return key;
  }

  public wasDown(key: string): boolean {
    return this.keysDown.has(this.normalizeKey(key));
  }

  public justPressed(key: string): boolean {
    return this.keysJustPressed.has(this.normalizeKey(key));
  }

  public update(): void {
    this.keysJustPressed.clear();
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this.keysDown.clear();
    this.keysJustPressed.clear();
  }
}
