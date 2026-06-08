import type { BackgroundType } from '@/types';
import { lightenColor, darkenColor } from './colorUtils';

export interface SceneCanvas {
  width: number;
  height: number;
}

const drawSkyGradient = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  topColor: string,
  bottomColor: string,
): void => {
  const gradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height * 0.6);
};

const drawClouds = (
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  color: string,
  count: number = 5,
): void => {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = (width / count) * i + Math.random() * 60 - 30;
    const cloudY = y + Math.random() * 40 - 20;
    const size = 30 + Math.random() * 40;

    ctx.beginPath();
    ctx.arc(x, cloudY, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, cloudY - size * 0.2, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size * 1.2, cloudY, size * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawSun = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
): void => {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.5, lightenColor(color, 0.3) + '80');
  gradient.addColorStop(1, color + '00');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
};

const drawMountains = (
  ctx: CanvasRenderingContext2D,
  width: number,
  baseY: number,
  height: number,
  color: string,
  layers: number = 3,
): void => {
  for (let layer = 0; layer < layers; layer++) {
    const layerY = baseY - (layers - layer - 1) * height * 0.3;
    const layerHeight = height * (0.5 + layer * 0.2);
    const layerColor = lightenColor(color, (layers - layer - 1) * 0.15);

    ctx.fillStyle = layerColor;
    ctx.beginPath();
    ctx.moveTo(0, layerY);

    const peaks = 5 + layer;
    for (let i = 0; i <= peaks; i++) {
      const x = (width / peaks) * i;
      const peakHeight = layerHeight * (0.6 + Math.sin(i * 1.5 + layer) * 0.4);
      ctx.lineTo(x, layerY - peakHeight);
    }

    ctx.lineTo(width, layerY);
    ctx.closePath();
    ctx.fill();
  }
};

const drawTrees = (
  ctx: CanvasRenderingContext2D,
  width: number,
  baseY: number,
  count: number,
  color: string,
): void => {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const treeHeight = 60 + Math.random() * 80;
    const treeWidth = 30 + Math.random() * 20;
    const y = baseY - treeHeight;

    ctx.fillStyle = darkenColor(color, 0.3);
    ctx.fillRect(x - 4, y + treeHeight * 0.7, 8, treeHeight * 0.3);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - treeWidth / 2, y + treeHeight * 0.7);
    ctx.lineTo(x + treeWidth / 2, y + treeHeight * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = lightenColor(color, 0.2);
    ctx.beginPath();
    ctx.moveTo(x, y + treeHeight * 0.1);
    ctx.lineTo(x - treeWidth / 3, y + treeHeight * 0.5);
    ctx.lineTo(x + treeWidth / 3, y + treeHeight * 0.5);
    ctx.closePath();
    ctx.fill();
  }
};

const drawWater = (
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  height: number,
  color: string,
): void => {
  const gradient = ctx.createLinearGradient(0, y, 0, y + height);
  gradient.addColorStop(0, lightenColor(color, 0.2));
  gradient.addColorStop(1, darkenColor(color, 0.2));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y, width, height);

  ctx.strokeStyle = lightenColor(color, 0.4) + '60';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const waveY = y + 20 + i * 15;
    ctx.beginPath();
    for (let x = 0; x < width; x += 10) {
      ctx.lineTo(x, waveY + Math.sin(x * 0.02 + i) * 3);
    }
    ctx.stroke();
  }
};

const drawStars = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
): void => {
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height * 0.6;
    const size = Math.random() * 2 + 0.5;
    const alpha = Math.random() * 0.5 + 0.5;

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

const drawMoon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void => {
  ctx.fillStyle = '#F5F5DC';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#E8E8C8';
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.2, radius * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + radius * 0.2, y + radius * 0.3, radius * 0.15, 0, Math.PI * 2);
  ctx.fill();
};

const drawCastle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): void => {
  ctx.fillStyle = color;

  ctx.fillRect(x - width * 0.3, y - height * 0.5, width * 0.6, height * 0.5);

  const towerWidth = width * 0.2;
  ctx.fillRect(x - width * 0.5, y - height * 0.8, towerWidth, height * 0.8);
  ctx.fillRect(x + width * 0.3, y - height * 0.8, towerWidth, height * 0.8);

  const mainTowerWidth = width * 0.25;
  ctx.fillRect(x - mainTowerWidth / 2, y - height, mainTowerWidth, height);

  const drawRoof = (rx: number, ry: number, rw: number, rh: number) => {
    ctx.fillStyle = darkenColor(color, 0.3);
    ctx.beginPath();
    ctx.moveTo(rx - rw / 2, ry);
    ctx.lineTo(rx, ry - rh);
    ctx.lineTo(rx + rw / 2, ry);
    ctx.closePath();
    ctx.fill();
  };

  drawRoof(x - width * 0.4, y - height * 0.8, towerWidth * 1.3, height * 0.2);
  drawRoof(x + width * 0.4, y - height * 0.8, towerWidth * 1.3, height * 0.2);
  drawRoof(x, y - height, mainTowerWidth * 1.3, height * 0.25);

  ctx.fillStyle = darkenColor(color, 0.5);
  ctx.fillRect(x - width * 0.08, y - height * 0.3, width * 0.16, height * 0.3);
};

