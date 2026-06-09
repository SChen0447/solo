export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  spotlight: boolean;
  spacePressed: boolean;
}

export class InputManager {
  private state: InputState;
  private spaceJustPressed: boolean;

  constructor() {
    this.state = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      spotlight: false,
      spacePressed: false
    };
    this.spaceJustPressed = false;
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.handleKeyDown(e);
    });
    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.handleKeyUp(e);
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') {
      this.state.forward = true;
    }
    if (key === 's' || key === 'arrowdown') {
      this.state.backward = true;
    }
    if (key === 'a' || key === 'arrowleft') {
      this.state.left = true;
    }
    if (key === 'd' || key === 'arrowright') {
      this.state.right = true;
    }
    if (key === ' ') {
      e.preventDefault();
      if (!this.state.spacePressed) {
        this.spaceJustPressed = true;
      }
      this.state.spacePressed = true;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') {
      this.state.forward = false;
    }
    if (key === 's' || key === 'arrowdown') {
      this.state.backward = false;
    }
    if (key === 'a' || key === 'arrowleft') {
      this.state.left = false;
    }
    if (key === 'd' || key === 'arrowright') {
      this.state.right = false;
    }
    if (key === ' ') {
      this.state.spacePressed = false;
    }
  }

  public getState(): InputState {
    return { ...this.state };
  }

  public consumeSpaceJustPressed(): boolean {
    const pressed = this.spaceJustPressed;
    this.spaceJustPressed = false;
    return pressed;
  }

  public toggleSpotlight(): void {
    this.state.spotlight = !this.state.spotlight;
  }

  public setSpotlight(on: boolean): void {
    this.state.spotlight = on;
  }
}
