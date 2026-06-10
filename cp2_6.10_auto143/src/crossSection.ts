import * as THREE from 'three';
import { TerrainModel, LayerInfo } from './terrainModel';

export type CutMode = 'view' | 'fixed';

export class CrossSectionManager {
  public group: THREE.Group;
  public cutPlane: THREE.Mesh;
  public cutPlaneBorder: THREE.LineSegments;
  public crossSectionMeshes: THREE.Mesh[] = [];
  public cutEdges: THREE.LineSegments[] = [];

  private cutPosition: number = 0;
  private cutMode: CutMode = 'view';
  private cameraDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  private planeUp: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  private terrainModel: TerrainModel;
  private planeSize: number = 20;

  private lastUpdateTime: number = 0;
  private readonly updateInterval: number = 200;
  private pendingUpdate: boolean = false;

  private currentOpacity: number = 0.4;
  private targetOpacity: number = 0.4;

  constructor(terrainModel: TerrainModel) {
    this.terrainModel = terrainModel;
    this.group = new THREE.Group();

    this.cutPlane = this.createCutPlane();
    this.cutPlaneBorder = this.createCutPlaneBorder();
    this.group.add(this.cutPlane);
    this.group.add(this.cutPlaneBorder);
  }

  private createCutPlane(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(this.planeSize, this.planeSize);
    const material = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: this.currentOpacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.renderOrder = 1;
    return plane;
  }

