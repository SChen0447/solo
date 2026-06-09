import { Hands, Results, NormalizedLandmark } from '@mediapipe/hands';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface GestureData {
  handsDetected: number;
  wristAngles: [number | undefined, number | undefined];
  palmSpeeds: [number | undefined, number | undefined];
  isFist: [boolean | undefined, boolean | undefined];
  handsDistance: number | undefined;
  handPositions: Array<{ x: number; y: number; z: number }>;
  landmarks: Array<Array<HandLandmark>>;
}

const WRIST = 0;
const INDEX_MCP = 5;
const PINKY_MCP = 17;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;
const THUMB_TIP = 4;

export class GestureTracker {
  private hands: Hands | null = null;
  private videoElement: HTMLVideoElement;
  private lastPalmPositions: Array<{ x: number; y: number; t: number }> = [];
  private onResultsCallback: ((data: GestureData) => void) | null = null;
  private animationFrameId: number | null = null;
  private lastProcessTime = 0;
  private processInterval = 1000 / 30;
  private isInitialized = false;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  async init(): Promise<void> {
    const { Hands } = await import('@mediapipe/hands');
    this.hands = new Hands({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
    });
    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 0,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5
    });
    this.hands.onResults((results: Results) => this.handleResults(results));
    this.isInitialized = true;
  }

  onResults(callback: (data: GestureData) => void): void {
    this.onResultsCallback = callback;
  }

  start(): void {
    if (!this.isInitialized) return;
    this.processLoop();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.hands) {
      this.hands.close();
    }
  }

  private processLoop = (): void => {
    this.animationFrameId = requestAnimationFrame(this.processLoop);
    const now = performance.now();
    if (now - this.lastProcessTime < this.processInterval) return;
    this.lastProcessTime = now;

    if (
      this.videoElement.readyState >= 2 &&
      this.videoElement.videoWidth > 0 &&
      this.hands
    ) {
      this.hands.send({ image: this.videoElement }).catch(() => {});
    }
  };

  private handleResults(results: Results): void {
    const landmarksList = results.multiHandLandmarks || [];
    const data: GestureData = {
      handsDetected: landmarksList.length,
      wristAngles: [undefined, undefined],
      palmSpeeds: [undefined, undefined],
      isFist: [undefined, undefined],
      handsDistance: undefined,
      handPositions: [],
      landmarks: []
    };

    const now = performance.now();

    for (let i = 0; i < landmarksList.length; i++) {
      const lm = landmarksList[i] as NormalizedLandmark[];
      const converted = lm.map(p => ({ x: p.x, y: p.y, z: p.z }));
      data.landmarks.push(converted);

      const palmX = (converted[INDEX_MCP].x + converted[PINKY_MCP].x + converted[WRIST].x) / 3;
      const palmY = (converted[INDEX_MCP].y + converted[PINKY_MCP].y + converted[WRIST].y) / 3;
      const palmZ = (converted[INDEX_MCP].z + converted[PINKY_MCP].z + converted[WRIST].z) / 3;
      data.handPositions.push({ x: palmX, y: palmY, z: palmZ });

      data.wristAngles[i] = this.computeWristAngle(converted);
      data.isFist[i] = this.detectFist(converted);

      const last = this.lastPalmPositions[i];
      if (last) {
        const dt = Math.max(1, now - last.t) / 1000;
        const dx = palmX - last.x;
        const dy = palmY - last.y;
        data.palmSpeeds[i] = Math.sqrt(dx * dx + dy * dy) / dt;
      }
      this.lastPalmPositions[i] = { x: palmX, y: palmY, t: now };
    }

    if (landmarksList.length === 2) {
      const p0 = data.handPositions[0];
      const p1 = data.handPositions[1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      data.handsDistance = Math.sqrt(dx * dx + dy * dy) * this.videoElement.videoWidth;
    }

    if (this.onResultsCallback) {
      this.onResultsCallback(data);
    }
  }

  private computeWristAngle(lm: HandLandmark[]): number {
    const wrist = lm[WRIST];
    const indexMcp = lm[INDEX_MCP];
    const pinkyMcp = lm[PINKY_MCP];
    const midX = (indexMcp.x + pinkyMcp.x) / 2;
    const midY = (indexMcp.y + pinkyMcp.y) / 2;
    const dx = midX - wrist.x;
    const dy = midY - wrist.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  private detectFist(lm: HandLandmark[]): boolean {
    const palmCenter = {
      x: (lm[INDEX_MCP].x + lm[PINKY_MCP].x) / 2,
      y: (lm[INDEX_MCP].y + lm[PINKY_MCP].y) / 2
    };
    const palmSize = Math.hypot(
      lm[INDEX_MCP].x - lm[PINKY_MCP].x,
      lm[INDEX_MCP].y - lm[PINKY_MCP].y
    );
    if (palmSize < 0.01) return false;

    const tips = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP, THUMB_TIP];
    let curledCount = 0;
    for (const tip of tips) {
      const dist = Math.hypot(lm[tip].x - palmCenter.x, lm[tip].y - palmCenter.y);
      if (dist < palmSize * 1.2) {
        curledCount++;
      }
    }
    return curledCount >= 4;
  }
}
