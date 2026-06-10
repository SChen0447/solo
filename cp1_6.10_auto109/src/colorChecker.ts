import { hexToHsl, hslToHex, HSL } from './colorMatrix';

export interface AlternativeColor {
  color1: string;
  color2: string;
  ratio: number;
}

export interface ContrastResult {
  ratio: number;
  passAA: boolean;
  passAAA: boolean;
  color1: string;
  color2: string;
  alternatives: AlternativeColor[];
}

const NAMED_COLORS: Record<string, string> = {
  aliceblue: '#F0F8FF', antiquewhite: '#FAEBD7', aqua: '#00FFFF',
  aquamarine: '#7FFFD4', azure: '#F0FFFF', beige: '#F5F5DC',
  bisque: '#FFE4C4', black: '#000000', blanchedalmond: '#FFEBCD',
  blue: '#0000FF', blueviolet: '#8A2BE2', brown: '#A52A2A',
  burlywood: '#DEB887', cadetblue: '#5F9EA0', chartreuse: '#7FFF00',
  chocolate: '#D2691E', coral: '#FF7F50', cornflowerblue: '#6495ED',
  cornsilk: '#FFF8DC', crimson: '#DC143C', cyan: '#00FFFF',
  darkblue: '#00008B', darkcyan: '#008B8B', darkgoldenrod: '#B8860B',
  darkgray: '#A9A9A9', darkgreen: '#006400', darkgrey: '#A9A9A9',
  darkkhaki: '#BDB76B', darkmagenta: '#8B008B', darkolivegreen: '#556B2F',
  darkorange: '#FF8C00', darkorchid: '#9932CC', darkred: '#8B0000',
  darksalmon: '#E9967A', darkseagreen: '#8FBC8F', darkslateblue: '#483D8B',
  darkslategray: '#2F4F4F', darkslategrey: '#2F4F4F', darkturquoise: '#00CED1',
  darkviolet: '#9400D3', deeppink: '#FF1493', deepskyblue: '#00BFFF',
  dimgray: '#696969', dimgrey: '#696969', dodgerblue: '#1E90FF',
  firebrick: '#B22222', floralwhite: '#FFFAF0', forestgreen: '#228B22',
  fuchsia: '#FF00FF', gainsboro: '#DCDCDC', ghostwhite: '#F8F8FF',
  gold: '#FFD700', goldenrod: '#DAA520', gray: '#808080',
  green: '#008000', greenyellow: '#ADFF2F', grey: '#808080',
  honeydew: '#F0FFF0', hotpink: '#FF69B4', indianred: '#CD5C5C',
  indigo: '#4B0082', ivory: '#FFFFF0', khaki: '#F0E68C',
  lavender: '#E6E6FA', lavenderblush: '#FFF0F5', lawngreen: '#7CFC00',
  lemonchiffon: '#FFFACD', lightblue: '#ADD8E6', lightcoral: '#F08080',
  lightcyan: '#E0FFFF', lightgoldenrodyellow: '#FAFAD2', lightgray: '#D3D3D3',
  lightgreen: '#90EE90', lightgrey: '#D3D3D3', lightpink: '#FFB6C1',
  lightsalmon: '#FFA07A', lightseagreen: '#20B2AA', lightskyblue: '#87CEFA',
  lightslategray: '#778899', lightslategrey: '#778899', lightsteelblue: '#B0C4DE',
  lightyellow: '#FFFFE0', lime: '#00FF00', limegreen: '#32CD32',
  linen: '#FAF0E6', magenta: '#FF00FF', maroon: '#800000',
  mediumaquamarine: '#66CDAA', mediumblue: '#0000CD', mediumorchid: '#BA55D3',
  mediumpurple: '#9370DB', mediumseagreen: '#3CB371', mediumslateblue: '#7B68EE',
  mediumspringgreen: '#00FA9A', mediumturquoise: '#48D1CC', mediumvioletred: '#C71585',
  midnightblue: '#191970', mintcream: '#F5FFFA', mistyrose: '#FFE4E1',
  moccasin: '#FFE4B5', navajowhite: '#FFDEAD', navy: '#000080',
  oldlace: '#FDF5E6', olive: '#808000', olivedrab: '#6B8E23',
  orange: '#FFA500', orangered: '#FF4500', orchid: '#DA70D6',
  palegoldenrod: '#EEE8AA', palegreen: '#98FB98', paleturquoise: '#AFEEEE',
  palevioletred: '#DB7093', papayawhip: '#FFEFD5', peachpuff: '#FFDAB9',
  peru: '#CD853F', pink: '#FFC0CB', plum: '#DDA0DD',
  powderblue: '#B0E0E6', purple: '#800080', rebeccapurple: '#663399',
  red: '#FF0000', rosybrown: '#BC8F8F', royalblue: '#4169E1',
  saddlebrown: '#8B4513', salmon: '#FA8072', sandybrown: '#F4A460',
  seagreen: '#2E8B57', seashell: '#FFF5EE', sienna: '#A0522D',
  silver: '#C0C0C0', skyblue: '#87CEEB', slateblue: '#6A5ACD',
  slategray: '#708090', slategrey: '#708090', snow: '#FFFAFA',
  springgreen: '#00FF7F', steelblue: '#4682B4', tan: '#D2B48C',
  teal: '#008080', thistle: '#D8BFD8', tomato: '#FF6347',
  turquoise: '#40E0D0', violet: '#EE82EE', wheat: '#F5DEB3',
  white: '#FFFFFF', whitesmoke: '#F5F5F5', yellow: '#FFFF00',
  yellowgreen: '#9ACD32',
};

