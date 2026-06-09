import { Vec2, vec2, vecAdd, vecSub, vecMul, vecDot, vecLen, vecNorm, vecDist, LightSource, Mirror, Lens, OpticsElement } from './optics';

export interface RaySegment {
  start: Vec2;
  end: Vec2;
  color: string;
  bounceCount: number;
  dispersion?: Array<{ offset: Vec2; color: string }>;
  terminated?: boolean;
}

export interface RenderParams {
  rayCount: number;
  lightIntensity: number;
  showLabels: boolean;
}

export class RayTracer {
  private canvasWidth: number;
  private canvasHeight: number;
  private maxBounces: number = 8;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  traceAll(lights: LightSource[], elements: OpticsElement[], params: RenderParams): RaySegment[] {
    const segments: RaySegment[] = [];
    for (const light of lights) {
      light.intensity = params.lightIntensity;
      segments.push(...this.traceLight(light, elements, params));
    }
    return segments;
  }

  private traceLight(light: LightSource, elements: OpticsElement[], params: RenderParams): RaySegment[] {
    const segments: RaySegment[] = [];
    for (let i = 0; i < params.rayCount; i++) {
      const angle = (i / params.rayCount) * Math.PI * 2;
      const dir = vec2(Math.cos(angle), Math.sin(angle));
      segments.push(...this.traceRay(light.position, dir, light.color, elements, 0));
    }
    return segments;
  }

