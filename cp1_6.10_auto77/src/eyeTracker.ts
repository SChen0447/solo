export interface Point2D {
  x: number;
  y: number;
}

export interface GazeData {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
  confidence: number;
  pupilLeft: Point2D;
  pupilRight: Point2D;
  eyeAspectRatioLeft: number;
  eyeAspectRatioRight: number;
  isEyesClosed: boolean;
  eyesClosedDuration: number;
}

export interface CalibrationPoint {
  x: number;
  y: number;
  label: string;
  baseline?: {
    pupilLeft: Point2D;
    pupilRight: Point2D;
  };
  progress: number;
  completed: boolean;
}

export interface TrackingStatus {
  tracking: boolean;
  stability: 'stable' | 'medium' | 'lost';
  pupilOffset: number;
  fps: number;
}

export type TrackerEvent =
  | 'ready'
  | 'gaze'
  | 'calibration-start'
  | 'calibration-progress'
  | 'calibration-complete'
  | 'status'
  | 'eyes-closed'
  | 'eyes-opened';

export class EyeTracker extends EventTarget {
  private video: HTMLVideoElement;
  private faceMesh: any = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;

  private calibrationPoints: CalibrationPoint[] = [];
  private isCalibrating: boolean = false;
  private currentCalibrationIndex: number = -1;
  private calibrationStartTime: number = 0;
  private calibrationSamples: { pupilLeft: Point2D; pupilRight: Point2D }[] = [];

  private eyesClosedStartTime: number = 0;
  private isEyesClosed: boolean = false;

  private lastGazeData: GazeData | null = null;
  private lastStatus: TrackingStatus = {
    tracking: false,
    stability: 'lost',
    pupilOffset: 0,
    fps: 0
  };

  private basePupilOffset: { left: Point2D; right: Point2D } | null = null;

  constructor(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    super();
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.initCalibrationPoints();
  }

