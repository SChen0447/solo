import * as THREE from 'three';
import { DataPoint } from './dataLoader';
import { PointCloudRenderer } from './pointCloudRenderer';

const MAX_EDGES = 800;
const MIN_EDGES = 300;
const BASE_LINEWIDTH = 0.5;
const PULSE_PERIOD = 3.0;

interface EdgeInfo {
  i: number;
  j: number;
  distance: number;
}

export class EdgeConnector {
  private scene: THREE.Scene;
  private lineSegments: THREE.LineSegments;
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;
  private data: DataPoint[] = [];
  private pointCloudRenderer: PointCloudRenderer;
  private activeEdgeCount = 0;
  private pulseTime = 0;
  private baseOpacity = 0.25;

  constructor(scene: THREE.Scene, pointCloudRenderer: PointCloudRenderer) {
    this.scene = scene;
    this.pointCloudRenderer = pointCloudRenderer;

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_EDGES * 2 * 3);
    const colors = new Float32Array(MAX_EDGES * 2 * 3);
    const opacities = new Float32Array(MAX_EDGES * 2);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: this.baseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: BASE_LINEWIDTH
    });

    this.lineSegments = new THREE.LineSegments(this.geometry, this.material);
    this.lineSegments.visible = false;
    this.scene.add(this.lineSegments);
  }

  setData(data: DataPoint[]): void {
    this.data = data;
  }

  updateEdges(visibleCategories: Set<string>, distanceThreshold: number, mapping: { x: number; y: number; z: number }): void {
    if (this.data.length === 0) return;

    const visibleIndices: number[] = [];
    for (let i = 0; i < this.data.length; i++) {
      if (visibleCategories.has(this.data[i].category)) {
        visibleIndices.push(i);
      }
    }

    if (visibleIndices.length < 2) {
      this.activeEdgeCount = 0;
      this.geometry.setDrawRange(0, 0);
      this.lineSegments.visible = false;
      return;
    }

    const edgeInfos: EdgeInfo[] = [];
    const posArray = this.geometry.attributes.position.array as Float32Array;
    const colArray = this.geometry.attributes.color.array as Float32Array;

    for (let a = 0; a < visibleIndices.length; a++) {
      for (let b = a + 1; b < visibleIndices.length; b++) {
        const i = visibleIndices[a];
        const j = visibleIndices[b];
        const dist = this.euclideanDistance3D(
          this.data[i].dimensions[mapping.x],
          this.data[i].dimensions[mapping.y],
          this.data[i].dimensions[mapping.z],
          this.data[j].dimensions[mapping.x],
          this.data[j].dimensions[mapping.y],
          this.data[j].dimensions[mapping.z]
        );
        if (dist < distanceThreshold) {
          edgeInfos.push({ i, j, distance: dist });
        }
      }
    }

    edgeInfos.sort((a, b) => a.distance - b.distance);

    let targetCount = edgeInfos.length;
    targetCount = Math.min(targetCount, MAX_EDGES);
    targetCount = Math.max(targetCount, 0);

    if (targetCount < MIN_EDGES && edgeInfos.length >= MIN_EDGES) {
      targetCount = Math.min(MIN_EDGES, edgeInfos.length);
    }

    this.activeEdgeCount = targetCount;

    for (let idx = 0; idx < targetCount; idx++) {
      const edge = edgeInfos[idx];
      const posI = this.pointCloudRenderer.getInstancePosition(edge.i);
      const posJ = this.pointCloudRenderer.getInstancePosition(edge.j);

      posArray[idx * 6] = posI.x;
      posArray[idx * 6 + 1] = posI.y;
      posArray[idx * 6 + 2] = posI.z;
      posArray[idx * 6 + 3] = posJ.x;
      posArray[idx * 6 + 4] = posJ.y;
      posArray[idx * 6 + 5] = posJ.z;

      const colI = this.pointCloudRenderer.getInstanceColor(edge.i);
      const colJ = this.pointCloudRenderer.getInstanceColor(edge.j);
      const distFactor = 1 - (edge.distance / distanceThreshold);
      const intensity = 0.5 + distFactor * 0.5;

      colArray[idx * 6] = colI.r * intensity;
      colArray[idx * 6 + 1] = colI.g * intensity;
      colArray[idx * 6 + 2] = colI.b * intensity;
      colArray[idx * 6 + 3] = colJ.r * intensity;
      colArray[idx * 6 + 4] = colJ.g * intensity;
      colArray[idx * 6 + 5] = colJ.b * intensity;
    }

    this.baseOpacity = targetCount > 600 ? 0.2 : 0.25;

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, targetCount * 2);
    this.lineSegments.visible = targetCount > 0;
  }

  updatePositions(): void {
    if (this.activeEdgeCount === 0) return;

    const posArray = this.geometry.attributes.position.array as Float32Array;
    const colArray = this.geometry.attributes.color.array as Float32Array;

    for (let idx = 0; idx < this.activeEdgeCount; idx++) {
      const i = Math.floor(idx / 200);
      const j = idx % 200;
      const dummyIdxI = (idx * 7) % 200;
      const dummyIdxJ = (idx * 13 + 31) % 200;

      let posI: THREE.Vector3;
      let posJ: THREE.Vector3;
      let colI: THREE.Color;
      let colJ: THREE.Color;

      if (this.pointCloudRenderer.getInstanceOpacity(dummyIdxI) > 0.01 &&
          this.pointCloudRenderer.getInstanceOpacity(dummyIdxJ) > 0.01) {
        posI = this.pointCloudRenderer.getInstancePosition(dummyIdxI);
        posJ = this.pointCloudRenderer.getInstancePosition(dummyIdxJ);
        colI = this.pointCloudRenderer.getInstanceColor(dummyIdxI);
        colJ = this.pointCloudRenderer.getInstanceColor(dummyIdxJ);
      } else {
        continue;
      }

      posArray[idx * 6] = posI.x;
      posArray[idx * 6 + 1] = posI.y;
      posArray[idx * 6 + 2] = posI.z;
      posArray[idx * 6 + 3] = posJ.x;
      posArray[idx * 6 + 4] = posJ.y;
      posArray[idx * 6 + 5] = posJ.z;

      colArray[idx * 6] = colI.r;
      colArray[idx * 6 + 1] = colI.g;
      colArray[idx * 6 + 2] = colI.b;
      colArray[idx * 6 + 3] = colJ.r;
      colArray[idx * 6 + 4] = colJ.g;
      colArray[idx * 6 + 5] = colJ.b;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  update(deltaTime: number): void {
    this.pulseTime += deltaTime;
    const pulse = 0.5 + 0.5 * Math.sin((this.pulseTime / PULSE_PERIOD) * Math.PI * 2);
    this.material.opacity = this.baseOpacity * (0.7 + pulse * 0.6);

    if (this.activeEdgeCount > 0) {
      this.updatePositions();
    }
  }

  getActiveEdgeCount(): number {
    return this.activeEdgeCount;
  }

  private euclideanDistance3D(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number
  ): number {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const dz = z1 - z2;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.lineSegments);
  }
}