  private traceRay(origin: Vec2, dir: Vec2, color: string, elements: OpticsElement[], depth: number): RaySegment[] {
    if (depth > this.maxBounces) return [];

    const maxDist = 3000;
    let nearestHit: { t: number; point: Vec2; normal: Vec2; element: OpticsElement } | null = null;

    for (const el of elements) {
      if (el instanceof LightSource) continue;
      if (el instanceof Mirror) {
        const hit = this.intersectMirror(origin, dir, el, maxDist);
        if (hit && hit.t > 0.1 && (!nearestHit || hit.t < nearestHit.t)) {
          nearestHit = { ...hit, element: el };
        }
      } else if (el instanceof Lens) {
        const hit = this.intersectLens(origin, dir, el, maxDist);
        if (hit && hit.t > 0.1 && (!nearestHit || hit.t < nearestHit.t)) {
          nearestHit = { ...hit, element: el };
        }
      }
    }

    const endPoint = nearestHit ? nearestHit.point : vecAdd(origin, vecMul(dir, maxDist));
    const clampedEnd = this.clampToCanvas(origin, dir, endPoint);
    const leftCanvas = clampedEnd !== endPoint;

    const isRefracted = nearestHit && nearestHit.element instanceof Lens;
    const currentColor = isRefracted ? '#E0FFFF' : color;

    const segment: RaySegment = {
      start: { ...origin },
      end: { ...clampedEnd },
      color: currentColor,
      bounceCount: depth,
      terminated: !nearestHit && leftCanvas ? false : (nearestHit ? false : true)
    };

    if (isRefracted && nearestHit) {
      const dispersion: Array<{ offset: Vec2; color: string }> = [];
      const colors = ['#FF4444', '#FF8C00', '#FFFF00', '#00FF00', '#00BFFF', '#4169E1', '#9932CC'];
      for (let i = 0; i < colors.length; i++) {
        dispersion.push({
          offset: vec2((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3),
          color: colors[i]
        });
      }
      segment.dispersion = dispersion;
    }

    const result: RaySegment[] = [segment];

    if (nearestHit && depth < this.maxBounces) {
      if (nearestHit.element instanceof Mirror) {
        const reflected = this.reflect(dir, nearestHit.normal);
        result.push(...this.traceRay(nearestHit.point, reflected, color, elements, depth + 1));
      } else if (nearestHit.element instanceof Lens) {
        const refracted = this.refractLens(dir, nearestHit.normal, nearestHit.element as Lens);
        result.push(...this.traceRay(nearestHit.point, refracted, '#E0FFFF', elements, depth + 1));
      }
    }

    if (!nearestHit && !leftCanvas) {
      segment.terminated = true;
    }

    return result;
  }

  private intersectMirror(origin: Vec2, dir: Vec2, mirror: Mirror, maxDist: number): { t: number; point: Vec2; normal: Vec2 } | null {
    let best: { t: number; point: Vec2; normal: Vec2 } | null = null;
    for (const edge of mirror.getEdges()) {
      const hit = this.rayLineIntersect(origin, dir, edge.start, edge.end, maxDist);
      if (hit && (!best || hit.t < best.t)) {
        const rayDotNormal = vecDot(dir, edge.normal);
        let normal = edge.normal;
        if (rayDotNormal > 0) normal = vecMul(normal, -1);
        best = { t: hit.t, point: hit.point, normal };
      }
    }
    return best;
  }

  private intersectLens(origin: Vec2, dir: Vec2, lens: Lens, maxDist: number): { t: number; point: Vec2; normal: Vec2 } | null {
    const hit = this.rayLineIntersect(origin, dir, lens.start, lens.end, maxDist);
    if (!hit) return null;
    const rayDotNormal = vecDot(dir, lens.getNormal());
    let normal = lens.getNormal();
    if (rayDotNormal > 0) normal = vecMul(normal, -1);
    return { t: hit.t, point: hit.point, normal };
  }

  private rayLineIntersect(origin: Vec2, dir: Vec2, p1: Vec2, p2: Vec2, maxDist: number): { t: number; point: Vec2 } | null {
    const v1 = vecSub(origin, p1);
    const v2 = vecSub(p2, p1);
    const v3 = vec2(-dir.y, dir.x);
    const dot = vecDot(v2, v3);
    if (Math.abs(dot) < 0.0001) return null;
    const t1 = (v2.x * v1.y - v2.y * v1.x) / dot;
    const t2 = vecDot(v1, v3) / dot;
    if (t1 > 0 && t1 < maxDist && t2 >= 0 && t2 <= 1) {
      return { t: t1, point: vecAdd(origin, vecMul(dir, t1)) };
    }
    return null;
  }

  private reflect(dir: Vec2, normal: Vec2): Vec2 {
    const d = vecDot(dir, normal);
    return vecNorm(vecSub(dir, vecMul(normal, 2 * d)));
  }

  private refractLens(dir: Vec2, normal: Vec2, lens: Lens): Vec2 {
    const focal = lens.getFocalLength();
    const center = lens.getCenter();
    const perp = lens.getNormal();
    const sign = lens.lensType === 'convex' ? 1 : -1;

    const parallel = lens.getDirection();
    const alongParallel = vecDot(dir, parallel);
    const alongPerp = vecDot(dir, perp);

    const bendFactor = sign * (1 / focal) * 15;
    const newAlongPerp = alongPerp + alongParallel * bendFactor * sign;

    return vecNorm(vecAdd(vecMul(parallel, alongParallel), vecMul(perp, newAlongPerp)));
  }

  private clampToCanvas(origin: Vec2, dir: Vec2, target: Vec2): Vec2 {
    let t = Infinity;
    if (dir.x > 0.0001) t = Math.min(t, (this.canvasWidth - origin.x) / dir.x);
    if (dir.x < -0.0001) t = Math.min(t, (-origin.x) / dir.x);
    if (dir.y > 0.0001) t = Math.min(t, (this.canvasHeight - origin.y) / dir.y);
    if (dir.y < -0.0001) t = Math.min(t, (-origin.y) / dir.y);
    if (!isFinite(t) || t < 0) return target;
    const boundPoint = vecAdd(origin, vecMul(dir, t));
    const distToTarget = vecDist(origin, target);
    const distToBound = vecDist(origin, boundPoint);
    return distToBound < distToTarget ? boundPoint : target;
  }

  render(ctx: CanvasRenderingContext2D, segments: RaySegment[], elements: OpticsElement[], params: RenderParams): void {
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.fillStyle = '#1E1E1E';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const seg of segments) {
      this.drawRaySegment(ctx, seg, params.lightIntensity);
    }

    for (const seg of segments) {
      if (seg.dispersion) {
        for (const d of seg.dispersion) {
          ctx.strokeStyle = d.color + '40';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(seg.end.x + d.offset.x, seg.end.y + d.offset.y);
          ctx.lineTo(seg.end.x + d.offset.x * 3, seg.end.y + d.offset.y * 3);
          ctx.stroke();
        }
      }
    }

    for (const el of elements) {
      el.draw(ctx);
    }

    for (const seg of segments) {
      if (seg.terminated) {
        const g = ctx.createRadialGradient(seg.end.x, seg.end.y, 0, seg.end.x, seg.end.y, 6);
        g.addColorStop(0, '#FFFFFF30');
        g.addColorStop(1, '#FFFFFF00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(seg.end.x, seg.end.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (params.showLabels) {
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      for (const seg of segments) {
        if (seg.bounceCount > 0) {
          const mid = vecAdd(vecMul(seg.start, 0.3), vecMul(seg.end, 0.7));
          ctx.fillText(String(seg.bounceCount), mid.x + 4, mid.y - 4);
        }
      }
    }
  }

  private drawRaySegment(ctx: CanvasRenderingContext2D, seg: RaySegment, intensity: number): void {
    const alpha = Math.min(1, intensity * 0.9);
    ctx.strokeStyle = seg.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(seg.start.x, seg.start.y);
    ctx.lineTo(seg.end.x, seg.end.y);
    ctx.stroke();

    ctx.strokeStyle = seg.color + Math.floor(alpha * 100).toString(16).padStart(2, '0');
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(seg.start.x, seg.start.y);
    ctx.lineTo(seg.end.x, seg.end.y);
    ctx.stroke();
  }
}
