import type { ExpressionType } from './faceMeshDetector';
import type { CharacterStatus } from './characterRenderer';

export interface RecordedFrame {
  timestamp: number;
  status: CharacterStatus;
}

export interface PlaybackCallbacks {
  onStatus: (status: CharacterStatus) => void;
  onFinish: () => void;
}

export class UIController {
  private videoEl: HTMLVideoElement;
  private recordBtn: HTMLElement;
  private playbackBtn: HTMLElement;
  private indicatorContainer: HTMLElement;
  private statusTextEl: HTMLElement;
  private indicatorDots: HTMLElement[] = [];

  private isRecordingState: boolean = false;
  private recordedFrames: RecordedFrame[] = [];
  private recordingStartTime: number = 0;

  private isPlayingBack: boolean = false;
  private playbackRafId: number | null = null;

  constructor(
    videoEl: HTMLVideoElement,
    recordBtn: HTMLElement,
    playbackBtn: HTMLElement,
    indicatorContainer: HTMLElement,
    statusTextEl: HTMLElement
  ) {
    this.videoEl = videoEl;
    this.recordBtn = recordBtn;
    this.playbackBtn = playbackBtn;
    this.indicatorContainer = indicatorContainer;
    this.statusTextEl = statusTextEl;
    this.indicatorDots = Array.from(indicatorContainer.querySelectorAll('.indicator-dot'));
  }

  setStatusText(text: string): void {
    this.statusTextEl.textContent = text;
  }

  setCameraStream(stream: MediaStream): void {
    this.videoEl.srcObject = stream;
  }

  updateExpressionIndicators(expression: ExpressionType): void {
    this.indicatorDots.forEach((dot) => {
      const dotExpr = dot.dataset.expression as ExpressionType;
      if (dotExpr === expression) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  onRecordClick(callback: () => void): void {
    this.recordBtn.addEventListener('click', callback);
  }

  onPlaybackClick(callback: () => void): void {
    this.playbackBtn.addEventListener('click', callback);
  }

  isRecording(): boolean {
    return this.isRecordingState;
  }

  startRecording(): void {
    this.isRecordingState = true;
    this.recordedFrames = [];
    this.recordingStartTime = performance.now();
    this.recordBtn.classList.add('recording');
    this.playbackBtn.classList.remove('visible');
  }

  stopRecording(): RecordedFrame[] {
    this.isRecordingState = false;
    this.recordBtn.classList.remove('recording');
    if (this.recordedFrames.length > 0) {
      this.playbackBtn.classList.add('visible');
    }
    return [...this.recordedFrames];
  }

  recordFrame(status: CharacterStatus): void {
    if (!this.isRecordingState) return;
    this.recordedFrames.push({
      timestamp: performance.now() - this.recordingStartTime,
      status: { ...status }
    });
  }

  getRecordedFrames(): RecordedFrame[] {
    return [...this.recordedFrames];
  }

  hasRecording(): boolean {
    return this.recordedFrames.length > 0;
  }

  startPlayback(callbacks: PlaybackCallbacks): void {
    if (this.isPlayingBack || this.recordedFrames.length === 0) return;
    this.isPlayingBack = true;
    this.playbackBtn.textContent = '⏹ 停止';

    const frames = this.recordedFrames;
    const totalDuration = frames[frames.length - 1].timestamp;
    const startTime = performance.now();

    const tick = () => {
      if (!this.isPlayingBack) return;
      const elapsed = performance.now() - startTime;

      if (elapsed >= totalDuration) {
        if (frames.length > 0) {
          callbacks.onStatus(frames[frames.length - 1].status);
        }
        this.stopPlayback(callbacks);
        return;
      }

      let frameIdx = 0;
      while (frameIdx < frames.length - 1 && frames[frameIdx + 1].timestamp <= elapsed) {
        frameIdx++;
      }

      const currentFrame = frames[frameIdx];
      const nextFrame = frames[Math.min(frameIdx + 1, frames.length - 1)];
      const frameDuration = nextFrame.timestamp - currentFrame.timestamp;
      const t = frameDuration > 0 ? (elapsed - currentFrame.timestamp) / frameDuration : 0;
      const clampedT = Math.max(0, Math.min(1, t));

      const interpolated = this.interpolateStatus(currentFrame.status, nextFrame.status, clampedT);
      callbacks.onStatus(interpolated);

      this.playbackRafId = requestAnimationFrame(tick);
    };

    this.playbackRafId = requestAnimationFrame(tick);
  }

  stopPlayback(callbacks: PlaybackCallbacks): void {
    this.isPlayingBack = false;
    this.playbackBtn.textContent = '▶ 回放';
    if (this.playbackRafId !== null) {
      cancelAnimationFrame(this.playbackRafId);
      this.playbackRafId = null;
    }
    callbacks.onFinish();
  }

  isPlaybackActive(): boolean {
    return this.isPlayingBack;
  }

  private interpolateStatus(from: CharacterStatus, to: CharacterStatus, t: number): CharacterStatus {
    return {
      expression: to.expression,
      eyeScale: from.eyeScale + (to.eyeScale - from.eyeScale) * t,
      mouthCurve: from.mouthCurve + (to.mouthCurve - from.mouthCurve) * t,
      browAngle: from.browAngle + (to.browAngle - from.browAngle) * t,
      browYOffset: from.browYOffset + (to.browYOffset - from.browYOffset) * t,
      cheekBlush: from.cheekBlush + (to.cheekBlush - from.cheekBlush) * t,
      mouthOpen: from.mouthOpen + (to.mouthOpen - from.mouthOpen) * t
    };
  }
}
