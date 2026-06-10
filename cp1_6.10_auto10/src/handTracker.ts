declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

export interface HandPoint {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  detected: boolean;
  palm: HandPoint;
  fingertips: HandPoint[];
}

export type HandCallback = (data: HandData) => void;

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];
const PALM_INDEX = 9;

export class HandTracker {
  private hands: any = null;
  private camera: any = null;
  private videoElement: HTMLVideoElement;
  private callback: HandCallback;
  private isRunning: boolean = false;

  constructor(videoElement: HTMLVideoElement, callback: HandCallback) {
    this.videoElement = videoElement;
    this.callback = callback;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    const Hands = window.Hands;
    const Camera = window.Camera;

    if (!Hands || !Camera) {
      console.error('MediaPipe Hands 未加载');
      return;
    }

    this.hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults(this.onResults.bind(this));

    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        if (this.hands) {
          await this.hands.send({ image: this.videoElement });
        }
      },
      width: 640,
      height: 480
    });

    try {
      await this.camera.start();
      this.isRunning = true;
      this.videoElement.classList.add('active');
    } catch (err) {
      console.error('摄像头启动失败:', err);
      this.callback({
        detected: false,
        palm: { x: 0, y: 0, z: 0 },
        fingertips: []
      });
    }
  }

  stop(): void {
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
    this.isRunning = false;
    this.videoElement.classList.remove('active');
    this.callback({
      detected: false,
      palm: { x: 0, y: 0, z: 0 },
      fingertips: []
    });
  }

  private onResults(results: any): void {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.callback({
        detected: false,
        palm: { x: 0, y: 0, z: 0 },
        fingertips: []
      });
      return;
    }

    const landmarks = results.multiHandLandmarks[0];

    const palmLandmark = landmarks[PALM_INDEX];
    const palm: HandPoint = {
      x: 1 - palmLandmark.x,
      y: 1 - palmLandmark.y,
      z: palmLandmark.z
    };

    const fingertips: HandPoint[] = FINGERTIP_INDICES.map((idx) => {
      const lm = landmarks[idx];
      return {
        x: 1 - lm.x,
        y: 1 - lm.y,
        z: lm.z
      };
    });

    this.callback({
      detected: true,
      palm,
      fingertips
    });
  }

  get active(): boolean {
    return this.isRunning;
  }
}
