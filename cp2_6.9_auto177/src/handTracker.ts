import { Hands, Results } from '@mediapipe/hands';

export interface FingerPoint {
  x: number;
  y: number;
}

export interface HandTrackingResult {
  isHandDetected: boolean;
  indexFingerTip: FingerPoint | null;
  isFist: boolean;
  isOpenPalm: boolean;
}

const FINGER_TIP_IDS = [4, 8, 12, 16, 20];
const FINGER_PIP_IDS = [3, 6, 10, 14, 18];
const WRIST_ID = 0;
const INDEX_FINGER_TIP_ID = 8;

export class HandTracker {
  private hands: Hands | null = null;
  private videoElement: HTMLVideoElement;
  private lastResults: Results | null = null;
  private modeHistory: ('fist' | 'open' | 'other')[] = [];
  private readonly HISTORY_SIZE = 3;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  async init(): Promise<void> {
    const { Hands } = await import('@mediapipe/hands');
    this.hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });
    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    });
    this.hands.onResults((results: Results) => {
      this.lastResults = results;
    });
  }

  async detect(): Promise<HandTrackingResult> {
    if (!this.hands || this.videoElement.readyState < 2) {
      return {
        isHandDetected: false,
        indexFingerTip: null,
        isFist: false,
        isOpenPalm: false
      };
    }

    await this.hands.send({ image: this.videoElement });

    if (!this.lastResults || !this.lastResults.multiHandLandmarks || this.lastResults.multiHandLandmarks.length === 0) {
      return {
        isHandDetected: false,
        indexFingerTip: null,
        isFist: false,
        isOpenPalm: false
      };
    }

    const landmarks = this.lastResults.multiHandLandmarks[0];
    const indexTip = landmarks[INDEX_FINGER_TIP_ID];

    const isFist = this.detectFist(landmarks);
    const isOpenPalm = this.detectOpenPalm(landmarks);

    let currentMode: 'fist' | 'open' | 'other' = 'other';
    if (isFist) currentMode = 'fist';
    else if (isOpenPalm) currentMode = 'open';

    this.modeHistory.push(currentMode);
    if (this.modeHistory.length > this.HISTORY_SIZE) {
      this.modeHistory.shift();
    }

    const stableFist = this.modeHistory.filter(m => m === 'fist').length >= 2;
    const stableOpen = this.modeHistory.filter(m => m === 'open').length >= 2;

    return {
      isHandDetected: true,
      indexFingerTip: {
        x: indexTip.x,
        y: indexTip.y
      },
      isFist: stableFist,
      isOpenPalm: stableOpen
    };
  }

  private detectFist(landmarks: { x: number; y: number; z: number }[]): boolean {
    let curledCount = 0;
    const wrist = landmarks[WRIST_ID];

    for (let i = 1; i < FINGER_TIP_IDS.length; i++) {
      const tip = landmarks[FINGER_TIP_IDS[i]];
      const pip = landmarks[FINGER_PIP_IDS[i]];
      const tipToWrist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      const pipToWrist = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      if (tipToWrist < pipToWrist * 1.1) {
        curledCount++;
      }
    }

    return curledCount >= 3;
  }

  private detectOpenPalm(landmarks: { x: number; y: number; z: number }[]): boolean {
    let extendedCount = 0;
    const wrist = landmarks[WRIST_ID];

    for (let i = 1; i < FINGER_TIP_IDS.length; i++) {
      const tip = landmarks[FINGER_TIP_IDS[i]];
      const pip = landmarks[FINGER_PIP_IDS[i]];
      const tipToWrist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      const pipToWrist = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      if (tipToWrist > pipToWrist * 1.2) {
        extendedCount++;
      }
    }

    return extendedCount >= 3;
  }
}
