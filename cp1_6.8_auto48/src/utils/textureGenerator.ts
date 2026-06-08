import { TextureType } from '../types';

const TEXTURE_SIZE = 256;

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  return canvas;
}

function drawPencil(ctx: CanvasRenderingContext2D): void {
  const w = TEXTURE_SIZE;
  const h = TEXTURE_SIZE;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  
  ctx.strokeStyle = 'rgba(74, 74, 74, 0.6)';
  ctx.lineWidth = 1;
  
  for (let i = 0; i < 80; i++) {
    const y = (i / 80) * h + (Math.random() - 0.5) * 4;
    const offset = Math.sin(i * 0.3) * 10;
    ctx.globalAlpha = 0.3 + Math.random() * 0.4;
    ctx.beginPath();
    ctx.moveTo(offset, y);
    ctx.lineTo(w - offset, y + (Math.random() - 0.5) * 3);
    ctx.stroke();
  }
  
  for (let i = 0; i < 30; i++) {
    const startX = Math.random() * w;
    const startY = Math.random() * h;
    const len = 20 + Math.random() * 60;
    const angle = (Math.random() - 0.5) * 0.3;
    ctx.globalAlpha = 0.2 + Math.random() * 0.3;
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + Math.cos(angle) * len, startY + Math.sin(angle) * len);
    ctx.stroke();
  }
  
  ctx.globalAlpha = 1;
}

function drawWatercolor(ctx: CanvasRenderingContext2D): void {
  const w = TEXTURE_SIZE;
  const h = TEXTURE_SIZE;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  
  const blobs = [
    { x: 80, y: 80, r: 60, color: 'rgba(91, 155, 213, 0.4)' },
    { x: 160, y: 100, r: 50, color: 'rgba(91, 155, 213, 0.5)' },
    { x: 120, y: 160, r: 55, color: 'rgba(91, 155, 213, 0.35)' },
    { x: 200, y: 180, r: 40, color: 'rgba(91, 155, 213, 0.45)' },
    { x: 60, y: 200, r: 45, color: 'rgba(91, 155, 213, 0.3)' },
  ];
  
  blobs.forEach(blob => {
    const gradient = ctx.createRadialGradient(
      blob.x, blob.y, 0,
      blob.x, blob.y, blob.r
    );
    gradient.addColorStop(0, blob.color);
    gradient.addColorStop(0.7, blob.color.replace(/[\d.]+\)$/, '0.15)'));
    gradient.addColorStop(1, 'rgba(91, 155, 213, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    const points = 12;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = blob.r * (0.85 + Math.sin(i * 3.7) * 0.15 + Math.sin(i * 7.3) * 0.08);
      const x = blob.x + Math.cos(angle) * r;
      const y = blob.y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  });
}