  private initCalibrationPoints() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.calibrationPoints = [
      { x: w * 0.1, y: h * 0.1, label: '左上', progress: 0, completed: false },
      { x: w * 0.9, y: h * 0.1, label: '右上', progress: 0, completed: false },
      { x: w * 0.1, y: h * 0.9, label: '左下', progress: 0, completed: false },
      { x: w * 0.9, y: h * 0.9, label: '右下', progress: 0, completed: false },
      { x: w * 0.5, y: h * 0.5, label: '中心', progress: 0, completed: false }
    ];
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    await this.loadMediaPipe();
    this.isInitialized = true;
    this.dispatchEvent(new CustomEvent('ready'));
  }

  private async loadMediaPipe(): Promise<void> {
    const existingScript = document.querySelector('script[src*="face_mesh"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
      await new Promise<void>((resolve) => {
        script.onload = () => resolve();
      });
    }

    const FaceMesh = (window as any).FaceMesh;
    if (!FaceMesh) {
      throw new Error('MediaPipe FaceMesh 加载失败');
    }

    this.faceMesh = new FaceMesh({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.faceMesh.onResults((results: any) => this.onResults(results));
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.processFrame();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private async processFrame(): Promise<void> {
    if (!this.isRunning) return;

    if (this.video.readyState >= 2) {
      try {
        await this.faceMesh.send({ image: this.video });
      } catch (e) {
        console.error('FaceMesh 处理错误:', e);
      }
    }

    this.updateFPS();
    this.animationFrameId = requestAnimationFrame(() => this.processFrame());
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
      this.updateStatus();
    }
  }

  private onResults(results: any): void {
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.globalAlpha = 0.3;
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalAlpha = 1.0;

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      this.drawLandmarks(landmarks);
      this.processGaze(landmarks);
    } else {
      this.lastStatus.tracking = false;
      this.lastStatus.stability = 'lost';
      this.dispatchEvent(new CustomEvent('status', { detail: this.lastStatus }));
    }

    this.ctx.restore();
  }

  private drawLandmarks(landmarks: any[]): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.strokeStyle = '#00ffff';
    this.ctx.lineWidth = 1;

    const leftEyeIndices = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
    const rightEyeIndices = [362, 398, 384, 385, 386, 387, 388, 466, 263, 382, 381, 380, 374, 373, 390, 249];

    this.drawEyeContour(landmarks, leftEyeIndices, w, h);
    this.drawEyeContour(landmarks, rightEyeIndices, w, h);

    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const x = lm.x * w;
      const y = lm.y * h;

      if (i === 1) {
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (i === 473 || i === 474 || i === 475 || i === 476) {
        this.ctx.fillStyle = '#00ffff';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  private drawEyeContour(landmarks: any[], indices: number[], w: number, h: number): void {
    this.ctx.beginPath();
    for (let i = 0; i < indices.length; i++) {
      const lm = landmarks[indices[i]];
      const x = lm.x * w;
      const y = lm.y * h;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.stroke();
  }

  private getPupilCenter(landmarks: any[], eye: 'left' | 'right'): Point2D {
    const indices = eye === 'left' ? [473, 474, 475, 476] : [468, 469, 470, 471, 472];
    let sumX = 0;
    let sumY = 0;
    for (const idx of indices) {
      if (landmarks[idx]) {
        sumX += landmarks[idx].x;
        sumY += landmarks[idx].y;
      }
    }
    return {
      x: sumX / indices.length,
      y: sumY / indices.length
    };
  }

  private getEyeAspectRatio(landmarks: any[], eye: 'left' | 'right'): number {
    const verticalIndices = eye === 'left' ? [159, 145] : [386, 374];
    const horizontalIndices = eye === 'left' ? [33, 133] : [362, 263];

    const v1 = landmarks[verticalIndices[0]];
    const v2 = landmarks[verticalIndices[1]];
    const h1 = landmarks[horizontalIndices[0]];
    const h2 = landmarks[horizontalIndices[1]];

    const verticalDist = Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
    const horizontalDist = Math.sqrt((h1.x - h2.x) ** 2 + (h1.y - h2.y) ** 2);

    return horizontalDist > 0 ? verticalDist / horizontalDist : 0;
  }

  private processGaze(landmarks: any[]): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const pupilLeftNorm = this.getPupilCenter(landmarks, 'left');
    const pupilRightNorm = this.getPupilCenter(landmarks, 'right');

    const pupilLeft: Point2D = { x: pupilLeftNorm.x * w, y: pupilLeftNorm.y * h };
    const pupilRight: Point2D = { x: pupilRightNorm.x * w, y: pupilRightNorm.y * h };

    const earLeft = this.getEyeAspectRatio(landmarks, 'left');
    const earRight = this.getEyeAspectRatio(landmarks, 'right');
    const avgEAR = (earLeft + earRight) / 2;

    const eyesClosed = avgEAR < 0.18;

    if (eyesClosed && !this.isEyesClosed) {
      this.eyesClosedStartTime = performance.now();
      this.isEyesClosed = true;
    } else if (!eyesClosed && this.isEyesClosed) {
      this.isEyesClosed = false;
      this.dispatchEvent(new CustomEvent('eyes-opened'));
    }

    const eyesClosedDuration = this.isEyesClosed ? performance.now() - this.eyesClosedStartTime : 0;

    if (this.isEyesClosed) {
      this.dispatchEvent(new CustomEvent('eyes-closed', { detail: { duration: eyesClosedDuration } }));
    }

    let gazeX = (pupilLeft.x + pupilRight.x) / 2;
    let gazeY = (pupilLeft.y + pupilRight.y) / 2;
    let confidence = 1.0;

    if (this.basePupilOffset) {
      const offsetLeft = {
        x: pupilLeftNorm.x - this.basePupilOffset.left.x,
        y: pupilLeftNorm.y - this.basePupilOffset.left.y
      };
      const offsetRight = {
        x: pupilRightNorm.x - this.basePupilOffset.right.x,
        y: pupilRightNorm.y - this.basePupilOffset.right.y
      };
      const avgOffset = {
        x: (offsetLeft.x + offsetRight.x) / 2,
        y: (offsetLeft.y + offsetRight.y) / 2
      };

      gazeX = w / 2 - avgOffset.x * w * 4;
      gazeY = h / 2 - avgOffset.y * h * 4;

      gazeX = Math.max(0, Math.min(w, gazeX));
      gazeY = Math.max(0, Math.min(h, gazeY));

      const pupilOffset = Math.sqrt(avgOffset.x ** 2 + avgOffset.y ** 2);
      this.updateStatus(pupilOffset);
    } else {
      this.updateStatus(0.02);
    }

    const gazeData: GazeData = {
      x: gazeX,
      y: gazeY,
      normalizedX: gazeX / w,
      normalizedY: gazeY / h,
      confidence,
      pupilLeft,
      pupilRight,
      eyeAspectRatioLeft: earLeft,
      eyeAspectRatioRight: earRight,
      isEyesClosed: eyesClosed,
      eyesClosedDuration
    };

    this.lastGazeData = gazeData;
    this.dispatchEvent(new CustomEvent('gaze', { detail: gazeData }));

    if (this.isCalibrating) {
      this.processCalibration(pupilLeftNorm, pupilRightNorm);
    }
  }

  private updateStatus(pupilOffset: number = 0): void {
    let stability: 'stable' | 'medium' | 'lost' = 'stable';
    let tracking = true;

    if (pupilOffset > 0.08) {
      stability = 'lost';
      tracking = false;
    } else if (pupilOffset > 0.04) {
      stability = 'medium';
    }

    this.lastStatus = {
      tracking,
      stability,
      pupilOffset,
      fps: this.fps
    };

    this.dispatchEvent(new CustomEvent('status', { detail: this.lastStatus }));
  }

  public startCalibration(): void {
    if (this.isCalibrating) return;
    this.isCalibrating = true;
    this.currentCalibrationIndex = 0;
    this.calibrationSamples = [];
    this.calibrationStartTime = performance.now();
    this.initCalibrationPoints();

    this.dispatchEvent(new CustomEvent('calibration-start', { detail: { points: this.calibrationPoints } }));
  }

  private processCalibration(pupilLeft: Point2D, pupilRight: Point2D): void {
    if (this.currentCalibrationIndex < 0 || this.currentCalibrationIndex >= this.calibrationPoints.length) {
      return;
    }

    const point = this.calibrationPoints[this.currentCalibrationIndex];
    const elapsed = performance.now() - this.calibrationStartTime;

    if (elapsed < 2000) {
      this.calibrationSamples.push({ pupilLeft, pupilRight });
      point.progress = elapsed / 2000;

      this.dispatchEvent(
        new CustomEvent('calibration-progress', {
          detail: {
            currentIndex: this.currentCalibrationIndex,
            point,
            points: this.calibrationPoints
          }
        })
      );
    } else {
      const avg = this.calibrationSamples.reduce(
        (acc, s) => ({
          pupilLeft: { x: acc.pupilLeft.x + s.pupilLeft.x, y: acc.pupilLeft.y + s.pupilLeft.y },
          pupilRight: { x: acc.pupilRight.x + s.pupilRight.x, y: acc.pupilRight.y + s.pupilRight.y }
        }),
        { pupilLeft: { x: 0, y: 0 }, pupilRight: { x: 0, y: 0 } }
      );

      const n = this.calibrationSamples.length;
      point.baseline = {
        pupilLeft: { x: avg.pupilLeft.x / n, y: avg.pupilLeft.y / n },
        pupilRight: { x: avg.pupilRight.x / n, y: avg.pupilRight.y / n }
      };
      point.completed = true;
      point.progress = 1;

      if (this.currentCalibrationIndex >= this.calibrationPoints.length - 1) {
        this.finishCalibration();
      } else {
        this.currentCalibrationIndex++;
        this.calibrationSamples = [];
        this.calibrationStartTime = performance.now();
      }
    }
  }

  private finishCalibration(): void {
    this.isCalibrating = false;

    const centerPoint = this.calibrationPoints.find((p) => p.label === '中心');
    if (centerPoint && centerPoint.baseline) {
      this.basePupilOffset = {
        left: centerPoint.baseline.pupilLeft,
        right: centerPoint.baseline.pupilRight
      };
    }

    this.dispatchEvent(
      new CustomEvent('calibration-complete', {
        detail: { points: this.calibrationPoints, baseline: this.basePupilOffset }
      })
    );
  }

  public getStatus(): TrackingStatus {
    return this.lastStatus;
  }

  public getLastGazeData(): GazeData | null {
    return this.lastGazeData;
  }

  public getCalibrationPoints(): CalibrationPoint[] {
    return this.calibrationPoints;
  }

  public getIsCalibrating(): boolean {
    return this.isCalibrating;
  }

  public getCurrentCalibrationIndex(): number {
    return this.currentCalibrationIndex;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.initCalibrationPoints();
  }
}
