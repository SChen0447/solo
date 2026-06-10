export type ClockMode = 'clock' | 'countdown' | 'stopwatch';

export interface TimeState {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  totalMilliseconds: number;
  running: boolean;
  finished: boolean;
}

export class TimeUtils {
  private mode: ClockMode = 'clock';
  private countdownTargetMs: number = 0;
  private countdownRemainingMs: number = 0;
  private countdownStartTime: number = 0;
  private stopwatchElapsedMs: number = 0;
  private stopwatchStartTime: number = 0;
  private stopwatchRunning: boolean = false;
  private countdownRunning: boolean = false;

  setMode(mode: ClockMode): void {
    this.mode = mode;
    if (mode !== 'countdown') {
      this.countdownRunning = false;
      this.countdownRemainingMs = this.countdownTargetMs;
    }
    if (mode !== 'stopwatch') {
      this.stopwatchRunning = false;
      this.stopwatchElapsedMs = 0;
    }
  }

  getMode(): ClockMode {
    return this.mode;
  }

  setCountdownTarget(minutes: number, seconds: number): void {
    const clampedMinutes = Math.min(Math.max(minutes, 0), 99);
    const clampedSeconds = Math.min(Math.max(seconds, 0), 59);
    this.countdownTargetMs = clampedMinutes * 60000 + clampedSeconds * 1000;
    this.countdownRemainingMs = this.countdownTargetMs;
    this.countdownRunning = false;
  }

  startCountdown(): void {
    if (this.countdownRemainingMs > 0) {
      this.countdownStartTime = performance.now();
      this.countdownRunning = true;
    }
  }

  stopCountdown(): void {
    this.countdownRunning = false;
  }

  getCountdownTargetMs(): number {
    return this.countdownTargetMs;
  }

  addCountdownMinutes(minutes: number): void {
    const currentTotalSec = Math.floor(this.countdownTargetMs / 1000);
    let currentMin = Math.floor(currentTotalSec / 60);
    const currentSec = currentTotalSec % 60;
    currentMin = Math.min(currentMin + minutes, 99);
    this.setCountdownTarget(currentMin, currentSec);
  }

  addCountdownSeconds(seconds: number): void {
    const currentTotalSec = Math.floor(this.countdownTargetMs / 1000);
    const currentMin = Math.floor(currentTotalSec / 60);
    let currentSec = currentTotalSec % 60;
    currentSec = Math.min(currentSec + seconds, 59);
    this.setCountdownTarget(currentMin, currentSec);
  }

  startStopwatch(): void {
    if (!this.stopwatchRunning) {
      this.stopwatchStartTime = performance.now() - this.stopwatchElapsedMs;
      this.stopwatchRunning = true;
    }
  }

  stopStopwatch(): void {
    if (this.stopwatchRunning) {
      this.stopwatchElapsedMs = performance.now() - this.stopwatchStartTime;
      this.stopwatchRunning = false;
    }
  }

  resetStopwatch(): void {
    this.stopwatchRunning = false;
    this.stopwatchElapsedMs = 0;
  }

  isStopwatchRunning(): boolean {
    return this.stopwatchRunning;
  }

  isCountdownRunning(): boolean {
    return this.countdownRunning;
  }

  getTimeState(): TimeState {
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    let milliseconds = 0;
    let totalMs = 0;
    let running = false;
    let finished = false;

    switch (this.mode) {
      case 'clock': {
        const now = new Date();
        hours = now.getHours() % 12;
        if (hours === 0) hours = 12;
        minutes = now.getMinutes();
        seconds = now.getSeconds();
        milliseconds = now.getMilliseconds();
        totalMs = hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
        running = true;
        finished = false;
        break;
      }
      case 'countdown': {
        if (this.countdownRunning) {
          const elapsed = performance.now() - this.countdownStartTime;
          this.countdownRemainingMs = Math.max(0, this.countdownTargetMs - elapsed);
          if (this.countdownRemainingMs === 0) {
            this.countdownRunning = false;
            finished = true;
          }
        }
        totalMs = this.countdownRemainingMs;
        hours = Math.floor(totalMs / 3600000);
        minutes = Math.floor((totalMs % 3600000) / 60000);
        seconds = Math.floor((totalMs % 60000) / 1000);
        milliseconds = totalMs % 1000;
        running = this.countdownRunning;
        finished = this.countdownRemainingMs === 0 && this.countdownTargetMs > 0;
        break;
      }
      case 'stopwatch': {
        if (this.stopwatchRunning) {
          totalMs = performance.now() - this.stopwatchStartTime;
        } else {
          totalMs = this.stopwatchElapsedMs;
        }
        hours = Math.floor(totalMs / 3600000);
        minutes = Math.floor((totalMs % 3600000) / 60000);
        seconds = Math.floor((totalMs % 60000) / 1000);
        milliseconds = totalMs % 1000;
        running = this.stopwatchRunning;
        finished = false;
        break;
      }
    }

    return {
      hours: Math.min(hours, 99),
      minutes,
      seconds,
      milliseconds,
      totalMilliseconds: totalMs,
      running,
      finished
    };
  }

  formatTimeDisplay(): string {
    const state = this.getTimeState();
    const mm = state.minutes.toString().padStart(2, '0');
    const ss = state.seconds.toString().padStart(2, '0');

    switch (this.mode) {
      case 'clock': {
        const now = new Date();
        const hh = now.getHours().toString().padStart(2, '0');
        return `现在时间：${hh}:${mm}:${ss}`;
      }
      case 'countdown':
        return `剩余时间：${mm}:${ss}`;
      case 'stopwatch':
        return `已过时间：${mm}:${ss}`;
    }
  }
}
