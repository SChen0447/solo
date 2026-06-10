export type RGB = [number, number, number];

export interface PaletteStop {
  position: number;
  color: RGB;
}

export interface BiomePalette {
  name: string;
  themeColor: string;
  base: RGB;
  gradient: PaletteStop[];
  detailColor: RGB;
}

export const FOREST_PALETTE: BiomePalette = {
  name: 'forest',
  themeColor: '#2d6a4f',
  base: [45, 106, 79],
  gradient: [
    { position: 0.0, color: [20, 50, 30] },
    { position: 0.2, color: [30, 80, 50] },
    { position: 0.4, color: [45, 106, 79] },
    { position: 0.6, color: [65, 130, 95] },
    { position: 0.8, color: [100, 160, 100] },
    { position: 1.0, color: [144, 190, 109] }
  ],
  detailColor: [25, 60, 40]
};

export const DESERT_PALETTE: BiomePalette = {
  name: 'desert',
  themeColor: '#e9c46a',
  base: [233, 196, 106],
  gradient: [
    { position: 0.0, color: [120, 80, 40] },
    { position: 0.2, color: [180, 130, 70] },
    { position: 0.4, color: [218, 165, 85] },
    { position: 0.6, color: [233, 196, 106] },
    { position: 0.8, color: [244, 220, 140] },
    { position: 1.0, color: [255, 240, 180] }
  ],
  detailColor: [150, 100, 50]
};

export const SNOW_PALETTE: BiomePalette = {
  name: 'snow',
  themeColor: '#e0fbfc',
  base: [224, 251, 252],
  gradient: [
    { position: 0.0, color: [80, 100, 130] },
    { position: 0.2, color: [140, 170, 200] },
    { position: 0.4, color: [180, 210, 230] },
    { position: 0.6, color: [210, 235, 245] },
    { position: 0.8, color: [224, 251, 252] },
    { position: 1.0, color: [250, 255, 255] }
  ],
  detailColor: [120, 150, 180]
};

export const BIOME_PALETTES: Record<string, BiomePalette> = {
  forest: FOREST_PALETTE,
  desert: DESERT_PALETTE,
  snow: SNOW_PALETTE
};

export function getPalette(name: string): BiomePalette {
  return BIOME_PALETTES[name] || FOREST_PALETTE;
}

export function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

export function sampleGradient(gradient: PaletteStop[], t: number): RGB {
  if (t <= gradient[0].position) return gradient[0].color;
  if (t >= gradient[gradient.length - 1].position) return gradient[gradient.length - 1].color;

  for (let i = 0; i < gradient.length - 1; i++) {
    const curr = gradient[i];
    const next = gradient[i + 1];
    if (t >= curr.position && t <= next.position) {
      const localT = (t - curr.position) / (next.position - curr.position);
      return lerpColor(curr.color, next.color, localT);
    }
  }
  return gradient[gradient.length - 1].color;
}
