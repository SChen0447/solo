export type ExpressionType = 'happy' | 'sad' | 'angry' | 'surprised' | 'disgusted' | 'neutral';

export interface ExpressionWeights {
  happy: number;
  sad: number;
  angry: number;
  surprised: number;
  disgusted: number;
  neutral: number;
}

interface Landmark {
  x: number;
  y: number;
  z: number;
}

declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

export class FaceMeshDetector {
  private faceMesh: any = null;
  private camera: any = null;
  private currentLandmarks: Landmark[] = [];
  private lastExpressionWeights: ExpressionWeights = {
    happy: 0,
    sad: 0,
    angry: 0,
    surprised: 0,
    disgusted: 0,
    neutral: 1
  };
  private smoothedWeights: ExpressionWeights = {
    happy: 0,
    sad: 0,
    angry: 0,
    surprised: 0,
    disgusted: 0,
    neutral: 1
  };
  private onResultsCallback: ((landmarks: Landmark[]) => void) | null = null;
  private smoothingFactor = 0.25;

  constructor() {}

  static async waitForLibraries(timeoutMs: number = 15000): Promise<void> {
    const startTime = performance.now();
    return new Promise((resolve, reject) => {
      const check = () => {
        if (window.FaceMesh && window.Camera) {
          resolve();
          return;
        }
        if (performance.now() - startTime > timeoutMs) {
          reject(new Error('加载 MediaPipe 库超时'));
          return;
        }
        setTimeout(check, 100);
      };
      check();
    });
  }

