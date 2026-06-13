export interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  id: string;
  points: Point[];
  color: RGB;
  center: Point;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export const GEMSTONE_COLORS: RGB[] = [
  { r: 200, g: 30,  b: 45  },
  { r: 30,  g: 65,  b: 180 },
  { r: 20,  g: 140, b: 75  },
  { r: 135, g: 95,  b: 185 },
  { r: 225, g: 150, b: 30  },
  { r: 50,  g: 180, b: 200 },
  { r: 220, g: 120, b: 180 },
  { r: 180, g: 180, b: 60  },
  { r: 210, g: 80,  b: 60  },
  { r: 160, g: 50,  b: 140 },
  { r: 90,  g: 200, b: 140 },
  { r: 245, g: 200, b: 60  },
];

const GEMSTONE_NAMES: string[] = [
  '红宝石红', '蓝宝石蓝', '祖母绿绿', '紫水晶紫',
  '黄水晶黄', '海蓝宝蓝', '粉碧玺粉', '橄榄石绿',
  '石榴石橙', '紫锂辉紫', '翠绿松石', '黄钻金'
];

export function getGemstoneName(index: number): string {
  return GEMSTONE_NAMES[index % GEMSTONE_NAMES.length];
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function rgbToString(rgb: RGB, alpha: number = 0.78): string {
  const a = rgb.a !== undefined ? rgb.a : alpha;
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${a})`;
}

export function rgbToStringSolid(rgb: RGB): string {
  return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
}

export function pointsToSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
}

export function polygonCenter(points: Point[]): Point {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  let x = 0, y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / n, y: y / n };
}

export function polygonArea(points: Point[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

export function generateVoronoiLikePolygons(
  width: number,
  height: number,
  count: number
): Polygon[] {
  const cols = Math.ceil(Math.sqrt(count * (width / height)));
  const rows = Math.ceil(count / cols);
  const cellW = width / cols;
  const cellH = height / rows;

  const sites: Point[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (sites.length >= count) break;
      const jitterX = randomFloat(-cellW * 0.25, cellW * 0.25);
      const jitterY = randomFloat(-cellH * 0.25, cellH * 0.25);
      sites.push({
        x: c * cellW + cellW / 2 + jitterX,
        y: r * cellH + cellH / 2 + jitterY,
      });
    }
  }

  const cx = width / 2;
  const cy = height / 2;
  const margin = Math.min(width, height) * 0.04;
  const rectCenter = { x: cx, y: cy };
  const halfW = width / 2 - margin;
  const halfH = height / 2 - margin;

  const polygons: Polygon[] = sites.map((site, idx) => {
    const dirX = (site.x - rectCenter.x) / halfW;
    const dirY = (site.y - rectCenter.y) / halfH;
    const scale = Math.min(cellW, cellH) * randomFloat(0.5, 0.85);
    const numSides = randomInt(3, 6);
    const points: Point[] = [];
    const startAngle = randomFloat(0, Math.PI * 2);
    const pointJitter = 0.18;

    for (let i = 0; i < numSides; i++) {
      const angle = startAngle + (i / numSides) * Math.PI * 2;
      const r = scale * randomFloat(0.7, 1.15);
      const jitterAngle = randomFloat(-pointJitter, pointJitter);
      let px = site.x + Math.cos(angle + jitterAngle) * r * (0.85 + Math.abs(dirX) * 0.15);
      let py = site.y + Math.sin(angle + jitterAngle) * r * (0.85 + Math.abs(dirY) * 0.15);
      px = Math.max(margin, Math.min(width - margin, px));
      py = Math.max(margin, Math.min(height - margin, py));
      points.push({ x: px, y: py });
    }

    const colorIndex = randomInt(0, GEMSTONE_COLORS.length - 1);
    const baseColor = GEMSTONE_COLORS[colorIndex];
    const variance = 18;
    const color: RGB = {
      r: Math.max(40, Math.min(255, baseColor.r + randomInt(-variance, variance))),
      g: Math.max(40, Math.min(255, baseColor.g + randomInt(-variance, variance))),
      b: Math.max(40, Math.min(255, baseColor.b + randomInt(-variance, variance))),
      a: randomFloat(0.72, 0.88),
    };

    return {
      id: `poly-${idx}`,
      points,
      color,
      center: polygonCenter(points),
    };
  });

  return polygons;
}

export function mixColors(colors: RGB[], weights: number[] = []): RGB {
  if (colors.length === 0) return { r: 0, g: 0, b: 0 };
  let r = 0, g = 0, b = 0, totalW = 0;

  for (let i = 0; i < colors.length; i++) {
    const w = weights[i] !== undefined ? weights[i] : 1;
    r += colors[i].r * w;
    g += colors[i].g * w;
    b += colors[i].b * w;
    totalW += w;
  }

  if (totalW === 0) return { r: 0, g: 0, b: 0 };
  return {
    r: Math.round(r / totalW),
    g: Math.round(g / totalW),
    b: Math.round(b / totalW),
  };
}

export function scaleColor(rgb: RGB, factor: number): RGB {
  return {
    r: Math.max(0, Math.min(255, rgb.r * factor)),
    g: Math.max(0, Math.min(255, rgb.g * factor)),
    b: Math.max(0, Math.min(255, rgb.b * factor)),
    a: rgb.a,
  };
}

export function addColors(a: RGB, b: RGB, bWeight: number = 1): RGB {
  return {
    r: Math.min(255, a.r + b.r * bWeight),
    g: Math.min(255, a.g + b.g * bWeight),
    b: Math.min(255, a.b + b.b * bWeight),
  };
}

export interface LightSource {
  heightAngle: number;
  intensity: number;
}

export interface ProjectionParams {
  rotationY: number;
  light: LightSource;
  width: number;
  height: number;
}

export interface ProjectedShape {
  polygonId: string;
  points: Point[];
  color: RGB;
  opacity: number;
  blur: number;
}

export function projectPolygonToShadow(
  polygon: Polygon,
  params: ProjectionParams
): ProjectedShape {
  const { rotationY, light, width, height } = params;
  const radY = (rotationY * Math.PI) / 180;
  const heightRad = (light.heightAngle * Math.PI) / 180;

  const cosY = Math.cos(radY);
  const sinY = Math.sin(radY);
  const tanH = Math.tan(heightRad);

  const offsetXBase = sinY * width * 0.55;
  const shadowScale = 1.05 + Math.abs(sinY) * 0.25;

  const projectedPoints: Point[] = polygon.points.map((p) => {
    const relX = (p.x - width / 2) / (width / 2);
    const relY = (p.y - height / 2) / (height / 2);

    const depthFactor = relX * sinY;
    const perspective = 1 + depthFactor * 0.4;

    const px = width / 2 + (p.x - width / 2) * cosY * shadowScale + offsetXBase;
    const verticalShift = -relY * tanH * height * 0.35;
    const horizontalDepthShift = depthFactor * width * 0.25;
    const py = height / 2 + (p.y - height / 2) * perspective * 0.95 + verticalShift;

    return {
      x: px + horizontalDepthShift,
      y: py,
    };
  });

  const depthOpacity = 0.6 + Math.abs(cosY) * 0.4;
  const angleAttenuation = Math.max(0.2, cosY);
  const intensityFactor = light.intensity / 100;
  const opacity = Math.min(0.85, depthOpacity * angleAttenuation * intensityFactor * 0.95);

  const blur = 4 + Math.abs(sinY) * 12 + (1 - light.intensity / 100) * 6;

  const colorFactor = 0.55 + intensityFactor * 0.45;
  const coloredColor = scaleColor(polygon.color, colorFactor);

  return {
    polygonId: polygon.id,
    points: projectedPoints,
    color: coloredColor,
    opacity,
    blur,
  };
}

export function getSunPosition(
  light: LightSource,
  canvasW: number,
  canvasH: number
): Point {
  const heightRad = (light.heightAngle * Math.PI) / 180;
  const arcRadius = Math.min(canvasW, canvasH) * 0.35;
  const startX = canvasW * 0.12;
  const startY = canvasH * 0.55;
  return {
    x: startX + arcRadius * Math.cos(heightRad),
    y: startY - arcRadius * Math.sin(heightRad),
  };
}

export interface MinimapObjects {
  light: Point;
  window: { x: number; y: number; w: number; h: number; angle: number };
  shadow: { x: number; y: number; w: number; h: number };
}

export function computeMinimap(
  rotationY: number,
  light: LightSource,
  mmW: number,
  mmH: number
): MinimapObjects {
  const padding = mmW * 0.1;
  const usableW = mmW - padding * 2;
  const usableH = mmH - padding * 2;

  const heightRad = (light.heightAngle * Math.PI) / 180;
  const lightDist = usableW * 0.38;
  const lightX = padding + lightDist * Math.cos(heightRad);
  const lightY = mmH * 0.5 - usableH * 0.38 * Math.sin(heightRad);

  const windowCX = padding + usableW * 0.46;
  const windowCY = mmH / 2;
  const windowW = usableW * 0.22;
  const windowH = usableH * 0.5;

  const radY = (rotationY * Math.PI) / 180;
  const shadowOffsetX = Math.sin(radY) * usableW * 0.32;
  const shadowCX = windowCX + shadowOffsetX + usableW * 0.12;
  const shadowCY = windowCY - Math.sin(heightRad) * usableH * 0.12;
  const shadowW = windowW * (1 + Math.abs(Math.sin(radY)) * 0.45);
  const shadowH = windowH * 0.95;

  return {
    light: { x: lightX, y: lightY },
    window: { x: windowCX - windowW / 2, y: windowCY - windowH / 2, w: windowW, h: windowH, angle: rotationY },
    shadow: { x: shadowCX - shadowW / 2, y: shadowCY - shadowH / 2, w: shadowW, h: shadowH },
  };
}
