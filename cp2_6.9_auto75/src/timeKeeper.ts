export class TimeKeeper {
  private static _instance: TimeKeeper | null = null;

  private _speed: number = 1;
  private _targetSpeed: number = 1;
  private _paused: boolean = false;
  private _virtualTime: number = 0;
  private _lastRealTime: number = 0;
  private _speedTransitionStart: number = 0;
  private _speedTransitionDuration: number = 300;
  private _initialSpeed: number = 1;

  private constructor() {
    this._lastRealTime = performance.now();
  }

  public static getInstance(): TimeKeeper {
    if (!TimeKeeper._instance) {
      TimeKeeper._instance = new TimeKeeper();
    }
    return TimeKeeper._instance;
  }

  public setSpeed(value: number): void {
    this._initialSpeed = this._speed;
    this._targetSpeed = Math.max(0.1, Math.min(100, value));
    this._speedTransitionStart = performance.now();
  }

  public getSpeed(): number {
    return this._targetSpeed;
  }

  public getCurrentDisplaySpeed(): number {
    return this._speed;
  }

  public togglePause(): void {
    this._paused = !this._paused;
    if (!this._paused) {
      this._lastRealTime = performance.now();
    }
  }

  public setPaused(value: boolean): void {
    this._paused = value;
    if (!value) {
      this._lastRealTime = performance.now();
    }
  }

  public isPaused(): boolean {
    return this._paused;
  }

  public update(): number {
    const now = performance.now();
    const realDelta = now - this._lastRealTime;
    this._lastRealTime = now;

    if (now < this._speedTransitionStart + this._speedTransitionDuration) {
      const t = (now - this._speedTransitionStart) / this._speedTransitionDuration;
      const eased = 1 - Math.pow(1 - t, 3);
      this._speed = this._initialSpeed + (this._targetSpeed - this._initialSpeed) * eased;
    } else {
      this._speed = this._targetSpeed;
    }

    if (!this._paused) {
      this._virtualTime += realDelta * this._speed;
    }

    return this._virtualTime;
  }

  public getTime(): number {
    return this._virtualTime;
  }

  public getDelta(): number {
    return 0;
  }

  public reset(): void {
    this._virtualTime = 0;
    this._lastRealTime = performance.now();
  }
}
