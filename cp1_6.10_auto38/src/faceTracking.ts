declare global {
  interface Window {
    FaceMesh: any;
  }
}

export interface FaceData {
  isDetected: boolean;
  leftEyeOpen: number;
  rightEyeOpen: number;
  mouthOpen: number;
  browFrown: number;
  headYaw: number;
  headPitch: number;
  timestamp: number;
}

interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

class MovingAverageFilter {
  private window: number[] = [];
  private size: number;

  constructor(size: number = 3) {
    this.size = size;
  }

  push(value: number): number {
    this.window.push(value);
    if (this.window.length > this.size) {
      this.window.shift();
    }
    if (this.window.length === 0) return value;
    return this.window.reduce((a, b) => a + b, 0) / this.window.length;
  }

  reset(): void {
    this.window = [];
  }
}

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

const dist2D = (a: NormalizedLandmark, b: NormalizedLandmark): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const LM = {
  LEFT_EYE_TOP: 386,
  LEFT_EYE_BOTTOM: 374,
  LEFT_EYE_LEFT: 362,
  LEFT_EYE_RIGHT: 263,
  RIGHT_EYE_TOP: 159,
  RIGHT_EYE_BOTTOM: 145,
  RIGHT_EYE_LEFT: 33,
  RIGHT_EYE_RIGHT: 133,
  MOUTH_TOP: 13,
  MOUTH_BOTTOM: 14,
  MOUTH_LEFT: 78,
  MOUTH_RIGHT: 308,
  LEFT_BROW_INNER: 70,
  RIGHT_BROW_INNER: 300,
  LEFT_BROW_OUTER: 105,
  RIGHT_BROW_OUTER: 334,
  NOSE_TIP: 1,
  LEFT_FACE_EDGE: 234,
  RIGHT_FACE_EDGE: 454,
  FOREHEAD: 10,
  CHIN: 152,
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
};

const BASE_EYE_RATIO = 0.22;
const BASE_MOUTH_RATIO = 0.05;
const BASE_BROW_DIST = 0.12;

export class FaceTracker {
  private videoElement: HTMLVideoElement;
  private faceMesh: any = null;
  private cameraStream: MediaStream | null = null;
  private isRunning: boolean = false;
  private latestFaceData: FaceData = {
    isDetected: false,
    leftEyeOpen: 1,
    rightEyeOpen: 1,
    mouthOpen: 0,
    browFrown: 0,
    headYaw: 0,
    headPitch: 0,
    timestamp: 0,
  };
  private lastDetectedTime: number = 0;
  private onDataCallback: ((data: FaceData) => void) | null = null;

  private filterLeftEye = new MovingAverageFilter(3);
  private filterRightEye = new MovingAverageFilter(3);
  private filterMouth = new MovingAverageFilter(3);
  private filterBrow = new MovingAverageFilter(3);
  private filterYaw = new MovingAverageFilter(3);
  private filterPitch = new MovingAverageFilter(3);

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  onData(callback: (data: FaceData) => void): void {
    this.onDataCallback = callback;
  }

