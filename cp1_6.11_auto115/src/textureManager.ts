import * as THREE from 'three';
import gsap from 'gsap';

export type TextureType = 'white' | 'kraft' | 'washi' | 'gold' | 'recycled' | 'colorful';

export interface TextureData {
  name: string;
  type: TextureType;
  texture: THREE.Texture;
}

export class TextureManager {
  private textureCache: Map<TextureType, THREE.Texture> = new Map();
  private canvasSize: number = 512;

  constructor() {
    this.preloadAllTextures();
  }

  private preloadAllTextures(): void {
    const types: TextureType[] = ['white', 'kraft', 'washi', 'gold', 'recycled', 'colorful'];
    for (const type of types) {
      this.getTexture(type);
    }
  }

  public getTexture(type: TextureType): THREE.Texture {
    if (this.textureCache.has(type)) {
      return this.textureCache.get(type)!;
    }

    const texture = this.generateTexture(type);
    this.textureCache.set(type, texture);
    return texture;
  }

  public generateTexture(type: TextureType): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = this.canvasSize;
    canvas.height = this.canvasSize;
    const ctx = canvas.getContext('2d')!;

    switch (type) {
      case 'white':
        this.generateWhitePaper(ctx);
        break;
      case 'kraft':
        this.generateKraftPaper(ctx);
        break;
      case 'washi':
        this.generateWashiPaper(ctx);
        break;
      case 'gold':
        this.generateGoldFoil(ctx);
        break;
      case 'recycled':
        this.generateRecycledPaper(ctx);
        break;
      case 'colorful':
        this.generateColorfulPaper(ctx);
        break;
      default:
        this.generateWhitePaper(ctx);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.needsUpdate = true;

    return texture;
  }

  public async applyTexture(
    mesh: THREE.Mesh,
    type: TextureType,
    duration: number = 0.3
  ): Promise<void> {
    const material = mesh.material as THREE.MeshStandardMaterial;
    const newTexture = this.getTexture(type);

    if (!material.map) {
      material.map = newTexture;
      material.needsUpdate = true;
      return;
    }

    const oldOpacity = material.opacity;
    const oldMap = material.map;

    await gsap.to(material, {
      opacity: 0,
      duration: duration * 0.5,
      ease: 'power2.in',
    });

    material.map = newTexture;
    material.needsUpdate = true;

    if (type === 'gold') {
      material.metalness = 0.8;
      material.roughness = 0.2;
    } else {
      material.metalness = 0.1;
      material.roughness = 0.8;
    }

    await gsap.to(material, {
      opacity: oldOpacity,
      duration: duration * 0.5,
      ease: 'power2.out',
    });

    if (oldMap && oldMap !== newTexture && !this.textureCache.has(type)) {
      oldMap.dispose();
    }
  }

