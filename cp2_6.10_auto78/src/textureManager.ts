export interface TextureInfo {
  id: string;
  name: string;
  image: HTMLImageElement;
  thumbnail: HTMLCanvasElement;
}

export type TextureSelectHandler = (texture: TextureInfo) => void;

type TextureGenerator = (ctx: CanvasRenderingContext2D, size: number) => void;

const TEXTURE_DEFINITIONS: Array<{ id: string; name: string; generator: TextureGenerator }> = [
  {
    id: 'burlap',
    name: '粗麻布',
    generator: generateBurlapTexture
  },
  {
    id: 'watercolor',
    name: '水彩纸',
    generator: generateWatercolorTexture
  },
  {
    id: 'brushed-metal',
    name: '金属拉丝',
    generator: generateBrushedMetalTexture
  },
  {
    id: 'wood',
    name: '木纹',
    generator: generateWoodTexture
  },
  {
    id: 'marble',
    name: '大理石',
    generator: generateMarbleTexture
  },
  {
    id: 'noise',
    name: '噪点',
    generator: generateNoiseTexture
  },
  {
    id: 'grid',
    name: '网格',
    generator: generateGridTexture
  },
  {
    id: 'dots',
    name: '圆点',
    generator: generateDotsTexture
  },
  {
    id: 'leather',
    name: '皮革',
    generator: generateLeatherTexture
  },
  {
    id: 'fabric',
    name: '织纹',
    generator: generateFabricTexture
  }
];

export class TextureManager {
  private textures: TextureInfo[] = [];
  private textureSize: number = 512;
  private thumbnailSize: number = 80;
  private listeners: Set<TextureSelectHandler> = new Set();
  private loadingPromise: Promise<void> | null = null;

  constructor() {}

  public async loadTextures(): Promise<TextureInfo[]> {
    if (this.loadingPromise) {
      await this.loadingPromise;
      return this.textures;
    }

    this.loadingPromise = this.doLoadTextures();
    await this.loadingPromise;
    return this.textures;
  }

  public getTextures(): TextureInfo[] {
    return this.textures;
  }

  public getTextureById(id: string): TextureInfo | undefined {
    return this.textures.find((t) => t.id === id);
  }

  public onTextureSelected(handler: TextureSelectHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  public selectTexture(texture: TextureInfo): void {
    this.listeners.forEach((handler) => handler(texture));
  }

  private async doLoadTextures(): Promise<void> {
    const loaded: TextureInfo[] = [];

    for (const def of TEXTURE_DEFINITIONS) {
      const fullCanvas = this.generateFullTexture(def.generator);
      const thumbCanvas = this.generateThumbnail(def.generator);
      const image = await this.canvasToImage(fullCanvas);

      loaded.push({
        id: def.id,
        name: def.name,
        image,
        thumbnail: thumbCanvas
      });
    }

    this.textures = loaded;
  }

  private generateFullTexture(generator: TextureGenerator): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.textureSize;
    canvas.height = this.textureSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    generator(ctx, this.textureSize);
    return canvas;
  }

  private generateThumbnail(generator: TextureGenerator): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.thumbnailSize;
    canvas.height = this.thumbnailSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    generator(ctx, this.thumbnailSize);
    return canvas;
  }

  private canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to convert canvas to image'));
      img.src = canvas.toDataURL('image/png');
    });
  }
}

