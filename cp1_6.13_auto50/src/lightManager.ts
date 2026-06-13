export interface Vec2 {
  x: number;
  y: number;
}

export interface LightRay {
  origin: Vec2;
  direction: Vec2;
  color: string;
  intensity: number;
  distanceFromPrism: number;
  isSplit: boolean;
}

export interface LightSegment {
  start: Vec2;
  end: Vec2;
  color: string;
  intensity: number;
}

export interface CollisionPoint {
  point: Vec2;
  normal: Vec2;
  t: number;
  mirrorIndex: number;
  prismIndex: number;
  targetIndex: number;
  type: 'mirror' | 'prism' | 'target' | 'boundary';
}

export interface MirrorData {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
}

export interface PrismData {
  x: number;
  y: number;
  size: number;
  refractiveIndex: number;
}

export interface LensData {
  x: number;
  y: number;
  focalLength: number;
  isConverging: boolean;
  height: number;
}

export interface TargetData {
  x: number;
  y: number;
  radius: number;
}

export interface EmitterData {
  x: number;
  y: number;
  direction: Vec2;
  color: string;
}

export interface FlashEffect {
  x: number;
  y: number;
  radius: number;
  startTime: number;
  duration: number;
}

const EPSILON = 0.001;
const MAX_BOUNCES = 6;
const MAX_RAY_LENGTH = 1200;
const PRISM_SPLIT_DISTANCE_FADE = 50;
const FADE_RATE = 0.1;
const FADE_INTERVAL = 10;

