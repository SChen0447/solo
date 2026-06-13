export interface Rock {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

export interface Crack {
  x: number;
  y: number;
  length: number;
  angle: number;
  segments: { x: number; y: number }[];
}

export class Terrain {
  public width: number;
  public height: number;
  public rocks: Rock[] = [];
  public cracks: Crack[] = [];
  public gateOpen: boolean = false;
  public gateProgress: number = 0;
  public gateX: number = 0;
  public gateY: number = 0;
  public gateWidth: number = 120;
  public gateHeight: number = 150;
  public gearRotation: number = 0;
  
  private noiseCanvas: HTMLCanvasElement;
  private noiseCtx: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.noiseCanvas = document.createElement('canvas');
    this.noiseCtx = this.noiseCanvas.getContext('2d')!;
    this.generateTerrain();
  }

  private generateNoise(width: number, height: number): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const noise = Math.random();
        data[idx] = noise * 255;
        data[idx + 1] = noise * 255;
        data[idx + 2] = noise * 255;
        data[idx + 3] = 255;
      }
    }

    return imageData;
  }

  private smoothNoise(noise: ImageData, scale: number): ImageData {
    const width = noise.width;
    const height = noise.height;
    const result = new ImageData(width, height);
    const src = noise.data;
    const dst = result.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let sum = 0;
        let count = 0;

        for (let dy = -scale; dy <= scale; dy++) {
          for (let dx = -scale; dx <= scale; dx++) {
            const nx = Math.min(Math.max(x + dx, 0), width - 1);
            const ny = Math.min(Math.max(y + dy, 0), height - 1);
            const nidx = (ny * width + nx) * 4;
            sum += src[nidx];
            count++;
          }
        }

        const val = sum / count;
        dst[idx] = val;
        dst[idx + 1] = val;
        dst[idx + 2] = val;
        dst[idx + 3] = 255;
      }
    }

    return result;
  }

  public generateTerrain(): void {
    const noiseWidth = Math.ceil(this.width / 4);
    const noiseHeight = Math.ceil(this.height / 4);
    const baseNoise = this.generateNoise(noiseWidth, noiseHeight);
    const smooth = this.smoothNoise(baseNoise, 2);

    this.noiseCanvas.width = this.width;
    this.noiseCanvas.height = this.height;
    const ctx = this.noiseCtx;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#2a2a3e');
    gradient.addColorStop(0.5, '#3d2d2d');
    gradient.addColorStop(1, '#4a2c1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.globalAlpha = 0.15;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = noiseWidth;
    tempCanvas.height = noiseHeight;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(smooth, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0, this.width, this.height);
    ctx.globalAlpha = 1;

    this.rocks = [];
    const rockCount = Math.floor(this.height / 80);
    for (let i = 0; i < rockCount; i++) {
      const rock: Rock = {
        x: Math.random() * this.width * 0.8 + this.width * 0.1,
        y: Math.random() * this.height * 0.9 + this.height * 0.05,
        width: 20 + Math.random() * 50,
        height: 15 + Math.random() * 35,
        depth: 0.3 + Math.random() * 0.5
      };
      this.rocks.push(rock);
    }

    this.cracks = [];
    const crackCount = Math.floor(this.height / 120);
    for (let i = 0; i < crackCount; i++) {
      const startX = Math.random() * this.width;
      const startY = Math.random() * this.height * 0.9;
      const segments: { x: number; y: number }[] = [];
      let cx = startX;
      let cy = startY;
      const segCount = 3 + Math.floor(Math.random() * 4);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      
      for (let j = 0; j < segCount; j++) {
        const len = 15 + Math.random() * 30;
        cx += Math.cos(angle + (Math.random() - 0.5) * 0.5) * len;
        cy += Math.sin(angle + (Math.random() - 0.5) * 0.5) * len;
        segments.push({ x: cx, y: cy });
      }

      this.cracks.push({
        x: startX,
        y: startY,
        length: 50 + Math.random() * 80,
        angle,
        segments
      });
    }

    this.gateX = this.width / 2 - this.gateWidth / 2;
    this.gateY = 10;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.generateTerrain();
  }

  public openGate(): void {
    this.gateOpen = true;
  }

  public update(dt: number): void {
    if (this.gateOpen && this.gateProgress < 1) {
      this.gateProgress += dt * 0.3;
      if (this.gateProgress > 1) this.gateProgress = 1;
    }
    this.gearRotation += dt * 2;
  }

  public draw(ctx: CanvasRenderingContext2D, cameraY: number): void {
    ctx.drawImage(this.noiseCanvas, 0, -cameraY);

    ctx.save();
    ctx.translate(0, -cameraY);

    for (const rock of this.rocks) {
      const gradient = ctx.createRadialGradient(
        rock.x + rock.width * 0.3, rock.y + rock.height * 0.3, 0,
        rock.x + rock.width * 0.5, rock.y + rock.height * 0.5, rock.width * 0.6
      );
      gradient.addColorStop(0, `rgba(80, 70, 60, ${0.6 + rock.depth * 0.3})`);
      gradient.addColorStop(1, `rgba(40, 35, 30, ${0.3 + rock.depth * 0.2})`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(rock.x + rock.width / 2, rock.y + rock.height / 2, rock.width / 2, rock.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + rock.depth * 0.05})`;
      ctx.beginPath();
      ctx.ellipse(rock.x + rock.width * 0.35, rock.y + rock.height * 0.3, rock.width * 0.2, rock.height * 0.1, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(20, 15, 10, 0.6)';
    ctx.lineWidth = 1.5;
    for (const crack of this.cracks) {
      ctx.beginPath();
      ctx.moveTo(crack.x, crack.y);
      for (const seg of crack.segments) {
        ctx.lineTo(seg.x, seg.y);
      }
      ctx.stroke();
    }

    this.drawGate(ctx);

    ctx.restore();
  }

  private drawGate(ctx: CanvasRenderingContext2D): void {
    const x = this.gateX;
    const y = this.gateY;
    const w = this.gateWidth;
    const h = this.gateHeight;
    const openOffset = this.gateProgress * (h * 0.8);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x - 10, y - 10, w + 20, h + 20);

    const halfW = w / 2;
    const topY = y + openOffset;

    const leftGradient = ctx.createLinearGradient(x, y, x + halfW, y);
    leftGradient.addColorStop(0, '#3a3a4e');
    leftGradient.addColorStop(0.5, '#5a5a6e');
    leftGradient.addColorStop(1, '#3a3a4e');
    ctx.fillStyle = leftGradient;
    ctx.fillRect(x, topY, halfW, h - openOffset);

    const rightGradient = ctx.createLinearGradient(x + halfW, y, x + w, y);
    rightGradient.addColorStop(0, '#3a3a4e');
    rightGradient.addColorStop(0.5, '#5a5a6e');
    rightGradient.addColorStop(1, '#3a3a4e');
    ctx.fillStyle = rightGradient;
    ctx.fillRect(x + halfW, topY, halfW, h - openOffset);

    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#e94560';
    ctx.shadowBlur = 10;
    ctx.strokeRect(x, topY, w, h - openOffset);
    ctx.shadowBlur = 0;

    if (this.gateProgress > 0 && this.gateProgress < 1) {
      ctx.strokeStyle = 'rgba(233, 69, 96, 0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + halfW - 20, topY + 10 + i * 15);
        ctx.lineTo(x + halfW + 20, topY + 10 + i * 15);
        ctx.stroke();
      }
    }

    const gearX1 = x + 25;
    const gearX2 = x + w - 25;
    const gearY = topY + 30;
    const gearR = 12;

    this.drawGear(ctx, gearX1, gearY, gearR, this.gearRotation);
    this.drawGear(ctx, gearX2, gearY, gearR, -this.gearRotation);
  }

  private drawGear(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rotation: number): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    ctx.fillStyle = '#6a6a7e';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fill();

    const teeth = 8;
    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;
      ctx.fillStyle = '#5a5a6e';
      ctx.save();
      ctx.rotate(angle);
      ctx.fillRect(-3, -r, 6, r * 0.4);
      ctx.restore();
    }

    ctx.fillStyle = '#2a2a3e';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#e94560';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  public isAtGate(spiderY: number): boolean {
    return spiderY <= this.gateY + this.gateHeight && this.gateProgress >= 1;
  }

  public getBottomY(): number {
    return this.height - 50;
  }
}
