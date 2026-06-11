import * as THREE from 'three';

export type ThemeName = 'neon' | 'ocean' | 'sunset' | 'forest' | 'aurora' | 'candy';

export interface ColorTheme {
  name: ThemeName;
  displayName: string;
  colors: string[];
  gradient: { top: string; bottom: string };
  buttonGradient: string;
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    name: 'neon',
    displayName: '霓虹',
    colors: [
      '#ff00ff', '#00ffff', '#ff0080', '#8000ff',
      '#00ff80', '#ffff00', '#ff4488', '#44ffff'
    ],
    gradient: { top: '#0a0020', bottom: '#200040' },
    buttonGradient: 'linear-gradient(135deg, #ff00ff, #00ffff, #ffff00)'
  },
  {
    name: 'ocean',
    displayName: '海洋',
    colors: [
      '#006994', '#0099cc', '#00ccff', '#33ccff',
      '#66ffff', '#004466', '#0077aa', '#44aadd'
    ],
    gradient: { top: '#001a33', bottom: '#003366' },
    buttonGradient: 'linear-gradient(135deg, #006994, #00ccff, #66ffff)'
  },
  {
    name: 'sunset',
    displayName: '日落',
    colors: [
      '#ff4500', '#ff6347', '#ff7f50', '#ffa500',
      '#ffd700', '#ff1493', '#ee82ee', '#ff69b4'
    ],
    gradient: { top: '#1a0a00', bottom: '#402000' },
    buttonGradient: 'linear-gradient(135deg, #ff4500, #ffa500, #ff69b4)'
  },
  {
    name: 'forest',
    displayName: '森林',
    colors: [
      '#006400', '#228b22', '#32cd32', '#7cfc00',
      '#90ee90', '#2e8b57', '#3cb371', '#66cdaa'
    ],
    gradient: { top: '#0a1a0a', bottom: '#1a331a' },
    buttonGradient: 'linear-gradient(135deg, #006400, #32cd32, #7cfc00)'
  },
  {
    name: 'aurora',
    displayName: '极光',
    colors: [
      '#00ff7f', '#7fffd4', '#87ceeb', '#dda0dd',
      '#9370db', '#00fa9a', '#48d1cc', '#ba55d3'
    ],
    gradient: { top: '#001020', bottom: '#002040' },
    buttonGradient: 'linear-gradient(135deg, #00ff7f, #87ceeb, #ba55d3)'
  },
  {
    name: 'candy',
    displayName: '糖果',
    colors: [
      '#ff69b4', '#ff1493', '#db7093', '#e6e6fa',
      '#dda0dd', '#ee82ee', '#da70d6', '#98fb98'
    ],
    gradient: { top: '#201020', bottom: '#402040' },
    buttonGradient: 'linear-gradient(135deg, #ff69b4, #dda0dd, #98fb98)'
  }
];

export function createGlassMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.05,
    transmission: 0.95,
    thickness: 0.3,
    ior: 1.5,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    envMapIntensity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });
}

export function createFluidMaterial(color: string | number = 0xff0080): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    metalness: 0.1,
    roughness: 0.2,
    transmission: 0.3,
    thickness: 0.5,
    ior: 1.33,
    transparent: true,
    opacity: 0.85,
    emissive: new THREE.Color(color).multiplyScalar(0.15),
    emissiveIntensity: 0.5,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2
  });
}

export function createHeatWaveTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(255, 200, 100, 0)');
  gradient.addColorStop(0.3, 'rgba(255, 180, 80, 0.08)');
  gradient.addColorStop(0.6, 'rgba(255, 150, 50, 0.15)');
  gradient.addColorStop(0.85, 'rgba(255, 120, 30, 0.25)');
  gradient.addColorStop(1, 'rgba(255, 100, 20, 0.35)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = Math.random() * 15 + 5;
    const alpha = Math.random() * 0.15 + 0.05;
    const waveGradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    waveGradient.addColorStop(0, `rgba(255, 200, 100, ${alpha})`);
    waveGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = waveGradient;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function createLampLiquidMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0a1530,
    metalness: 0.0,
    roughness: 0.1,
    transmission: 0.6,
    thickness: 1.0,
    ior: 1.3,
    transparent: true,
    opacity: 0.7,
    side: THREE.BackSide
  });
}

export function hslToRgbHex(h: number, s: number, l: number): string {
  const color = new THREE.Color();
  color.setHSL(h / 360, s / 100, l / 100);
  return '#' + color.getHexString();
}

export function adjustColorSaturation(hex: string, saturation: number): string {
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  hsl.s = Math.min(Math.max(saturation / 100, 0), 1);
  color.setHSL(hsl.h, hsl.s, hsl.l);
  return '#' + color.getHexString();
}

export function lerpColor(hex1: string, hex2: string, t: number): string {
  const c1 = new THREE.Color(hex1);
  const c2 = new THREE.Color(hex2);
  c1.lerp(c2, t);
  return '#' + c1.getHexString();
}

export function getRandomThemeColor(theme: ColorTheme): string {
  return theme.colors[Math.floor(Math.random() * theme.colors.length)];
}
