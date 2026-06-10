export type GazeAction =
  | 'prev_page'
  | 'next_page'
  | 'scroll_top'
  | 'scroll_bottom'
  | null;

export type GazeDirection = 'left' | 'right' | 'up' | 'down' | 'center';

interface GazeTrackerOptions {
  horizontalThreshold: number;
  verticalThreshold: number;
  holdDuration: number;
  onAction: (action: GazeAction) => void;
  onBubble: (text: string) => void;
}

interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

export class GazeTracker {
  private options: GazeTrackerOptions;
  private lastDirection: GazeDirection = 'center';
  private directionStartTime: number = 0;
  private autoModeActive: boolean = false;
  private lastAutoActionTime: number = 0;
  private isPaused: boolean = false;
  private autoPageSpeed: number = 1.0;
  private cooldownUntil: number = 0;
  private readonly COOLDOWN_MS = 800;

  constructor(options: GazeTrackerOptions) {
    this.options = options;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (paused) {
      this.autoModeActive = false;
      this.lastDirection = 'center';
    }
  }

  public setAutoPageSpeed(speed: number): void {
    this.autoPageSpeed = speed;
  }

  public processLandmarks(landmarks: FaceLandmark[], imageWidth: number, imageHeight: number): void {
    if (this.isPaused) return;

    const now = performance.now();
    if (now < this.cooldownUntil) return;

    const leftPupil = landmarks[473];
    const rightPupil = landmarks[474];
    const leftIrisLeft = landmarks[475];
    const rightIrisRight = landmarks[476];
    const noseBridge = landmarks[168];

    if (!leftPupil || !rightPupil || !noseBridge) return;

    const avgPupilX = ((leftPupil.x + rightPupil.x) / 2) * imageWidth;
    const avgPupilY = ((leftPupil.y + rightPupil.y) / 2) * imageHeight;
    const noseX = noseBridge.x * imageWidth;
    const noseY = noseBridge.y * imageHeight;

    const offsetX = avgPupilX - noseX;
    const offsetY = avgPupilY - noseY;

    let direction: GazeDirection = 'center';

    if (offsetX < -this.options.horizontalThreshold) {
      direction = 'left';
    } else if (offsetX > this.options.horizontalThreshold) {
      direction = 'right';
    } else if (offsetY < -this.options.verticalThreshold) {
      direction = 'up';
    } else if (offsetY > this.options.verticalThreshold) {
      direction = 'down';
    }

    if (direction !== this.lastDirection) {
      this.lastDirection = direction;
      this.directionStartTime = now;
      this.autoModeActive = false;

      if (direction !== 'center') {
        this.triggerSingleAction(direction);
      }
    } else if (direction !== 'center') {
      const holdTime = now - this.directionStartTime;

      if (holdTime >= this.options.holdDuration && !this.autoModeActive) {
        this.autoModeActive = true;
        this.lastAutoActionTime = now;
        this.options.onBubble('自动翻页模式');
      }

      if (this.autoModeActive) {
        const interval = this.autoPageSpeed * 1000;
        if (now - this.lastAutoActionTime >= interval) {
          this.triggerSingleAction(direction);
          this.lastAutoActionTime = now;
        }
      }
    }
  }

  private triggerSingleAction(direction: GazeDirection): void {
    let action: GazeAction = null;
    let bubbleText = '';

    switch (direction) {
      case 'left':
        action = 'prev_page';
        bubbleText = '← 上一页';
        break;
      case 'right':
        action = 'next_page';
        bubbleText = '下一页 →';
        break;
      case 'up':
        action = 'scroll_top';
        bubbleText = '↑ 滚动到顶部';
        break;
      case 'down':
        action = 'scroll_bottom';
        bubbleText = '↓ 滚动到底部';
        break;
    }

    if (action) {
      this.options.onAction(action);
      this.options.onBubble(bubbleText);
      this.cooldownUntil = performance.now() + this.COOLDOWN_MS;
    }
  }
}
