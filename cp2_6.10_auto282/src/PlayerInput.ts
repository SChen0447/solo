import { InputState } from './types';

export class PlayerInput {
  private state: InputState = {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false,
  };

  private prevJump: boolean = false;

  constructor() {
    this.attachListeners();
  }

  private attachListeners(): void {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  public detachListeners(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.state.left = true;
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.state.right = true;
        e.preventDefault();
        break;
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        this.state.jump = true;
        e.preventDefault();
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.state.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.state.right = false;
        break;
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        this.state.jump = false;
        break;
    }
  }

  public poll(): InputState {
    this.state.jumpPressed = this.state.jump && !this.prevJump;
    this.prevJump = this.state.jump;
    return { ...this.state };
  }

  public reset(): void {
    this.state = {
      left: false,
      right: false,
      jump: false,
      jumpPressed: false,
    };
    this.prevJump = false;
  }
}
