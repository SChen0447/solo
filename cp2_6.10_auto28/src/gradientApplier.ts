export function generateLinearGradientCSS(colors: string[], angle: number = 45): string {
  if (!colors || colors.length === 0) {
    return 'background: linear-gradient(45deg, #1a1a2e, #16213e);';
  }
  const colorString = colors.join(', ');
  return `background: linear-gradient(${angle}deg, ${colorString});`;
}

export function generateRadialGradientCSS(colors: string[]): string {
  if (!colors || colors.length === 0) {
    return 'background: radial-gradient(circle, #1a1a2e, #16213e);';
  }
  const colorString = colors.join(', ');
  return `background: radial-gradient(circle, ${colorString});`;
}

export interface GradientElements {
  previewArea: HTMLElement | null;
  cssCodeElement: HTMLElement | null;
}

export function applyGradient(colors: string[], elements: GradientElements, angle: number = 45): void {
  const cssString = generateLinearGradientCSS(colors, angle);

  if (elements.previewArea) {
    elements.previewArea.style.background = cssString.replace('background: ', '').replace(';', '');
  }

  if (elements.cssCodeElement) {
    elements.cssCodeElement.textContent = cssString;
  }
}

export function renderPaletteToCanvas(colors: string[], canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  if (colors.length === 0) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  const step = 1 / Math.max(colors.length - 1, 1);

  colors.forEach((color, index) => {
    gradient.addColorStop(index * step, color);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function createColorCardElement(color: string, index: number): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'color-card';
  card.style.backgroundColor = color;
  card.dataset.colorIndex = String(index);
  card.dataset.colorHex = color;

  const colorIndex = document.createElement('span');
  colorIndex.className = 'color-index';
  colorIndex.textContent = `${index + 1}`;
  colorIndex.style.color = getContrastColor(color);

  const colorHex = document.createElement('span');
  colorHex.className = 'color-hex';
  colorHex.textContent = color.toUpperCase();
  colorHex.style.color = getContrastColor(color);

  const colorLabel = document.createElement('span');
  colorLabel.className = 'color-label';
  colorLabel.textContent = getColorNameByIndex(index);
  colorLabel.style.color = getContrastColor(color);

  card.appendChild(colorIndex);
  card.appendChild(colorHex);
  card.appendChild(colorLabel);

  return card;
}

function getColorNameByIndex(index: number): string {
  const names = ['主色', '辅色', '点缀', '强调', '背景'];
  return names[index] || `颜色${index + 1}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

function getContrastColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#ffffff';

  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

export function createFavoriteThumbnail(colors: string[], name: string): HTMLDivElement {
  const item = document.createElement('div');
  item.className = 'favorite-item';

  const preview = document.createElement('div');
  preview.className = 'favorite-preview';

  colors.forEach((color) => {
    const colorBlock = document.createElement('div');
    colorBlock.style.backgroundColor = color;
    preview.appendChild(colorBlock);
  });

  const info = document.createElement('div');
  info.className = 'favorite-info';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'favorite-name';
  nameSpan.textContent = name;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-favorite';
  deleteBtn.textContent = '×';
  deleteBtn.title = '删除收藏';

  info.appendChild(nameSpan);
  info.appendChild(deleteBtn);

  item.appendChild(preview);
  item.appendChild(info);

  return item;
}
