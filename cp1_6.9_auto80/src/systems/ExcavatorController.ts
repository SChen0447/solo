export interface ExcavatorState {
  armAngle: number;
  armTargetAngle: number;
  bucketAngle: number;
  bucketTargetAngle: number;
  steamPressure: number;
  health: number;
  maxHealth: number;
  isShaking: boolean;
  shakeTimer: number;
  baseX: number;
  baseY: number;
  armLength: number;
  bucketSize: number;
}

export interface ExcavatorVisuals {
  body: Phaser.GameObjects.Container;
  armSegment1: Phaser.GameObjects.Rectangle;
  armSegment2: Phaser.GameObjects.Rectangle;
  bucketLeft: Phaser.GameObjects.Rectangle;
  bucketRight: Phaser.GameObjects.Rectangle;
  pivotPoint: Phaser.GameObjects.Container;
  bucketPivot: Phaser.GameObjects.Container;
}

export class ExcavatorController {
  private scene: Phaser.Scene;
  private state: ExcavatorState;
  private visuals: ExcavatorVisuals | null = null;
  private keys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  private audioContext: AudioContext | null = null;
  private lastSteamDecay: number = 0;
  private onBucketCloseCallback: (() => void) | null = null;
  private onHealthChangeCallback: ((health: number) => void) | null = null;
  private onSteamChangeCallback: ((pressure: number) => void) | null = null;

  private readonly ROTATION_SPEED = 60;
  private readonly MIN_ARM_ANGLE = -45;
  private readonly MAX_ARM_ANGLE = 45;
  private readonly MAX_BUCKET_ANGLE = 90;
  private readonly LERP_FACTOR = 0.9;
  private readonly STEAM_DECAY_RATE = 2;
  private readonly STEAM_MIN_FOR_DIG = 10;
  private readonly STEAM_COST_PER_DIG = 10;
  private readonly STEAM_GOLD_RESTORE = 5;

  constructor(scene: Phaser.Scene, baseX: number, baseY: number) {
    this.scene = scene;
    this.state = {
      armAngle: 0,
      armTargetAngle: 0,
      bucketAngle: 0,
      bucketTargetAngle: 0,
      steamPressure: 100,
      health: 100,
      maxHealth: 100,
      isShaking: false,
      shakeTimer: 0,
      baseX,
      baseY,
      armLength: 200,
      bucketSize: 40
    };

    this.setupInput();
    this.setupAudio();
  }

  private setupInput(): void {
    this.keys = {
      A: this.scene.input.keyboard!.addKey('A'),
      D: this.scene.input.keyboard!.addKey('D'),
      W: this.scene.input.keyboard!.addKey('W'),
      S: this.scene.input.keyboard!.addKey('S')
    };
  }

  private setupAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  createVisuals(): ExcavatorVisuals {
    const container = this.scene.add.container(this.state.baseX, this.state.baseY);

    const bodyBase = this.scene.add.rectangle(0, 40, 80, 60, 0x5D4037);
    bodyBase.setStrokeStyle(3, 0xB87333);
    container.add(bodyBase);

    const cabin = this.scene.add.rectangle(0, -20, 50, 50, 0x3E2723);
    cabin.setStrokeStyle(3, 0xB87333);
    container.add(cabin);

    const window = this.scene.add.rectangle(0, -20, 35, 30, 0x87CEEB, 0.4);
    window.setStrokeStyle(2, 0xB87333);
    container.add(window);

    const rivetPositions = [
      [-35, 10], [35, 10], [-35, 70], [35, 70],
      [-20, -45], [20, -45], [-20, 5], [20, 5]
    ];
    rivetPositions.forEach(([rx, ry]) => {
      const rivet = this.scene.add.circle(rx, ry, 4, 0xB87333);
      container.add(rivet);
    });

    const pivotPoint = this.scene.add.container(0, 0);
    container.add(pivotPoint);

    const armSegment1 = this.scene.add.rectangle(
      this.state.armLength / 2, 0, this.state.armLength, 20, 0xFFD700
    );
    armSegment1.setOrigin(0, 0.5);
    armSegment1.setStrokeStyle(2, 0x000000);
    pivotPoint.add(armSegment1);

    this.drawWarningStripes(armSegment1);

    const bucketPivot = this.scene.add.container(this.state.armLength, 0);
    pivotPoint.add(bucketPivot);

    const armSegment2 = this.scene.add.rectangle(30, 0, 60, 18, 0x000000);
    armSegment2.setOrigin(0, 0.5);
    armSegment2.setStrokeStyle(2, 0xFFD700);
    bucketPivot.add(armSegment2);

    const bucketLeft = this.scene.add.rectangle(
      60, -this.state.bucketSize / 4, this.state.bucketSize, 8, 0x555555
    );
    bucketLeft.setOrigin(0, 0.5);
    bucketLeft.setStrokeStyle(2, 0x222222);
    bucketPivot.add(bucketLeft);

    const bucketRight = this.scene.add.rectangle(
      60, this.state.bucketSize / 4, this.state.bucketSize, 8, 0x555555
    );
    bucketRight.setOrigin(0, 0.5);
    bucketRight.setStrokeStyle(2, 0x222222);
    bucketPivot.add(bucketRight);

    this.visuals = {
      body: container,
      armSegment1,
      armSegment2,
      bucketLeft,
      bucketRight,
      pivotPoint,
      bucketPivot
    };

    return this.visuals;
  }

  private drawWarningStripes(rect: Phaser.GameObjects.Rectangle): void {
    const graphics = this.scene.add.graphics();
    const stripeWidth = 10;
    const numStripes = Math.floor(this.state.armLength / stripeWidth);
    
    for (let i = 0; i < numStripes; i++) {
      const x = i * stripeWidth;
      const color = i % 2 === 0 ? 0x000000 : 0xFFD700;
      graphics.fillStyle(color, 0.5);
      graphics.fillRect(x, -8, stripeWidth, 16);
    }
    
    rect.setMask(graphics.createGeometryMask());
  }

