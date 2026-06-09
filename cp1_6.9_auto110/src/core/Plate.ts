import * as THREE from 'three';
import { plateVertexShader, plateFragmentShader } from '../rendering/PlateShader';
import type { PlateSettings, PlateInfo } from '../types';

export class Plate {
  public id: string;
  public name: string;
  public color: string;
  public mesh: THREE.Mesh;
  public edges: THREE.LineSegments;

  private baseVertices: THREE.Vector3[];
  private currentVertices: THREE.Vector3[];
  private upliftHeights: Float32Array;
  private driftDirection: THREE.Vector2;
  private driftOffset: THREE.Vector2;
  private collisionCount: number;
  private highlighted: boolean;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private positionAttr: THREE.BufferAttribute;
  private upliftAttr: THREE.BufferAttribute;

  constructor(
    id: string,
    name: string,
    vertices: THREE.Vector3[],
    color: string,
    driftDirection: THREE.Vector2
  ) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.baseVertices = vertices.map((v) => v.clone());
    this.currentVertices = vertices.map((v) => v.clone());
    this.upliftHeights = new Float32Array(vertices.length);
    this.driftDirection = driftDirection.clone().normalize();
    this.driftOffset = new THREE.Vector2(0, 0);
    this.collisionCount = 0;
    this.highlighted = false;

    this.geometry = this.buildGeometry();
    this.material = this.buildMaterial(color);
    this.mesh = new THREE.Mesh(this.geometry, this.material);

    const edgeGeom = new THREE.EdgesGeometry(this.geometry, 15);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0
    });
    this.edges = new THREE.LineSegments(edgeGeom, edgeMat);
    this.mesh.add(this.edges);
  }

  private buildGeometry(): THREE.BufferGeometry {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const uplift: number[] = [];

    for (let i = 0; i < this.currentVertices.length; i++) {
      const v = this.currentVertices[i];
      positions.push(v.x, v.y, v.z);
      uvs.push((v.x + 10) / 20, (v.z + 10) / 20);
      uplift.push(0);
    }

    const center = new THREE.Vector2();
    for (const v of this.currentVertices) {
      center.x += v.x;
      center.y += v.z;
    }
    center.x /= this.currentVertices.length;
    center.y /= this.currentVertices.length;

    const sorted = this.currentVertices
      .map((v, i) => ({
        i,
        angle: Math.atan2(v.z - center.y, v.x - center.x)
      }))
      .sort((a, b) => a.angle - b.angle);

    for (let i = 1; i < sorted.length - 1; i++) {
      indices.push(sorted[0].i, sorted[i].i, sorted[i + 1].i);
    }

    const geom = new THREE.BufferGeometry();
    this.positionAttr = new THREE.Float32BufferAttribute(positions, 3);
    this.upliftAttr = new THREE.Float32BufferAttribute(uplift, 1);
    geom.setAttribute('position', this.positionAttr);
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setAttribute('aUplift', this.upliftAttr);
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return geom;
  }

  private buildMaterial(color: string): THREE.ShaderMaterial {
    const col = new THREE.Color(color);
    return new THREE.ShaderMaterial({
      vertexShader: plateVertexShader,
      fragmentShader: plateFragmentShader,
      uniforms: {
        uBaseColor: { value: new THREE.Vector3(col.r, col.g, col.b) },
        uOpacity: { value: 0.8 },
        uHighlighted: { value: 0.0 },
        uTime: { value: 0.0 }
      },
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  public update(dt: number, settings: PlateSettings, timeMultiplier: number): void {
    const speed = settings.driftSpeed * timeMultiplier;
    this.driftOffset.x += this.driftDirection.x * speed;
    this.driftOffset.y += this.driftDirection.y * speed;

    for (let i = 0; i < this.currentVertices.length; i++) {
      this.currentVertices[i].x = this.baseVertices[i].x + this.driftOffset.x;
      this.currentVertices[i].z = this.baseVertices[i].z + this.driftOffset.y;

      if (this.upliftHeights[i] > 0) {
        this.upliftHeights[i] = Math.max(0, this.upliftHeights[i] - 0.005 * timeMultiplier);
      }

      this.positionAttr.setXYZ(
        i,
        this.currentVertices[i].x,
        this.currentVertices[i].y,
        this.currentVertices[i].z
      );
      this.upliftAttr.setX(i, this.upliftHeights[i]);
    }

    this.positionAttr.needsUpdate = true;
    this.upliftAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    this.material.uniforms.uOpacity.value = settings.opacity;
    this.material.uniforms.uTime.value = performance.now() * 0.001;
  }

  public setCollisionForce(point: THREE.Vector3, force: number, radius: number = 1.5): void {
    const radiusSq = radius * radius;
    for (let i = 0; i < this.currentVertices.length; i++) {
      const v = this.currentVertices[i];
      const dx = v.x - point.x;
      const dz = v.z - point.z;
      const distSq = dx * dx + dz * dz;
      if (distSq <= radiusSq) {
        const falloff = 1 - Math.sqrt(distSq) / radius;
        const newHeight = this.upliftHeights[i] + force * falloff;
        this.upliftHeights[i] = Math.min(newHeight, 0.5);
      }
    }
  }

  public setHighlighted(enabled: boolean): void {
    this.highlighted = enabled;
    this.material.uniforms.uHighlighted.value = enabled ? 1.0 : 0.0;
    const edgeMat = this.edges.material as THREE.LineBasicMaterial;
    edgeMat.opacity = enabled ? 0.9 : 0.0;
    if (enabled) {
      edgeMat.color.setHex(0xffffff);
      edgeMat.linewidth = 2;
    }
  }

  public isHighlighted(): boolean {
    return this.highlighted;
  }

  public incrementCollisionCount(): void {
    this.collisionCount++;
  }

  public getCenter(): THREE.Vector2 {
    let cx = 0;
    let cz = 0;
    for (const v of this.currentVertices) {
      cx += v.x;
      cz += v.z;
    }
    return new THREE.Vector2(cx / this.currentVertices.length, cz / this.currentVertices.length);
  }

  public getVertices(): THREE.Vector3[] {
    return this.currentVertices;
  }

  public getDriftDirection(): THREE.Vector2 {
    return this.driftDirection.clone();
  }

  public getInfo(currentSpeed: number): PlateInfo {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      currentSpeed,
      collisionCount: this.collisionCount
    };
  }
}
