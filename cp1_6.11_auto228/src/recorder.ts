import type { ParticleState } from './aurora';
import { AuroraSystem } from './aurora';

export interface RecorderOptions {
  recordInterval: number;
  maxFrames: number;
  playbackFps: number;
}

interface RecordedFrame {
  state: ParticleState;
}

type RecorderStatus = 'idle' | 'recording' | 'playing' | 'paused';

export class Recorder {
  private aurora: AuroraSystem;
  private options: RecorderOptions;
  private frames: RecordedFrame[] = [];
  private status: RecorderStatus = 'idle';
  private frameCounter = 0;
  private playbackFrameIndex = 0;
  private playbackAccumulator = 0;
  private playbackSpeed = 1.0;
  private onStatusChange?: (status: RecorderStatus) => void;
  private onFrameCountChange?: (count: number, max: number) => void;
  private onPlaybackProgress?: (index: number, total: number) => void;

  constructor(aurora: AuroraSystem, options?: Partial<RecorderOptions>) {
    this.aurora = aurora;
    this.options = {
      recordInterval: 60,
      maxFrames: 300,
      playbackFps: 30,
      ...options
    };
  }

  public setOnStatusChange(callback: (status: RecorderStatus) => void): void {
    this.onStatusChange = callback;
  }

  public setOnFrameCountChange(callback: (count: number, max: number) => void): void {
    this.onFrameCountChange = callback;
  }

  public setOnPlaybackProgress(callback: (index: number, total: number) => void): void {
    this.onPlaybackProgress = callback;
  }

  private updateStatus(status: RecorderStatus): void {
    this.status = status;
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  public getStatus(): RecorderStatus {
    return this.status;
  }

  public getFrameCount(): number {
    return this.frames.length;
  }

  public getMaxFrames(): number {
    return this.options.maxFrames;
  }

  public setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.25, Math.min(4, speed));
  }

  public getPlaybackSpeed(): number {
    return this.playbackSpeed;
  }

  public startRecording(): void {
    if (this.status === 'playing' || this.status === 'recording') return;
    this.frames = [];
    this.frameCounter = 0;
    this.updateStatus('recording');
    if (this.onFrameCountChange) {
      this.onFrameCountChange(0, this.options.maxFrames);
    }
  }

  public stopRecording(): void {
    if (this.status !== 'recording') return;
    this.updateStatus('idle');
  }

  public startPlayback(): void {
    if (this.frames.length === 0) return;
    if (this.status === 'recording') return;
    this.playbackFrameIndex = 0;
    this.playbackAccumulator = 0;
    this.updateStatus('playing');
    if (this.onPlaybackProgress) {
      this.onPlaybackProgress(0, this.frames.length);
    }
  }

  public pausePlayback(): void {
    if (this.status !== 'playing') return;
    this.updateStatus('paused');
  }

  public resumePlayback(): void {
    if (this.status !== 'paused') return;
    this.updateStatus('playing');
  }

  public resetPlayback(): void {
    this.playbackFrameIndex = 0;
    this.playbackAccumulator = 0;
    if (this.frames.length > 0) {
      this.aurora.restoreParticleState(this.frames[0].state);
    }
    if (this.onPlaybackProgress) {
      this.onPlaybackProgress(0, this.frames.length);
    }
    if (this.status === 'playing' || this.status === 'paused') {
      this.updateStatus('idle');
    }
  }

  public clearFrames(): void {
    this.frames = [];
    this.playbackFrameIndex = 0;
    this.playbackAccumulator = 0;
    if (this.onFrameCountChange) {
      this.onFrameCountChange(0, this.options.maxFrames);
    }
    if (this.onPlaybackProgress) {
      this.onPlaybackProgress(0, 0);
    }
  }

  public update(delta: number): boolean {
    if (this.status === 'recording') {
      this.frameCounter++;
      if (this.frameCounter >= this.options.recordInterval) {
        this.frameCounter = 0;
        if (this.frames.length < this.options.maxFrames) {
          this.frames.push({
            state: this.aurora.getParticleState()
          });
          if (this.onFrameCountChange) {
            this.onFrameCountChange(this.frames.length, this.options.maxFrames);
          }
        } else {
          this.stopRecording();
        }
      }
      return false;
    }

    if (this.status === 'playing') {
      this.playbackAccumulator += delta * this.options.playbackFps * this.playbackSpeed;

      while (this.playbackAccumulator >= 1) {
        this.playbackAccumulator -= 1;
        this.playbackFrameIndex++;

        if (this.playbackFrameIndex >= this.frames.length) {
          this.playbackFrameIndex = this.frames.length - 1;
          this.updateStatus('idle');
          break;
        }
      }

      const currentFrame = this.frames[this.playbackFrameIndex];
      if (currentFrame) {
        this.aurora.restoreParticleState(currentFrame.state);
      }

      if (this.onPlaybackProgress) {
        this.onPlaybackProgress(this.playbackFrameIndex, this.frames.length);
      }

      return true;
    }

    return false;
  }
}