  getLatestData(): FaceData {
    return this.latestFaceData;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      this.videoElement.srcObject = this.cameraStream;
      await this.videoElement.play();
      await this.videoElement.play();

      if (typeof window.FaceMesh === 'undefined') {
        throw new Error('MediaPipe Face Mesh not loaded. Check CDN connection.');
      }

      this.faceMesh = new window.FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.faceMesh.onResults((results: any) => this.processResults(results));
      this.processVideoLoop();
    } catch (err) {
      this.isRunning = false;
      console.error('FaceTracker start error:', err);
      throw err;
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((t) => t.stop());
      this.cameraStream = null;
    }
    if (this.videoElement.srcObject) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
    }
  }

  private async processVideoLoop(): Promise<void> {
    if (!this.isRunning) return;

    if (this.videoElement.readyState >= 2) {
      try {
        await this.faceMesh.send({ image: this.videoElement });
      } catch (_e) {
        // ignore per-frame errors
      }
    }

    requestAnimationFrame(() => this.processVideoLoop());
  }

  private processResults(results: any): void {
    const now = performance.now();

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      this.latestFaceData = {
        ...this.latestFaceData,
        isDetected: false,
        timestamp: now,
      };
    } else {
      this.lastDetectedTime = now;
      const lm = results.multiFaceLandmarks[0] as NormalizedLandmark[];
      this.latestFaceData = this.extractFaceData(lm, now);
    }

    if (this.onDataCallback) {
      this.onDataCallback(this.latestFaceData);
    }
  }

  private extractFaceData(lm: NormalizedLandmark[], now: number): FaceData {
    const faceWidth = dist2D(lm[LM.LEFT_FACE_EDGE], lm[LM.RIGHT_FACE_EDGE]);
    const faceHeight = dist2D(lm[LM.FOREHEAD], lm[LM.CHIN]);
    const faceSize = Math.max(faceWidth, faceHeight) || 1;

    const leftEyeH = dist2D(lm[LM.LEFT_EYE_TOP], lm[LM.LEFT_EYE_BOTTOM]);
    const leftEyeW = dist2D(lm[LM.LEFT_EYE_LEFT], lm[LM.LEFT_EYE_RIGHT]);
    const leftEyeRatio = leftEyeH / (leftEyeW || 1);
    let leftEyeOpen = clamp(leftEyeRatio / BASE_EYE_RATIO, 0, 1);

    const rightEyeH = dist2D(lm[LM.RIGHT_EYE_TOP], lm[LM.RIGHT_EYE_BOTTOM]);
    const rightEyeW = dist2D(lm[LM.RIGHT_EYE_LEFT], lm[LM.RIGHT_EYE_RIGHT]);
    const rightEyeRatio = rightEyeH / (rightEyeW || 1);
    let rightEyeOpen = clamp(rightEyeRatio / BASE_EYE_RATIO, 0, 1);

    const mouthH = dist2D(lm[LM.MOUTH_TOP], lm[LM.MOUTH_BOTTOM]);
    const mouthW = dist2D(lm[LM.MOUTH_LEFT], lm[LM.MOUTH_RIGHT]);
    const mouthRatio = mouthH / (mouthW || 1);
    let mouthOpen = clamp((mouthRatio - BASE_MOUTH_RATIO) / 0.35, 0, 1);

    const browCenterY = (lm[LM.LEFT_BROW_INNER].y + lm[LM.RIGHT_BROW_INNER].y) / 2;
    const eyeCenterY = (lm[LM.LEFT_EYE_TOP].y + lm[LM.RIGHT_EYE_TOP].y) / 2;
    const browEyeDist = (eyeCenterY - browCenterY) / faceSize;
    let browFrown = clamp((BASE_BROW_DIST - browEyeDist) / 0.04, 0, 1);

    const noseX = lm[LM.NOSE_TIP].x;
    const midX = (lm[LM.LEFT_FACE_EDGE].x + lm[LM.RIGHT_FACE_EDGE].x) / 2;
    let headYaw = clamp((noseX - midX) / (faceWidth * 0.5), -1, 1);

    const noseY = lm[LM.NOSE_TIP].y;
    const midY = (lm[LM.FOREHEAD].y + lm[LM.CHIN].y) / 2;
    let headPitch = clamp((noseY - midY) / (faceHeight * 0.35), -1, 1);

    leftEyeOpen = this.filterLeftEye.push(leftEyeOpen);
    rightEyeOpen = this.filterRightEye.push(rightEyeOpen);
    mouthOpen = this.filterMouth.push(mouthOpen);
    browFrown = this.filterBrow.push(browFrown);
    headYaw = this.filterYaw.push(headYaw);
    headPitch = this.filterPitch.push(headPitch);

    return {
      isDetected: true,
      leftEyeOpen,
      rightEyeOpen,
      mouthOpen,
      browFrown,
      headYaw,
      headPitch,
      timestamp: now,
    };
  }

  getLastDetectedTime(): number {
    return this.lastDetectedTime;
  }
}
