export type WeaveType = 'plain' | 'twill' | 'satin';

export interface WeaveParams {
  warpDensity: number;
  weftDensity: number;
  warpColor: string;
  weftColor: string;
  weaveType: WeaveType;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function darkenColor(color: RGB, factor: number): RGB {
  return {
    r: Math.floor(color.r * factor),
    g: Math.floor(color.g * factor),
    b: Math.floor(color.b * factor),
  };
}

function isWarpIntersection(
  x: number,
  y: number,
  warpDensity: number,
  weftDensity: number,
  weaveType: WeaveType
): boolean {
  const warpPeriod = warpDensity;
  const weftPeriod = weftDensity;

  const warpIndex = Math.floor(x / (500 / warpPeriod));
  const weftIndex = Math.floor(y / (500 / weftPeriod));

  switch (weaveType) {
    case 'plain':
      return (warpIndex + weftIndex) % 2 === 0;

    case 'twill': {
      const patternSize = 3;
      const offset = weftIndex % patternSize;
      const position = (warpIndex + offset) % patternSize;
      return position < 2;
    }

    case 'satin': {
      const patternSize = 7;
      const rowOffset = (weftIndex * 2) % patternSize;
      const colOffset = (warpIndex * 3) % patternSize;
      const position = (warpIndex + rowOffset + colOffset) % patternSize;
      return position < 5;
    }

    default:
      return (warpIndex + weftIndex) % 2 === 0;
  }
}

export function generateWeaveTexture(
  params: WeaveParams,
  width: number,
  height: number
): ImageData {
  const { warpDensity, weftDensity, warpColor, weftColor, weaveType } = params;

  const warpRgb = hexToRgb(warpColor);
  const weftRgb = hexToRgb(weftColor);
  const weftDarkened = darkenColor(weftRgb, 0.7);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const isWarp = isWarpIntersection(x, y, warpDensity, weftDensity, weaveType);

      let color: RGB;
      if (isWarp) {
        const threadX = (x / (500 / warpDensity)) % 1;
        const threadY = (y / (500 / weftDensity)) % 1;
        const distFromCenter = Math.abs(threadX - 0.5) * 2;
        const shade = 1 - distFromCenter * 0.25;
        color = {
          r: Math.floor(warpRgb.r * shade),
          g: Math.floor(warpRgb.g * shade),
          b: Math.floor(warpRgb.b * shade),
        };
      } else {
        color = weftDarkened;
      }

      data[idx] = color.r;
      data[idx + 1] = color.g;
      data[idx + 2] = color.b;
      data[idx + 3] = 255;
    }
  }

  return imageData;
}

export function generateWeaveTextureHighRes(
  params: WeaveParams,
  width: number,
  height: number
): ImageData {
  return generateWeaveTexture(params, width, height);
}
