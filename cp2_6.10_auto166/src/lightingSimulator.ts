export interface LightConfig {
  color: string;
  intensity: number;
}

export interface RenderBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

const PRESET_LIGHT_COLORS: Record<string, string> = {
  warm: '#f1c40f',
  cool: '#ecf0f1',
  neon: '#9b59b6'
};

export function getPresetLightColors(): Record<string, string> {
  return { ...PRESET_LIGHT_COLORS };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function blendColors(
  baseRgb: { r: number; g: number; b: number },
  lightRgb: { r: number; g: number; b: number },
  intensity: number
): { r: number; g: number; b: number } {
  const t = Math.max(0, Math.min(1, intensity / 100));
  if (t === 0) {
    return { ...baseRgb };
  }
  return {
    r: clampByte(baseRgb.r * (1 - t) + (baseRgb.r * lightRgb.r) / 255 * t),
    g: clampByte(baseRgb.g * (1 - t) + (baseRgb.g * lightRgb.g) / 255 * t),
    b: clampByte(baseRgb.b * (1 - t) + (baseRgb.b * lightRgb.b) / 255 * t)
  };
}

export class LightingSimulator {
  private lightColor: { r: number; g: number; b: number };
  private intensity: number;

  constructor(config: LightConfig = { color: '#f1c40f', intensity: 40 }) {
    this.lightColor = hexToRgb(config.color);
    this.intensity = config.intensity;
  }

  setLightColor(hex: string): void {
    this.lightColor = hexToRgb(hex);
  }

  setIntensity(value: number): void {
    this.intensity = Math.max(0, Math.min(100, value));
  }

  getIntensity(): number {
    return this.intensity;
  }

  getLightColorHex(): string {
    return (
      '#' +
      [this.lightColor.r, this.lightColor.g, this.lightColor.b]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('')
    );
  }

  applyToColor(hexColor: string): string {
    const baseRgb = hexToRgb(hexColor);
    const blended = blendColors(baseRgb, this.lightColor, this.intensity);
    return (
      '#' +
      [blended.r, blended.g, blended.b]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('')
    );
  }

  renderBlockToBuffer(
    baseColor: string,
    width: number,
    height: number
  ): RenderBuffer {
    const data = new Uint8ClampedArray(width * height * 4);
    const baseRgb = hexToRgb(baseColor);
    const blended = blendColors(baseRgb, this.lightColor, this.intensity);

    for (let i = 0; i < data.length; i += 4) {
      data[i] = blended.r;
      data[i + 1] = blended.g;
      data[i + 2] = blended.b;
      data[i + 3] = 255;
    }

    return { width, height, data };
  }

  renderBlocksToBuffer(
    baseColors: string[],
    cols: number,
    blockSize: number,
    gap: number
  ): RenderBuffer {
    const rows = Math.ceil(baseColors.length / cols);
    const width = cols * blockSize + (cols - 1) * gap;
    const height = rows * blockSize + (rows - 1) * gap;
    const data = new Uint8ClampedArray(width * height * 4);

    const bgRgb = hexToRgb('#2c3e50');

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const col = Math.floor(x / (blockSize + gap));
        const row = Math.floor(y / (blockSize + gap));
        const localX = x - col * (blockSize + gap);
        const localY = y - row * (blockSize + gap);
        const idx = (y * width + x) * 4;
        const blockIdx = row * cols + col;

        if (
          localX < blockSize &&
          localY < blockSize &&
          blockIdx < baseColors.length
        ) {
          const baseRgb = hexToRgb(baseColors[blockIdx]);
          const blended = blendColors(baseRgb, this.lightColor, this.intensity);
          data[idx] = blended.r;
          data[idx + 1] = blended.g;
          data[idx + 2] = blended.b;
          data[idx + 3] = 255;
        } else {
          data[idx] = bgRgb.r;
          data[idx + 1] = bgRgb.g;
          data[idx + 2] = bgRgb.b;
          data[idx + 3] = 255;
        }
      }
    }

    return { width, height, data };
  }

  renderBlocksToImageData(
    ctx: CanvasRenderingContext2D,
    baseColors: string[],
    cols: number,
    blockSize: number,
    gap: number
  ): ImageData {
    const rows = Math.ceil(baseColors.length / cols);
    const width = cols * blockSize + (cols - 1) * gap;
    const height = rows * blockSize + (rows - 1) * gap;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const bgRgb = hexToRgb('#2c3e50');

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const col = Math.floor(x / (blockSize + gap));
        const row = Math.floor(y / (blockSize + gap));
        const localX = x - col * (blockSize + gap);
        const localY = y - row * (blockSize + gap);
        const idx = (y * width + x) * 4;
        const blockIdx = row * cols + col;

        if (
          localX < blockSize &&
          localY < blockSize &&
          blockIdx < baseColors.length
        ) {
          const baseRgb = hexToRgb(baseColors[blockIdx]);
          const blended = blendColors(baseRgb, this.lightColor, this.intensity);
          data[idx] = blended.r;
          data[idx + 1] = blended.g;
          data[idx + 2] = blended.b;
          data[idx + 3] = 255;
        } else {
          data[idx] = bgRgb.r;
          data[idx + 1] = bgRgb.g;
          data[idx + 2] = bgRgb.b;
          data[idx + 3] = 255;
        }
      }
    }

    return imageData;
  }
}
