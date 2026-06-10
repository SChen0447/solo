export class InputManager {
  private keys: Map<string, boolean>;
  private justPressed: Set<string>;

  constructor() {
    this.keys = new Map();
    this.justPressed = new Set();
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!this.keys.get(key)) {
        this.justPressed.add(key);
      }
      this.keys.set(key, true);
      if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      this.keys.set(key, false);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.justPressed.clear();
    });
  }

  isKeyDown(key: string): boolean {
    return this.keys.get(key.toLowerCase()) ?? false;
  }

  isKeyPressed(key: string): boolean {
    return this.justPressed.has(key.toLowerCase());
  }

  isAnyKeyPressed(): boolean {
    return this.justPressed.size > 0;
  }

  clearJustPressed(): void {
    this.justPressed.clear();
  }

  getHorizontalAxis(): number {
    let axis = 0;
    if (this.isKeyDown('a') || this.isKeyDown('arrowleft')) axis -= 1;
    if (this.isKeyDown('d') || this.isKeyDown('arrowright')) axis += 1;
    return axis;
  }

  getVerticalAxis(): number {
    let axis = 0;
    if (this.isKeyDown('w') || this.isKeyDown('arrowup')) axis -= 1;
    if (this.isKeyDown('s') || this.isKeyDown('arrowdown')) axis += 1;
    return axis;
  }

  isShooting(): boolean {
    return this.isKeyDown(' ');
  }

  isRestartPressed(): boolean {
    return this.isKeyPressed('r');
  }
}