export function parseColor(input: string): string | null {
  let cleaned = input.trim().toLowerCase();

  if (cleaned.startsWith('#')) {
    cleaned = cleaned.toUpperCase();
    if (/^#[0-9A-F]{6}$/.test(cleaned)) {
      return cleaned;
    }
    if (/^#[0-9A-F]{3}$/.test(cleaned)) {
      return '#' + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2] + cleaned[3] + cleaned[3];
    }
    return null;
  }

  if (NAMED_COLORS[cleaned]) {
    return NAMED_COLORS[cleaned];
  }

  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function linearizeChannel(v: number): number {
  v /= 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const r = linearizeChannel(rgb.r);
  const g = linearizeChannel(rgb.g);
  const b = linearizeChannel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function calculateContrast(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

export class ColorChecker {
  private parseCache: Map<string, string | null> = new Map();
  private contrastCache: Map<string, number> = new Map();

  public parseColor(input: string): string | null {
    if (this.parseCache.has(input)) {
      return this.parseCache.get(input) ?? null;
    }
    const result = parseColor(input);
    this.parseCache.set(input, result);
    return result;
  }

  public checkContrast(color1: string, color2: string): ContrastResult {
    const cacheKey = [color1, color2].sort().join('|');
    let ratio: number;
    if (this.contrastCache.has(cacheKey)) {
      ratio = this.contrastCache.get(cacheKey)!;
    } else {
      ratio = calculateContrast(color1, color2);
      this.contrastCache.set(cacheKey, ratio);
    }

    const passAA = ratio >= 4.5;
    const passAAA = ratio >= 7.0;

    const alternatives: AlternativeColor[] = passAA
      ? []
      : this.suggestAlternatives(color1, color2);

    return {
      ratio: Math.round(ratio * 100) / 100,
      passAA,
      passAAA,
      color1,
      color2,
      alternatives,
    };
  }

  public suggestAlternatives(baseColor: string, targetColor: string): AlternativeColor[] {
    const alternatives: AlternativeColor[] = [];
    const baseHsl = hexToHsl(baseColor);
    const seen = new Set<string>();

    const hueOffsets = [-15, -10, -5, 0, 5, 10, 15];
    const lightOffsets = [-20, -15, -10, -5, 5, 10, 15, 20];

    outer: for (const hueOff of hueOffsets) {
      for (const lightOff of lightOffsets) {
        const newH: HSL = {
          h: (baseHsl.h + hueOff + 360) % 360,
          s: baseHsl.s,
          l: Math.max(10, Math.min(90, baseHsl.l + lightOff)),
        };
        const newHex = hslToHex(newH.h, newH.s, newH.l);
        const newRatio = calculateContrast(newHex, targetColor);

        if (newRatio >= 4.5) {
          const key = newHex;
          if (!seen.has(key)) {
            seen.add(key);
            alternatives.push({
              color1: newHex,
              color2: targetColor,
              ratio: Math.round(newRatio * 100) / 100,
            });
            if (alternatives.length >= 3) {
              break outer;
            }
          }
        }
      }
    }

    if (alternatives.length < 3) {
      const targetHsl = hexToHsl(targetColor);
      for (const hueOff of hueOffsets) {
        for (const lightOff of lightOffsets) {
          const newH: HSL = {
            h: (targetHsl.h + hueOff + 360) % 360,
            s: targetHsl.s,
            l: Math.max(10, Math.min(90, targetHsl.l + lightOff)),
          };
          const newHex = hslToHex(newH.h, newH.s, newH.l);
          const newRatio = calculateContrast(baseColor, newHex);

          if (newRatio >= 4.5) {
            const key = baseColor + newHex;
            if (!seen.has(key)) {
              seen.add(key);
              alternatives.push({
                color1: baseColor,
                color2: newHex,
                ratio: Math.round(newRatio * 100) / 100,
              });
              if (alternatives.length >= 3) {
                return alternatives;
              }
            }
          }
        }
      }
    }

    return alternatives;
  }
}