  setOnBucketClose(callback: () => void): void {
    this.onBucketCloseCallback = callback;
  }

  setOnHealthChange(callback: (health: number) => void): void {
    this.onHealthChangeCallback = callback;
  }

  setOnSteamChange(callback: (pressure: number) => void): void {
    this.onSteamChangeCallback = callback;
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    this.handleInput(dt);
    this.updateRotations(dt);
    this.updateSteamPressure(dt);
    this.updateShake(deltaTime);
    this.applyVisuals();
  }

  private handleInput(dt: number): void {
    const rotationDelta = this.ROTATION_SPEED * dt;

    if (this.keys.A.isDown) {
      this.state.armTargetAngle = Math.max(
        this.MIN_ARM_ANGLE,
        this.state.armTargetAngle - rotationDelta
      );
    }
    if (this.keys.D.isDown) {
      this.state.armTargetAngle = Math.min(
        this.MAX_ARM_ANGLE,
        this.state.armTargetAngle + rotationDelta
      );
    }

    const wasBucketClosed = this.state.bucketTargetAngle <= 5;

    if (this.keys.W.isDown) {
      this.state.bucketTargetAngle = Math.min(
        this.MAX_BUCKET_ANGLE,
        this.state.bucketTargetAngle + rotationDelta * 2
      );
    }
    if (this.keys.S.isDown) {
      this.state.bucketTargetAngle = Math.max(
        0,
        this.state.bucketTargetAngle - rotationDelta * 2
      );
    }

    const isBucketNowClosed = this.state.bucketTargetAngle <= 5;
    if (!wasBucketClosed && isBucketNowClosed) {
      this.playBucketCloseSound();
      if (this.onBucketCloseCallback) {
        this.onBucketCloseCallback();
      }
    }
  }

  private updateRotations(dt: number): void {
    const lerpFactor = 1 - Math.pow(1 - this.LERP_FACTOR, dt * 60);
    this.state.armAngle = Phaser.Math.Linear(
      this.state.armAngle,
      this.state.armTargetAngle,
      lerpFactor
    );
    this.state.bucketAngle = Phaser.Math.Linear(
      this.state.bucketAngle,
      this.state.bucketTargetAngle,
      lerpFactor
    );
  }

  private updateSteamPressure(_dt: number): void {
    const now = this.scene.time.now;
    if (now - this.lastSteamDecay >= 1000) {
      this.state.steamPressure = Math.max(0, this.state.steamPressure - this.STEAM_DECAY_RATE);
      this.lastSteamDecay = now;
      if (this.onSteamChangeCallback) {
        this.onSteamChangeCallback(this.state.steamPressure);
      }
    }
  }

  private updateShake(deltaTime: number): void {
    if (this.state.isShaking) {
      this.state.shakeTimer -= deltaTime;
      if (this.state.shakeTimer <= 0) {
        this.state.isShaking = false;
      }
    }
  }

  private applyVisuals(): void {
    if (!this.visuals) return;

    let offsetX = 0, offsetY = 0;
    if (this.state.isShaking) {
      offsetX = (Math.random() - 0.5) * 4;
      offsetY = (Math.random() - 0.5) * 4;
    }

    this.visuals.body.x = this.state.baseX + offsetX;
    this.visuals.body.y = this.state.baseY + offsetY;

    this.visuals.pivotPoint.setAngle(this.state.armAngle);

    const bucketOpenAngle = this.state.bucketAngle / 2;
    this.visuals.bucketLeft.setAngle(-bucketOpenAngle);
    this.visuals.bucketRight.setAngle(bucketOpenAngle);
  }

  private playBucketCloseSound(): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(80, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  canDig(): boolean {
    return this.state.steamPressure >= this.STEAM_MIN_FOR_DIG;
  }

  consumeSteamForDig(): boolean {
    if (!this.canDig()) return false;
    this.state.steamPressure = Math.max(0, this.state.steamPressure - this.STEAM_COST_PER_DIG);
    if (this.onSteamChangeCallback) {
      this.onSteamChangeCallback(this.state.steamPressure);
    }
    return true;
  }

  restoreSteamFromGold(): void {
    this.state.steamPressure = Math.min(100, this.state.steamPressure + this.STEAM_GOLD_RESTORE);
    if (this.onSteamChangeCallback) {
      this.onSteamChangeCallback(this.state.steamPressure);
    }
  }

  takeDamage(amount: number, shakeDuration: number = 200): void {
    this.state.health = Math.max(0, this.state.health - amount);
    this.state.isShaking = true;
    this.state.shakeTimer = shakeDuration;
    if (this.onHealthChangeCallback) {
      this.onHealthChangeCallback(this.state.health);
    }
  }

  isBucketClosed(): boolean {
    return this.state.bucketAngle <= 10;
  }

  getBucketWorldPosition(): { x: number; y: number; radius: number } {
    const armRad = Phaser.Math.DegToRad(this.state.armAngle);
    const bucketX = this.state.baseX + Math.cos(armRad) * (this.state.armLength + 60);
    const bucketY = this.state.baseY + Math.sin(armRad) * (this.state.armLength + 60);
    return { x: bucketX, y: bucketY, radius: this.state.bucketSize };
  }

  getState(): ExcavatorState {
    return { ...this.state };
  }

  getCurrentForce(): number {
    const baseForce = 5;
    const pressureBonus = (this.state.steamPressure / 100) * 3;
    return baseForce + pressureBonus;
  }
}
