import * as THREE from 'three';

export enum HandGesture {
  NONE = 'none',
  OPEN = 'open',
  FIST = 'fist'
}

export interface HandData {
  position: THREE.Vector3;
  gesture: HandGesture;
  isTracked: boolean;
  velocity: THREE.Vector3;
}

declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_FINGER_TIP = 8;
const MIDDLE_FINGER_TIP = 12;
const RING_FINGER_TIP = 16;
const PINKY_TIP = 20;
const MIDDLE_FINGER_MCP = 9;

const FINGER_TIPS = [THUMB_TIP, INDEX_FINGER_TIP, MIDDLE_FINGER_TIP, RING_FINGER_TIP, PINKY_TIP];
const OPEN_THRESHOLD = 0.18;
const FIST_THRESHOLD = 0.12;
const SMOOTHING = 0.7;

export class HandTracker {
  private hands: any;
  private camera: any;
  private video: HTMLVideoElement;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D;
  private currentData: HandData;
  private previousPosition: THREE.Vector3;
  private onUpdateCallback: ((data: HandData) => void) | null = null;

  constructor() {
    this.video = document.getElementById('inputVideo') as HTMLVideoElement;
    this.overlayCanvas = document.getElementById('handCanvas') as HTMLCanvasElement;
    this.overlayCtx = this.overlayCanvas.getContext('2d')!;
    this.overlayCanvas.width = 200;
    this.overlayCanvas.height = 150;

    this.currentData = {
      position: new THREE.Vector3(0, 0, 0),
      gesture: HandGesture.NONE,
      isTracked: false,
      velocity: new THREE.Vector3(0, 0, 0)
    };
    this.previousPosition = new THREE.Vector3(0, 0, 0);
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (window.Hands && window.Camera && window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
          clearInterval(checkInterval);
          this.setupHands()
            .then(resolve)
            .catch(reject);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('MediaPipe Hands 加载超时'));
      }, 15000);
    });
  }

  private async setupHands(): Promise<void> {
    this.hands = new window.Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults((results: any) => this.onResults(results));

    this.camera = new window.Camera(this.video, {
      onFrame: async () => {
        await this.hands.send({ image: this.video });
      },
      width: 640,
      height: 480
    });

    await this.camera.start();
  }

  private onResults(results: any): void {
    this.overlayCtx.save();
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.overlayCtx.drawImage(results.image, 0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      this.processLandmarks(landmarks);
      this.drawSkeleton(landmarks);
    } else {
      this.currentData.isTracked = false;
      this.currentData.gesture = HandGesture.NONE;
    }

    this.overlayCtx.restore();

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.currentData);
    }
  }

  private processLandmarks(landmarks: any[]): void {
    const wrist = landmarks[WRIST];
    const middleMcp = landmarks[MIDDLE_FINGER_MCP];

    const centerX = (wrist.x + middleMcp.x) / 2;
    const centerY = (wrist.y + middleMcp.y) / 2;
    const centerZ = (wrist.z + middleMcp.z) / 2;

    const targetX = (centerX - 0.5) * 12;
    const targetY = (0.5 - centerY) * 8;
    const targetZ = centerZ * 6;

    const newPosition = new THREE.Vector3(targetX, targetY, targetZ);
    this.currentData.velocity = newPosition.clone().sub(this.previousPosition);
    this.currentData.position.lerp(newPosition, SMOOTHING);
    this.previousPosition.copy(newPosition);

    let avgDistance = 0;
    for (const tipIndex of FINGER_TIPS) {
      const tip = landmarks[tipIndex];
      const dx = tip.x - wrist.x;
      const dy = tip.y - wrist.y;
      const dz = tip.z - wrist.z;
      avgDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    avgDistance /= FINGER_TIPS.length;

    const previousGesture = this.currentData.gesture;
    if (avgDistance > OPEN_THRESHOLD) {
      this.currentData.gesture = HandGesture.OPEN;
    } else if (avgDistance < FIST_THRESHOLD) {
      this.currentData.gesture = HandGesture.FIST;
    } else {
      this.currentData.gesture = previousGesture !== HandGesture.NONE ? previousGesture : HandGesture.OPEN;
    }

    this.currentData.isTracked = true;
  }

  private drawSkeleton(landmarks: any[]): void {
    this.overlayCtx.globalCompositeOperation = 'source-over';

    window.drawConnectors(this.overlayCtx, landmarks, window.HAND_CONNECTIONS, {
      color: 'rgba(100, 180, 255, 0.8)',
      lineWidth: 2
    });

    window.drawLandmarks(this.overlayCtx, landmarks, {
      color: 'rgba(150, 220, 255, 0.9)',
      lineWidth: 1,
      radius: 3
    });
  }

  onUpdate(callback: (data: HandData) => void): void {
    this.onUpdateCallback = callback;
  }

  getData(): HandData {
    return this.currentData;
  }
}
