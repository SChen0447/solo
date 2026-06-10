import * as THREE from 'three';
import { Prism, PrismFace } from './prism';

export interface LightConfig {
  intensity: number;
  refractionIndex: number;
  maxBeams: number;
}

interface BeamSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
}

interface RayHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  prism: Prism;
  face: PrismFace;
}

const WAVELENGTH_COLORS = [
  0xff3333, 0xff7722, 0xffcc22, 0x88ff44,
  0x22ffcc, 0x2299ff, 0x6644ff, 0xcc33ff
];

export class LightSystem {
  private scene: THREE.Scene;
  private prisms: Prism[] = [];
  private beamsGroup: THREE.Group;
  private particlesGroup: THREE.Group;
  private sourcePosition: THREE.Vector3;
  private config: LightConfig;
  private beamLines: THREE.Line[] = [];
  private particles: THREE.Mesh[] = [];
  private maxBounces: number = 4;

  constructor(
    scene: THREE.Scene,
    sourcePosition: THREE.Vector3,
    config: LightConfig
  ) {
    this.scene = scene;
    this.sourcePosition = sourcePosition.clone();
    this.config = { ...config };

    this.beamsGroup = new THREE.Group();
    this.particlesGroup = new THREE.Group();
    this.scene.add(this.beamsGroup);
    this.scene.add(this.particlesGroup);
  }

  public setPrisms(prisms: Prism[]): void {
    this.prisms = prisms;
  }

  public updateConfig(config: Partial<LightConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): LightConfig {
    return { ...this.config };
  }

  public setSourcePosition(pos: THREE.Vector3): void {
    this.sourcePosition.copy(pos);
  }

