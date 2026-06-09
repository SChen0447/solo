import * as THREE from 'three';

export interface GlazeRecipe {
  id: string;
  name: string;
  initialColor: string;
  reductionThreshold: number;
  reducedColor: string;
  oxidizedColor: string;
  reducedName: string;
  oxidizedName: string;
  flowAmount: number;
  crackDensity: number;
}

export interface CurvePoint {
  time: number;
  temperature: number;
}

export const GLAZE_RECIPES: GlazeRecipe[] = [
  {
    id: 'yingqing',
    name: '影青',
    initialColor: '#8B7355',
    reductionThreshold: 50,
    reducedColor: '#70B8E0',
    oxidizedColor: '#C4D8E0',
    reducedName: '天青',
    oxidizedName: '青白釉',
    flowAmount: 0.8,
    crackDensity: 0.6
  },
  {
    id: 'rustred',
    name: '铁锈红',
    initialColor: '#8B4513',
    reductionThreshold: 40,
    reducedColor: '#8B0000',
    oxidizedColor: '#CD5C5C',
    reducedName: '祭红',
    oxidizedName: '矾红',
    flowAmount: 0.5,
    crackDensity: 0.3
  },
  {
    id: 'coppergreen',
    name: '铜绿',
    initialColor: '#556B2F',
    reductionThreshold: 45,
    reducedColor: '#228B22',
    oxidizedColor: '#6B8E23',
    reducedName: '翠绿',
    oxidizedName: '橄榄绿',
    flowAmount: 1.0,
    crackDensity: 0.5
  },
  {
    id: 'zijintu',
    name: '紫金土',
    initialColor: '#4A3728',
    reductionThreshold: 35,
    reducedColor: '#2F1810',
    oxidizedColor: '#6B4423',
    reducedName: '乌金釉',
    oxidizedName: '酱釉',
    flowAmount: 0.4,
    crackDensity: 0.7
  },
  {
    id: 'junyao',
    name: '钧釉',
    initialColor: '#6B5D7A',
    reductionThreshold: 55,
    reducedColor: '#9932CC',
    oxidizedColor: '#BA55D3',
    reducedName: '玫瑰紫',
    oxidizedName: '葡萄紫',
    flowAmount: 1.2,
    crackDensity: 0.8
  },
  {
    id: 'geyao',
    name: '哥釉',
    initialColor: '#C4B7A6',
    reductionThreshold: 30,
    reducedColor: '#D3D3D3',
    oxidizedColor: '#F5F5DC',
    reducedName: '粉青',
    oxidizedName: '米白',
    flowAmount: 0.6,
    crackDensity: 1.5
  },
  {
    id: 'ruyao',
    name: '汝釉',
    initialColor: '#8CA8B0',
    reductionThreshold: 60,
    reducedColor: '#5D8A8A',
    oxidizedColor: '#8FBCBC',
    reducedName: '雨过天青',
    oxidizedName: '鸭蛋青',
    flowAmount: 0.7,
    crackDensity: 0.9
  },
  {
    id: 'dingyao',
    name: '定釉',
    initialColor: '#E8DCC8',
    reductionThreshold: 25,
    reducedColor: '#FFFAF0',
    oxidizedColor: '#FFF8DC',
    reducedName: '象牙白',
    oxidizedName: '甜白',
    flowAmount: 0.3,
    crackDensity: 0.2
  },
  {
    id: 'longquan',
    name: '龙泉',
    initialColor: '#6B8E6B',
    reductionThreshold: 50,
    reducedColor: '#006400',
    oxidizedColor: '#2E8B57',
    reducedName: '梅子青',
    oxidizedName: '粉青',
    flowAmount: 0.9,
    crackDensity: 0.4
  },
  {
    id: 'jianyao',
    name: '建盏',
    initialColor: '#3D2B1F',
    reductionThreshold: 40,
    reducedColor: '#1A0F0A',
    oxidizedColor: '#4A2C1A',
    reducedName: '兔毫',
    oxidizedName: '油滴',
    flowAmount: 0.6,
    crackDensity: 0.5
  },
  {
    id: 'dehua',
    name: '德化',
    initialColor: '#F0EBE0',
    reductionThreshold: 20,
    reducedColor: '#FFFFF0',
    oxidizedColor: '#FFFAF0',
    reducedName: '猪油白',
    oxidizedName: '象牙白',
    flowAmount: 0.2,
    crackDensity: 0.1
  },
  {
    id: 'shufu',
    name: '枢府',
    initialColor: '#D8D0C0',
    reductionThreshold: 35,
    reducedColor: '#F0EAD6',
    oxidizedColor: '#E5DFCC',
    reducedName: '鹅卵白',
    oxidizedName: '乳白',
    flowAmount: 0.3,
    crackDensity: 0.2
  }
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
      }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, Math.round(x * 255))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function interpolateColor(
  color1: string,
  color2: string,
  t: number
): THREE.Color {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return new THREE.Color(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

export function addColorJitter(color: THREE.Color, amount: number = 0.05): THREE.Color {
  const jitter = (v: number) => v + (Math.random() - 0.5) * 2 * amount * v;
  return new THREE.Color(
    Math.max(0, Math.min(1, jitter(color.r))),
    Math.max(0, Math.min(1, jitter(color.g))),
    Math.max(0, Math.min(1, jitter(color.b)))
  );
}

export function calculateFinalColor(
  recipe: GlazeRecipe,
  reductionValue: number,
  _curve: CurvePoint[]
): { color: THREE.Color; name: string } {
  const isReduced = reductionValue >= recipe.reductionThreshold;
  const baseColor = isReduced ? recipe.reducedColor : recipe.oxidizedColor;
  const name = isReduced ? recipe.reducedName : recipe.oxidizedName;

  const mixT = Math.abs(reductionValue - recipe.reductionThreshold) / 100;
  const mixed = interpolateColor(
    isReduced ? recipe.oxidizedColor : recipe.reducedColor,
    baseColor,
    Math.min(1, mixT * 2 + 0.3)
  );

  return {
    color: addColorJitter(mixed, 0.05),
    name
  };
}

export function calculateIntegralHeat(curve: CurvePoint[]): number {
  let total = 0;
  for (let i = 1; i < curve.length; i++) {
    const dt = curve[i].time - curve[i - 1].time;
    const avgTemp = (curve[i].temperature + curve[i - 1].temperature) / 2;
    total += dt * avgTemp;
  }
  return total;
}

export function createCrackLines(
  width: number,
  height: number,
  density: number
): THREE.LineSegments {
  const positions: number[] = [];
  const crackCount = Math.floor(8 + density * 25);

  for (let i = 0; i < crackCount; i++) {
    const startX = (Math.random() - 0.5) * width;
    const startZ = (Math.random() - 0.5) * height;
    const length = 0.1 + Math.random() * 0.4;
    const angle = Math.random() * Math.PI * 2;

    const segments = 2 + Math.floor(Math.random() * 3);
    let px = startX;
    let pz = startZ;

    for (let s = 0; s < segments; s++) {
      const segLen = length / segments;
      const nextX = px + Math.cos(angle + (Math.random() - 0.5) * 0.8) * segLen;
      const nextZ = pz + Math.sin(angle + (Math.random() - 0.5) * 0.8) * segLen;

      positions.push(px, 0.052, pz);
      positions.push(nextX, 0.052, nextZ);

      px = nextX;
      pz = nextZ;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: 0x1a1a1a,
    transparent: true,
    opacity: 0.3 + Math.random() * 0.3,
    depthWrite: false
  });

  return new THREE.LineSegments(geometry, material);
}

export function createGlazeTexture(colorHex: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const baseColor = hexToRgb(colorHex);
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = Math.random() * 0.3 - 0.15;
    const r = Math.max(0, Math.min(255, Math.round((baseColor.r + brightness) * 255)));
    const g = Math.max(0, Math.min(255, Math.round((baseColor.g + brightness) * 255)));
    const b = Math.max(0, Math.min(255, Math.round((baseColor.b + brightness) * 255)));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  for (let i = 0; i < 15; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 5 + Math.random() * 20;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    const alpha = Math.random() * 0.1;
    gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
