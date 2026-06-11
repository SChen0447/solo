export interface NebulaPreset {
  id: string;
  name: string;
  color: string;
  r: number;
  g: number;
  b: number;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
};

const roseRgb = hexToRgb('#ff6b9d');
const eagleRgb = hexToRgb('#9b59b6');
const catseyeRgb = hexToRgb('#4fc3f7');
const orionRgb = hexToRgb('#ff7043');
const darkRgb = hexToRgb('#37474f');

export const presets: NebulaPreset[] = [
  {
    id: 'rose',
    name: '玫瑰星云',
    color: '#ff6b9d',
    r: roseRgb.r,
    g: roseRgb.g,
    b: roseRgb.b,
  },
  {
    id: 'eagle',
    name: '鹰状星云',
    color: '#9b59b6',
    r: eagleRgb.r,
    g: eagleRgb.g,
    b: eagleRgb.b,
  },
  {
    id: 'catseye',
    name: '猫眼星云',
    color: '#4fc3f7',
    r: catseyeRgb.r,
    g: catseyeRgb.g,
    b: catseyeRgb.b,
  },
  {
    id: 'orion',
    name: '猎户星云',
    color: '#ff7043',
    r: orionRgb.r,
    g: orionRgb.g,
    b: orionRgb.b,
  },
  {
    id: 'dark',
    name: '暗星云',
    color: '#37474f',
    r: darkRgb.r,
    g: darkRgb.g,
    b: darkRgb.b,
  },
];

export const getPresetById = (id: string): NebulaPreset | undefined => {
  return presets.find((p) => p.id === id);
};

export const defaultPhysicsParams = {
  starWind: 20,
  gravity: 10,
  lifetime: 5,
};
