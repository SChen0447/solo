export interface Jellyfish {
  x: number;
  y: number;
  baseY: number;
  size: number;
  color: string;
  pulsePhase: number;
  pulseSpeed: number;
  driftSpeed: number;
  driftPhase: number;
  alphaPhase: number;
  alphaSpeed: number;
}

export interface Coral {
  x: number;
  y: number;
  width: number;
  height: number;
  type: number;
  color: string;
}

export interface DistantRidge {
  x: number;
  height: number;
  width: number;
  color: string;
}

export interface ShadowTarget {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'terrain' | 'jellyfish' | 'coral';
  ref: Jellyfish | Coral | null;
}

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    return [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number): number {
    return (hash & 1) === 0 ? x : -x;
  }

  public noise1D(x: number): number {
    const X = Math.floor(x) & 255;
    x -= Math.floor(x);
    const u = this.fade(x);
    return this.lerp(
      this.grad(this.permutation[X], x),
      this.grad(this.permutation[X + 1], x - 1),
      u
    );
  }

  public octaveNoise(x: number, octaves: number, persistence: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise1D(x * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }
}

export class SceneManager {
  private terrainWidth: number;
  private terrainHeight: number;
  private terrainHeights: number[] = [];
  private terrainSampleRate: number = 10;
  private perlin: PerlinNoise;
  private jellyfishList: Jellyfish[] = [];
  private coralList: Coral[] = [];
  private distantRidges: DistantRidge[] = [];
  private sceneBounds: { minX: number; minY: number; maxX: number; maxY: number };

  constructor(sceneWidth: number, sceneHeight: number) {
    this.terrainWidth = sceneWidth;
    this.terrainHeight = sceneHeight;
    this.perlin = new PerlinNoise(42);
    this.sceneBounds = {
      minX: 0,
      minY: 50,
      maxX: sceneWidth,
      maxY: sceneHeight - 50
    };
    this.generateTerrain();
    this.generateDistantRidges();
    this.generateJellyfish();
    this.generateCorals();
  }

  private generateTerrain(): void {
    const sampleCount = Math.ceil(this.terrainWidth / this.terrainSampleRate) + 10;
    this.terrainHeights = [];
    
    const baseHeight = this.terrainHeight * 0.75;
    const amplitude = this.terrainHeight * 0.2;

    for (let i = 0; i < sampleCount; i++) {
      const x = i * this.terrainSampleRate;
      const noiseVal = this.perlin.octaveNoise(x * 0.003, 4, 0.5);
      const height = baseHeight + noiseVal * amplitude;
      this.terrainHeights.push(height);
    }
  }

  private generateDistantRidges(): void {
    const ridgePerlin = new PerlinNoise(123);
    const ridgeCount = Math.ceil(this.terrainWidth / 200) + 5;
    
    for (let i = 0; i < ridgeCount; i++) {
      const x = i * 200 - 200;
      const noiseVal = ridgePerlin.octaveNoise(i * 0.3, 3, 0.5);
      this.distantRidges.push({
        x,
        height: 150 + noiseVal * 100,
        width: 300 + noiseVal * 100,
        color: `rgb(${10 + noiseVal * 10}, ${25 + noiseVal * 20}, ${50 + noiseVal * 30})`
      });
    }
  }

  private generateJellyfish(): void {
    const colors = [
      '#ff69b4',
      '#ff1493',
      '#da70d6',
      '#ba55d3',
      '#ee82ee',
      '#d8bfd8'
    ];
    
    for (let i = 0; i < 25; i++) {
      const x = 200 + Math.random() * (this.terrainWidth - 400);
      const baseY = 150 + Math.random() * (this.terrainHeight * 0.5);
      this.jellyfishList.push({
        x,
        y: baseY,
        baseY,
        size: 15 + Math.random() * 25,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 1 + Math.random() * 2,
        driftSpeed: 0.3 + Math.random() * 0.5,
        driftPhase: Math.random() * Math.PI * 2,
        alphaPhase: Math.random() * Math.PI * 2,
        alphaSpeed: (0.5 + Math.random() * 1) * (Math.random() > 0.5 ? 1 : -1)
      });
    }
  }

