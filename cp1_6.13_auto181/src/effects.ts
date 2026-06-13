import gsap from 'gsap';

export interface MouseState {
  x: number;
  y: number;
  isOnBoard: boolean;
  hue: number;
}

export interface DistortionState {
  amplitude: number;
  maxAmplitude: number;
  phase: number;
  period: number;
  mouseInfluence: number;
}

export class EffectManager {
  private mouseState: MouseState = {
    x: 0,
    y: 0,
    isOnBoard: false,
    hue: 200
  };

  private distortion: DistortionState = {
    amplitude: 0,
    maxAmplitude: 6,
    phase: 0,
    period: 1800,
    mouseInfluence: 0
  };

  private time: number = 0;
  private boardCenterX: number = 0;
  private boardCenterY: number = 0;
  private boardRadius: number = 0;

  private hoverPosition: { x: number; y: number; visible: boolean } = {
    x: 0,
    y: 0,
    visible: false
  };

  constructor() {}

  public setBoardBounds(centerX: number, centerY: number, radius: number): void {
    this.boardCenterX = centerX;
    this.boardCenterY = centerY;
    this.boardRadius = radius;
  }

  public getMouseState(): MouseState {
    return { ...this.mouseState };
  }

  public getMouseHue(): number {
    return this.mouseState.hue;
  }

  public updateMouse(x: number, y: number, isOnBoard: boolean): void {
    const prevX = this.mouseState.x;
    const prevY = this.mouseState.y;

    gsap.to(this.mouseState, {
      x,
      y,
      duration: 0.15,
      ease: 'power2.out'
    });

    this.mouseState.isOnBoard = isOnBoard;

    if (isOnBoard && this.boardRadius > 0) {
      const dx = x - this.boardCenterX;
      const dy = y - this.boardCenterY;
      const angle = Math.atan2(dy, dx);
      const hue = ((angle + Math.PI) / (Math.PI * 2)) * 360;
      this.mouseState.hue = hue;
    }

    if (isOnBoard && this.boardRadius > 0) {
      const dist = Math.sqrt(
        Math.pow(x - this.boardCenterX, 2) + Math.pow(y - this.boardCenterY, 2)
      );
      const distRatio = Math.min(dist / this.boardRadius, 1);
      this.distortion.mouseInfluence = distRatio;
    } else {
      this.distortion.mouseInfluence *= 0.95;
    }
  }

  public setHoverPosition(x: number | null, y: number | null): void {
    if (x === null || y === null) {
      this.hoverPosition.visible = false;
    } else {
      if (!this.hoverPosition.visible) {
        this.hoverPosition.x = x;
        this.hoverPosition.y = y;
        this.hoverPosition.visible = true;
      } else {
        gsap.to(this.hoverPosition, {
          x,
          y,
          duration: 0.1,
          ease: 'power2.out'
        });
      }
    }
  }

  public getHoverPosition(): { x: number; y: number; visible: boolean } {
    return { ...this.hoverPosition };
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.distortion.phase = (this.time / this.distortion.period) * Math.PI * 2;

    const targetAmplitude = this.distortion.maxAmplitude * this.distortion.mouseInfluence;
    this.distortion.amplitude += (targetAmplitude - this.distortion.amplitude) * 0.05;
  }

  public getDistortionOffset(x: number, y: number): { dx: number; dy: number } {
    if (this.distortion.amplitude < 0.1) {
      return { dx: 0, dy: 0 };
    }

    const dx = x - this.boardCenterX;
    const dy = y - this.boardCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.boardRadius * 1.2) {
      return { dx: 0, dy: 0 };
    }

    const distFactor = 1 - Math.min(dist / this.boardRadius, 1);
    const angle = Math.atan2(dy, dx);

    const wave1 = Math.sin(this.distortion.phase + angle * 3 + dist * 0.02);
    const wave2 = Math.sin(this.distortion.phase * 1.3 + angle * 2 - dist * 0.015);
    const combinedWave = (wave1 + wave2 * 0.5) / 1.5;

    const magnitude = this.distortion.amplitude * distFactor * 0.5;
    const offsetAngle = angle + Math.PI / 2 + combinedWave * 0.5;

    return {
      dx: Math.cos(offsetAngle) * magnitude * combinedWave,
      dy: Math.sin(offsetAngle) * magnitude * combinedWave
    };
  }

  public getHaloWobble(phase: number): { x: number; y: number } {
    const wobblePeriod = 800;
    const wobblePhase = (this.time / wobblePeriod) * Math.PI * 2 + phase;
    const amplitude = 2;

    return {
      x: Math.sin(wobblePhase) * amplitude * 0.3,
      y: Math.cos(wobblePhase * 1.2) * amplitude
    };
  }

  public getDistortionState(): DistortionState {
    return { ...this.distortion };
  }

  public animateValue(
    target: object,
    props: gsap.TweenVars,
    duration: number = 0.3
  ): gsap.core.Tween {
    return gsap.to(target, {
      ...props,
      duration,
      ease: 'power2.out'
    });
  }

  public getTime(): number {
    return this.time;
  }
}
