import { Hands, Results } from '@mediapipe/hands';
import type { HandData, HandLandmark, GestureType } from '../shared/types';

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export class HandTracker {
  private hands: Hands | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private lastFrameTime = 0;
  private isRunning = false;
  private animationId: number | null = null;
  private onHandDataCallback: ((data: HandData) => void) | null = null;
  private lastGesture: GestureType = 'none';
  private gestureStableFrames = 0;
  private readonly GESTURE_STABLE_THRESHOLD = 5;

  constructor() {}

  async init(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;
    
    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults(this.onResults.bind(this));
  }

  setOnHandDataCallback(callback: (data: HandData) => void): void {
    this.onHandDataCallback = callback;
  }

  start(): void {
    if (this.isRunning || !this.videoElement) return;
    this.isRunning = true;
    this.processFrame();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private processFrame = (): void => {
    if (!this.isRunning || !this.videoElement || !this.hands) return;

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= FRAME_INTERVAL) {
      if (this.videoElement.readyState >= 2) {
        this.hands.send({ image: this.videoElement });
      }
      this.lastFrameTime = now - (elapsed % FRAME_INTERVAL);
    }

    this.animationId = requestAnimationFrame(this.processFrame);
  };

  private onResults(results: Results): void {
    if (!this.onHandDataCallback) return;

    const handData: HandData = {
      landmarks: [],
      gestureType: 'none',
      timestamp: performance.now()
    };

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      handData.landmarks = landmarks.map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z
      })) as HandLandmark[];

      const gesture = this.detectGesture(handData.landmarks);
      handData.gestureType = this.stabilizeGesture(gesture);
    } else {
      handData.gestureType = this.stabilizeGesture('none');
    }

    this.onHandDataCallback(handData);
  }

  private stabilizeGesture(gesture: GestureType): GestureType {
    if (gesture === this.lastGesture) {
      this.gestureStableFrames++;
    } else {
      this.gestureStableFrames = 0;
      this.lastGesture = gesture;
    }

    if (this.gestureStableFrames >= this.GESTURE_STABLE_THRESHOLD) {
      return gesture;
    }
    
    return this.lastGesture === 'none' ? 'none' : this.lastGesture;
  }

  private detectGesture(landmarks: HandLandmark[]): GestureType {
    if (landmarks.length < 21) return 'none';

    const fingerTips = [4, 8, 12, 16, 20];
    const fingerPips = [3, 6, 10, 14, 18];
    
    const extendedFingers: boolean[] = [];

    for (let i = 0; i < fingerTips.length; i++) {
      const tip = landmarks[fingerTips[i]];
      const pip = landmarks[fingerPips[i]];
      
      if (i === 0) {
        const thumbIp = landmarks[2];
        const thumbMcp = landmarks[1];
        const distTipToMcp = this.distance2D(tip, thumbMcp);
        const distIpToMcp = this.distance2D(thumbIp, thumbMcp);
        extendedFingers.push(distTipToMcp > distIpToMcp * 1.2);
      } else {
        extendedFingers.push(tip.y < pip.y);
      }
    }

    const indexExtended = extendedFingers[1];
    const middleExtended = extendedFingers[2];
    const ringExtended = extendedFingers[3];
    const pinkyExtended = extendedFingers[4];
    const thumbExtended = extendedFingers[0];

    const numExtended = extendedFingers.filter(Boolean).length;

    if (numExtended === 0) {
      return 'fist';
    }

    if (numExtended >= 4) {
      return 'palm';
    }

    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'index_finger';
    }

    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      return 'index_finger';
    }

    return 'none';
  }

  private distance2D(a: HandLandmark, b: HandLandmark): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  destroy(): void {
    this.stop();
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
    this.videoElement = null;
    this.canvasElement = null;
    this.onHandDataCallback = null;
  }
}

export function getIndexFingerTip(landmarks: HandLandmark[]): HandLandmark | null {
  if (landmarks.length < 9) return null;
  return landmarks[8];
}