function generateBurlapTexture(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#c4a77d';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 1;

  for (let i = 0; i < size; i += 3) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    for (let y = 0; y < size; y += 6) {
      const xOffset = Math.random() * 2 - 1;
      ctx.lineTo(i + xOffset, y + 3);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    for (let x = 0; x < size; x += 6) {
      const yOffset = Math.random() * 2 - 1;
      ctx.lineTo(x + 3, i + yOffset);
    }
    ctx.stroke();
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 30;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}

function generateWatercolorTexture(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#faf3e0';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 50; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 30 + Math.random() * 100;
    const hue = 180 + Math.random() * 60;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `hsla(${hue}, 50%, 70%, ${0.05 + Math.random() * 0.1})`);
    gradient.addColorStop(1, 'hsla(0, 0%, 100%, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 15;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}

function generateBrushedMetalTexture(ctx: CanvasRenderingContext2D, size: number): void {
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#a0a0a0');
  gradient.addColorStop(0.5, '#d0d0d0');
  gradient.addColorStop(1, '#a0a0a0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 2) {
    const offset = Math.random() * 2 - 1;
    ctx.beginPath();
    ctx.moveTo(0, i + offset);
    ctx.lineTo(size, i + offset + Math.random() * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 1; i < size; i += 2) {
    const offset = Math.random() * 2 - 1;
    ctx.beginPath();
    ctx.moveTo(0, i + offset);
    ctx.lineTo(size, i + offset + Math.random() * 2);
    ctx.stroke();
  }

  const highlight = ctx.createRadialGradient(
    size * 0.3,
    size * 0.2,
    0,
    size * 0.3,
    size * 0.2,
    size * 0.6
  );
  highlight.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlight;
  ctx.fillRect(0, 0, size, size);
}

function generateWoodTexture(ctx: CanvasRenderingContext2D, size: number): void {
  const gradient = ctx.createLinearGradient(0, 0, size, 0);
  gradient.addColorStop(0, '#8b5a2b');
  gradient.addColorStop(0.5, '#a0522d');
  gradient.addColorStop(1, '#8b5a2b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 40; i++) {
    const y = Math.random() * size;
    const height = 2 + Math.random() * 6;
    const alpha = 0.05 + Math.random() * 0.15;
    ctx.fillStyle = `rgba(60, 30, 10, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, y);

    for (let x = 0; x <= size; x += 10) {
      const waveOffset = Math.sin(x * 0.02 + i) * 3;
      ctx.lineTo(x, y + waveOffset);
    }

    for (let x = size; x >= 0; x -= 10) {
      const waveOffset = Math.sin(x * 0.02 + i) * 3;
      ctx.lineTo(x, y + waveOffset + height);
    }
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < 5; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 15 + Math.random() * 40;
    ctx.strokeStyle = 'rgba(50, 25, 10, 0.3)';
    ctx.lineWidth = 1 + Math.random() * 2;
    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      ctx.ellipse(x, y, r + ring * 5, (r + ring * 5) * 0.5, Math.random(), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function generateMarbleTexture(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#f0ece2';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 15; i++) {
    ctx.strokeStyle = `rgba(100, 100, 110, ${0.1 + Math.random() * 0.2})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.beginPath();

    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);

    for (let j = 0; j < 20; j++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 60;
      x += Math.cos(angle) * distance;
      y += Math.sin(angle) * distance;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 5; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 20 + Math.random() * 60;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(180, 180, 190, 0.3)');
    gradient.addColorStop(1, 'rgba(180, 180, 190, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 8;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}

function generateNoiseTexture(ctx: CanvasRenderingContext2D, size: number): void {
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 220;
  }
  ctx.putImageData(imageData, 0, 0);
}

function generateGridTexture(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#2a2a3e';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  const gridSize = size / 16;

  for (let x = 0; x <= size; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  for (let y = 0; y <= size; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  const bigGrid = gridSize * 4;
  for (let x = 0; x <= size; x += bigGrid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y <= size; y += bigGrid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
}

function generateDotsTexture(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#e8d5c4';
  ctx.fillRect(0, 0, size, size);

  const spacing = size / 12;
  const dotRadius = spacing * 0.3;

  ctx.fillStyle = '#8b4513';
  for (let y = spacing / 2; y < size; y += spacing) {
    for (let x = spacing / 2; x < size; x += spacing) {
      const offsetY = (Math.floor((y - spacing / 2) / spacing) % 2) * (spacing / 2);
      ctx.beginPath();
      ctx.arc(x + offsetY, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function generateLeatherTexture(ctx: CanvasRenderingContext2D, size: number): void {
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size * 0.7
  );
  gradient.addColorStop(0, '#8b5a3c');
  gradient.addColorStop(1, '#5c3a21');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 3;
    const alpha = Math.random() * 0.15;
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 2;
    const alpha = Math.random() * 0.1;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function generateFabricTexture(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#6b8e23';
  ctx.fillRect(0, 0, size, size);

  const threadWidth = 4;
  const threadGap = 2;

  for (let i = 0; i < size; i += threadWidth + threadGap) {
    const gradient = ctx.createLinearGradient(i, 0, i + threadWidth, 0);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    ctx.fillStyle = gradient;
    ctx.fillRect(i, 0, threadWidth, size);
  }

  for (let i = 0; i < size; i += threadWidth + threadGap) {
    const gradient = ctx.createLinearGradient(0, i, 0, i + threadWidth);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.08)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, i, size, threadWidth);
  }
}
