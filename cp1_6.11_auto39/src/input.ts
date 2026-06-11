import { InputState, Vector2 } from './types';

export class InputSystem {
  private state: InputState;
  private keys: Set<string>;
  private joystickActive: boolean;
  private joystickCenter: Vector2;
  private joystickCurrent: Vector2;

  constructor() {
    this.state = {
      up: false,
      down: false,
      left: false,
      right: false,
      action: false,
      joystick: { x: 0, y: 0 }
    };
    this.keys = new Set();
    this.joystickActive = false;
    this.joystickCenter = { x: 0, y: 0 };
    this.joystickCurrent = { x: 0, y: 0 };
  }

  init(): void {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    this.setupMobileControls();
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key.toLowerCase());
    this.updateKeyboardState();
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
    this.updateKeyboardState();
  }

  private updateKeyboardState(): void {
    this.state.up = this.keys.has('w') || this.keys.has('arrowup');
    this.state.down = this.keys.has('s') || this.keys.has('arrowdown');
    this.state.left = this.keys.has('a') || this.keys.has('arrowleft');
    this.state.right = this.keys.has('d') || this.keys.has('arrowright');
    this.state.action = this.keys.has(' ');
  }

  private setupMobileControls(): void {
    const joystickContainer = document.getElementById('joystick-container');
    const joystickStick = document.getElementById('joystick-stick');
    const actionBtn = document.getElementById('btn-action');

    if (joystickContainer && joystickStick) {
      joystickContainer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = joystickContainer.getBoundingClientRect();
        this.joystickCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
        this.joystickActive = true;
        this.updateJoystick(touch.clientX, touch.clientY, joystickStick);
      }, { passive: false });

      joystickContainer.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (this.joystickActive) {
          const touch = e.touches[0];
          this.updateJoystick(touch.clientX, touch.clientY, joystickStick);
        }
      }, { passive: false });

      joystickContainer.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.joystickActive = false;
        this.state.joystick = { x: 0, y: 0 };
        joystickStick.style.transform = 'translate(-50%, -50%)';
      }, { passive: false });
    }

    if (actionBtn) {
      actionBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.state.action = true;
      }, { passive: false });

      actionBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.state.action = false;
      }, { passive: false });
    }
  }

  private updateJoystick(clientX: number, clientY: number, stickElement: HTMLElement): void {
    const maxDistance = 40;
    let dx = clientX - this.joystickCenter.x;
    let dy = clientY - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxDistance) {
      dx = (dx / dist) * maxDistance;
      dy = (dy / dist) * maxDistance;
    }

    this.state.joystick = {
      x: dx / maxDistance,
      y: dy / maxDistance
    };

    stickElement.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  getState(): InputState {
    return { ...this.state };
  }

  getMoveDirection(): Vector2 {
    if (this.state.joystick.x !== 0 || this.state.joystick.y !== 0) {
      return { ...this.state.joystick };
    }

    let x = 0;
    let y = 0;
    if (this.state.left) x -= 1;
    if (this.state.right) x += 1;
    if (this.state.up) y -= 1;
    if (this.state.down) y += 1;

    if (x !== 0 || y !== 0) {
      const len = Math.sqrt(x * x + y * y);
      x /= len;
      y /= len;
    }

    return { x, y };
  }

  isActionPressed(): boolean {
    return this.state.action;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}
