import type { ShapeData, Vertex3D, ProjectedVertex, GlazeInfo } from './types';

const AMBIENT_INTENSITY = 0.45;
const DIRECTIONAL_INTENSITY = 0.55;
const LIGHT_DIR = { x: -0.577, y: -0.577, z: 0.577 };
const WHEEL_WIDTH = 200;
const WHEEL_HEIGHT = 20;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 160, g: 160, b: 160 };
}

function rgbToString(r: number, g: number, b: number, a = 1): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class PotteryRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  public render(shape: ShapeData): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2 + 40;

    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();

    const wheelY = cy + shape.height / 2 + WHEEL_HEIGHT / 2;
    this.drawWheelShadow(cx, wheelY);
    this.drawPotteryShadow(shape, cx, wheelY);
    this.drawWheel(cx, wheelY);
    this.drawPottery(shape, cx, cy);
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 50,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, '#F8F4EC');
    gradient.addColorStop(1, '#EDE6D6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawWheel(cx: number, cy: number): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(cx, cy);

    const wheelDepth = 30;
    const angle = (25 * Math.PI) / 180;
    const perspectiveY = Math.sin(angle);
    const perspectiveX = Math.cos(angle);

    const w = WHEEL_WIDTH / 2;
    const h = WHEEL_HEIGHT / 2;

    const topY = -h * perspectiveY;
    const bottomY = h * perspectiveY;

    const topGrad = ctx.createLinearGradient(0, topY - wheelDepth * perspectiveY, 0, topY);
    topGrad.addColorStop(0, '#8B6F47');
    topGrad.addColorStop(1, '#A08360');
    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.ellipse(0, topY - wheelDepth * perspectiveY * 0.5, w * perspectiveX, wheelDepth * perspectiveY * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const sideGrad = ctx.createLinearGradient(-w * perspectiveX, 0, w * perspectiveX, 0);
    sideGrad.addColorStop(0, '#5D4A2F');
    sideGrad.addColorStop(0.3, '#8B6F47');
    sideGrad.addColorStop(0.7, '#8B6F47');
    sideGrad.addColorStop(1, '#5D4A2F');
    ctx.fillStyle = sideGrad;
    ctx.beginPath();
    ctx.ellipse(0, topY, w * perspectiveX, wheelDepth * perspectiveY, 0, Math.PI, 0);
    ctx.lineTo(w * perspectiveX, bottomY);
    ctx.ellipse(0, bottomY, w * perspectiveX, wheelDepth * perspectiveY, 0, 0, Math.PI, true);
    ctx.closePath();
    ctx.fill();

    const topFaceGrad = ctx.createRadialGradient(0, topY - wheelDepth * perspectiveY * 0.5, 10, 0, topY - wheelDepth * perspectiveY * 0.5, w * perspectiveX);
    topFaceGrad.addColorStop(0, '#B8996E');
    topFaceGrad.addColorStop(0.7, '#8B6F47');
    topFaceGrad.addColorStop(1, '#6B4F2F');
    ctx.fillStyle = topFaceGrad;
    ctx.beginPath();
    ctx.ellipse(0, topY - wheelDepth * perspectiveY * 0.5, w * perspectiveX, wheelDepth * perspectiveY * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(60, 40, 20, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const r = (w * perspectiveX) * (0.3 + i * 0.15);
      ctx.beginPath();
      ctx.ellipse(0, topY - wheelDepth * perspectiveY * 0.5, r, wheelDepth * perspectiveY * 0.4 * (r / (w * perspectiveX)), 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawWheelShadow(cx: number, cy: number): void {
    const ctx = this.ctx;
    ctx.save();

    const shadowY = cy + 25;
    const grad = ctx.createRadialGradient(cx, shadowY, 10, cx, shadowY, WHEEL_WIDTH * 0.7);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, shadowY, WHEEL_WIDTH * 0.55, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawPotteryShadow(shape: ShapeData, cx: number, wheelY: number): void {
    const ctx = this.ctx;
    ctx.save();

    const shadowY = wheelY + 15;
    const angleRad = (shape.viewAngle * Math.PI) / 180;
    const cosA = Math.cos(angleRad);

    const bottomRadius = shape.radii[shape.radii.length - 1];
    const shadowWidth = bottomRadius * cosA * 1.3;
    const shadowOffsetX = bottomRadius * 0.3;

    const grad = ctx.createRadialGradient(
      cx + shadowOffsetX, shadowY, 5,
      cx + shadowOffsetX, shadowY, Math.max(shadowWidth, 40)
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx + shadowOffsetX, shadowY, shadowWidth, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawPottery(shape: ShapeData, cx: number, cy: number): void {
    const ctx = this.ctx;
    const { radii, height, heightSegments, radialSegments, viewAngle, glazeMap } = shape;

    const angleRad = (viewAngle * Math.PI) / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    const vertices: ProjectedVertex[][] = [];
    const normals: Vertex3D[][] = [];

    for (let h = 0; h < heightSegments; h++) {
      const row: ProjectedVertex[] = [];
      const normalRow: Vertex3D[] = [];
      const normalizedH = h / (heightSegments - 1);
      const worldY = cy + height / 2 - normalizedH * height;
      const radius = radii[h];

      const prevRadius = h > 0 ? radii[h - 1] : radius;
      const nextRadius = h < heightSegments - 1 ? radii[h + 1] : radius;
      const dr = (nextRadius - prevRadius) / 2;
      const dh = height / heightSegments;
      const slopeAngle = Math.atan2(dr, dh);

      for (let r = 0; r <= radialSegments; r++) {
        const theta = (r / radialSegments) * Math.PI * 2;
        const localX = radius * Math.cos(theta);
        const localZ = radius * Math.sin(theta);

        const screenX = cx + localX * cosA + localZ * sinA;
        const screenZ = -localX * sinA + localZ * cosA;

        row.push({ x: screenX, y: worldY, z: localZ, depth: screenZ });

        const nx = Math.cos(theta) * Math.cos(slopeAngle);
        const ny = -Math.sin(slopeAngle);
        const nz = Math.sin(theta) * Math.cos(slopeAngle);
        normalRow.push({ x: nx, y: ny, z: nz });
      }
      vertices.push(row);
      normals.push(normalRow);
    }

    const faces: Array<{
      h: number;
      r: number;
      depth: number;
      v1: ProjectedVertex;
      v2: ProjectedVertex;
      v3: ProjectedVertex;
      v4: ProjectedVertex;
      n1: Vertex3D;
      n2: Vertex3D;
      n3: Vertex3D;
      n4: Vertex3D;
    }> = [];

    for (let h = 0; h < heightSegments - 1; h++) {
      for (let r = 0; r < radialSegments; r++) {
        const v1 = vertices[h][r];
        const v2 = vertices[h][r + 1];
        const v3 = vertices[h + 1][r + 1];
        const v4 = vertices[h + 1][r];
        const n1 = normals[h][r];
        const n2 = normals[h][r + 1];
        const n3 = normals[h + 1][r + 1];
        const n4 = normals[h + 1][r];

        const avgDepth = (v1.depth + v2.depth + v3.depth + v4.depth) / 4;

        if (avgDepth > -5) {
          faces.push({ h, r, depth: avgDepth, v1, v2, v3, v4, n1, n2, n3, n4 });
        }
      }
    }

    faces.sort((a, b) => a.depth - b.depth);

    for (const face of faces) {
      this.drawFace(shape, face, cx, cy);
    }

    this.drawSilhouette(shape, cx, cy, cosA, sinA);
    this.drawRimLight(shape, cx, cy, cosA, sinA);
  }

  private drawFace(
    shape: ShapeData,
    face: {
      h: number;
      v1: ProjectedVertex;
      v2: ProjectedVertex;
      v3: ProjectedVertex;
      v4: ProjectedVertex;
      n1: Vertex3D;
      n2: Vertex3D;
      n3: Vertex3D;
      n4: Vertex3D;
    },
    _cx: number,
    _cy: number
  ): void {
    const ctx = this.ctx;

    const avgNormal = {
      x: (face.n1.x + face.n2.x + face.n3.x + face.n4.x) / 4,
      y: (face.n1.y + face.n2.y + face.n3.y + face.n4.y) / 4,
      z: (face.n1.z + face.n2.z + face.n3.z + face.n4.z) / 4
    };

    const len = Math.sqrt(avgNormal.x ** 2 + avgNormal.y ** 2 + avgNormal.z ** 2) || 1;
    avgNormal.x /= len;
    avgNormal.y /= len;
    avgNormal.z /= len;

    const dot = avgNormal.x * LIGHT_DIR.x + avgNormal.y * LIGHT_DIR.y + avgNormal.z * LIGHT_DIR.z;
    const intensity = Math.max(0, dot) * DIRECTIONAL_INTENSITY + AMBIENT_INTENSITY;

    const glaze = shape.glazeMap.get(face.h);
    const isRippleArea = shape.ripples.some(r => Math.abs(r.heightIndex - face.h) < 8);

    let baseColor: { r: number; g: number; b: number };
    let alpha = 1;
    let specular = 0;

    if (glaze) {
      baseColor = hexToRgb(glaze.color);
      alpha = 0.7 + (5 - glaze.thickness) * 0.06;
      specular = glaze.thickness * 0.15;
    } else {
      baseColor = hexToRgb(shape.baseColor);
      specular = 0.05;
    }

    if (isRippleArea) {
      const ripple = shape.ripples.find(r => Math.abs(r.heightIndex - face.h) < 8);
      if (ripple) {
        const elapsed = performance.now() - ripple.startTime;
        const progress = elapsed / ripple.duration;
        const dist = Math.abs(ripple.heightIndex - face.h);
        const wave = Math.exp(-dist * 0.3) * Math.sin(progress * Math.PI * 4 - dist * 0.5);
        const rippleAlpha = Math.max(0, 1 - progress) * 0.5;
        const rippleColor = hexToRgb(ripple.color);
        baseColor.r = lerp(baseColor.r, rippleColor.r, rippleAlpha * (0.5 + wave * 0.5));
        baseColor.g = lerp(baseColor.g, rippleColor.g, rippleAlpha * (0.5 + wave * 0.5));
        baseColor.b = lerp(baseColor.b, rippleColor.b, rippleAlpha * (0.5 + wave * 0.5));
        specular += rippleAlpha * 0.3;
      }
    }

    const r = Math.min(255, baseColor.r * intensity);
    const g = Math.min(255, baseColor.g * intensity);
    const b = Math.min(255, baseColor.b * intensity);

    const halfDir = {
      x: LIGHT_DIR.x,
      y: LIGHT_DIR.y - 0.5,
      z: LIGHT_DIR.z
    };
    const halfLen = Math.sqrt(halfDir.x ** 2 + halfDir.y ** 2 + halfDir.z ** 2) || 1;
    halfDir.x /= halfLen;
    halfDir.y /= halfLen;
    halfDir.z /= halfLen;

    const specDot = Math.max(0, avgNormal.x * halfDir.x + avgNormal.y * halfDir.y + avgNormal.z * halfDir.z);
    const specIntensity = Math.pow(specDot, 32) * specular;

    ctx.beginPath();
    ctx.moveTo(face.v1.x, face.v1.y);
    ctx.lineTo(face.v2.x, face.v2.y);
    ctx.lineTo(face.v3.x, face.v3.y);
    ctx.lineTo(face.v4.x, face.v4.y);
    ctx.closePath();

    if (specular > 0 && specIntensity > 0.01) {
      const grad = ctx.createLinearGradient(face.v1.x, face.v1.y, face.v3.x, face.v3.y);
      grad.addColorStop(0, rgbToString(r, g, b, alpha));
      grad.addColorStop(0.5, rgbToString(
        Math.min(255, r + specIntensity * 255),
        Math.min(255, g + specIntensity * 255),
        Math.min(255, b + specIntensity * 255),
        alpha
      ));
      grad.addColorStop(1, rgbToString(r, g, b, alpha));
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = rgbToString(r, g, b, alpha);
    }

    ctx.fill();
  }

  private drawSilhouette(
    shape: ShapeData,
    cx: number,
    cy: number,
    cosA: number,
    _sinA: number
  ): void {
    const ctx = this.ctx;
    const { radii, height, heightSegments } = shape;

    ctx.save();
    ctx.strokeStyle = 'rgba(80, 60, 40, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (let h = 0; h < heightSegments; h++) {
      const normalizedH = h / (heightSegments - 1);
      const y = cy + height / 2 - normalizedH * height;
      const x = cx - radii[h] * cosA;
      if (h === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let h = 0; h < heightSegments; h++) {
      const normalizedH = h / (heightSegments - 1);
      const y = cy + height / 2 - normalizedH * height;
      const x = cx + radii[h] * cosA;
      if (h === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.beginPath();
    const topY = cy + height / 2;
    ctx.ellipse(cx, topY, radii[0] * cosA, radii[0] * _sinA * 0.5 + 2, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(80, 60, 40, 0.2)';
    ctx.stroke();

    ctx.restore();
  }

  private drawRimLight(
    shape: ShapeData,
    cx: number,
    cy: number,
    cosA: number,
    _sinA: number
  ): void {
    const ctx = this.ctx;
    const { radii, height } = shape;

    const topY = cy + height / 2;
    const topRadius = radii[0];

    const innerGrad = ctx.createRadialGradient(
      cx, topY, topRadius * 0.2 * cosA,
      cx, topY, topRadius * cosA
    );
    innerGrad.addColorStop(0, '#B8B8B8');
    innerGrad.addColorStop(0.7, '#909090');
    innerGrad.addColorStop(1, '#707070');

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, topY, topRadius * cosA, topRadius * _sinA * 0.5 + 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();
    ctx.restore();
  }
}