  private generateCorals(): void {
    const colors = [
      '#ff7f50',
      '#ff6347',
      '#cd5c5c',
      '#e9967a',
      '#f4a460',
      '#8b4513'
    ];

    for (let i = 0; i < 40; i++) {
      const terrainIdx = Math.floor(Math.random() * (this.terrainHeights.length - 10)) + 5;
      const x = terrainIdx * this.terrainSampleRate;
      const terrainY = this.terrainHeights[terrainIdx];
      const height = 20 + Math.random() * 50;
      const width = 15 + Math.random() * 35;
      
      this.coralList.push({
        x,
        y: terrainY - height * 0.3,
        width,
        height,
        type: Math.floor(Math.random() * 3),
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  public update(deltaTime: number): void {
    const time = performance.now() / 1000;

    for (const jf of this.jellyfishList) {
      jf.pulsePhase += jf.pulseSpeed * deltaTime;
      jf.driftPhase += jf.driftSpeed * deltaTime;
      jf.alphaPhase += jf.alphaSpeed * deltaTime;
      
      jf.y = jf.baseY + Math.sin(jf.driftPhase) * 30;
      jf.x += Math.sin(jf.driftPhase * 0.7) * 0.3;
      
      if (jf.x < 100) jf.x = this.terrainWidth - 100;
      if (jf.x > this.terrainWidth - 100) jf.x = 100;
    }
  }

  public getTerrainHeights(): number[] {
    return this.terrainHeights;
  }

  public getTerrainSampleRate(): number {
    return this.terrainSampleRate;
  }

  public getSceneBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    return this.sceneBounds;
  }

  public getShadowTargets(viewX: number, viewY: number, viewW: number, viewH: number, maxCount: number): ShadowTarget[] {
    const targets: ShadowTarget[] = [];

    const startX = Math.max(0, Math.floor((viewX - 100) / this.terrainSampleRate));
    const endX = Math.min(this.terrainHeights.length - 1, Math.ceil((viewX + viewW + 100) / this.terrainSampleRate));
    
    const terrainStep = Math.max(1, Math.floor((endX - startX) / Math.floor(maxCount * 0.4)));
    for (let i = startX; i < endX && targets.length < maxCount * 0.4; i += terrainStep) {
      const tx = i * this.terrainSampleRate;
      const ty = this.terrainHeights[i];
      if (ty > viewY - 50 && ty < viewY + viewH + 100) {
        targets.push({
          x: tx - this.terrainSampleRate,
          y: ty - 10,
          width: this.terrainSampleRate * 2,
          height: this.terrainHeight - ty + 10,
          type: 'terrain',
          ref: null
        });
      }
    }

    for (const coral of this.coralList) {
      if (targets.length >= maxCount) break;
      if (
        coral.x + coral.width > viewX - 50 &&
        coral.x - coral.width < viewX + viewW + 50 &&
        coral.y + coral.height > viewY - 50 &&
        coral.y < viewY + viewH + 50
      ) {
        targets.push({
          x: coral.x - coral.width / 2,
          y: coral.y - coral.height / 2,
          width: coral.width,
          height: coral.height,
          type: 'coral',
          ref: coral
        });
      }
    }

    for (const jf of this.jellyfishList) {
      if (targets.length >= maxCount) break;
      if (
        jf.x + jf.size > viewX - 50 &&
        jf.x - jf.size < viewX + viewW + 50 &&
        jf.y + jf.size > viewY - 50 &&
        jf.y - jf.size < viewY + viewH + 50
      ) {
        targets.push({
          x: jf.x - jf.size,
          y: jf.y - jf.size,
          width: jf.size * 2,
          height: jf.size * 2,
          type: 'jellyfish',
          ref: jf
        });
      }
    }

    return targets;
  }

  public checkCollision(bbox: { x: number; y: number; w: number; h: number }): boolean {
    for (const coral of this.coralList) {
      if (
        bbox.x < coral.x + coral.width / 2 &&
        bbox.x + bbox.w > coral.x - coral.width / 2 &&
        bbox.y < coral.y + coral.height / 2 &&
        bbox.y + bbox.h > coral.y - coral.height / 2
      ) {
        return true;
      }
    }
    return false;
  }

  public getNearbyCoralProximity(
    subX: number,
    subY: number,
    threshold: number = 100
  ): number {
    let minDist = Infinity;
    for (const coral of this.coralList) {
      const dx = subX - coral.x;
      const dy = subY - coral.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) minDist = dist;
    }
    return minDist < threshold ? 1 - minDist / threshold : 0;
  }

  public drawTerrain(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    viewW: number,
    viewH: number
  ): void {
    const startX = Math.max(0, Math.floor((cameraX - 50) / this.terrainSampleRate));
    const endX = Math.min(this.terrainHeights.length - 1, Math.ceil((cameraX + viewW + 50) / this.terrainSampleRate));

    ctx.beginPath();
    ctx.moveTo(startX * this.terrainSampleRate - cameraX, viewH + 100);

    for (let i = startX; i <= endX; i++) {
      const x = i * this.terrainSampleRate - cameraX;
      const y = this.terrainHeights[i] - cameraY;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(endX * this.terrainSampleRate - cameraX, viewH + 100);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, viewH);
    gradient.addColorStop(0, '#1e3a5f');
    gradient.addColorStop(0.3, '#152a45');
    gradient.addColorStop(0.6, '#0d1a2d');
    gradient.addColorStop(1, '#050a14');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    for (let i = startX; i <= endX; i++) {
      const x = i * this.terrainSampleRate - cameraX;
      const y = this.terrainHeights[i] - cameraY;
      if (i === startX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(100, 160, 220, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  public drawDistantRidges(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    parallaxFactor: number
  ): void {
    for (const ridge of this.distantRidges) {
      const rx = ridge.x - cameraX * parallaxFactor;
      const ry = this.terrainHeight * 0.6 - cameraY;

      ctx.beginPath();
      ctx.moveTo(rx - ridge.width / 2, ry + ridge.height);
      ctx.quadraticCurveTo(rx, ry, rx + ridge.width / 2, ry + ridge.height);
      ctx.closePath();
      ctx.fillStyle = ridge.color;
      ctx.fill();
    }
  }

  public drawJellyfish(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number
  ): void {
    for (const jf of this.jellyfishList) {
      const x = jf.x - cameraX;
      const y = jf.y - cameraY;
      const pulse = 1 + Math.sin(jf.pulsePhase) * 0.15;
      const alpha = 0.6 + Math.sin(jf.alphaPhase) * 0.3;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = jf.color;
      ctx.shadowBlur = 20;

      ctx.beginPath();
      ctx.ellipse(x, y, jf.size * pulse, jf.size * 0.7 * pulse, 0, Math.PI, 0);
      ctx.fillStyle = jf.color;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = jf.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = jf.color;
      ctx.lineWidth = 1.5;
      for (let t = 0; t < 6; t++) {
        const tx = x - jf.size * 0.8 + (t / 5) * jf.size * 1.6;
        ctx.beginPath();
        ctx.moveTo(tx, y);
        for (let s = 1; s <= 5; s++) {
          const sy = y + s * jf.size * 0.3;
          const sx = tx + Math.sin(jf.pulsePhase + s * 0.5 + t) * 5;
          ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  public drawCorals(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number
  ): void {
    for (const coral of this.coralList) {
      const x = coral.x - cameraX;
      const y = coral.y - cameraY;

      ctx.save();

      if (coral.type === 0) {
        this.drawBranchingCoral(ctx, x, y, coral);
      } else if (coral.type === 1) {
        this.drawBrainCoral(ctx, x, y, coral);
      } else {
        this.drawTubeCoral(ctx, x, y, coral);
      }

      ctx.restore();
    }
  }

  private drawBranchingCoral(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    coral: Coral
  ): void {
    ctx.strokeStyle = coral.color;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';

    for (let b = 0; b < 5; b++) {
      const angle = -Math.PI / 2 + (b - 2) * 0.35;
      const len = coral.height * (0.6 + Math.random() * 0.4);
      ctx.beginPath();
      ctx.moveTo(x, y);
      const endX = x + Math.cos(angle) * len;
      const endY = y + Math.sin(angle) * len;
      ctx.quadraticCurveTo(
        x + Math.cos(angle) * len * 0.5 + (Math.random() - 0.5) * 10,
        y + Math.sin(angle) * len * 0.5,
        endX,
        endY
      );
      ctx.stroke();

      ctx.fillStyle = coral.color;
      ctx.beginPath();
      ctx.arc(endX, endY, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBrainCoral(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    coral: Coral
  ): void {
    const gradient = ctx.createRadialGradient(x, y, 2, x, y, coral.width);
    gradient.addColorStop(0, coral.color);
    gradient.addColorStop(1, this.darkenColor(coral.color, 0.5));
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.ellipse(x, y, coral.width / 2, coral.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.darkenColor(coral.color, 0.3);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const offset = (i - 3) * (coral.width / 12);
      ctx.moveTo(x + offset - 5, y - coral.height / 3);
      ctx.bezierCurveTo(
        x + offset, y - coral.height / 6,
        x + offset - 3, y + coral.height / 6,
        x + offset + 2, y + coral.height / 3
      );
      ctx.stroke();
    }
  }

  private drawTubeCoral(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    coral: Coral
  ): void {
    for (let t = 0; t < 7; t++) {
      const tx = x + (t - 3) * (coral.width / 8);
      const th = coral.height * (0.7 + ((t % 3) - 1) * 0.15);

      const gradient = ctx.createLinearGradient(tx - 4, y, tx + 4, y);
      gradient.addColorStop(0, this.darkenColor(coral.color, 0.4));
      gradient.addColorStop(0.5, coral.color);
      gradient.addColorStop(1, this.darkenColor(coral.color, 0.4));
      ctx.fillStyle = gradient;

      ctx.beginPath();
      ctx.moveTo(tx - 4, y);
      ctx.lineTo(tx - 3, y - th);
      ctx.lineTo(tx + 3, y - th);
      ctx.lineTo(tx + 4, y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = this.lightenColor(coral.color, 0.3);
      ctx.beginPath();
      ctx.ellipse(tx, y - th, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private darkenColor(hex: string, amount: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * (1 - amount))}, ${Math.floor(g * (1 - amount))}, ${Math.floor(b * (1 - amount))})`;
  }

  private lightenColor(hex: string, amount: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.min(255, Math.floor(r + (255 - r) * amount))}, ${Math.min(255, Math.floor(g + (255 - g) * amount))}, ${Math.min(255, Math.floor(b + (255 - b) * amount))})`;
  }

  public getSceneSize(): { width: number; height: number } {
    return { width: this.terrainWidth, height: this.terrainHeight };
  }
}
