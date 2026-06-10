export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Bucket {
  id: string;
  x: number;
  y: number;
  color: RGB;
  colorHex: string;
  diameter: number;
  isSecondary: boolean;
  isSelected: boolean;
  isDragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
  scale: number;
  glowAlpha: number;
}

const PRESET_COLORS: { hex: string; rgb: RGB }[] = [
  { hex: '#FF0000', rgb: { r: 255, g: 0, b: 0 } },
  { hex: '#FF8000', rgb: { r: 255, g: 128, b: 0 } },
  { hex: '#FFFF00', rgb: { r: 255, g: 255, b: 0 } },
  { hex: '#00FF80', rgb: { r: 0, g: 255, b: 128 } },
  { hex: '#00FFFF', rgb: { r: 0, g: 255, b: 255 } },
  { hex: '#0000FF', rgb: { r: 0, g: 0, b: 255 } },
  { hex: '#8000FF', rgb: { r: 128, g: 0, b: 255 } },
  { hex: '#FF69B4', rgb: { r: 255, g: 105, b: 180 } },
  { hex: '#8B4513', rgb: { r: 139, g: 69, b: 19 } },
  { hex: '#808080', rgb: { r: 128, g: 128, b: 128 } },
  { hex: '#FFFFFF', rgb: { r: 255, g: 255, b: 255 } },
  { hex: '#000000', rgb: { r: 0, g: 0, b: 0 } },
];

const MAX_BUCKETS = 8;
let bucketIdCounter = 0;

function generateBucketId(): string {
  return `bucket-${++bucketIdCounter}`;
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(rgb: RGB): string {
  return '#' + [rgb.r, rgb.g, rgb.b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export class Palette {
  private buckets: Bucket[] = [];
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;
  private smallScreen: boolean = false;

  constructor() {}

  init(canvasWidth: number, canvasHeight: number, smallScreen: boolean): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.smallScreen = smallScreen;
    this.reset();
  }

  reset(): void {
    this.buckets = [];
    bucketIdCounter = 0;
    const diameter = this.smallScreen ? 30 : 40;
    const centerY = this.canvasHeight / 2;
    const spacing = Math.min(180, this.canvasWidth / 4);

    const primaries = [
      { hex: '#FF0000', x: this.canvasWidth / 2 - spacing },
      { hex: '#FFFF00', x: this.canvasWidth / 2 },
      { hex: '#0000FF', x: this.canvasWidth / 2 + spacing },
    ];

    primaries.forEach(p => {
      const rgb = hexToRgb(p.hex);
      this.buckets.push({
        id: generateBucketId(),
        x: p.x,
        y: centerY,
        color: rgb,
        colorHex: p.hex,
        diameter,
        isSecondary: false,
        isSelected: false,
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
        scale: 1,
        glowAlpha: 0,
      });
    });
  }

  getBuckets(): Bucket[] {
    return this.buckets;
  }

  getBucketCount(): number {
    return this.buckets.length;
  }

  setCanvasSize(width: number, height: number, smallScreen: boolean): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.smallScreen = smallScreen;
    const diameter = smallScreen ? 30 : 40;
    this.buckets.forEach(b => {
      if (!b.isSecondary) b.diameter = diameter;
      else b.diameter = smallScreen ? 36 : 48;
    });
  }

  hitTest(x: number, y: number): Bucket | null {
    for (let i = this.buckets.length - 1; i >= 0; i--) {
      const b = this.buckets[i];
      const r = (b.diameter * b.scale) / 2;
      const dx = x - b.x;
      const dy = y - b.y;
      if (dx * dx + dy * dy <= r * r) {
        return b;
      }
    }
    return null;
  }

  selectBucket(bucket: Bucket | null): void {
    this.buckets.forEach(b => {
      b.isSelected = bucket ? b.id === bucket.id : false;
    });
  }

  startDrag(bucket: Bucket, pointerX: number, pointerY: number): void {
    bucket.isDragging = true;
    bucket.dragOffsetX = pointerX - bucket.x;
    bucket.dragOffsetY = pointerY - bucket.y;
    bucket.scale = 1.1;
  }

  drag(bucket: Bucket, pointerX: number, pointerY: number): void {
    if (!bucket.isDragging) return;
    const r = bucket.diameter / 2;
    bucket.x = Math.max(r, Math.min(this.canvasWidth - r, pointerX - bucket.dragOffsetX));
    bucket.y = Math.max(r, Math.min(this.canvasHeight - r, pointerY - bucket.dragOffsetY));
  }

  endDrag(bucket: Bucket): void {
    bucket.isDragging = false;
    bucket.scale = 1;
  }

  addRandomBucket(x: number, y: number): boolean {
    if (this.buckets.length >= MAX_BUCKETS) return false;
    const preset = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    const diameter = this.smallScreen ? 30 : 40;
    const r = diameter / 2;
    this.buckets.push({
      id: generateBucketId(),
      x: Math.max(r, Math.min(this.canvasWidth - r, x)),
      y: Math.max(r, Math.min(this.canvasHeight - r, y)),
      color: { ...preset.rgb },
      colorHex: preset.hex,
      diameter,
      isSecondary: false,
      isSelected: false,
      isDragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      scale: 1,
      glowAlpha: 0,
    });
    return true;
  }

  removeBucket(bucket: Bucket): void {
    const idx = this.buckets.findIndex(b => b.id === bucket.id);
    if (idx !== -1) this.buckets.splice(idx, 1);
  }

  mergeBuckets(bucketA: Bucket, bucketB: Bucket, newColorHex: string): Bucket {
    const newRgb = hexToRgb(newColorHex);
    const midX = (bucketA.x + bucketB.x) / 2;
    const midY = (bucketA.y + bucketB.y) / 2;
    const diameter = this.smallScreen ? 36 : 48;
    this.removeBucket(bucketA);
    this.removeBucket(bucketB);
    const newBucket: Bucket = {
      id: generateBucketId(),
      x: midX,
      y: midY,
      color: newRgb,
      colorHex: newColorHex,
      diameter,
      isSecondary: true,
      isSelected: false,
      isDragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      scale: 1,
      glowAlpha: 0.6,
    };
    this.buckets.push(newBucket);
    return newBucket;
  }

  getAverageColor(): RGB {
    if (this.buckets.length === 0) return { r: 255, g: 255, b: 255 };
    let ar = 0, ag = 0, ab = 0;
    this.buckets.forEach(bucket => {
      ar += bucket.color.r;
      ag += bucket.color.g;
      ab += bucket.color.b;
    });
    const n = this.buckets.length;
    return {
      r: Math.round(ar / n),
      g: Math.round(ag / n),
      b: Math.round(ab / n),
    };
  }
}

export { rgbToHex, hexToRgb };