  private createCutPlaneBorder(): THREE.LineSegments {
    const half = this.planeSize / 2;
    const points = [
      new THREE.Vector3(-half, -half, 0),
      new THREE.Vector3(half, -half, 0),
      new THREE.Vector3(half, -half, 0),
      new THREE.Vector3(half, half, 0),
      new THREE.Vector3(half, half, 0),
      new THREE.Vector3(-half, half, 0),
      new THREE.Vector3(-half, half, 0),
      new THREE.Vector3(-half, -half, 0)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00d2ff,
      linewidth: 2
    });
    return new THREE.LineSegments(geometry, material);
  }

  private createStripedTexture(baseColor: string): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const color = new THREE.Color(baseColor);
    ctx.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    for (let i = -canvas.height; i < canvas.width + canvas.height; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + canvas.height, canvas.height);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  public setCutPosition(position: number): void {
    this.cutPosition = THREE.MathUtils.clamp(position, -5, 5);
    this.updatePlaneTransform();
    this.scheduleCrossSectionUpdate();
  }

  public getCutPosition(): number {
    return this.cutPosition;
  }

  public setCutMode(mode: CutMode): void {
    if (this.cutMode !== mode) {
      this.cutMode = mode;
      this.fadeTransition();
    }
  }

  public getCutMode(): CutMode {
    return this.cutMode;
  }

  public setCameraDirection(direction: THREE.Vector3): void {
    this.cameraDirection.copy(direction).normalize();
    if (this.cutMode === 'view') {
      this.updatePlaneTransform();
    }
  }

  private updatePlaneTransform(): void {
    if (this.cutMode === 'fixed') {
      this.cutPlane.rotation.set(0, 0, 0);
      this.cutPlane.position.set(0, this.cutPosition, 0);
      this.cutPlaneBorder.rotation.set(0, 0, 0);
      this.cutPlaneBorder.position.set(0, this.cutPosition, 0);
    } else {
      const lookDir = this.cameraDirection.clone().negate();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(up, lookDir).normalize();
      this.planeUp.crossVectors(lookDir, right).normalize();

      const offset = lookDir.clone().multiplyScalar(-this.cutPosition * 0.5);
      this.cutPlane.position.copy(offset);
      this.cutPlaneBorder.position.copy(offset);

      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), lookDir);
      this.cutPlane.quaternion.copy(quaternion);
      this.cutPlaneBorder.quaternion.copy(quaternion);
    }
  }

  private fadeTransition(): void {
    this.targetOpacity = 0;
    const fadeOut = setInterval(() => {
      this.currentOpacity = Math.max(0, this.currentOpacity - 0.05);
      (this.cutPlane.material as THREE.MeshBasicMaterial).opacity = this.currentOpacity;

      if (this.currentOpacity <= 0) {
        clearInterval(fadeOut);
        this.updatePlaneTransform();
        this.scheduleCrossSectionUpdate(true);
        this.targetOpacity = 0.4;

        const fadeIn = setInterval(() => {
          this.currentOpacity = Math.min(0.4, this.currentOpacity + 0.05);
          (this.cutPlane.material as THREE.MeshBasicMaterial).opacity = this.currentOpacity;

          if (this.currentOpacity >= 0.4) {
            clearInterval(fadeIn);
          }
        }, 30);
      }
    }, 30);
  }

  private scheduleCrossSectionUpdate(force: boolean = false): void {
    if (force) {
      this.updateCrossSection();
      return;
    }

    this.pendingUpdate = true;
    const now = performance.now();
    if (now - this.lastUpdateTime >= this.updateInterval) {
      this.updateCrossSection();
      this.pendingUpdate = false;
    }
  }

  public checkPendingUpdate(): void {
    if (this.pendingUpdate) {
      const now = performance.now();
      if (now - this.lastUpdateTime >= this.updateInterval) {
        this.updateCrossSection();
        this.pendingUpdate = false;
      }
    }
  }

  private clearCrossSection(): void {
    this.crossSectionMeshes.forEach(mesh => {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (mat.map) mat.map.dispose();
      mat.dispose();
    });
    this.crossSectionMeshes = [];

    this.cutEdges.forEach(edge => {
      this.group.remove(edge);
      edge.geometry.dispose();
      (edge.material as THREE.Material).dispose();
    });
    this.cutEdges = [];
  }

  private getWorldPlane(): THREE.Plane {
    const planeNormal = new THREE.Vector3();
    const planePoint = new THREE.Vector3();

    if (this.cutMode === 'fixed') {
      planeNormal.set(0, 1, 0);
      planePoint.set(0, this.cutPosition, 0);
    } else {
      planeNormal.copy(this.cameraDirection).negate().normalize();
      planePoint.copy(this.cutPlane.position);
    }

    return new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
  }

  private updateCrossSection(): void {
    this.lastUpdateTime = performance.now();
    this.clearCrossSection();

    const worldPlane = this.getWorldPlane();
    const layerInfos = this.terrainModel.layerInfos;

    const intersections: { [layerIndex: number]: THREE.Vector3[] } = {};

    this.terrainModel.layerMeshes.forEach((mesh, layerIndex) => {
      const geometry = mesh.geometry;
      const positionAttr = geometry.getAttribute('position');
      const indexAttr = geometry.index;

      if (!indexAttr) return;

      const points: THREE.Vector3[] = [];
      const vertex = new THREE.Vector3();

      for (let i = 0; i < indexAttr.count; i += 3) {
        const i0 = indexAttr.getX(i);
        const i1 = indexAttr.getX(i + 1);
        const i2 = indexAttr.getX(i + 2);

        const v0 = new THREE.Vector3(
          positionAttr.getX(i0),
          positionAttr.getY(i0),
          positionAttr.getZ(i0)
        );
        const v1 = new THREE.Vector3(
          positionAttr.getX(i1),
          positionAttr.getY(i1),
          positionAttr.getZ(i1)
        );
        const v2 = new THREE.Vector3(
          positionAttr.getX(i2),
          positionAttr.getY(i2),
          positionAttr.getZ(i2)
        );

        const d0 = worldPlane.distanceToPoint(v0);
        const d1 = worldPlane.distanceToPoint(v1);
        const d2 = worldPlane.distanceToPoint(v2);

        const triPoints: THREE.Vector3[] = [];

        const interpolate = (p1: THREE.Vector3, p2: THREE.Vector3, d1: number, d2: number) => {
          const t = d1 / (d1 - d2);
          return new THREE.Vector3().lerpVectors(p1, p2, t);
        };

        if ((d0 >= 0) !== (d1 >= 0)) {
          triPoints.push(interpolate(v0, v1, d0, d1));
        }
        if ((d1 >= 0) !== (d2 >= 0)) {
          triPoints.push(interpolate(v1, v2, d1, d2));
        }
        if ((d2 >= 0) !== (d0 >= 0)) {
          triPoints.push(interpolate(v2, v0, d2, d0));
        }

        if (triPoints.length === 2) {
          points.push(triPoints[0], triPoints[1]);
        }
      }

      if (points.length > 0) {
        intersections[layerIndex] = points;
      }
    });

    Object.keys(intersections).forEach(key => {
      const layerIndex = parseInt(key);
      const points = intersections[layerIndex];
      const layerInfo = layerInfos[layerIndex];
      if (!layerInfo) return;

      this.createCrossSectionMesh(points, layerInfo, worldPlane);
      this.createCutEdgeLines(points, layerInfo);
    });
  }

  private createCrossSectionMesh(points: THREE.Vector3[], layerInfo: LayerInfo, plane: THREE.Plane): void {
    if (points.length < 4) return;

    const centroid = new THREE.Vector3();
    points.forEach(p => centroid.add(p));
    centroid.divideScalar(points.length);

    const planeNormal = plane.normal.clone();

    const tangent = new THREE.Vector3(0, 1, 0);
    if (Math.abs(planeNormal.dot(tangent)) > 0.9) {
      tangent.set(1, 0, 0);
    }
    const uDir = new THREE.Vector3().crossVectors(planeNormal, tangent).normalize();
    const vDir = new THREE.Vector3().crossVectors(uDir, planeNormal).normalize();

    const projected2D = points.map(p => {
      const rel = new THREE.Vector3().subVectors(p, centroid);
      return {
        x: rel.dot(uDir),
        y: rel.dot(vDir),
        point: p
      };
    });

    const hull = this.convexHull2D(projected2D);
    if (hull.length < 3) return;

    const positions: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];

    hull.forEach(p2d => {
      positions.push(p2d.point.x, p2d.point.y, p2d.point.z);
      normals.push(planeNormal.x, planeNormal.y, planeNormal.z);
      uvs.push((p2d.x + 10) / 20, (p2d.y + 10) / 20);
    });

    for (let i = 1; i < hull.length - 1; i++) {
      positions.push(
        hull[0].point.x, hull[0].point.y, hull[0].point.z,
        hull[i].point.x, hull[i].point.y, hull[i].point.z,
        hull[i + 1].point.x, hull[i + 1].point.y, hull[i + 1].point.z
      );
      normals.push(
        planeNormal.x, planeNormal.y, planeNormal.z,
        planeNormal.x, planeNormal.y, planeNormal.z,
        planeNormal.x, planeNormal.y, planeNormal.z
      );
      uvs.push(
        (hull[0].x + 10) / 20, (hull[0].y + 10) / 20,
        (hull[i].x + 10) / 20, (hull[i].y + 10) / 20,
        (hull[i + 1].x + 10) / 20, (hull[i + 1].y + 10) / 20
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    const texture = this.createStripedTexture(layerInfo.color);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 2;
    this.crossSectionMeshes.push(mesh);
    this.group.add(mesh);
  }

  private convexHull2D(points: { x: number; y: number; point: THREE.Vector3 }[]): { x: number; y: number; point: THREE.Vector3 }[] {
    if (points.length < 3) return points;

    const sorted = points.slice().sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return a.y - b.y;
    });

    const cross = (o: typeof sorted[0], a: typeof sorted[0], b: typeof sorted[0]) => {
      return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    };

    const lower: typeof sorted = [];
    for (const p of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }

    const upper: typeof sorted = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
        upper.pop();
      }
      upper.push(sorted[i]);
    }

    lower.pop();
    upper.pop();

    return lower.concat(upper);
  }

  private createCutEdgeLines(points: THREE.Vector3[], _layerInfo: LayerInfo): void {
    if (points.length < 2) return;

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    });

    const edge = new THREE.LineSegments(geometry, material);
    edge.renderOrder = 3;
    this.cutEdges.push(edge);
    this.group.add(edge);
  }

  public reset(): void {
    this.cutPosition = 0;
    this.updatePlaneTransform();
    this.updateCrossSection();
  }

  public dispose(): void {
    this.cutPlane.geometry.dispose();
    (this.cutPlane.material as THREE.Material).dispose();
    this.cutPlaneBorder.geometry.dispose();
    (this.cutPlaneBorder.material as THREE.Material).dispose();
    this.clearCrossSection();
  }
}
