import { OrigamiModel } from './origamiModel';

export class FoldAnimation {
  public isPlaying: boolean = false;
  public speed: number = 0.5;
  public currentStep: number = 0;
  public currentProgress: number = 0;

  private model: OrigamiModel;
  private keyframeInterval: number = 0.5;
  private accumulatedTime: number = 0;

  public onStepChange: ((step: number) => void) | null = null;
  public onFrameUpdate: ((vertices: number[]) => void) | null = null;
  public onAnimationComplete: (() => void) | null = null;

  private fromVertices: number[] = [];
  private toVertices: number[] = [];

  constructor(model: OrigamiModel) {
    this.model = model;
    this.currentStep = 0;
    this.currentProgress = 0;
    this.prepareStepVertices();
  }

  private prepareStepVertices(): void {
    const totalSteps = this.model.getTotalSteps();

    if (this.currentStep === 0) {
      this.fromVertices = [...this.model.modelData.baseVertices];
    } else {
      this.fromVertices = this.model.getStepVertices(this.currentStep - 1);
    }

    if (this.currentStep < totalSteps) {
      this.toVertices = this.model.getStepVertices(this.currentStep);
    } else {
      this.toVertices = this.model.getStepVertices(totalSteps - 1);
    }
  }

  public play(): void {
    if (this.currentStep >= this.model.getTotalSteps()) {
      this.currentStep = 0;
      this.currentProgress = 0;
      this.prepareStepVertices();
      if (this.onStepChange) {
        this.onStepChange(this.currentStep);
      }
    }
    this.isPlaying = true;
    this.model.showCreaseLines(true);
  }

  public pause(): void {
    this.isPlaying = false;
    this.model.showCreaseLines(false);
  }

  public toggle(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public nextStep(): void {
    const totalSteps = this.model.getTotalSteps();
    if (this.currentStep < totalSteps) {
      this.currentStep++;
      this.currentProgress = 0;
      this.prepareStepVertices();
      this.accumulatedTime = 0;

      const targetVertices = this.currentStep > 0
        ? this.model.getStepVertices(this.currentStep - 1)
        : [...this.model.modelData.baseVertices];

      this.model.updateVertices(targetVertices);
      this.model.currentStep = this.currentStep;
      this.model.updateHighlight(this.currentStep);

      if (this.onFrameUpdate) {
        this.onFrameUpdate(targetVertices);
      }
      if (this.onStepChange) {
        this.onStepChange(this.currentStep);
      }
    }
  }

  public prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.currentProgress = 0;
      this.prepareStepVertices();
      this.accumulatedTime = 0;

      const targetVertices = this.currentStep > 0
        ? this.model.getStepVertices(this.currentStep - 1)
        : [...this.model.modelData.baseVertices];

      this.model.updateVertices(targetVertices);
      this.model.currentStep = this.currentStep;
      this.model.updateHighlight(this.currentStep);

      if (this.onFrameUpdate) {
        this.onFrameUpdate(targetVertices);
      }
      if (this.onStepChange) {
        this.onStepChange(this.currentStep);
      }
    }
  }

  public goToStep(step: number): void {
    const totalSteps = this.model.getTotalSteps();
    const clampedStep = Math.max(0, Math.min(step, totalSteps));

    this.currentStep = clampedStep;
    this.currentProgress = 0;
    this.accumulatedTime = 0;
    this.prepareStepVertices();

    const targetVertices = clampedStep > 0
      ? this.model.getStepVertices(clampedStep - 1)
      : [...this.model.modelData.baseVertices];

    this.model.updateVertices(targetVertices);
    this.model.currentStep = clampedStep;
    this.model.updateHighlight(clampedStep);

    if (this.onFrameUpdate) {
      this.onFrameUpdate(targetVertices);
    }
    if (this.onStepChange) {
      this.onStepChange(clampedStep);
    }
  }

  public setSpeed(speed: number): void {
    this.speed = Math.max(0.3, Math.min(0.8, speed));
  }

  public update(deltaTime: number): void {
    if (!this.isPlaying) return;

    const adjustedDelta = deltaTime * this.speed;
    this.accumulatedTime += adjustedDelta;

    const stepDuration = this.keyframeInterval;
    this.currentProgress = Math.min(1, this.accumulatedTime / stepDuration);

    const interpolatedVertices = this.lerpVertices(
      this.fromVertices,
      this.toVertices,
      this.easeInOutCubic(this.currentProgress)
    );

    this.model.updateVertices(interpolatedVertices);
    this.model.updateHighlight(this.currentStep, 0.3 * (1 - this.currentProgress * 0.5));

    if (this.onFrameUpdate) {
      this.onFrameUpdate(interpolatedVertices);
    }

    if (this.currentProgress >= 1) {
      this.currentStep++;
      this.currentProgress = 0;
      this.accumulatedTime = 0;

      const totalSteps = this.model.getTotalSteps();

      if (this.currentStep >= totalSteps) {
        this.isPlaying = false;
        this.model.showCreaseLines(false);
        this.model.updateHighlight(this.currentStep, 0);
        if (this.onAnimationComplete) {
          this.onAnimationComplete();
        }
      } else {
        this.prepareStepVertices();
      }

      if (this.onStepChange) {
        this.onStepChange(this.currentStep);
      }
    }
  }

  private lerpVertices(from: number[], to: number[], t: number): number[] {
    const result: number[] = [];
    const maxLen = Math.max(from.length, to.length);

    for (let i = 0; i < maxLen; i++) {
      const fromVal = from[i] ?? (to[i] ?? 0);
      const toVal = to[i] ?? (from[i] ?? 0);
      result.push(this.lerp(fromVal, toVal, t));
    }

    return result;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public reset(): void {
    this.isPlaying = false;
    this.currentStep = 0;
    this.currentProgress = 0;
    this.accumulatedTime = 0;
    this.model.reset();
    this.prepareStepVertices();
    this.model.showCreaseLines(false);

    if (this.onStepChange) {
      this.onStepChange(0);
    }
  }

  public getTotalSteps(): number {
    return this.model.getTotalSteps();
  }

  public getCurrentStepDescription(): string {
    if (this.currentStep === 0) {
      return '准备开始折叠';
    }
    return this.model.getStepDescription(this.currentStep - 1);
  }

  public getStepDescription(step: number): string {
    if (step === 0) {
      return '准备一张正方形的纸';
    }
    return this.model.getStepDescription(step - 1);
  }
}
