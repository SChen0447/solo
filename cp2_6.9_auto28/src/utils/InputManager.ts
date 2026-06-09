export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
}

export interface InputState {
  player: PlayerInput;
  recordPressed: boolean;
}

export class InputManager {
  private scene: Phaser.Scene;
  private keys!: {
    A: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    W: Phaser.Input.Keyboard.Key;
    LEFT: Phaser.Input.Keyboard.Key;
    RIGHT: Phaser.Input.Keyboard.Key;
    UP: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
  };
  private prevJump: boolean = false;
  private prevRecord: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createKeys();
  }

  private createKeys(): void {
    this.keys = this.scene.input.keyboard!.addKeys({
      A: 'A',
      D: 'D',
      W: 'W',
      LEFT: 'LEFT',
      RIGHT: 'RIGHT',
      UP: 'UP',
      SPACE: 'SPACE',
    }) as typeof this.keys;
  }

  public getState(): InputState {
    const jumpHeld = this.keys.W.isDown || this.keys.UP.isDown;
    const jumpPressed = jumpHeld && !this.prevJump;
    this.prevJump = jumpHeld;

    const recordHeld = this.keys.SPACE.isDown;
    const recordPressed = recordHeld && !this.prevRecord;
    this.prevRecord = recordHeld;

    return {
      player: {
        left: this.keys.A.isDown || this.keys.LEFT.isDown,
        right: this.keys.D.isDown || this.keys.RIGHT.isDown,
        jump: jumpHeld,
        jumpPressed: jumpPressed,
      },
      recordPressed: recordPressed,
    };
  }

  public destroy(): void {
    Object.values(this.keys).forEach((key) => key.removeAllListeners());
  }
}