function vec2Add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function vec2Sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function vec2Scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function vec2Dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function vec2Length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function vec2Normalize(v: Vec2): Vec2 {
  const len = vec2Length(v);
  if (len < EPSILON) return { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function vec2Perpendicular(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x };
}

function reflect(incident: Vec2, normal: Vec2): Vec2 {
  const d = vec2Dot(incident, normal);
  return vec2Sub(incident, vec2Scale(normal, 2 * d));
}

function refract(incident: Vec2, normal: Vec2, n1: number, n2: number): Vec2 | null {
  const ratio = n1 / n2;
  const cosI = -vec2Dot(incident, normal);
  const sinT2 = ratio * ratio * (1 - cosI * cosI);
  if (sinT2 > 1) return null;
  const cosT = Math.sqrt(1 - sinT2);
  return vec2Normalize(vec2Add(vec2Scale(incident, ratio), vec2Scale(normal, ratio * cosI - cosT)));
}

function getMirrorEndpoints(mirror: MirrorData): [Vec2, Vec2] {
  const rad = (mirror.angle * Math.PI) / 180;
  const halfLen = mirror.length / 2;
  const dx = Math.cos(rad) * halfLen;
  const dy = Math.sin(rad) * halfLen;
  return [
    { x: mirror.x - dx, y: mirror.y - dy },
    { x: mirror.x + dx, y: mirror.y + dy },
  ];
}

function getPrismVertices(prism: PrismData): Vec2[] {
  const s = prism.size;
  const h = (s * Math.sqrt(3)) / 2;
  return [
    { x: prism.x, y: prism.y - h * (2 / 3) },
    { x: prism.x - s / 2, y: prism.y + h / 3 },
    { x: prism.x + s / 2, y: prism.y + h / 3 },
  ];
}

function getPrismEdges(prism: PrismData): [Vec2, Vec2][] {
  const v = getPrismVertices(prism);
  return [
    [v[0], v[1]],
    [v[1], v[2]],
    [v[2], v[0]],
  ];
}

function getEdgeNormal(a: Vec2, b: Vec2, interiorPoint: Vec2): Vec2 {
  const edge = vec2Sub(b, a);
  const n1 = vec2Normalize(vec2Perpendicular(edge));
  const n2 = vec2Normalize({ x: -n1.x, y: -n1.y });
  const mid = vec2Scale(vec2Add(a, b), 0.5);
  const d1 = vec2Dot(vec2Sub(interiorPoint, mid), n1);
  return d1 < 0 ? n1 : n2;
}

function raySegmentIntersect(
  rayOrigin: Vec2,
  rayDir: Vec2,
  segA: Vec2,
  segB: Vec2
): { t: number; u: number; point: Vec2 } | null {
  const edge = vec2Sub(segB, segA);
  const denom = rayDir.x * edge.y - rayDir.y * edge.x;
  if (Math.abs(denom) < EPSILON) return null;
  const diff = vec2Sub(segA, rayOrigin);
  const t = (diff.x * edge.y - diff.y * edge.x) / denom;
  const u = (diff.x * rayDir.y - diff.y * rayDir.x) / denom;
  if (t > EPSILON && u >= 0 && u <= 1) {
    return {
      t,
      u,
      point: vec2Add(rayOrigin, vec2Scale(rayDir, t)),
    };
  }
  return null;
}

function pointInTriangle(p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean {
  const sign = (p1: Vec2, p2: Vec2, p3: Vec2) =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = sign(p, a, b);
  const d2 = sign(p, b, c);
  const d3 = sign(p, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

export class LightManager {
  private segments: LightSegment[] = [];
  private flashEffects: FlashEffect[] = [];
  private hitTarget: boolean = false;
  private hitTargetPoint: Vec2 | null = null;

  traceRays(
    emitter: EmitterData,
    mirrors: MirrorData[],
    prisms: PrismData[],
    lenses: LensData[],
    target: TargetData,
    canvasWidth: number,
    canvasHeight: number
  ): { segments: LightSegment[]; flashEffects: FlashEffect[]; hitTarget: boolean; hitTargetPoint: Vec2 | null } {
    this.segments = [];
    this.flashEffects = [];
    this.hitTarget = false;
    this.hitTargetPoint = null;

    const initialRay: LightRay = {
      origin: { x: emitter.x, y: emitter.y },
      direction: vec2Normalize(emitter.direction),
      color: emitter.color,
      intensity: 1,
      distanceFromPrism: -1,
      isSplit: false,
    };

    this.traceRayRecursive(
      initialRay,
      mirrors,
      prisms,
      lenses,
      target,
      canvasWidth,
      canvasHeight,
      0
    );

    return {
      segments: this.segments,
      flashEffects: this.flashEffects,
      hitTarget: this.hitTarget,
      hitTargetPoint: this.hitTargetPoint,
    };
  }

  private traceRayRecursive(
    ray: LightRay,
    mirrors: MirrorData[],
    prisms: PrismData[],
    lenses: LensData[],
    target: TargetData,
    cw: number,
    ch: number,
    depth: number
  ): void {
    if (depth >= MAX_BOUNCES) return;

    let closestCollision: CollisionPoint | null = null;
    let closestT = MAX_RAY_LENGTH;

    for (let i = 0; i < mirrors.length; i++) {
      const [a, b] = getMirrorEndpoints(mirrors[i]);
      const hit = raySegmentIntersect(ray.origin, ray.direction, a, b);
      if (hit && hit.t < closestT) {
        const normal = getEdgeNormal(a, b, { x: mirrors[i].x, y: mirrors[i].y });
        closestT = hit.t;
        closestCollision = {
          point: hit.point,
          normal,
          t: hit.t,
          mirrorIndex: i,
          prismIndex: -1,
          targetIndex: -1,
          type: 'mirror',
        };
      }
    }

    for (let i = 0; i < prisms.length; i++) {
      const prism = prisms[i];
      const edges = getPrismEdges(prism);
      const center = { x: prism.x, y: prism.y };

      for (const [a, b] of edges) {
        const hit = raySegmentIntersect(ray.origin, ray.direction, a, b);
        if (hit && hit.t < closestT) {
          const outwardNormal = getEdgeNormal(a, b, center);
          closestT = hit.t;
          closestCollision = {
            point: hit.point,
            normal: outwardNormal,
            t: hit.t,
            mirrorIndex: -1,
            prismIndex: i,
            targetIndex: -1,
            type: 'prism',
          };
        }
      }
    }

    const targetHit = this.rayCircleIntersect(ray.origin, ray.direction, target);
    if (targetHit && targetHit.t < closestT) {
      closestT = targetHit.t;
      closestCollision = {
        point: targetHit.point,
        normal: { x: 0, y: 0 },
        t: targetHit.t,
        mirrorIndex: -1,
        prismIndex: -1,
        targetIndex: 0,
        type: 'target',
      };
    }

    const boundaryT = this.rayBoundaryIntersect(ray.origin, ray.direction, cw, ch);
    if (boundaryT < closestT) {
      closestT = boundaryT;
      const boundaryPoint = vec2Add(ray.origin, vec2Scale(ray.direction, boundaryT));
      closestCollision = {
        point: boundaryPoint,
        normal: { x: 0, y: 0 },
        t: boundaryT,
        mirrorIndex: -1,
        prismIndex: -1,
        targetIndex: -1,
        type: 'boundary',
      };
    }

    if (!closestCollision) {
      const end = vec2Add(ray.origin, vec2Scale(ray.direction, MAX_RAY_LENGTH));
      this.addSegment(ray, end);
      return;
    }

    this.addSegment(ray, closestCollision.point);

    if (closestCollision.type === 'mirror') {
      this.flashEffects.push({
        x: closestCollision.point.x,
        y: closestCollision.point.y,
        radius: 8,
        startTime: 0,
        duration: 500,
      });

      const reflDir = reflect(ray.direction, closestCollision.normal);
      const newRay: LightRay = {
        origin: vec2Add(closestCollision.point, vec2Scale(reflDir, EPSILON * 2)),
        direction: vec2Normalize(reflDir),
        color: ray.color,
        intensity: ray.intensity,
        distanceFromPrism: ray.distanceFromPrism,
        isSplit: ray.isSplit,
      };
      this.traceRayRecursive(newRay, mirrors, prisms, lenses, target, cw, ch, depth + 1);
    } else if (closestCollision.type === 'prism') {
      const prism = prisms[closestCollision.prismIndex];
      const center = { x: prism.x, y: prism.y };
      const enteringPrism = vec2Dot(ray.direction, closestCollision.normal) < 0;

      if (enteringPrism) {
        if (!ray.isSplit) {
          const splitColors = ['#ff3333', '#33ff33', '#3333ff'];
          const baseRefractAngle = Math.asin(1 / prism.refractiveIndex);

          for (let ci = 0; ci < splitColors.length; ci++) {
            let refractedDir: Vec2;
            if (ci === 0) {
              const refr = refract(ray.direction, closestCollision.normal, 1.0, prism.refractiveIndex);
              if (!refr) continue;
              refractedDir = refr;
            } else {
              const angleOffset = (ci === 1 ? -1 : 1) * baseRefractAngle * 0.7;
              const cos = Math.cos(angleOffset);
              const sin = Math.sin(angleOffset);
              const baseRefr = refract(ray.direction, closestCollision.normal, 1.0, prism.refractiveIndex);
              if (!baseRefr) continue;
              refractedDir = vec2Normalize({
                x: baseRefr.x * cos - baseRefr.y * sin,
                y: baseRefr.x * sin + baseRefr.y * cos,
              });
            }

            const insideNormal = vec2Scale(closestCollision.normal, -1);
            const insideOrigin = vec2Add(closestCollision.point, vec2Scale(refractedDir, EPSILON * 2));

            const exitResult = this.findPrismExit(
              insideOrigin,
              refractedDir,
              prism,
              center,
              insideNormal
            );

            if (exitResult) {
              this.addSegment(
                { ...ray, color: splitColors[ci], intensity: 1, distanceFromPrism: -1 },
                exitResult.point
              );

              const exitNormal = exitResult.normal;
              const exitRefr = refract(refractedDir, exitNormal, prism.refractiveIndex, 1.0);

              if (exitRefr) {
                const splitRay: LightRay = {
                  origin: vec2Add(exitResult.point, vec2Scale(exitRefr, EPSILON * 2)),
                  direction: vec2Normalize(exitRefr),
                  color: splitColors[ci],
                  intensity: 1,
                  distanceFromPrism: 0,
                  isSplit: true,
                };
                this.traceRayRecursive(splitRay, mirrors, prisms, lenses, target, cw, ch, depth + 1);
              }
            }
          }
        } else {
          const refr = refract(ray.direction, closestCollision.normal, 1.0, prism.refractiveIndex);
          if (refr) {
            const newRay: LightRay = {
              origin: vec2Add(closestCollision.point, vec2Scale(refr, EPSILON * 2)),
              direction: vec2Normalize(refr),
              color: ray.color,
              intensity: ray.intensity,
              distanceFromPrism: ray.distanceFromPrism,
              isSplit: ray.isSplit,
            };
            this.traceRayRecursive(newRay, mirrors, prisms, lenses, target, cw, ch, depth + 1);
          }
        }
      } else {
        const refr = refract(ray.direction, closestCollision.normal, prism.refractiveIndex, 1.0);
        if (refr) {
          const newRay: LightRay = {
            origin: vec2Add(closestCollision.point, vec2Scale(refr, EPSILON * 2)),
            direction: vec2Normalize(refr),
            color: ray.color,
            intensity: ray.intensity,
            distanceFromPrism: ray.distanceFromPrism >= 0 ? ray.distanceFromPrism : 0,
            isSplit: ray.isSplit,
          };
          this.traceRayRecursive(newRay, mirrors, prisms, lenses, target, cw, ch, depth + 1);
        } else {
          const reflDir = reflect(ray.direction, closestCollision.normal);
          const newRay: LightRay = {
            origin: vec2Add(closestCollision.point, vec2Scale(reflDir, EPSILON * 2)),
            direction: vec2Normalize(reflDir),
            color: ray.color,
            intensity: ray.intensity,
            distanceFromPrism: ray.distanceFromPrism,
            isSplit: ray.isSplit,
          };
          this.traceRayRecursive(newRay, mirrors, prisms, lenses, target, cw, ch, depth + 1);
        }
      }
    } else if (closestCollision.type === 'target') {
      this.hitTarget = true;
      this.hitTargetPoint = closestCollision.point;
    }
  }

  private findPrismExit(
    origin: Vec2,
    direction: Vec2,
    prism: PrismData,
    center: Vec2,
    entryNormal: Vec2
  ): { point: Vec2; normal: Vec2 } | null {
    const edges = getPrismEdges(prism);
    let closestT = MAX_RAY_LENGTH;
    let result: { point: Vec2; normal: Vec2 } | null = null;

    for (const [a, b] of edges) {
      const hit = raySegmentIntersect(origin, direction, a, b);
      if (hit && hit.t < closestT && hit.t > EPSILON) {
        const outwardNormal = getEdgeNormal(a, b, center);
        closestT = hit.t;
        result = { point: hit.point, normal: outwardNormal };
      }
    }
    return result;
  }

  private rayCircleIntersect(
    origin: Vec2,
    dir: Vec2,
    target: TargetData
  ): { t: number; point: Vec2 } | null {
    const oc = vec2Sub(origin, { x: target.x, y: target.y });
    const a = vec2Dot(dir, dir);
    const b = 2 * vec2Dot(oc, dir);
    const c = vec2Dot(oc, oc) - 15 * 15;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const sqrtDisc = Math.sqrt(disc);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);
    const t = t1 > EPSILON ? t1 : t2 > EPSILON ? t2 : -1;
    if (t < 0) return null;
    return { t, point: vec2Add(origin, vec2Scale(dir, t)) };
  }

  private rayBoundaryIntersect(origin: Vec2, dir: Vec2, cw: number, ch: number): number {
    let tMin = MAX_RAY_LENGTH;
    if (Math.abs(dir.x) > EPSILON) {
      const t1 = -origin.x / dir.x;
      const t2 = (cw - origin.x) / dir.x;
      if (t1 > EPSILON) tMin = Math.min(tMin, t1);
      if (t2 > EPSILON) tMin = Math.min(tMin, t2);
    }
    if (Math.abs(dir.y) > EPSILON) {
      const t3 = -origin.y / dir.y;
      const t4 = (ch - origin.y) / dir.y;
      if (t3 > EPSILON) tMin = Math.min(tMin, t3);
      if (t4 > EPSILON) tMin = Math.min(tMin, t4);
    }
    return tMin;
  }

  private addSegment(ray: LightRay, end: Vec2): void {
    const segLen = vec2Length(vec2Sub(end, ray.origin));
    let intensity = ray.intensity;

    if (ray.isSplit && ray.distanceFromPrism >= 0) {
      const totalDist = ray.distanceFromPrism + segLen;
      const fadeStart = PRISM_SPLIT_DISTANCE_FADE;
      if (totalDist > fadeStart) {
        const fadeDist = totalDist - fadeStart;
        const fadeFactor = Math.max(0, 1 - (fadeDist / FADE_INTERVAL) * FADE_RATE);
        intensity *= fadeFactor;
      }
      this.segments.push({
        start: ray.origin,
        end,
        color: ray.color,
        intensity: Math.max(0, intensity),
      });
      return;
    }

    this.segments.push({
      start: ray.origin,
      end,
      color: ray.color,
      intensity,
    });
  }

  static getMirrorEndpoints(mirror: MirrorData): [Vec2, Vec2] {
    return getMirrorEndpoints(mirror);
  }

  static getPrismVertices(prism: PrismData): Vec2[] {
    return getPrismVertices(prism);
  }
}
