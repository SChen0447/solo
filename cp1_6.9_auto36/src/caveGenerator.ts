import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

export interface CaveOutput {
  caveMeshes: THREE.Mesh[];
  surfacePoints: THREE.Vector3[];
  colorMap: Map<THREE.Mesh, THREE.Color>;
}

export class CaveGenerator {
  private noise3D: (x: number, y: number, z: number) => number;
  private seed: number;

  constructor(seed: number = Math.random() * 10000) {
    this.seed = seed;
    this.noise3D = createNoise3D(() => seed);
  }

  public generate(): CaveOutput {
    const caveMeshes: THREE.Mesh[] = [];
    const surfacePoints: THREE.Vector3[] = [];
    const colorMap = new Map<THREE.Mesh, THREE.Color>();

    const tunnelSegments = this.generateTunnelSystem();

    for (const segment of tunnelSegments) {
      const { mesh, points } = this.createTunnelSegment(segment);
      caveMeshes.push(mesh);
      surfacePoints.push(...points);
      colorMap.set(mesh, segment.color);
    }

    return { caveMeshes, surfacePoints, colorMap };
  }

  private generateTunnelSystem(): Array<{
    start: THREE.Vector3;
    end: THREE.Vector3;
    radius: number;
    color: THREE.Color;
  }> {
    const segments: Array<{
      start: THREE.Vector3;
      end: THREE.Vector3;
      radius: number;
      color: THREE.Color;
    }> = [];

    const mainStart = new THREE.Vector3(0, -1, 0);
    const queue: Array<{ pos: THREE.Vector3; dir: THREE.Vector3; depth: number; radius: number }> = [
      { pos: mainStart, dir: new THREE.Vector3(0, -1, 0), depth: 0, radius: 1.8 }
    ];

    const visited = new Set<string>();
    const maxDepth = 8;

    while (queue.length > 0 && segments.length < 35) {
      const current = queue.shift()!;
      const key = `${current.pos.x.toFixed(1)}_${current.pos.y.toFixed(1)}_${current.pos.z.toFixed(1)}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (current.depth >= maxDepth) continue;
      if (current.pos.y < -10) continue;

      const length = 1.5 + Math.random() * 2.5;
      const direction = current.dir.clone();

      const noiseAngle = this.noise3D(current.pos.x * 0.3, current.pos.y * 0.3, current.pos.z * 0.3) * Math.PI;
      direction.applyAxisAngle(new THREE.Vector3(1, 0, 0), noiseAngle * 0.5);
      direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.noise3D(current.pos.z * 0.2, current.pos.x * 0.2, current.pos.y * 0.2) * Math.PI * 0.4);
      direction.normalize();

      const endPos = current.pos.clone().add(direction.multiplyScalar(length));

      const depthRatio = Math.min(1, Math.abs(current.pos.y) / 10);
      const color = new THREE.Color().lerpColors(
        new THREE.Color(0x6b4226),
        new THREE.Color(0x3e2723),
        depthRatio
      );

      segments.push({
        start: current.pos.clone(),
        end: endPos.clone(),
        radius: current.radius,
        color
      });

      const branchCount = current.depth < 3 ? (Math.random() > 0.4 ? 2 : 1) : (Math.random() > 0.6 ? 2 : 1);

      for (let i = 0; i < branchCount; i++) {
        const branchDir = direction.clone();
        const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
        branchDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        branchDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), (Math.random() - 0.5) * 0.8);
        branchDir.y -= 0.2 + Math.random() * 0.3;
        branchDir.normalize();

        const branchRadius = current.radius * (0.55 + Math.random() * 0.35);

        if (branchRadius > 0.4) {
          queue.push({
            pos: endPos.clone(),
            dir: branchDir,
            depth: current.depth + 1,
            radius: branchRadius
          });
        }
      }
    }

    return segments;
  }

  private createTunnelSegment(segment: {
    start: THREE.Vector3;
    end: THREE.Vector3;
    radius: number;
    color: THREE.Color;
  }): { mesh: THREE.Mesh; points: THREE.Vector3[] } {
    const direction = new THREE.Vector3().subVectors(segment.end, segment.start);
    const length = direction.length();
    direction.normalize();

    const radialSegments = 16;
    const heightSegments = Math.max(8, Math.floor(length * 4));

    const geometry = new THREE.CylinderGeometry(
      segment.radius,
      segment.radius * (0.85 + Math.random() * 0.3),
      length,
      radialSegments,
      heightSegments,
      true
    );

    const positions = geometry.attributes.position;
    const surfacePoints: THREE.Vector3[] = [];

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      const noiseVal = this.noise3D(
        (x + segment.start.x) * 1.5,
        y * 1.5,
        (z + segment.start.z) * 1.5
      );
      const displacement = 1 + noiseVal * 0.25;

      const noiseVal2 = this.noise3D(
        (x + segment.start.x) * 3,
        y * 3,
        (z + segment.start.z) * 3
      );
      const fineDisplacement = 1 + noiseVal2 * 0.1;

      positions.setX(i, x * displacement * fineDisplacement);
      positions.setZ(i, z * displacement * fineDisplacement);

      if (Math.random() < 0.06 && y > -length * 0.3) {
        const worldPos = new THREE.Vector3(
          x * displacement * fineDisplacement + segment.start.x,
          y + segment.start.y + length / 2,
          z * displacement * fineDisplacement + segment.start.z
        );
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        worldPos.applyQuaternion(quaternion);
        surfacePoints.push(worldPos);
      }
    }

    geometry.computeVertexNormals();

    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const yRatio = (y + length / 2) / length;
      const noiseColor = this.noise3D(
        positions.getX(i) * 2,
        positions.getY(i) * 2,
        positions.getZ(i) * 2
      );
      const c = segment.color.clone();
      c.offsetHSL(0, 0, noiseColor * 0.08);
      c.lerp(new THREE.Color(0x4a2c1e), yRatio * 0.3);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      shininess: 8,
      flatShading: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(segment.start).add(direction.clone().multiplyScalar(length / 2));

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    mesh.quaternion.copy(quaternion);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return { mesh, points: surfacePoints };
  }

  public reseed(seed: number): void {
    this.seed = seed;
    this.noise3D = createNoise3D(() => seed);
  }
}
