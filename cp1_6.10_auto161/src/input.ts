export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  jumpPressed: boolean;
  rewind: boolean;
  rewindPressed: boolean;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private prevKeys: Set<string> = new Set();

  constructor() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  update(): void {
    this.prevKeys = new Set(this.keys);
  }

  private isDown(code: string): boolean {
    return this.keys.has(code);
  }

  private wasPressed(code: string): boolean {
    return this.keys.has(code) && !this.prevKeys.has(code);
  }

  getState(): InputState {
    const left = this.isDown('KeyA') || this.isDown('ArrowLeft');
    const right = this.isDown('KeyD') || this.isDown('ArrowRight');
    const up = this.isDown('KeyW') || this.isDown('ArrowUp');
    const down = this.isDown('KeyS') || this.isDown('ArrowDown');
    const jump = this.isDown('Space');
    const jumpPressed = this.wasPressed('Space');
    const rewind = this.isDown('KeyR');
    const rewindPressed = this.wasPressed('KeyR');

    return { left, right, up, down, jump, jumpPressed, rewind, rewindPressed };
  }
}
