import type { ShadowTarget } from './SceneManager';

export interface LightSource {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  intensity: number;
  radius: number;
  color: { r: number; g: number; b: number };
}

export interface ShadowMask {
  polygonPoints: { x: number; y: number }[];
  opacity: number;
  distance: number;
}

export class LightShadow {
  private lightX: number = 0;
  private lightY: number = 0;
  private lightWorldX: number = 0;
  private lightWorldY: number = 0;
  private orbitCenterX: number;
  private orbitCenterY: number;
  private orbitA: number;
  private orbitB: number;
  private orbitPeriod: number = 15;
  private startTime: number;
  private lightIntensity: number = 1;
  private lightRadius: number = 600;
  private causticPhase: number = 0;
  private readonly maxShadowTargets: number = 40;

  constructor(viewWidth: number, viewHeight: number) {
    this.orbitCenterX = viewWidth * 0.25;
    this.orbitCenterY = viewHeight * 0.15;
    this.orbitA = viewWidth * 0.3;
    this.orbitB = viewHeight * 0.12;
    this.startTime = performance.now();
  }

  public update(
    deltaTime: number,
    cameraX: number,
    cameraY: number,
    viewWidth: number,
    viewHeight: number
  ): LightSource {
    const elapsed = (performance.now() - this.startTime) / 1000;
    const angle = (elapsed / this.orbitPeriod) * Math.PI * 2;

    this.lightX = this.orbitCenterX + Math.cos(angle) * this.orbitA;
    this.lightY = this.orbitCenterY + Math.sin(angle) * this.orbitB;

    this.lightWorldX = this.lightX + cameraX;
    this.lightWorldY = this.lightY + cameraY;

    this.causticPhase += deltaTime * 2;
    this.lightIntensity = 0.85 + Math.sin(this.causticPhase * 0.7) * 0.1 + Math.sin(this.causticPhase * 1.3) * 0.05;

    return {
      x: this.lightX,
      y: this.lightY,
      worldX: this.lightWorldX,
      worldY: this.lightWorldY,
      intensity: this.lightIntensity,
      radius: this.lightRadius,
      color: { r: 255, g: 245, b: 200 }
    };
  }

  public computeShadows(
    targets: ShadowTarget[],
    cameraX: number,
    cameraY: number,
    viewWidth: number,
    viewHeight: number
  ): { masks: ShadowMask[]; useFallback: boolean } {
    const masks: ShadowMask[] = [];
    const useFallback = targets.length > this.maxShadowTargets;

    if (useFallback) {
      return { masks, useFallback: true };
    }

    for (const target of targets) {
      const screenX = target.x - cameraX;
      const screenY = target.y - cameraY;
      const centerX = screenX + target.width / 2;
      const centerY = screenY + target.height / 2;

      const dx = centerX - this.lightX;
      const dy = centerY - this.lightY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.lightRadius * 1.5) continue;

      const opacity = Math.max(0, 1 - distance / (this.lightRadius * 1.5)) * 0.5;
      if (opacity < 0.05) continue;

      const shadowPoly = this.castShadowPolygon(
        screenX,
        screenY,
        target.width,
        target.height,
        distance
      );

      masks.push({
        polygonPoints: shadowPoly,
        opacity,
        distance
      });
    }

    masks.sort((a, b) => b.distance - a.distance);