  public clear(): void {
    while (this.beamsGroup.children.length > 0) {
      const child = this.beamsGroup.children[0];
      this.beamsGroup.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    while (this.particlesGroup.children.length > 0) {
      const child = this.particlesGroup.children[0];
      this.particlesGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    this.beamLines = [];
    this.particles = [];
  }

  public compute(): void {
    this.clear();

    const segments = 100;
    const initialDir = new THREE.Vector3(0, -1, 0).normalize();

    const allBeams: BeamSegment[][] = [];

    this.traceRayRecursive(
      this.sourcePosition.clone(),
      initialDir,
      new THREE.Color(0xffffff),
      new THREE.Color(0xffffff),
      0,
      allBeams,
      null,
      0
    );

    const clampedBeams = allBeams.slice(0, this.config.maxBeams);

    clampedBeams.forEach((beamPath, beamIndex) => {
      this.renderBeamPath(beamPath, segments, beamIndex);
    });

    this.renderSourcePoint();
  }

  private traceRayRecursive(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    colorStart: THREE.Color,
    colorEnd: THREE.Color,
    depth: number,
    allBeams: BeamSegment[][],
    currentBeam: BeamSegment[] | null,
    beamIndex: number
  ): void {
    if (depth > this.maxBounces) {
      if (currentBeam && currentBeam.length > 0) {
        allBeams.push(currentBeam);
      }
      return;
    }

    const hit = this.intersectPrisms(origin, direction);
    const beam: BeamSegment[] = currentBeam ? [...currentBeam] : [];

    if (!hit) {
      const endPoint = origin
        .clone()
        .add(direction.clone().multiplyScalar(20));
      beam.push({
        start: origin.clone(),
        end: endPoint,
        colorStart: colorStart.clone(),
        colorEnd: colorEnd.clone()
      });
      allBeams.push(beam);
      return;
    }

    beam.push({
      start: origin.clone(),
      end: hit.point.clone(),
      colorStart: colorStart.clone(),
      colorEnd: colorEnd.clone()
    });

    if (allBeams.length >= this.config.maxBeams) {
      allBeams.push(beam);
      return;
    }

    const n1 = 1.0;
    const n2 = this.config.refractionIndex;

    const incident = direction.clone().normalize();
    const normal = hit.normal.clone().normalize();

    const facingNormal = normal.clone();
    if (incident.dot(facingNormal) > 0) {
      facingNormal.negate();
    }

    const reflectedDir = incident
      .clone()
      .sub(
        facingNormal
          .clone()
          .multiplyScalar(2 * incident.dot(facingNormal))
      )
      .normalize();

    const reflectColor = new THREE.Color().lerpColors(
      colorEnd,
      new THREE.Color(0x4488ff),
      0.4
    );

    const cosThetaI = Math.abs(incident.dot(facingNormal));
    const sinThetaT2 = (n1 / n2) * (n1 / n2) * (1 - cosThetaI * cosThetaI);

    const newBeamIndex = allBeams.length;
    const totalBeamsWanted = this.config.maxBeams;
    const remainingCapacity = totalBeamsWanted - allBeams.length - 1;
    const canSplitBoth = remainingCapacity >= 1 && depth < 2;

    if (canSplitBoth || depth === 0) {
      this.traceRayRecursive(
        hit.point.clone().add(reflectedDir.clone().multiplyScalar(0.01)),
        reflectedDir,
        colorEnd.clone(),
        reflectColor,
        depth + 1,
        allBeams,
        beam,
        newBeamIndex
      );

      if (sinThetaT2 <= 1.0) {
        const cosThetaT = Math.sqrt(1 - sinThetaT2);
        const refractedDir = incident
          .clone()
          .multiplyScalar(n1 / n2)
          .add(
            facingNormal
              .clone()
              .multiplyScalar((n1 / n2) * cosThetaI - cosThetaT)
          )
          .normalize();

        const hue = (beamIndex * 0.15 + depth * 0.08) % 1.0;
        const refractColor = new THREE.Color().setHSL(hue, 0.9, 0.6);
        const warmColor = new THREE.Color().lerpColors(
          colorEnd,
          refractColor,
          0.5
        );

        this.traceRayRecursive(
          hit.point.clone().add(refractedDir.clone().multiplyScalar(0.01)),
          refractedDir,
          colorEnd.clone(),
          warmColor,
          depth + 1,
          allBeams,
          null,
          newBeamIndex + 1
        );
      }
    } else {
      if (sinThetaT2 <= 1.0) {
        const cosThetaT = Math.sqrt(1 - sinThetaT2);
        const refractedDir = incident
          .clone()
          .multiplyScalar(n1 / n2)
          .add(
            facingNormal
              .clone()
              .multiplyScalar((n1 / n2) * cosThetaI - cosThetaT)
          )
          .normalize();

        const hue = ((beamIndex + depth) * 0.12) % 1.0;
        const refractColor = new THREE.Color().setHSL(hue, 0.9, 0.6);

        this.traceRayRecursive(
          hit.point.clone().add(refractedDir.clone().multiplyScalar(0.01)),
          refractedDir,
          colorEnd.clone(),
          refractColor,
          depth + 1,
          allBeams,
          beam,
          newBeamIndex
        );
      } else {
        this.traceRayRecursive(
          hit.point.clone().add(reflectedDir.clone().multiplyScalar(0.01)),
          reflectedDir,
          colorEnd.clone(),
          reflectColor,
          depth + 1,
          allBeams,
          beam,
          newBeamIndex
        );
      }
    }
  }

  private intersectPrisms(
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): RayHit | null {
    let closestHit: RayHit | null = null;
    const minDistance = 0.001;

    for (const prism of this.prisms) {
      const faces = prism.getWorldFaces();
      for (const face of faces) {
        const hit = this.rayTriangleIntersect(
          origin,
          direction,
          face.vertices[0],
          face.vertices[1],
          face.vertices[2]
        );
        if (
          hit !== null &&
          hit > minDistance &&
          (!closestHit || hit < closestHit.distance)
        ) {
          const point = origin
            .clone()
            .add(direction.clone().multiplyScalar(hit));
          closestHit = {
            point,
            normal: face.normal.clone(),
            distance: hit,
            prism,
            face
          };
        }
      }
    }

    return closestHit;
  }

  private rayTriangleIntersect(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    v0: THREE.Vector3,
    v1: THREE.Vector3,
    v2: THREE.Vector3
  ): number | null {
    const EPSILON = 1e-6;
    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const h = new THREE.Vector3().crossVectors(direction, edge2);
    const a = edge1.dot(h);

    if (a > -EPSILON && a < EPSILON) return null;

    const f = 1.0 / a;
    const s = new THREE.Vector3().subVectors(origin, v0);
    const u = f * s.dot(h);

    if (u < 0.0 || u > 1.0) return null;

    const q = new THREE.Vector3().crossVectors(s, edge1);
    const v = f * direction.dot(q);

    if (v < 0.0 || u + v > 1.0) return null;

    const t = f * edge2.dot(q);

    if (t > EPSILON) {
      return t;
    }
    return null;
  }

  private renderBeamPath(
    beamPath: BeamSegment[],
    segments: number,
    beamIndex: number
  ): void {
    for (const seg of beamPath) {
      this.renderBeamSegment(seg, segments, beamIndex);
    }
    if (beamPath.length > 0) {
      const lastSeg = beamPath[beamPath.length - 1];
      this.createParticle(lastSeg.end, lastSeg.colorEnd);
    }
  }

  private renderBeamSegment(
    segment: BeamSegment,
    segments: number,
    beamIndex: number
  ): void {
    const positions: number[] = [];
    const colors: number[] = [];

    const colorHexStart = segment.colorStart;
    const colorHexEnd = segment.colorEnd;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = segment.start.x + (segment.end.x - segment.start.x) * t;
      const y = segment.start.y + (segment.end.y - segment.start.y) * t;
      const z = segment.start.z + (segment.end.z - segment.start.z) * t;

      positions.push(x, y, z);

      const r = colorHexStart.r + (colorHexEnd.r - colorHexStart.r) * t;
      const g = colorHexStart.g + (colorHexEnd.g - colorHexStart.g) * t;
      const b = colorHexStart.b + (colorHexEnd.b - colorHexStart.b) * t;

      colors.push(r * this.config.intensity, g * this.config.intensity, b * this.config.intensity);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });

    const line = new THREE.Line(geometry, material);
    this.beamsGroup.add(line);
    this.beamLines.push(line);
  }

  private createParticle(position: THREE.Vector3, color: THREE.Color): void {
    const geometry = new THREE.SphereGeometry(0.08, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.95
    });
    const particle = new THREE.Mesh(geometry, material);
    particle.position.copy(position);
    particle.scale.multiplyScalar(this.config.intensity);
    this.particlesGroup.add(particle);
    this.particles.push(particle);
  }

  private renderSourcePoint(): void {
    const geometry = new THREE.SphereGeometry(0.12, 24, 24);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });
    const source = new THREE.Mesh(geometry, material);
    source.position.copy(this.sourcePosition);
    this.particlesGroup.add(source);
    this.particles.push(source);
  }

  public dispose(): void {
    this.clear();
    this.scene.remove(this.beamsGroup);
    this.scene.remove(this.particlesGroup);
  }
}