const drawCactus = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  color: string,
): void => {
  ctx.fillStyle = color;
  ctx.fillRect(x - 8, y - height, 16, height);

  ctx.fillRect(x - 25, y - height * 0.7, 12, 8);
  ctx.fillRect(x - 25, y - height * 0.7 - 25, 8, 30);

  ctx.fillRect(x + 13, y - height * 0.5, 12, 8);
  ctx.fillRect(x + 17, y - height * 0.5 - 20, 8, 25);
};

const drawFlowers = (
  ctx: CanvasRenderingContext2D,
  width: number,
  baseY: number,
  count: number,
): void => {
  const flowerColors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9B59B6'];
  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const y = baseY - Math.random() * 30;
    const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
    const size = 8 + Math.random() * 6;

    ctx.strokeStyle = '#228B22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 15 + Math.random() * 10);
    ctx.stroke();

    ctx.fillStyle = color;
    for (let p = 0; p < 5; p++) {
      const angle = (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(angle) * size * 0.5,
        y + Math.sin(angle) * size * 0.5,
        size * 0.4,
        size * 0.6,
        angle,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawBuildings = (
  ctx: CanvasRenderingContext2D,
  width: number,
  baseY: number,
  color: string,
): void => {
  const buildingCount = 8;
  for (let i = 0; i < buildingCount; i++) {
    const buildingWidth = 40 + Math.random() * 50;
    const buildingHeight = 80 + Math.random() * 120;
    const x = (width / buildingCount) * i + Math.random() * 20;
    const y = baseY - buildingHeight;

    ctx.fillStyle = i % 2 === 0 ? color : darkenColor(color, 0.1);
    ctx.fillRect(x, y, buildingWidth, buildingHeight);

    ctx.fillStyle = lightenColor(color, 0.3);
    const windowRows = Math.floor(buildingHeight / 20);
    const windowCols = Math.floor(buildingWidth / 15);
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        if (Math.random() > 0.3) {
          ctx.fillRect(
            x + 5 + col * 12,
            y + 8 + row * 18,
            6,
            10,
          );
        }
      }
    }
  }
};

const drawSandDunes = (
  ctx: CanvasRenderingContext2D,
  width: number,
  baseY: number,
  color: string,
): void => {
  const gradient = ctx.createLinearGradient(0, baseY - 100, 0, baseY + 100);
  gradient.addColorStop(0, lightenColor(color, 0.1));
  gradient.addColorStop(1, darkenColor(color, 0.1));
  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.moveTo(0, baseY);
  for (let x = 0; x <= width; x += 20) {
    const y = baseY - 30 - Math.sin(x * 0.01) * 40 - Math.sin(x * 0.03) * 20;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, baseY + 100);
  ctx.lineTo(0, baseY + 100);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = darkenColor(color, 0.15);
  ctx.beginPath();
  ctx.moveTo(0, baseY + 30);
  for (let x = 0; x <= width; x += 15) {
    const y = baseY + 30 + Math.sin(x * 0.02 + 1) * 15;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, baseY + 100);
  ctx.lineTo(0, baseY + 100);
  ctx.closePath();
  ctx.fill();
};

export const drawBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bgType: BackgroundType,
  baseColor: string,
): void => {
  const skyTop = lightenColor(baseColor, 0.3);
  const skyBottom = lightenColor(baseColor, 0.1);
  const groundY = height * 0.65;

  switch (bgType) {
    case 'forest': {
      drawSkyGradient(ctx, width, height, skyTop, skyBottom);
      drawClouds(ctx, width, height * 0.15, '#FFFFFF', 4);
      drawSun(ctx, width * 0.85, height * 0.15, 35, '#FFE66D');
      drawMountains(ctx, width, groundY, height * 0.3, darkenColor(baseColor, 0.2), 3);
      
      const groundGradient = ctx.createLinearGradient(0, groundY, 0, height);
      groundGradient.addColorStop(0, lightenColor('#228B22', 0.2));
      groundGradient.addColorStop(1, '#228B22');
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, groundY, width, height - groundY);
      
      drawTrees(ctx, width, groundY, 15, '#2E7D32');
      drawFlowers(ctx, width, groundY + 10, 20);
      break;
    }

    case 'castle': {
      drawSkyGradient(ctx, width, height, '#FFB6C1', '#DDA0DD');
      drawClouds(ctx, width, height * 0.12, '#FFE4E1', 3);
      drawSun(ctx, width * 0.15, height * 0.12, 40, '#FF69B4');
      drawMountains(ctx, width, groundY, height * 0.25, '#9370DB', 2);

      const groundGradient = ctx.createLinearGradient(0, groundY, 0, height);
      groundGradient.addColorStop(0, '#98D8C8');
      groundGradient.addColorStop(1, '#7BC8A4');
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, groundY, width, height - groundY);

      drawCastle(ctx, width * 0.5, groundY + 10, 180, 200, '#DEB887');
      break;
    }

    case 'desert': {
      drawSkyGradient(ctx, width, height, '#FFA07A', '#FFD700');
      drawSun(ctx, width * 0.7, height * 0.2, 50, '#FF8C00');
      drawSandDunes(ctx, width, groundY, '#DEB887');
      
      for (let i = 0; i < 5; i++) {
        const x = 100 + i * 150 + Math.random() * 50;
        drawCactus(ctx, x, groundY + 20, 50 + Math.random() * 30, '#228B22');
      }
      break;
    }

    case 'ocean': {
      drawSkyGradient(ctx, width, height, '#87CEEB', '#B0E0E6');
      drawClouds(ctx, width, height * 0.1, '#FFFFFF', 6);
      drawSun(ctx, width * 0.2, height * 0.15, 45, '#FFD700');
      
      const horizonY = height * 0.5;
      drawWater(ctx, width, horizonY, height - horizonY, '#4169E1');
      
      ctx.fillStyle = '#F5DEB3';
      ctx.beginPath();
      ctx.ellipse(width * 0.8, height * 0.9, 120, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'mountain': {
      drawSkyGradient(ctx, width, height, '#87CEEB', '#E0FFFF');
      drawClouds(ctx, width, height * 0.08, '#FFFFFF', 3);
      drawSun(ctx, width * 0.75, height * 0.1, 35, '#FFD700');
      drawMountains(ctx, width, groundY + 20, height * 0.4, '#6B8E23', 4);

      const groundGradient = ctx.createLinearGradient(0, groundY, 0, height);
      groundGradient.addColorStop(0, '#90EE90');
      groundGradient.addColorStop(1, '#228B22');
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, groundY, width, height - groundY);
      break;
    }

    case 'city': {
      drawSkyGradient(ctx, width, height, '#4A4E69', '#9A8C98');
      
      const horizonY = height * 0.55;
      drawBuildings(ctx, width, horizonY, '#2D3142');

      ctx.fillStyle = '#1A1A2E';
      ctx.fillRect(0, horizonY, width, height - horizonY);

      ctx.fillStyle = '#FFE66D';
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const windowY = horizonY + 10 + Math.random() * 30;
        ctx.fillRect(x, windowY, 3, 5);
      }
      break;
    }

    case 'starry': {
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.7);
      skyGradient.addColorStop(0, '#0F0C29');
      skyGradient.addColorStop(0.5, '#302B63');
      skyGradient.addColorStop(1, '#24243E');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height * 0.7);

      drawStars(ctx, width, height, 100);
      drawMoon(ctx, width * 0.8, height * 0.15, 40);

      ctx.fillStyle = '#1A1A2E';
      ctx.fillRect(0, height * 0.7, width, height * 0.3);

      drawMountains(ctx, width, height * 0.75, height * 0.15, '#16213E', 2);
      break;
    }

    case 'garden': {
      drawSkyGradient(ctx, width, height, '#87CEEB', '#E0FFFF');
      drawClouds(ctx, width, height * 0.12, '#FFFFFF', 4);
      drawSun(ctx, width * 0.15, height * 0.12, 35, '#FFD700');

      const groundGradient = ctx.createLinearGradient(0, groundY, 0, height);
      groundGradient.addColorStop(0, '#90EE90');
      groundGradient.addColorStop(1, '#228B22');
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, groundY, width, height - groundY);

      drawFlowers(ctx, width, groundY + 15, 40);
      
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(width * 0.1, groundY - 80, 8, 80);
      ctx.fillRect(width * 0.9, groundY - 80, 8, 80);
      
      ctx.strokeStyle = '#228B22';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(width * 0.5, groundY - 80, width * 0.4, Math.PI, 0);
      ctx.stroke();
      
      drawFlowers(ctx, width, groundY - 60, 15);
      break;
    }

    default: {
      drawSkyGradient(ctx, width, height, skyTop, skyBottom);
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, groundY, width, height - groundY);
    }
  }
};

export const drawTextBubble = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  cursorVisible: boolean,
): void => {
  const padding = 24;
  const lineHeight = 28;
  const fontSize = 18;

  ctx.font = `${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textBaseline = 'top';

  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (const char of words) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth - padding * 2 && currentLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  const bubbleWidth = maxWidth;
  const bubbleHeight = lines.length * lineHeight + padding * 2;
  const bubbleX = x - bubbleWidth / 2;
  const bubbleY = y - bubbleHeight / 2;
  const radius = 16;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.moveTo(bubbleX + radius, bubbleY);
  ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
  ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
  ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
  ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
  ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
  ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
  ctx.lineTo(bubbleX, bubbleY + radius);
  ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  ctx.fillStyle = '#333333';
  lines.forEach((line, index) => {
    ctx.fillText(line, bubbleX + padding, bubbleY + padding + index * lineHeight);
  });

  if (cursorVisible && lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    const lastLineWidth = ctx.measureText(lastLine).width;
    const cursorX = bubbleX + padding + lastLineWidth + 2;
    const cursorY = bubbleY + padding + (lines.length - 1) * lineHeight;

    ctx.fillStyle = '#7A8B99';
    ctx.fillRect(cursorX, cursorY, 2, fontSize + 4);
  }
};