    return { masks, useFallback: false };
  }

  private castShadowPolygon(
    x: number,
    y: number,
    w: number,
    h: number,
    distance: number
  ): { x: number; y: number }[] {
    const corners = [
      { x: x, y: y },
      { x: x + w, y: y },
      { x: x + w, y: y + h },
      { x: x, y: y + h }
    ];

    const shadowLength = Math.min(300, distance * 0.6);
    const dirX = (x + w / 2 - this.lightX);
    const dirY = (y + h / 2 - this.lightY);
    const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    const normDx = dirX / dirLen;
    const normDy = dirY / dirLen;

    const extended: { x: number; y: number }[] = [];
    for (const corner of corners) {
      const cdx = corner.x - this.lightX;
      const cdy = corner.y - this.lightY;
      const cLen = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
      const extendFactor = 1 + shadowLength / cLen;
      extended.push({
        x: this.lightX + cdx * extendFactor,
        y: this.lightY + cdy * extendFactor
      });
    }

    const silhouette: { x: number; y: number }[] = [];
    const centerX = x + w / 2;
    const centerY = y + h / 2;

    for (let i = 0; i < corners.length; i++) {
      const c = corners[i];
      const toCornerX = c.x - centerX;
      const toCornerY = c.y - centerY;
      const dot = toCornerX * normDx + toCornerY * normDy;
      if (dot > 0) {
        silhouette.push(c);
      }
    }

    if (silhouette.length < 2) {
      return [
        corners[0], corners[1],
        extended[1], extended[2], extended[3], extended[0]
      ];
    }

    const result: { x: number; y: number }[] = [];
    const startIdx = corners.indexOf(silhouette[0]);
    const endIdx = corners.indexOf(silhouette[silhouette.length - 1]);

    for (let i = startIdx; ; i = (i + 1) % 4) {
      result.push(corners[i]);
      if (i === endIdx) break;
    }

    for (let i = endIdx; ; i = (i + 3) % 4) {
      result.push(extended[i]);
      if (i === startIdx) break;
    }

    return result;
  }

  public drawLightGlow(
    ctx: CanvasRenderingContext2D,
    viewWidth: number,
    viewHeight: number
  ): void {
    const gradient = ctx.createRadialGradient(
      this.lightX, this.lightY, 0,
      this.lightX, this.lightY, this.lightRadius
    );
    gradient.addColorStop(0, `rgba(255, 245, 200, ${0.35 * this.lightIntensity})`);
    gradient.addColorStop(0.3, `rgba(255, 230, 150, ${0.2 * this.lightIntensity})`);
    gradient.addColorStop(0.6, `rgba(200, 220, 255, ${0.08 * this.lightIntensity})`);
    gradient.addColorStop(1, 'rgba(100, 150, 200, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }

  public drawCaustics(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    viewWidth: number,
    viewHeight: number
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.08 * this.lightIntensity;

    const causticCount = 12;
    for (let i = 0; i < causticCount; i++) {
      const baseX = ((i * 173 + this.causticPhase * 20) % (viewWidth + 200)) - 100;
      const baseY = ((i * 89 + this.causticPhase * 10) % (viewHeight * 0.5 + 100)) + 20;
      const size = 40 + Math.sin(this.causticPhase + i) * 20;

      const gradient = ctx.createRadialGradient(
        baseX, baseY, 0,
        baseX, baseY, size
      );
      gradient.addColorStop(0, 'rgba(255, 250, 220, 0.8)');
      gradient.addColorStop(0.5, 'rgba(255, 240, 180, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 220, 150, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(baseX, baseY, size, size * 0.6, Math.sin(this.causticPhase * 0.5 + i) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public drawShadows(
    ctx: CanvasRenderingContext2D,
    masks: ShadowMask[],
    useFallback: boolean,
    viewWidth: number,
    viewHeight: number
  ): void {
    if (useFallback) {
      ctx.fillStyle = 'rgba(0, 10, 30, 0.25)';
      ctx.fillRect(0, 0, viewWidth, viewHeight);
      return;
    }

    ctx.save();
    for (const mask of masks) {
      if (mask.polygonPoints.length < 3) continue;

      const shadowGradient = ctx.createRadialGradient(
        this.lightX, this.lightY, 50,
        this.lightX, this.lightY, this.lightRadius * 1.5
      );
      shadowGradient.addColorStop(0, `rgba(0, 5, 20, ${mask.opacity})`);
      shadowGradient.addColorStop(1, 'rgba(0, 5, 20, 0)');

      ctx.fillStyle = shadowGradient;
      ctx.beginPath();
      ctx.moveTo(mask.polygonPoints[0].x, mask.polygonPoints[0].y);
      for (let i = 1; i < mask.polygonPoints.length; i++) {
        ctx.lineTo(mask.polygonPoints[i].x, mask.polygonPoints[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  public drawLightRays(
    ctx: CanvasRenderingContext2D,
    viewWidth: number,
    viewHeight: number
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const rayCount = 8;
    for (let i = 0; i < rayCount; i++) {
      const angle = Math.PI * 0.3 + (i / (rayCount - 1)) * Math.PI * 0.4;
      const rayLength = Math.max(viewWidth, viewHeight) * 1.5;
      const endX = this.lightX + Math.cos(angle) * rayLength;
      const endY = this.lightY + Math.sin(angle) * rayLength;
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);
      const width = 30 + Math.sin(this.causticPhase * 0.3 + i) * 15;

      const gradient = ctx.createLinearGradient(
        this.lightX, this.lightY,
        endX, endY
      );
      gradient.addColorStop(0, `rgba(255, 245, 200, ${0.12 * this.lightIntensity})`);
      gradient.addColorStop(0.5, `rgba(255, 230, 180, ${0.05 * this.lightIntensity})`);
      gradient.addColorStop(1, 'rgba(200, 220, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(this.lightX + perpX * width * 0.3, this.lightY + perpY * width * 0.3);
      ctx.lineTo(this.lightX - perpX * width * 0.3, this.lightY - perpY * width * 0.3);
      ctx.lineTo(endX - perpX * width, endY - perpY * width);
      ctx.lineTo(endX + perpX * width, endY + perpY * width);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  public getLightPosition(): { x: number; y: number; worldX: number; worldY: number } {
    return {
      x: this.lightX,
      y: this.lightY,
      worldX: this.lightWorldX,
      worldY: this.lightWorldY
    };
  }

  public getMaxShadowTargets(): number {
    return this.maxShadowTargets;
  }
}
