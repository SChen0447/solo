import type { HandLandmark, GestureCallback } from './types';

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe';

export class GestureTracker {
  private videoElement: HTMLVideoElement;
  private hands: any = null;
  private camera: any = null;
  private callback: GestureCallback;
  private frameCount: number = 0;
  private detectionInterval: number = 3;
  private lastLandmarks: HandLandmark[] | null = null;
  private isReady: boolean = false;
  private onReadyCallback: (() => void) | null = null;

  constructor(videoElement: HTMLVideoElement, callback: GestureCallback) {
    this.videoElement = videoElement;
    this.callback = callback;
  }

  async init(onReady?: () => void): Promise<void> {
    this.onReadyCallback = onReady || null;
    await this.loadScripts();
    await this.setupHands();
    await this.setupCamera();
  }

  private loadScripts(): Promise<void> {
    return new Promise((resolve, reject) => {
      const scripts = [
        `${MEDIAPIPE_CDN}/hands/hands.js`,
        `${MEDIAPIPE_CDN}/camera_utils/camera_utils.js`,
      ];
      let loaded = 0;

      scripts.forEach((src) => {
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          loaded++;
          if (loaded === scripts.length) {
            resolve();
          }
        };
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    });
  }

  private async setupHands(): Promise<void> {
    const { Hands } = window;
    if (!Hands) {
      throw new Error('MediaPipe Hands not loaded');
    }

    this.hands = new Hands({
      locateFile: (file: string) => {
        return `${MEDIAPIPE_CDN}/hands/${file}`;
      },
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults((results: any) => {
      this.handleResults(results);
    });
  }

  private async setupCamera(): Promise<void> {
    const { Camera } = window;
    if (!Camera) {
      throw new Error('MediaPipe Camera not loaded');
    }

    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        this.frameCount++;
        if (this.frameCount % this.detectionInterval === 0) {
          await this.hands.send({ image: this.videoElement });
        }
      },
      width: 640,
      height: 480,
    });

    await this.camera.start();
    this.isReady = true;
    if (this.onReadyCallback) {
      this.onReadyCallback();
    }
  }

  private handleResults(results: any): void {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const allLandmarks: HandLandmark[] = [];
      for (const landmarks of results.multiHandLandmarks) {
        for (const lm of landmarks) {
          allLandmarks.push({
            x: lm.x,
            y: lm.y,
            z: lm.z,
          });
        }
      }
      this.lastLandmarks = allLandmarks;
      this.callback(allLandmarks);
    } else {
      this.lastLandmarks = null;
      this.callback(null);
    }
  }

  getLastLandmarks(): HandLandmark[] | null {
    return this.lastLandmarks;
  }

  isInitialized(): boolean {
    return this.isReady;
  }

  destroy(): void {
    if (this.camera) {
      this.camera.stop();
    }
    if (this.hands) {
      this.hands.close();
    }
  }
}
