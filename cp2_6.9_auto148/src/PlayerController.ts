export interface PlayerSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
}

export interface RewindRequest {
  snapshots: PlayerSnapshot[];
}

export type RewindCallback = (request: RewindRequest) => void;

export const REWIND_MAX_FRAMES = 300;
export const PLAYER_SPEED = 5;
export const JUMP_VELOCITY = -10;
export const REWIND_SPEED_MULTIPLIER = 3;

export class PlayerController {
  private inputState: InputState;
  private snapshots: PlayerSnapshot[];
  private rewindCallback: RewindCallback | null;
  private isRewinding: boolean;
  private canJump: boolean;
  private jumpPressed: boolean;

  constructor() {
    this.inputState = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false
    };
    this.snapshots = [];
    this.rewindCallback = null;
    this.isRewinding = false;
    this.canJump = true;
    this.jumpPressed = false;
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key === 'a' || key === 'arrowleft') {
      this.inputState.left = true;
    }
    if (key === 'd' || key === 'arrowright') {
      this.inputState.right = true;
    }
    if (key === 'w' || key === 'arrowup') {
      this.inputState.up = true;
    }
    if (key === 's' || key === 'arrowdown') {
      this.inputState.down = true;
    }
    if (key === ' ') {
      e.preventDefault();
      if (this.canJump && !this.jumpPressed) {
        this.inputState.jump = true;
        this.jumpPressed = true;
      }
    }
    if (key === 'r') {
      this.triggerRewind();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key === 'a' || key === 'arrowleft') {
      this.inputState.left = false;
    }
    if (key === 'd' || key === 'arrowright') {
      this.inputState.right = false;
    }
    if (key === 'w' || key === 'arrowup') {
      this.inputState.up = false;
    }
    if (key === 's' || key === 'arrowdown') {
      this.inputState.down = false;
    }
    if (key === ' ') {
      this.inputState.jump = false;
      this.jumpPressed = false;
    }
  }

  getInputState(): InputState {
    return { ...this.inputState };
  }

  consumeJump(): boolean {
    const jump = this.inputState.jump;
    this.inputState.jump = false;
    return jump;
  }

  setCanJump(canJump: boolean): void {
    this.canJump = canJump;
  }

  recordSnapshot(x: number, y: number, vx: number, vy: number): void {
    if (this.isRewinding) return;
    this.snapshots.push({ x, y, vx, vy });
    if (this.snapshots.length > REWIND_MAX_FRAMES) {
      this.snapshots.shift();
    }
  }

  clearSnapshots(): void {
    this.snapshots = [];
  }

  setRewindCallback(callback: RewindCallback): void {
    this.rewindCallback = callback;
  }

  triggerRewind(): void {
    if (this.isRewinding) return;
    if (this.snapshots.length === 0) return;
    if (this.rewindCallback) {
      const request: RewindRequest = {
        snapshots: [...this.snapshots]
      };
      this.rewindCallback(request);
    }
  }

  setRewinding(rewinding: boolean): void {
    this.isRewinding = rewinding;
  }

  isRewindingActive(): boolean {
    return this.isRewinding;
  }
}
