export class InputManager {
  private keys: Set<string> = new Set();
  private lastKeyTime: Map<string, number> = new Map();
  private pressedKeys: Set<string> = new Set();
  private DEBOUNCE_MS = 50;

  constructor() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    const now = performance.now();
    const lastTime = this.lastKeyTime.get(key) || 0;

    if (!this.keys.has(key)) {
      if (now - lastTime >= this.DEBOUNCE_MS) {
        this.pressedKeys.add(key);
      }
    }
    this.keys.add(key);
    this.lastKeyTime.set(key, now);
  }

  private onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keys.delete(key);
    this.lastKeyTime.set(key, performance.now());
  }

  isDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  wasPressed(key: string): boolean {
    return this.pressedKeys.has(key.toLowerCase());
  }

  clearFrame(): void {
    this.pressedKeys.clear();
  }

  getMouseAim(playerX: number, playerY: number): { dx: number; dy: number } {
    const moveX = (this.isDown('arrowright') || this.isDown('d') ? 1 : 0) -
                  (this.isDown('arrowleft') || this.isDown('a') ? 1 : 0);
    return { dx: moveX !== 0 ? moveX : 1, dy: 0 };
  }
}
