export class StatsManager {
  private rotations: number = 0;
  private startTime: number = 0;
  private endTime: number = 0;
  private isRunning: boolean = false;
  private triggerSequence: string[] = [];
  private hintUsed: boolean = false;
  private extraSteps: number = 0;

  constructor() {}

  public incrementRotations(): void {
    this.rotations++;
  }

  public getRotations(): number {
    return this.rotations + this.extraSteps;
  }

  public startTimer(): void {
    if (!this.isRunning) {
      this.startTime = performance.now();
      this.isRunning = true;
    }
  }

  public stopTimer(): void {
    if (this.isRunning) {
      this.endTime = performance.now();
      this.isRunning = false;
    }
  }

  public getTime(): number {
    if (this.isRunning) {
      return (performance.now() - this.startTime) / 1000;
    }
    return (this.endTime - this.startTime) / 1000;
  }

  public getFormattedTime(): string {
    const time = this.getTime();
    return time.toFixed(1);
  }

  public addTriggerSequence(sequence: string): void {
    this.triggerSequence.push(sequence);
  }

  public getTriggerSequence(): string[] {
    return [...this.triggerSequence];
  }

  public useHint(): void {
    if (!this.hintUsed) {
      this.hintUsed = true;
      this.extraSteps += 1;
    }
  }

  public isHintUsed(): boolean {
    return this.hintUsed;
  }

  public getStats(): {
    rotations: number;
    time: number;
    formattedTime: string;
    sequence: string[];
    hintUsed: boolean;
  } {
    return {
      rotations: this.getRotations(),
      time: this.getTime(),
      formattedTime: this.getFormattedTime(),
      sequence: this.getTriggerSequence(),
      hintUsed: this.hintUsed
    };
  }

  public reset(): void {
    this.rotations = 0;
    this.startTime = 0;
    this.endTime = 0;
    this.isRunning = false;
    this.triggerSequence = [];
    this.hintUsed = false;
    this.extraSteps = 0;
  }
}
