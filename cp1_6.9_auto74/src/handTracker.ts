import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export type GestureType = 'none' | 'fist' | 'open' | 'swipe_left' | 'swipe_right';

export interface HandTrackerCallbacks {
  onGesture: (gesture: GestureType) => void;
  onHandOpenness: (distance: number) => void;
}

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export class HandTracker {
  private hands: Hands | null = null;
  private camera: Camera | null = null;
  private videoElement: HTMLVideoElement;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D | null;
  private callbacks: HandTrackerCallbacks;
  private previousGesture: GestureType = 'none';
  private gestureStableFrames: number = 0;
  private readonly STABLE_FRAMES_REQUIRED = 5;
  private wristHistory: { x: number; y: number; time: number }[] = [];
  private readonly SWIPE_HISTORY_SIZE = 15;

  constructor(videoElement: HTMLVideoElement, overlayCanvas: HTMLCanvasElement, callbacks: HandTrackerCallbacks) {
    this.videoElement = videoElement;
    this.overlayCanvas = overlayCanvas;
    this.overlayCtx = overlayCanvas.getContext('2d');
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    this.hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults((results: Results) => this.onResults(results));

    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        if (this.hands) {
          await this.hands.send({ image: this.videoElement });
        }
      },
      width: 640,
      height: 480
    });

    await this.camera.start();
  }

  private onResults(results: Results): void {
    if (this.overlayCtx) {
      this.overlayCanvas.width = this.videoElement.videoWidth || 640;
      this.overlayCanvas.height = this.videoElement.videoHeight || 480;
      this.overlayCtx.save();
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
      this.overlayCtx.restore();
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0] as HandLandmark[];
      this.drawLandmarks(landmarks);
      this.processLandmarks(landmarks);
    } else {
      this.emitStableGesture('none');
      this.callbacks.onHandOpenness(0);
    }
  }

  private drawLandmarks(landmarks: HandLandmark[]): void {
    if (!this.overlayCtx) return;
    const w = this.overlayCanvas.width;
    const h = this.overlayCanvas.height;

    this.overlayCtx.save();
    this.overlayCtx.fillStyle = '#88ccff';

    for (const lm of landmarks) {
      this.overlayCtx.beginPath();
      this.overlayCtx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2);
      this.overlayCtx.fill();
    }

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17]
    ];

    this.overlayCtx.strokeStyle = 'rgba(136, 204, 255, 0.5)';
    this.overlayCtx.lineWidth = 2;
    for (const [a, b] of connections) {
      this.overlayCtx.beginPath();
      this.overlayCtx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
      this.overlayCtx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
      this.overlayCtx.stroke();
    }
    this.overlayCtx.restore();
  }

  private processLandmarks(landmarks: HandLandmark[]): void {
    const palm = landmarks[0];
    const fingerTips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
    const fingerPips = [landmarks[3], landmarks[6], landmarks[10], landmarks[14], landmarks[18]];

    let totalDistance = 0;
    for (let i = 0; i < fingerTips.length; i++) {
      totalDistance += this.distance2D(palm, fingerTips[i]);
    }
    const avgDistance = (totalDistance / fingerTips.length) * 1000;
    const clampedDistance = Math.max(10, Math.min(100, avgDistance));
    this.callbacks.onHandOpenness(clampedDistance);

    let curledFingers = 0;
    for (let i = 1; i < 5; i++) {
      const tipToPalm = this.distance2D(palm, fingerTips[i]);
      const pipToPalm = this.distance2D(palm, fingerPips[i]);
      if (tipToPalm < pipToPalm * 1.1) {
        curledFingers++;
      }
    }

    const thumbTipToPalm = this.distance2D(palm, fingerTips[0]);
    if (thumbTipToPalm < this.distance2D(palm, landmarks[2]) * 1.2) {
      curledFingers++;
    }

    let currentGesture: GestureType = 'none';
    if (curledFingers >= 4) {
      currentGesture = 'fist';
    } else if (curledFingers <= 1) {
      currentGesture = 'open';
    }

    const swipeGesture = this.detectSwipe(landmarks[0]);
    if (swipeGesture !== 'none') {
      currentGesture = swipeGesture;
    }

    this.emitStableGesture(currentGesture);
  }

  private detectSwipe(wrist: HandLandmark): GestureType {
    const now = performance.now();
    this.wristHistory.push({ x: wrist.x, y: wrist.y, time: now });

    while (this.wristHistory.length > this.SWIPE_HISTORY_SIZE) {
      this.wristHistory.shift();
    }

    if (this.wristHistory.length < 8) return 'none';

    const oldest = this.wristHistory[0];
    const newest = this.wristHistory[this.wristHistory.length - 1];
    const timeDiff = newest.time - oldest.time;

    if (timeDiff > 500 || timeDiff < 100) return 'none';

    const dx = newest.x - oldest.x;
    const dy = newest.y - oldest.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > 0.12 && absDx > absDy * 1.5) {
      this.wristHistory = [];
      return dx > 0 ? 'swipe_right' : 'swipe_left';
    }

    return 'none';
  }

  private emitStableGesture(gesture: GestureType): void {
    if (gesture === this.previousGesture) {
      this.gestureStableFrames++;
    } else {
      this.gestureStableFrames = 1;
      this.previousGesture = gesture;
    }

    if (this.gestureStableFrames >= this.STABLE_FRAMES_REQUIRED) {
      this.callbacks.onGesture(gesture);
    }
  }

  private distance2D(a: HandLandmark, b: HandLandmark): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  stop(): void {
    if (this.camera) {
      this.camera.stop();
    }
    if (this.hands) {
      this.hands.close();
    }
  }
}
