import * as THREE from 'three';

export type LensType = 'biconvex' | 'biconcave' | 'plano-convex' | 'plano-concave';

export interface LensParams {
  type: LensType;
  radius: number;
  ior: number;
  thickness: number;
}

const LENS_COLOR = 0xB0D4F1;
const LENS_RADIUS = 1.2;
const RADIAL_SEGMENTS = 64;
const HEIGHT_SEGMENTS = 48;

export class LensSystem {
  public mesh: THREE.Mesh;
  public wireframe: THREE.LineSegments;
  public group: THREE.Group;
  public params: LensParams;

  private geometry: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.params = {
      type: 'biconvex',
      radius: 1.5,
      ior: 1.5,
      thickness: 0.3
    };

    this.group = new THREE.Group();

    this.geometry = this.createLensGeometry();
    const material = new THREE.MeshPhysicalMaterial({
      color: LENS_COLOR,
      transparent: true,
      opacity: 0.55,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.5,
      ior: this.params.ior,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    const wireframeGeo = new THREE.WireframeGeometry(this.geometry);
    const wireframeMat = new THREE.LineBasicMaterial({
      color: 0x6C63FF,
      transparent: true,
      opacity: 0.25
    });
    this.wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
    this.group.add(this.wireframe);

    scene.add(this.group);
  }

  public getSurfaceRadii(): { R1: number; R2: number } {
    const { type, radius } = this.params;
    switch (type) {
      case 'biconvex':
        return { R1: radius, R2: -radius };
      case 'biconcave':
        return { R1: -radius, R2: radius };
      case 'plano-convex':
        return { R1: radius, R2: Infinity };
      case 'plano-concave':
        return { R1: -radius, R2: Infinity };
      default:
        return { R1: radius, R2: -radius };
    }
  }

  private createLensGeometry(): THREE.BufferGeometry {
    const { R1, R2 } = this.getSurfaceRadii();
    const d = this.params.thickness;
    const halfD = d / 2;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const frontProfile: { x: number; y: number }[] = [];
    const backProfile: { x: number; y: number }[] = [];

    const profileSegments = Math.floor(HEIGHT_SEGMENTS / 2);

    for (let i = 0; i <= profileSegments; i++) {
      const t = i / profileSegments;
      const r = t * LENS_RADIUS;

      let fx: number;
      if (R1 === Infinity) {
        fx = -halfD;
      } else {
        const sign = R1 > 0 ? 1 : -1;
        const absR = Math.abs(R1);
        const sag = sign * (absR - Math.sqrt(Math.max(0, absR * absR - r * r)));
        fx = -halfD + sag;
      }
      frontProfile.push({ x: fx, y: r });

      let bx: number;
      if (R2 === Infinity) {
        bx = halfD;
      } else {
        const sign = R2 > 0 ? 1 : -1;
        const absR = Math.abs(R2);
        const sag = sign * (absR - Math.sqrt(Math.max(0, absR * absR - r * r)));
        bx = halfD - sag;
      }
      backProfile.push({ x: bx, y: r });
    }

    const fullProfile: { x: number; y: number }[] = [];
    for (let i = 0; i <= profileSegments; i++) {
      fullProfile.push(frontProfile[i]);
    }
    for (let i = profileSegments - 1; i >= 0; i--) {
      fullProfile.push(backProfile[i]);
    }

    const totalProfilePoints = fullProfile.length;

    for (let ring = 0; ring <= RADIAL_SEGMENTS; ring++) {
      const theta = (ring / RADIAL_SEGMENTS) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      for (let i = 0; i < totalProfilePoints; i++) {
        const pt = fullProfile[i];
        const px = pt.x;
        const py = pt.y * cosT;
        const pz = pt.y * sinT;

        positions.push(px, py, pz);

        let nx: number, ny: number, nz: number;
        const r = pt.y;

        if (i <= profileSegments) {
          if (R1 === Infinity || r < 0.0001) {
            nx = -1; ny = 0; nz = 0;
          } else {
            const sign = R1 > 0 ? 1 : -1;
            const absR = Math.abs(R1);
            const denom = absR;
            nx = -sign * Math.sqrt(Math.max(0, absR * absR - r * r)) / denom;
            ny = sign * py / denom;
            nz = sign * pz / denom;
          }
        } else {
          if (R2 === Infinity || r < 0.0001) {
            nx = 1; ny = 0; nz = 0;
          } else {
            const sign = R2 > 0 ? 1 : -1;
            const absR = Math.abs(R2);
            const denom = absR;
            nx = sign * Math.sqrt(Math.max(0, absR * absR - r * r)) / denom;
            ny = -sign * py / denom;
            nz = -sign * pz / denom;
          }
        }

        const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        normals.push(nx / nLen, ny / nLen, nz / nLen);

        uvs.push(ring / RADIAL_SEGMENTS, i / totalProfilePoints);
      }
    }

    for (let ring = 0; ring < RADIAL_SEGMENTS; ring++) {
      for (let i = 0; i < totalProfilePoints - 1; i++) {
        const a = ring * totalProfilePoints + i;
        const b = a + totalProfilePoints;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  public updateGeometry(): void {
    const oldGeometry = this.geometry;
    this.geometry = this.createLensGeometry();
    this.mesh.geometry = this.geometry;

    this.wireframe.geometry.dispose();
    this.wireframe.geometry = new THREE.WireframeGeometry(this.geometry);

    oldGeometry.dispose();

    const material = this.mesh.material as THREE.MeshPhysicalMaterial;
    material.ior = this.params.ior;
    material.needsUpdate = true;
  }

  public setParams(params: Partial<LensParams>): void {
    this.params = { ...this.params, ...params };
    this.updateGeometry();
  }

  public getFocalLength(): number {
    const { R1, R2 } = this.getSurfaceRadii();
    const n = this.params.ior;
    const d = this.params.thickness;

    if (R1 === Infinity && R2 === Infinity) {
      return Infinity;
    }
    if (R1 === Infinity) {
      return R2 / (1 - n);
    }
    if (R2 === Infinity) {
      return R1 / (n - 1);
    }

    const invF = (n - 1) * (1 / R1 - 1 / R2 + (n - 1) * d / (n * R1 * R2));
    if (Math.abs(invF) < 1e-10) return Infinity;
    return 1 / invF;
  }

  public getFocalPosition(): THREE.Vector3 {
    const f = this.getFocalLength();
    return new THREE.Vector3(f, 0, 0);
  }

  public getDispersionIOR(wavelength: number): number {
    const n = this.params.ior;
    const baseWavelength = 589.3;
    const dispersion = 0.015;
    const normalized = (wavelength - baseWavelength) / 300;
    return n - normalized * dispersion;
  }

  public getLensRadius(): number {
    return LENS_RADIUS;
  }

  public dispose(): void {
    this.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.wireframe.geometry.dispose();
    (this.wireframe.material as THREE.Material).dispose();
  }
}
