import * as THREE from 'three';

export interface EarthConfig {
  radius: number;
  rotationSpeed: number;
}

export class Earth {
  public mesh: THREE.Mesh;
  private config: EarthConfig;
  private isRotating: boolean = true;

  constructor(config: EarthConfig) {
    this.config = config;
    this.mesh = this.createEarth();
  }

  private createEarth(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.config.radius, 128, 128);
    const canvas = this.createEarthTexture();
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;

    const material = new THREE.MeshPhongMaterial({
      map: texture,
      specular: new THREE.Color(0x333333),
      shininess: 15
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI;
    return mesh;
  }

  private createEarthTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGradient.addColorStop(0, '#0a2a4a');
    oceanGradient.addColorStop(0.5, '#1a4a7a');
    oceanGradient.addColorStop(1, '#0a2a4a');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.drawContinent(ctx, 0.1, 0.2, 0.25, 0.35, '#2d5a3d');
    this.drawContinent(ctx, 0.38, 0.15, 0.18, 0.3, '#3d6a4d');
    this.drawContinent(ctx, 0.6, 0.1, 0.35, 0.45, '#4d7a5d');
    this.drawContinent(ctx, 0.15, 0.65, 0.2, 0.25, '#8b6f47');
    this.drawContinent(ctx, 0.45, 0.6, 0.1, 0.15, '#6b4a2d');
    this.drawContinent(ctx, 0.7, 0.7, 0.15, 0.15, '#5a8a5a');
    this.drawContinent(ctx, 0.05, 0.05, 0.12, 0.1, '#3d5a3d');
    this.drawContinent(ctx, 0.85, 0.15, 0.1, 0.12, '#2d4a2d');

    this.drawLatitudeLines(ctx, canvas.width, canvas.height);

    return canvas;
  }

  private drawContinent(
    ctx: CanvasRenderingContext2D,
    xRatio: number,
    yRatio: number,
    wRatio: number,
    hRatio: number,
    color: string
  ): void {
    const canvas = ctx.canvas;
    const cx = xRatio * canvas.width;
    const cy = yRatio * canvas.height;
    const w = wRatio * canvas.width;
    const h = hRatio * canvas.height;

    ctx.beginPath();
    const points = 24;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const noise = Math.sin(angle * 3.7) * 0.15 + Math.cos(angle * 5.3) * 0.1;
      const radiusX = (w / 2) * (1 + noise * 0.4);
      const radiusY = (h / 2) * (1 + noise * 0.4);
      const x = cx + Math.cos(angle) * radiusX;
      const y = cy + Math.sin(angle) * radiusY;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) / 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, this.shadeColor(color, -20));
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = this.shadeColor(color, -30);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawLatitudeLines(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = -60; i <= 60; i += 30) {
      const y = (0.5 - i / 180) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  private shadeColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
  }

  public setRotating(enabled: boolean): void {
    this.isRotating = enabled;
  }

  public update(delta: number): void {
    if (this.isRotating) {
      this.mesh.rotation.y += this.config.rotationSpeed * delta;
    }
  }

  public getRadius(): number {
    return this.config.radius;
  }
}
