import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import * as THREE from 'three';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export type TrackingCallback = (landmarks: HandLandmark[]) => void;

export class HandTracker {
  private hands: Hands | null = null;
  private camera: Camera | null = null;
  private videoElement: HTMLVideoElement;
  private onLandmarks: TrackingCallback;
  private isRunning: boolean = false;

  constructor(videoElement: HTMLVideoElement, onLandmarks: TrackingCallback) {
    this.videoElement = videoElement;
    this.onLandmarks = onLandmarks;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults((results: Results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0].map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z
        }));
        this.onLandmarks(landmarks);
      } else {
        this.onLandmarks([]);
      }
    });

    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        if (this.hands && this.videoElement.readyState >= 2) {
          await this.hands.send({ image: this.videoElement });
        }
      },
      width: 640,
      height: 480
    });

    await this.camera.start();
    this.isRunning = true;
  }

  stop(): void {
    if (this.camera) {
      this.camera.stop();
    }
    if (this.hands) {
      this.hands.close();
    }
    this.isRunning = false;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  static landmarksToVector3(landmarks: HandLandmark[]): THREE.Vector3[] {
    return landmarks.map((lm) => {
      return new THREE.Vector3(
        (lm.x - 0.5) * 3,
        (0.5 - lm.y) * 3,
        -lm.z * 2
      );
    });
  }
}

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];