  private generateWhitePaper(ctx: CanvasRenderingContext2D): void {
    const size = this.canvasSize;

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#fafafa');
    gradient.addColorStop(1, '#f0f0f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }

    ctx.putImageData(imageData, 0, 0);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.02)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const length = 10 + Math.random() * 30;
      const angle = Math.random() * Math.PI;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }
  }

  private generateKraftPaper(ctx: CanvasRenderingContext2D): void {
    const size = this.canvasSize;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7);
    gradient.addColorStop(0, '#d4a574');
    gradient.addColorStop(0.5, '#c9a66b');
    gradient.addColorStop(1, '#a67c52');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = this.perlinNoise(
        (i / 4) % size * 0.01,
        Math.floor((i / 4) / size) * 0.01
      ) * 20;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.9));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.7));
    }

    ctx.putImageData(imageData, 0, 0);

    ctx.strokeStyle = 'rgba(90, 60, 30, 0.15)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const length = 5 + Math.random() * 40;
      const angle = -Math.PI / 4 + (Math.random() * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(139, 90, 43, 0.1)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const length = 20 + Math.random() * 60;
      const angle = Math.random() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }
  }

  private generateWashiPaper(ctx: CanvasRenderingContext2D): void {
    const size = this.canvasSize;

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#f8f4eb');
    gradient.addColorStop(0.5, '#f5f0e6');
    gradient.addColorStop(1, '#e8dcc8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % size;
      const y = Math.floor((i / 4) / size);
      const noise = (this.perlinNoise(x * 0.02, y * 0.02) * 0.5 + 0.5) * 15;
      data[i] = Math.min(255, Math.max(0, data[i] - noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] - noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] - noise * 0.8));
    }

    ctx.putImageData(imageData, 0, 0);

    const fiberColors = ['rgba(180, 160, 130, 0.12)', 'rgba(200, 180, 150, 0.08)', 'rgba(160, 140, 110, 0.1)'];
    for (let f = 0; f < 3; f++) {
      ctx.strokeStyle = fiberColors[f];
      ctx.lineWidth = 0.6 + f * 0.2;
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const length = 15 + Math.random() * 50;
        const angle = Math.random() * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(
          x + Math.cos(angle) * length * 0.3,
          y + Math.sin(angle) * length * 0.3 + (Math.random() - 0.5) * 10,
          x + Math.cos(angle) * length * 0.6,
          y + Math.sin(angle) * length * 0.6 + (Math.random() - 0.5) * 10,
          x + Math.cos(angle) * length,
          y + Math.sin(angle) * length
        );
        ctx.stroke();
      }
    }

    ctx.fillStyle = 'rgba(139, 115, 85, 0.05)';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 1 + Math.random() * 3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private generateGoldFoil(ctx: CanvasRenderingContext2D): void {
    const size = this.canvasSize;

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#ffec8b');
    gradient.addColorStop(0.25, '#ffd700');
    gradient.addColorStop(0.5, '#daa520');
    gradient.addColorStop(0.75, '#ffd700');
    gradient.addColorStop(1, '#b8860b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % size;
      const y = Math.floor((i / 4) / size);
      const noise1 = this.perlinNoise(x * 0.05, y * 0.05) * 40;
      const noise2 = this.perlinNoise(x * 0.2, y * 0.2) * 20;
      const totalNoise = noise1 + noise2;

      data[i] = Math.min(255, Math.max(0, data[i] + totalNoise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + totalNoise * 0.8));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + totalNoise * 0.3));
    }

    ctx.putImageData(imageData, 0, 0);

    ctx.fillStyle = 'rgba(255, 255, 200, 0.6)';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 0.5 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const w = 2 + Math.random() * 6;
      const h = 2 + Math.random() * 6;
      const angle = Math.random() * Math.PI;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }

    const highlightGradient = ctx.createRadialGradient(size * 0.3, size * 0.3, 0, size * 0.3, size * 0.3, size * 0.4);
    highlightGradient.addColorStop(0, 'rgba(255, 250, 220, 0.25)');
    highlightGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.fillRect(0, 0, size, size);
  }

  private generateRecycledPaper(ctx: CanvasRenderingContext2D): void {
    const size = this.canvasSize;

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#e5d8c0');
    gradient.addColorStop(0.5, '#d4c4a8');
    gradient.addColorStop(1, '#b8a888');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % size;
      const y = Math.floor((i / 4) / size);
      const noise = (this.perlinNoise(x * 0.03, y * 0.03) * 0.5 + 0.5) * 25;
      data[i] = Math.min(255, Math.max(0, data[i] - noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] - noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] - noise * 0.9));
    }

    ctx.putImageData(imageData, 0, 0);

    const speckColors = [
      'rgba(100, 80, 60, 0.15)',
      'rgba(80, 100, 80, 0.12)',
      'rgba(120, 90, 70, 0.1)',
      'rgba(60, 50, 40, 0.18)',
    ];

    for (let s = 0; s < 4; s++) {
      ctx.fillStyle = speckColors[s];
      for (let i = 0; i < 150; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 0.5 + Math.random() * 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = 'rgba(90, 70, 50, 0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const length = 3 + Math.random() * 15;
      const angle = Math.random() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(150, 130, 100, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const w = 20 + Math.random() * 40;
      const h = 20 + Math.random() * 40;
      ctx.strokeRect(x, y, w, h);
    }
  }

  private generateColorfulPaper(ctx: CanvasRenderingContext2D): void {
    const size = this.canvasSize;

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    const colors = ['#ff6b6b', '#ffa06b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b59b6'];
    for (let i = 0; i < colors.length; i++) {
      gradient.addColorStop(i / (colors.length - 1), colors[i]);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 12;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }

    ctx.putImageData(imageData, 0, 0);

    ctx.globalAlpha = 0.15;
    for (let c = 0; c < colors.length; c++) {
      ctx.fillStyle = colors[c];
      for (let i = 0; i < 15; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 10 + Math.random() * 30;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 5; i++) {
      const gradient = ctx.createRadialGradient(
        Math.random() * size,
        Math.random() * size,
        0,
        Math.random() * size,
        Math.random() * size,
        100 + Math.random() * 150
      );
      gradient.addColorStop(0, colors[Math.floor(Math.random() * colors.length)]);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }
    ctx.globalAlpha = 1;

    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 8; i++) {
      const x1 = Math.random() * size;
      const y1 = Math.random() * size;
      const x2 = Math.random() * size;
      const y2 = Math.random() * size;

      const lineGradient = ctx.createLinearGradient(x1, y1, x2, y2);
      lineGradient.addColorStop(0, colors[i % colors.length]);
      lineGradient.addColorStop(1, colors[(i + 2) % colors.length]);

      ctx.strokeStyle = lineGradient;
      ctx.lineWidth = 3 + Math.random() * 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const textureGradient = ctx.createLinearGradient(0, 0, size, size);
    textureGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    textureGradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
    ctx.fillStyle = textureGradient;
    ctx.fillRect(0, 0, size, size);
  }

  private perlinNoise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.pseudoRandom(X + this.pseudoRandom(Y));
    const ab = this.pseudoRandom(X + this.pseudoRandom(Y + 1));
    const ba = this.pseudoRandom(X + 1 + this.pseudoRandom(Y));
    const bb = this.pseudoRandom(X + 1 + this.pseudoRandom(Y + 1));

    const x1 = this.lerp(aa, ba, u);
    const x2 = this.lerp(ab, bb, u);

    return this.lerp(x1, x2, v) * 2 - 1;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private pseudoRandom(n: number): number {
    const p = [
      151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
      140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
      247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
      57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
      74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
      60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
      65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
      200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
      52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
      207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
      119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
      129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
      218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
      81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
      184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
      222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
    ];
    return p[n % 256] / 255;
  }

  public dispose(): void {
    this.textureCache.forEach((texture) => {
      texture.dispose();
    });
    this.textureCache.clear();
  }
}
