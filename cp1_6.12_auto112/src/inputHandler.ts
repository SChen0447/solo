import * as THREE from 'three';

export interface MouseState {
  isDragging: boolean;
  position: THREE.Vector3;
  velocity: number;
  screenX: number;
  screenY: number;
}

export interface KeyboardCommand {
  type: 'reset' | 'toggleColor' | 'togglePause';
}

type CommandCallback = (cmd: KeyboardCommand) => void;
type MouseCallback = (state: MouseState) => void;

export class InputHandler {
  private container: HTMLElement;
  private mouseState: MouseState;
  private lastScreenPos: { x: number; y: number; time: number };
  private commandCallback: CommandCallback | null = null;
  private mouseCallback: MouseCallback | null = null;

  private readonly X_RANGE = { min: -10, max: 10 };
  private readonly Y_RANGE = { min: -6, max: 6 };
  private readonly Z_RANGE = { min: 0, max: 5 };

  constructor(container: HTMLElement) {
    this.container = container;
    this.mouseState = {
      isDragging: false,
      position: new THREE.Vector3(0, 0, 0),
      velocity: 0,
      screenX: 0,
      screenY: 0
    };
    this.lastScreenPos = { x: 0, y: 0, time: performance.now() };
    this.bindEvents();
  }

  private bindEvents(): void {
    this.container.addEventListener('mousedown', this.onMouseDown);
    this.container.addEventListener('mousemove', this.onMouseMove);
    this.container.addEventListener('mouseup', this.onMouseUp);
    this.container.addEventListener('mouseleave', this.onMouseUp);
    window.addEventListener('keydown', this.onKeyDown);
  }

  public onCommand(callback: CommandCallback): void {
    this.commandCallback = callback;
  }

  public onMouseUpdate(callback: MouseCallback): void {
    this.mouseCallback = callback;
  }

  private mapScreenTo3D(screenX: number, screenY: number): THREE.Vector3 {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    const nx = (screenX / width) * 2 - 1;
    const ny = -(screenY / height) * 2 + 1;

    const x = THREE.MathUtils.lerp(this.X_RANGE.min, this.X_RANGE.max, (nx + 1) / 2);
    const y = THREE.MathUtils.lerp(this.Y_RANGE.min, this.Y_RANGE.max, (ny + 1) / 2);
    const z = THREE.MathUtils.lerp(this.Z_RANGE.min, this.Z_RANGE.max, Math.random());

    return new THREE.Vector3(x, y, z);
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.mouseState.isDragging = true;
    this.mouseState.screenX = e.clientX;
    this.mouseState.screenY = e.clientY;
    this.mouseState.position.copy(this.mapScreenTo3D(e.clientX, e.clientY));
    this.lastScreenPos = { x: e.clientX, y: e.clientY, time: performance.now() };
    this.mouseState.velocity = 0;
    this.emitMouse();
  };

  private onMouseMove = (e: MouseEvent): void => {
    const now = performance.now();
    const dt = Math.max((now - this.lastScreenPos.time) / 1000, 0.001);

    const dx = e.clientX - this.lastScreenPos.x;
    const dy = e.clientY - this.lastScreenPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = distance / dt;

    this.mouseState.velocity = THREE.MathUtils.clamp(speed / 100, 0, 1);
    this.mouseState.screenX = e.clientX;
    this.mouseState.screenY = e.clientY;
    this.mouseState.position.copy(this.mapScreenTo3D(e.clientX, e.clientY));

    this.lastScreenPos = { x: e.clientX, y: e.clientY, time: now };
    this.emitMouse();
  };

  private onMouseUp = (): void => {
    this.mouseState.isDragging = false;
    this.mouseState.velocity = 0;
    this.emitMouse();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.commandCallback) return;

    switch (e.code) {
      case 'KeyR':
        this.commandCallback({ type: 'reset' });
        break;
      case 'KeyC':
        this.commandCallback({ type: 'toggleColor' });
        break;
      case 'Space':
        e.preventDefault();
        this.commandCallback({ type: 'togglePause' });
        break;
    }
  };

  private emitMouse(): void {
    if (this.mouseCallback) {
      this.mouseCallback({
        ...this.mouseState,
        position: this.mouseState.position.clone()
      });
    }
  }

  public getMouseState(): MouseState {
    return {
      ...this.mouseState,
      position: this.mouseState.position.clone()
    };
  }

  public dispose(): void {
    this.container.removeEventListener('mousedown', this.onMouseDown);
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('mouseup', this.onMouseUp);
    this.container.removeEventListener('mouseleave', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