function drawOil(ctx: CanvasRenderingContext2D): void {
  const w = TEXTURE_SIZE;
  const h = TEXTURE_SIZE;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  
  const baseColor = 'rgba(212, 165, 116, ';
  
  for (let i = 0; i < 25; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const rw = 15 + Math.random() * 35;
    const rh = 10 + Math.random() * 25;
    const rotation = Math.random() * Math.PI;
    const alpha = 0.3 + Math.random() * 0.5;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    const gradient = ctx.createLinearGradient(-rw/2, -rh/2, rw/2, rh/2);
    gradient.addColorStop(0, baseColor + (alpha + 0.2) + ')');
    gradient.addColorStop(0.5, baseColor + alpha + ')');
    gradient.addColorStop(1, baseColor + (alpha - 0.15) + ')');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, rw/2, rh/2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 2 + Math.random() * 4;
    ctx.fillStyle = `rgba(255, 230, 200, ${0.3 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCharcoal(ctx: CanvasRenderingContext2D): void {
  const w = TEXTURE_SIZE;
  const h = TEXTURE_SIZE;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const size = Math.random() * 2.5;
    const alpha = 0.1 + Math.random() * 0.3;
    ctx.fillStyle = `rgba(45, 45, 45, ${alpha})`;
    ctx.fillRect(x, y, size, size * (0.5 + Math.random()));
  }
  
  ctx.globalCompositeOperation = 'source-over';
  
  for (let i = 0; i < 12; i++) {
    const startX = Math.random() * w;
    const startY = Math.random() * h;
    const len = 40 + Math.random() * 100;
    const angle = Math.random() * Math.PI * 2;
    const width = 3 + Math.random() * 8;
    
    ctx.strokeStyle = `rgba(45, 45, 45, ${0.2 + Math.random() * 0.3})`;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    const midX = startX + Math.cos(angle) * len * 0.5 + (Math.random() - 0.5) * 15;
    const midY = startY + Math.sin(angle) * len * 0.5 + (Math.random() - 0.5) * 15;
    const endX = startX + Math.cos(angle) * len + (Math.random() - 0.5) * 20;
    const endY = startY + Math.sin(angle) * len + (Math.random() - 0.5) * 20;
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
  }
}

function drawMarker(ctx: CanvasRenderingContext2D): void {
  const w = TEXTURE_SIZE;
  const h = TEXTURE_SIZE;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  
  const color = 'rgba(231, 76, 60, ';
  
  ctx.fillStyle = color + '0.7)';
  ctx.fillRect(20, 30, w - 40, h - 60);
  
  for (let i = 0; i < 10; i++) {
    const x = 15 + i * (w - 30) / 10;
    ctx.fillStyle = color + '0.4)';
    ctx.fillRect(x - 3, 25, 6, h - 50);
  }
  
  for (let i = 0; i < 8; i++) {
    const y = 25 + i * (h - 50) / 8;
    ctx.fillStyle = color + '0.25)';
    ctx.fillRect(20, y - 2, w - 40, 4);
  }
  
  for (let i = 0; i < 50; i++) {
    const x = 20 + Math.random() * (w - 40);
    const y = 30 + Math.random() * (h - 60);
    const size = 1 + Math.random() * 3;
    ctx.fillStyle = `rgba(200, 60, 50, ${0.2 + Math.random() * 0.3})`;
    ctx.fillRect(x, y, size, size);
  }
}

function drawAirbrush(ctx: CanvasRenderingContext2D): void {
  const w = TEXTURE_SIZE;
  const h = TEXTURE_SIZE;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  
  const centerX = w / 2;
  const centerY = h / 2;
  
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 10,
    centerX, centerY, 110
  );
  gradient.addColorStop(0, 'rgba(155, 89, 182, 0.7)');
  gradient.addColorStop(0.3, 'rgba(155, 89, 182, 0.5)');
  gradient.addColorStop(0.6, 'rgba(155, 89, 182, 0.25)');
  gradient.addColorStop(1, 'rgba(155, 89, 182, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  
  for (let i = 0; i < 3000; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.pow(Math.random(), 0.6) * 110;
    const x = centerX + Math.cos(angle) * dist;
    const y = centerY + Math.sin(angle) * dist;
    const size = 0.5 + Math.random() * 1.5;
    const alpha = 0.1 + Math.random() * 0.4;
    ctx.fillStyle = `rgba(120, 60, 150, ${alpha})`;
    ctx.fillRect(x, y, size, size);
  }
}

export function generateTexture(type: TextureType): HTMLCanvasElement {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d')!;
  
  switch (type) {
    case 'pencil': drawPencil(ctx); break;
    case 'watercolor': drawWatercolor(ctx); break;
    case 'oil': drawOil(ctx); break;
    case 'charcoal': drawCharcoal(ctx); break;
    case 'marker': drawMarker(ctx); break;
    case 'airbrush': drawAirbrush(ctx); break;
  }
  
  return canvas;
}

const textureCache: Partial<Record<TextureType, HTMLCanvasElement>> = {};

export function getTextureCanvas(type: TextureType): HTMLCanvasElement {
  if (!textureCache[type]) {
    textureCache[type] = generateTexture(type);
  }
  return textureCache[type]!;
}

export function getColoredTexture(type: TextureType, color: string): HTMLCanvasElement {
  const baseCanvas = getTextureCanvas(type);
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  
  ctx.drawImage(baseCanvas, 0, 0);
  
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  
  return canvas;
}
