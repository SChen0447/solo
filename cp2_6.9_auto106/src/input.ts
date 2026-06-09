export interface InputState {
  x: number;
  y: number;
}

type InputMode = 'mouse' | 'camera';

export class InputManager {
  private canvas: HTMLCanvasElement;
  private videoElement: HTMLVideoElement | null;
  private mode: InputMode = 'mouse';
  private currentX: number = 0.5;
  private currentY: number = 0.5;
  private targetX: number = 0.5;
  private targetY: number = 0.5;
  private readonly smoothFactor: number = 0.1;
  private lastUpdate: number = 0;
  private readonly pollInterval: number = 16;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.videoElement = document.getElementById('cameraStream') as HTMLVideoElement | null;
    this.setupMouseInput();
    this.tryInitCamera();
  }

  private setupMouseInput(): void {
    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.targetX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.targetY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      this.mode = 'mouse';
    });
  }

  private async tryInitCamera(): Promise<void> {
    if (!this.videoElement) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' }
      });
      this.videoElement.srcObject = stream;
      await this.videoElement.play();
      this.mode = 'camera';
    } catch (_err) {
      this.mode = 'mouse';
    }
  }

  private updateFromCamera(): void {
    if (!this.videoElement || this.videoElement.readyState < 2) return;
    try {
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      tempCanvas.width = 64;
      tempCanvas.height = 48;
      ctx.drawImage(this.videoElement, 0, 0, 64, 48);
      const imageData = ctx.getImageData(0, 0, 64, 48);
      const data = imageData.data;

      let totalX = 0;
      let totalY = 0;
      let count = 0;

      for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 64; x++) {
          const i = (y * 64 + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;
          if (brightness < 60) {
            totalX += x;
            totalY += y;
            count++;
          }
        }
      }

      if (count > 50) {
        const avgX = totalX / count;
        const avgY = totalY / count;
        this.targetX = 1 - (avgX / 64);
        this.targetY = avgY / 48;
        this.mode = 'camera';
      }
    } catch (_err) {
      // Fallback to mouse mode on error
    }
  }

  public update(timestamp: number): InputState {
    if (timestamp - this.lastUpdate >= this.pollInterval) {
      if (this.mode === 'camera') {
        this.updateFromCamera();
      }
      this.lastUpdate = timestamp;
    }

    this.currentX += (this.targetX - this.currentX) * this.smoothFactor;
    this.currentY += (this.targetY - this.currentY) * this.smoothFactor;

    return {
      x: this.currentX,
      y: this.currentY
    };
  }

  public getMode(): InputMode {
    return this.mode;
  }
}