  async startDetection(videoElement: HTMLVideoElement): Promise<void> {
    await FaceMeshDetector.waitForLibraries();
    return new Promise((resolve, reject) => {
      try {
        if (!window.FaceMesh) {
          reject(new Error('FaceMesh 库未加载'));
          return;
        }

        this.faceMesh = new window.FaceMesh({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
          }
        });

        this.faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults((results: any) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            this.currentLandmarks = results.multiFaceLandmarks[0];
            this.updateExpressionWeights();
            if (this.onResultsCallback) {
              this.onResultsCallback(this.currentLandmarks);
            }
          }
        });

        if (!window.Camera) {
          reject(new Error('Camera 工具库未加载'));
          return;
        }

        this.camera = new window.Camera(videoElement, {
          onFrame: async () => {
            if (this.faceMesh) {
              await this.faceMesh.send({ image: videoElement });
            }
          },
          width: 640,
          height: 480
        });

        this.camera.start().then(() => {
          resolve();
        }).catch((err: Error) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  onResults(callback: (landmarks: Landmark[]) => void): void {
    this.onResultsCallback = callback;
  }

  getCurrentExpression(): ExpressionWeights {
    return { ...this.smoothedWeights };
  }

  getDominantExpression(): ExpressionType {
    const weights = this.smoothedWeights;
    let maxVal = -1;
    let maxExpr: ExpressionType = 'neutral';
    (Object.keys(weights) as ExpressionType[]).forEach((key) => {
      if (weights[key] > maxVal) {
        maxVal = weights[key];
        maxExpr = key;
      }
    });
    return maxExpr;
  }

  getLandmarks(): Landmark[] {
    return this.currentLandmarks;
  }

  destroy(): void {
    if (this.camera) {
      this.camera.stop();
    }
    if (this.faceMesh) {
      this.faceMesh.close();
    }
  }

  private dist(p1: Landmark, p2: Landmark): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private updateExpressionWeights(): void {
    if (this.currentLandmarks.length < 468) {
      return;
    }

    const lm = this.currentLandmarks;

    const upperLipTop = lm[13];
    const lowerLipBottom = lm[14];
    const mouthLeftCorner = lm[61];
    const mouthRightCorner = lm[291];
    const mouthTop = lm[13];
    const mouthBottom = lm[14];
    const upperLipBottom = lm[312];
    const lowerLipTop = lm[317];
    const leftEyebrowInner = lm[105];
    const rightEyebrowInner = lm[334];
    const leftEyeTop = lm[159];
    const leftEyeBottom = lm[145];
    const rightEyeTop = lm[386];
    const rightEyeBottom = lm[374];
    const leftEyeLeft = lm[33];
    const leftEyeRight = lm[133];
    const rightEyeLeft = lm[362];
    const rightEyeRight = lm[263];
    const noseTip = lm[1];
    const chinBottom = lm[152];

    const faceHeight = this.dist(noseTip, chinBottom);
    const eyeReference = (this.dist(leftEyeLeft, leftEyeRight) + this.dist(rightEyeLeft, rightEyeRight)) / 2;

    const mouthWidth = this.dist(mouthLeftCorner, mouthRightCorner);
    const mouthHeight = this.dist(mouthTop, mouthBottom);
    const mouthOpenRatio = faceHeight > 0 ? mouthHeight / faceHeight : 0;

    const lipGap = this.dist(upperLipBottom, lowerLipTop);
    const lipOpenRatio = faceHeight > 0 ? lipGap / faceHeight : 0;

    const mouthCornersY = (mouthLeftCorner.y + mouthRightCorner.y) / 2;
    const mouthCenterY = mouthTop.y;
    const mouthCurveRatio = eyeReference > 0 ? (mouthCenterY - mouthCornersY) / eyeReference : 0;

    const leftEyeOpen = this.dist(leftEyeTop, leftEyeBottom);
    const rightEyeOpen = this.dist(rightEyeTop, rightEyeBottom);
    const eyeOpenRatio = eyeReference > 0 ? ((leftEyeOpen + rightEyeOpen) / 2) / eyeReference : 0;

    const eyebrowHeight = ((leftEyebrowInner.y + rightEyebrowInner.y) / 2);
    const eyeHeight = ((leftEyeTop.y + rightEyeTop.y) / 2);
    const eyebrowRaiseRatio = faceHeight > 0 ? (eyeHeight - eyebrowHeight) / faceHeight : 0;

    const browNarrowDist = this.dist(leftEyebrowInner, rightEyebrowInner);
    const browNarrowRatio = eyeReference > 0 ? browNarrowDist / eyeReference : 0;

    const rawWeights: ExpressionWeights = {
      happy: 0,
      sad: 0,
      angry: 0,
      surprised: 0,
      disgusted: 0,
      neutral: 0
    };

    rawWeights.happy = Math.max(0, Math.min(1,
      (mouthCurveRatio - 0.02) / 0.08 +
      Math.max(0, (mouthWidth / eyeReference - 1.4) / 0.6) * 0.6
    ));

    rawWeights.sad = Math.max(0, Math.min(1,
      Math.max(0, (-mouthCurveRatio - 0.01)) / 0.06 +
      Math.max(0, (eyebrowRaiseRatio - 0.03) / 0.05) * 0.4
    ));

    rawWeights.angry = Math.max(0, Math.min(1,
      Math.max(0, (0.9 - browNarrowRatio)) / 0.3 +
      Math.max(0, (0.18 - eyebrowRaiseRatio)) / 0.15
    ));

    rawWeights.surprised = Math.max(0, Math.min(1,
      Math.max(0, (mouthOpenRatio - 0.06)) / 0.12 +
      Math.max(0, (eyeOpenRatio - 0.23)) / 0.12 +
      Math.max(0, (eyebrowRaiseRatio - 0.04)) / 0.06
    ));

    rawWeights.disgusted = Math.max(0, Math.min(1,
      Math.max(0, (0.95 - browNarrowRatio)) / 0.25 +
      Math.max(0, (lipOpenRatio - 0.005)) / 0.04 * 0.5
    ));

    const totalRaw = rawWeights.happy + rawWeights.sad + rawWeights.angry +
                    rawWeights.surprised + rawWeights.disgusted;
    rawWeights.neutral = Math.max(0, 1 - totalRaw);

    const sum = rawWeights.happy + rawWeights.sad + rawWeights.angry +
                rawWeights.surprised + rawWeights.disgusted + rawWeights.neutral;
    if (sum > 0) {
      (Object.keys(rawWeights) as ExpressionType[]).forEach((key) => {
        rawWeights[key] = rawWeights[key] / sum;
      });
    }

    const alpha = this.smoothingFactor;
    (Object.keys(this.smoothedWeights) as ExpressionType[]).forEach((key) => {
      this.smoothedWeights[key] = this.smoothedWeights[key] * (1 - alpha) + rawWeights[key] * alpha;
    });

    this.lastExpressionWeights = { ...this.smoothedWeights };
  }
}
