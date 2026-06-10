export interface LightSource {
  x: number;
  y: number;
  angle: number;
  spread: number;
  range: number;
  flickerPhase: number;
  flickerSpeed: number;
  type: 'torch' | 'lantern';
}

export class LightingSystem {
  private lights: LightSource[] = [];
  private roomWidth: number;
  private roomHeight: number;
  private noiseCanvas: HTMLCanvasElement;
  private noiseCtx: CanvasRenderingContext2D;
  private noiseOffset = 0;
  private time = 0;

  constructor(roomWidth: number, roomHeight: number) {
    this.roomWidth = roomWidth;
    this.roomHeight = roomHeight;

    this.noiseCanvas = document.createElement('canvas');
    this.noiseCanvas.width = roomWidth;
    this.noiseCanvas.height = roomHeight;
    this.noiseCtx = this.noiseCanvas.getContext('2d')!;
    this.generateNoise();

    this.initLights();
  }

  private initLights(): void {
    this.lights = [
      { x: 150, y: 120, angle: Math.PI / 2, spread: Math.PI / 2.5, range: 220, flickerPhase: 0, flickerSpeed: 2.3, type: 'torch' },
      { x: 400, y: 100, angle: Math.PI / 2, spread: Math.PI / 3, range: 200, flickerPhase: 1.5, flickerSpeed: 1.8, type: 'lantern' },
      { x: 650, y: 120, angle: Math.PI / 2, spread: Math.PI / 2.5, range: 230, flickerPhase: 3.0, flickerSpeed: 2.1, type: 'torch' },
      { x: 900, y: 100, angle: Math.PI / 2, spread: Math.PI / 3, range: 190, flickerPhase: 0.8, flickerSpeed: 2.5, type: 'lantern' },
      { x: 1150, y: 120, angle: Math.PI / 2, spread: Math.PI / 2.5, range: 210, flickerPhase: 2.2, flickerSpeed: 1.9, type: 'torch' },
    ];
  }

  private generateNoise(): void {
    const img = this.noiseCtx.createImageData(this.roomWidth, this.roomHeight);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 8;
    }
    this.noiseCtx.putImageData(img, 0, 0);
  }

  update(dt: number): void {
    this.time += dt;
    this.noiseOffset += dt * 20;

    for (const light of this.lights) {
      light.angle = Math.PI / 2 + Math.sin(this.time * light.flickerSpeed + light.flickerPhase) * 0.08;
      light.spread = (light.type === 'torch' ? Math.PI / 2.5 : Math.PI / 3) +
                     Math.sin(this.time * light.flickerSpeed * 1.3 + light.flickerPhase) * 0.05;
    }
  }

  isInShadow(x: number, y: number): boolean {
    for (const light of this.lights) {
      const dx = x - light.x;
      const dy = y - light.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > light.range * 1.1) continue;

      const angleTo = Math.atan2(dy, dx);
      let angleDiff = angleTo - light.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) < light.spread / 2 && dist < light.range) {
        const intensity = 1 - (dist / light.range);
        if (intensity > 0.25) return false;
      }
    }
    return true;
  }

  getLightIntensity(x: number, y: number): number {
    let maxIntensity = 0;
    for (const light of this.lights) {
      const dx = x - light.x;
      const dy = y - light.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > light.range) continue;

      const angleTo = Math.atan2(dy, dx);
      let angleDiff = angleTo - light.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) < light.spread / 2) {
        const angleFactor = 1 - Math.abs(angleDiff) / (light.spread / 2);
        const distFactor = 1 - dist / light.range;
        const intensity = angleFactor * distFactor;
        maxIntensity = Math.max(maxIntensity, intensity);
      }
    }
    return maxIntensity;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#0A0A1A';
    ctx.fillRect(0, 0, this.roomWidth, this.roomHeight);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const light of this.lights) {
      const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.range);
      gradient.addColorStop(0, 'rgba(255, 208, 128, 0.85)');
      gradient.addColorStop(0.3, 'rgba(255, 180, 80, 0.5)');
      gradient.addColorStop(0.6, 'rgba(255, 150, 50, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 120, 30, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(light.x, light.y);
      ctx.arc(light.x, light.y, light.range, light.angle - light.spread / 2, light.angle + light.spread / 2);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = gradient;
      ctx.fillRect(light.x - light.range, light.y - light.range, light.range * 2, light.range * 2);
      ctx.restore();
    }

    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.06;
    const ox = (this.noiseOffset % 64) | 0;
    const oy = ((this.noiseOffset * 0.7) % 64) | 0;
    for (let y = -64; y < this.roomHeight; y += 64) {
      for (let x = -64; x < this.roomWidth; x += 64) {
        ctx.drawImage(this.noiseCanvas, ox, oy, 64, 64, x, y, 64, 64);
      }
    }
    ctx.restore();

    for (const light of this.lights) {
      this.renderLightSource(ctx, light);
    }
  }

  private renderLightSource(ctx: CanvasRenderingContext2D, light: LightSource): void {
    if (light.type === 'torch') {
      ctx.fillStyle = '#3A2A1A';
      ctx.fillRect(light.x - 4, light.y, 8, 25);
      const flicker = 1 + Math.sin(this.time * 15 + light.flickerPhase) * 0.2;
      ctx.fillStyle = '#FF8833';
      ctx.beginPath();
      ctx.ellipse(light.x, light.y - 5, 6 * flicker, 12 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFD080';
      ctx.beginPath();
      ctx.ellipse(light.x, light.y - 3, 3 * flicker, 7 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#2A2A2A';
      ctx.fillRect(light.x - 3, light.y - 15, 6, 5);
      ctx.strokeStyle = '#3A3A3A';
      ctx.lineWidth = 2;
      ctx.strokeRect(light.x - 10, light.y - 10, 20, 25);
      const flicker = 0.9 + Math.sin(this.time * 8 + light.flickerPhase) * 0.1;
      ctx.fillStyle = `rgba(255, 208, 128, ${flicker})`;
      ctx.fillRect(light.x - 7, light.y - 7, 14, 19);
    }
  }

  renderLightMap(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.roomWidth, this.roomHeight);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const light of this.lights) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(light.x, light.y);
      ctx.arc(light.x, light.y, light.range, light.angle - light.spread / 2, light.angle + light.spread / 2);
      ctx.closePath();
      ctx.fillStyle = '#FFF';
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  getLights(): LightSource[] {
    return this.lights;
  }
}
