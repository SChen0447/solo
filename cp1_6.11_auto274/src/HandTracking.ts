import { Point3D, Handedness, HandState, HandGesture, TrackingData } from './types';

declare global {
  interface Window {
    Hands: any;
  }
}

const FINGER_TIP_IDS = [4, 8, 12, 16, 20];
const FINGER_PIP_IDS = [3, 6, 10, 14, 18];
const FINGER_MCP_IDS = [2, 5, 9, 13, 17];
const WRIST_ID = 0;
const MIDDLE_MCP_ID = 9;
const PINKY_MCP_ID = 17;
const INDEX_MCP_ID = 5;

function calculateDistance2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isFingerExtended(landmarks: Point3D[], tipId: number, pipId: number, mcpId: number, isThumb: boolean = false): boolean {
  const tip = landmarks[tipId];
  const pip = landmarks[pipId];
  const mcp = landmarks[mcpId];
  const wrist = landmarks[WRIST_ID];

  if (isThumb) {
    const indexMcp = landmarks[INDEX_MCP_ID];
    const thumbTipToIndex = calculateDistance2D(tip, indexMcp);
    const thumbMcpToIndex = calculateDistance2D(mcp, indexMcp);
    return thumbTipToIndex > thumbMcpToIndex * 1.5;
  }

  const tipToWrist = calculateDistance2D(tip, wrist);
  const pipToWrist = calculateDistance2D(pip, wrist);
  const mcpToWrist = calculateDistance2D(mcp, wrist);

  return tipToWrist > pipToWrist && pipToWrist > mcpToWrist * 0.9;
}

function detectGesture(landmarks: Point3D[]): HandGesture {
  let extendedCount = 0;

  for (let i = 0; i < 5; i++) {
    if (isFingerExtended(landmarks, FINGER_TIP_IDS[i], FINGER_PIP_IDS[i], FINGER_MCP_IDS[i], i === 0)) {
      extendedCount++;
    }
  }

  if (extendedCount >= 4) {
    return 'open';
  } else if (extendedCount <= 1) {
    return 'fist';
  }
  return 'unknown';
}

function calculatePalmAngle(landmarks: Point3D[]): number {
  const wrist = landmarks[WRIST_ID];
  const middleMcp = landmarks[MIDDLE_MCP_ID];
  const indexMcp = landmarks[INDEX_MCP_ID];
  const pinkyMcp = landmarks[PINKY_MCP_ID];

  const v1 = {
    x: middleMcp.x - wrist.x,
    y: middleMcp.y - wrist.y,
    z: middleMcp.z - wrist.z
  };

  const v2 = {
    x: pinkyMcp.x - indexMcp.x,
    y: pinkyMcp.y - indexMcp.y,
    z: pinkyMcp.z - indexMcp.z
  };

  const normal = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x
  };

  const normalLength = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
  if (normalLength === 0) return 0;

  const normalY = normal.y / normalLength;
  const angle = Math.asin(normalY) * (180 / Math.PI);

  return angle;
}

function getPalmPosition(landmarks: Point3D[]): { x: number; y: number } {
  const wrist = landmarks[WRIST_ID];
  const middleMcp = landmarks[MIDDLE_MCP_ID];
  return {
    x: (wrist.x + middleMcp.x) / 2,
    y: (wrist.y + middleMcp.y) / 2
  };
}

function processHandLandmarks(landmarks: Point3D[], handedness: Handedness): HandState {
  const gesture = detectGesture(landmarks);
  const palmAngle = calculatePalmAngle(landmarks);
  const palmPosition = getPalmPosition(landmarks);

  return {
    handedness,
    landmarks,
    gesture,
    palmAngle,
    palmUp: palmAngle > 60,
    palmDown: palmAngle < -60,
    palmPosition
  };
}

export type OnTrackingUpdate = (data: TrackingData) => void;

export class HandTracking {
  private hands: any = null;
  private videoElement: HTMLVideoElement | null = null;
  private onUpdate: OnTrackingUpdate;
  private isRunning: boolean = false;
  private lastFrameTime: number = 0;
  private minFrameInterval: number = 33;

  constructor(onUpdate: OnTrackingUpdate) {
    this.onUpdate = onUpdate;
  }

  async init(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;

    return new Promise((resolve) => {
      const checkHands = () => {
        if (typeof window.Hands !== 'undefined') {
          this.setupHands();
          resolve();
        } else {
          setTimeout(checkHands, 100);
        }
      };
      setTimeout(checkHands, 100);
    });
  }

  private setupHands(): void {
    this.hands = new window.Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults(this.onResults.bind(this));
  }

  private onResults(results: any): void {
    const now = performance.now();
    if (now - this.lastFrameTime < this.minFrameInterval) return;
    this.lastFrameTime = now;

    const handStates: HandState[] = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      results.multiHandLandmarks.forEach((landmarks: Point3D[], index: number) => {
        const handedness = results.multiHandedness?.[index]?.label === 'Left' ? 'Left' : 'Right';
        const state = processHandLandmarks(landmarks, handedness);
        handStates.push(state);
      });
    }

    const leftHand = handStates.find(h => h.handedness === 'Left') || null;
    const rightHand = handStates.find(h => h.handedness === 'Right') || null;

    let handsDistance = 0;
    if (leftHand && rightHand) {
      handsDistance = calculateDistance2D(leftHand.palmPosition, rightHand.palmPosition);
    }

    const trackingData: TrackingData = {
      hands: handStates,
      leftHand,
      rightHand,
      handsDistance,
      timestamp: now
    };

    this.onUpdate(trackingData);
  }

  async start(): Promise<void> {
    if (this.isRunning || !this.videoElement) return;
    this.isRunning = true;
    this.processFrame();
  }

  stop(): void {
    this.isRunning = false;
  }

  private async processFrame(): Promise<void> {
    if (!this.isRunning || !this.videoElement || !this.hands) return;

    try {
      await this.hands.send({ image: this.videoElement });
    } catch (e) {
      console.error('Hand tracking error:', e);
    }

    if (this.isRunning) {
      requestAnimationFrame(() => this.processFrame());
    }
  }

  destroy(): void {
    this.stop();
    this.hands = null;
    this.videoElement = null;
  }
}
