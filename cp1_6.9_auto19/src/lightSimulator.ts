import type p5 from 'p5';
import type { GlassPiece, Vertex, HSLColor } from './glassPiece';

export interface ProjectionPolygon {
  vertices: Vertex[];
  color: HSLColor;
}

export class LightSimulator {
  azimuthAngle: number;
  elevationAngle: number;
  controlKnob: { x: number; y: number };
  draggingKnob: boolean;
  readonly controlRadius: number;
  readonly knobRadius: number;
  private _cachedLightDir: { x: number; y: number; z: number } | null;
  private _cacheAzimuth: number;
  private _cacheElevation: number;

  constructor() {
    this.azimuthAngle = 270;
    this.elevationAngle = 45;
    this.controlKnob = { x: 0, y: 0 };
    this.draggingKnob = false;
    this.controlRadius = 60;
    this.knobRadius = 6;
    this._cachedLightDir = null;
    this._cacheAzimuth = -1;
    this._cacheElevation = -1;
  }

  setFromKnobPosition(
    knobX: number,
    knobY: number,
    controlCenterX: number,
    controlCenterY: number
  ): void {
    const dx = knobX - controlCenterX;
    const dy = knobY - controlCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this.controlRadius - this.knobRadius - 4;

    let clampedDx = dx;
    let clampedDy = dy;
    if (dist > maxDist) {
      clampedDx = (dx / dist) * maxDist;
      clampedDy = (dy / dist) * maxDist;
    }

    this.controlKnob.x = clampedDx;
    this.controlKnob.y = clampedDy;

    let azimuth = Math.atan2(clampedDy, clampedDx) * (180 / Math.PI);
    if (azimuth < 0) azimuth += 360;
    this.azimuthAngle = azimuth;

    const normalizedDist = Math.min(1, dist / maxDist);
    this.elevationAngle = 15 + (1 - normalizedDist) * 60;
  }

  updateKnobFromAngles(controlCenterX: number, controlCenterY: number): void {
    const azimuthRad = (this.azimuthAngle * Math.PI) / 180;
    const elevationNormalized = (this.elevationAngle - 15) / 60;
    const distFactor = 1 - elevationNormalized;
    const maxDist = this.controlRadius - this.knobRadius - 4;
    const dist = distFactor * maxDist;

    this.controlKnob.x = Math.cos(azimuthRad) * dist;
    this.controlKnob.y = Math.sin(azimuthRad) * dist;
  }

  getLightDirection(): { x: number; y: number; z: number } {
    if (
      this._cachedLightDir &&
      this._cacheAzimuth === this.azimuthAngle &&
      this._cacheElevation === this.elevationAngle
    ) {
      return this._cachedLightDir;
    }

    const azimuthRad = (this.azimuthAngle * Math.PI) / 180;
    const elevationRad = (this.elevationAngle * Math.PI) / 180;

    const dir = {
      x: Math.cos(elevationRad) * Math.cos(azimuthRad),
      y: -Math.sin(elevationRad),
      z: Math.cos(elevationRad) * Math.sin(azimuthRad),
    };

    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    const result = {
      x: dir.x / len,
      y: dir.y / len,
      z: dir.z / len,
    };

    this._cachedLightDir = result;
    this._cacheAzimuth = this.azimuthAngle;
    this._cacheElevation = this.elevationAngle;
    return result;
  }

  calculateStretchFactor(): number {
    const t = (this.elevationAngle - 15) / 60;
    return 2.0 - t * 0.8;
  }

  getMixedColor(piece: GlassPiece): HSLColor {
    const c = piece.color;
    const mixAmount = c.a;
    return {
      h: c.h,
      s: c.s * (1 - mixAmount * 0.5),
      l: c.l + (100 - c.l) * mixAmount * 0.4,
      a: 0.3,
    };
  }

  calculateWallProjection(
    piece: GlassPiece,
    wallStartX: number,
    windowRightX: number
  ): ProjectionPolygon {
    const lightDir = this.getLightDirection();
    const stretch = this.calculateStretchFactor();
    const worldVerts = piece.getWorldVertices();

    const projectionDistance = Math.max(20, windowRightX - wallStartX);
    const xShiftAmount = lightDir.x >= 0
      ? 30 + (projectionDistance * 0.15)
      : -10;

    const vertStretch = stretch;
    const horizStretch = 1 + (stretch - 1) * 0.5;

    const center = piece.getCenter();
    const dxToWindow = windowRightX - center.x;
    const xOffset = xShiftAmount + dxToWindow * 0.3;
    const yStretch = lightDir.y < 0 ? -lightDir.y * vertStretch * 40 : 10;

    const projectedVerts: Vertex[] = worldVerts.map((v) => {
      const relX = v.x - center.x;
      const relY = v.y - center.y;
      return {
        x: wallStartX + 10 + xOffset + relX * horizStretch + (lightDir.x * 50),
        y: center.y + yStretch + relY * vertStretch + (lightDir.y * 30),
      };
    });

    const color = this.getMixedColor(piece);
    return { vertices: projectedVerts, color };
  }

  drawControlPanel(
    p: p5,
    centerX: number,
    centerY: number
  ): void {
    p.push();

    p.noStroke();
    p.fill(51, 51, 51, 200);
    p.ellipse(centerX, centerY, this.controlRadius * 2, this.controlRadius * 2);

    p.stroke(136, 136, 136, 200);
    p.strokeWeight(2);
    p.noFill();
    p.ellipse(centerX, centerY, this.controlRadius * 2, this.controlRadius * 2);

    p.stroke(100, 100, 100, 120);
    p.strokeWeight(1);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const innerR = this.knobRadius + 8;
      const outerR = this.controlRadius - 4;
      p.line(
        centerX + Math.cos(angle) * innerR,
        centerY + Math.sin(angle) * innerR,
        centerX + Math.cos(angle) * outerR,
        centerY + Math.sin(angle) * outerR
      );
    }

    const knobX = centerX + this.controlKnob.x;
    const knobY = centerY + this.controlKnob.y;

    p.noStroke();
    p.fill(255, 255, 255, 220);
    p.ellipse(knobX, knobY, this.knobRadius * 2, this.knobRadius * 2);

    p.fill(255, 255, 255, 80);
    p.ellipse(knobX, knobY, this.knobRadius * 2 + 6, this.knobRadius * 2 + 6);

    p.pop();
  }

  isKnobHit(
    px: number,
    py: number,
    centerX: number,
    centerY: number
  ): boolean {
    const knobX = centerX + this.controlKnob.x;
    const knobY = centerY + this.controlKnob.y;
    const dx = px - knobX;
    const dy = py - knobY;
    return Math.sqrt(dx * dx + dy * dy) <= this.knobRadius + 8;
  }

  isInsideControlPanel(
    px: number,
    py: number,
    centerX: number,
    centerY: number
  ): boolean {
    const dx = px - centerX;
    const dy = py - centerY;
    return Math.sqrt(dx * dx + dy * dy) <= this.controlRadius;
  }
}
