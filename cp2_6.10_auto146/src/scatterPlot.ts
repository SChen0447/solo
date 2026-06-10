import * as THREE from 'three';
import { viridis, createAxisLabel, easeOutCubic, easeInOutCubic, lerp, normalize } from './utils';
import { DataManager, ReductionMode, DatasetName } from './dataManager';

interface PointData {
  mesh: THREE.Mesh;
  sprite?: THREE.Sprite;
  originalPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  originalScale: number;
  baseColor: THREE.Color;
  originalColor: THREE.Color;
  originalOpacity: number;
  index: number;
  isHovered: boolean;
  isNeighbor: boolean;
  animatingIn: boolean;
  animatingOut: boolean;
  animProgress: number;
}

export class ScatterPlot {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private dataManager: DataManager;
  private points: PointData[] = [];
  private pointsGroup: THREE.Group;
  private neighborLines: THREE.LineSegments | null = null;
  private hoveredIndex: number | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private container: HTMLElement;
  private axisGroup: THREE.Group;
  private axisLabels: { x: THREE.Sprite; y: THREE.Sprite; z: THREE.Sprite } | null = null;

  private xAxis: string = '';
  private yAxis: string = '';
  private zAxis: string = '';
  private colorFeature: string = '';
  private sizeFeature: string = '';
  private mode: ReductionMode = 'raw';
  private datasetName: DatasetName = 'iris';

  private maxPointsForMesh = 500;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, container: HTMLElement, dataManager: DataManager) {
    this.scene = scene;
    this.camera = camera;
    this.container = container;
    this.dataManager = dataManager;

    this.pointsGroup = new THREE.Group();
    this.scene.add(this.pointsGroup);

    this.axisGroup = new THREE.Group();
    this.scene.add(this.axisGroup);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.buildAxes();
    this.setupRaycaster();
  }

  private buildAxes(): void {
    this.axisGroup.clear();

    const axisLength = 6;
    const xGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-axisLength, 0, 0),
      new THREE.Vector3(axisLength, 0, 0)
    ]);
    const yGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0)
    ]);
    const zGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -axisLength),
      new THREE.Vector3(0, 0, axisLength)
    ]);

    const xMat = new THREE.LineBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.6 });
    const yMat = new THREE.LineBasicMaterial({ color: 0x51cf66, transparent: true, opacity: 0.6 });
    const zMat = new THREE.LineBasicMaterial({ color: 0x4dabf7, transparent: true, opacity: 0.6 });

    this.axisGroup.add(new THREE.Line(xGeo, xMat));
    this.axisGroup.add(new THREE.Line(yGeo, yMat));
    this.axisGroup.add(new THREE.Line(zGeo, zMat));

    this.axisLabels = {
      x: createAxisLabel(this.xAxis || 'X', 0xff6b6b),
      y: createAxisLabel(this.yAxis || 'Y', 0x51cf66),
      z: createAxisLabel(this.zAxis || 'Z', 0x4dabf7)
    };
    this.axisLabels.x.position.set(axisLength + 1, 0, 0);
    this.axisLabels.y.position.set(0, axisLength + 1, 0);
    this.axisLabels.z.position.set(0, 0, axisLength + 1);
    this.axisGroup.add(this.axisLabels.x, this.axisLabels.y, this.axisLabels.z);

    const gridHelper = new THREE.GridHelper(12, 12, 0x3b3b5c, 0x2d2d44);
    gridHelper.position.y = -3.01;
    this.axisGroup.add(gridHelper);
  }

  updateAxisLabels(x: string, y: string, z: string): void {
    this.xAxis = x;
    this.yAxis = y;
    this.zAxis = z;
    if (this.axisLabels) {
      this.axisGroup.remove(this.axisLabels.x, this.axisLabels.y, this.axisLabels.z);
    }
    this.axisLabels = {
      x: createAxisLabel(x || 'X', 0xff6b6b),
      y: createAxisLabel(y || 'Y', 0x51cf66),
      z: createAxisLabel(z || 'Z', 0x4dabf7)
    };
    this.axisLabels.x.position.set(7, 0, 0);
    this.axisLabels.y.position.set(0, 7, 0);
    this.axisLabels.z.position.set(0, 0, 7);
    this.axisGroup.add(this.axisLabels.x, this.axisLabels.y, this.axisLabels.z);
  }

  private setupRaycaster(): void {
    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });
  }

  setConfig(params: {
    dataset?: DatasetName;
    x?: string;
    y?: string;
    z?: string;
    mode?: ReductionMode;
    colorFeature?: string;
    sizeFeature?: string;
  }): void {
    if (params.dataset) this.datasetName = params.dataset;
    if (params.x !== undefined) this.xAxis = params.x;
    if (params.y !== undefined) this.yAxis = params.y;
    if (params.z !== undefined) this.zAxis = params.z;
    if (params.mode) this.mode = params.mode;
    if (params.colorFeature) this.colorFeature = params.colorFeature;
    if (params.sizeFeature) this.sizeFeature = params.sizeFeature;

    this.updateAxisLabels(this.xAxis, this.yAxis, this.zAxis);
    this.regeneratePoints();
  }

  private getCoordinates(): number[][] {
    if (this.mode === 'pca') {
      const result = this.dataManager.computePCA(this.datasetName);
      return result.coords3d;
    } else if (this.mode === 'tsne') {
      const result = this.dataManager.computeTSNE(this.datasetName);
      return result.coords3d;
    } else {
      return this.dataManager.get3DCoordinates(this.xAxis, this.yAxis, this.zAxis, this.datasetName);
    }
  }

  private regeneratePoints(): void {
    this.clearNeighborLines();
    this.hoveredIndex = null;

    for (const p of this.points) {
      p.animatingOut = true;
      p.animProgress = 1;
    }

    const coords = this.getCoordinates();
    if (coords.length === 0) return;

    const colorCol = this.dataManager.getColumn(this.colorFeature, this.datasetName);
    const sizeCol = this.dataManager.getColumn(this.sizeFeature, this.datasetName);
    const colorStats = colorCol.length > 0 ? this.dataManager.getMinMax(this.colorFeature, this.datasetName) : { min: 0, max: 1 };
    const sizeStats = sizeCol.length > 0 ? this.dataManager.getMinMax(this.sizeFeature, this.datasetName) : { min: 0, max: 1 };

    const useMesh = coords.length <= this.maxPointsForMesh;
    const baseRadius = 0.12;

    const geometry = useMesh ? new THREE.SphereGeometry(baseRadius, 16, 16) : null;
    let spriteTexture: THREE.Texture | null = null;
    if (!useMesh) {
      const cv = document.createElement('canvas');
      cv.width = 64;
      cv.height = 64;
      const ctx = cv.getContext('2d')!;
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.8)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      spriteTexture = new THREE.CanvasTexture(cv);
    }

    const oldPoints = [...this.points];
    this.points = [];

    for (let i = 0; i < coords.length; i++) {
      const pos = new THREE.Vector3(coords[i][0], coords[i][1], coords[i][2]);

      const colorVal = colorCol.length > 0 ? normalize(colorCol[i], colorStats.min, colorStats.max) : 0.5;
      const baseColor = viridis(colorVal);
      const sizeVal = sizeCol.length > 0 ? normalize(sizeCol[i], sizeStats.min, sizeStats.max) : 0.5;
      const scale = lerp(2, 20, sizeVal) / 20;
      const radiusScale = lerp(0.6, 2.0, sizeVal);

      let mesh: THREE.Mesh;
      let sprite: THREE.Sprite | undefined;

      if (useMesh && geometry) {
        const material = new THREE.MeshStandardMaterial({
          color: baseColor,
          metalness: 0.2,
          roughness: 0.4,
          transparent: true,
          opacity: 1
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.scale.setScalar(radiusScale);
      } else {
        const material = new THREE.MeshBasicMaterial({
          color: baseColor,
          transparent: true,
          opacity: 0.001
        });
        mesh = new THREE.Mesh(new THREE.SphereGeometry(baseRadius, 8, 8), material);
        mesh.scale.setScalar(radiusScale * 0.3);

        const spriteMat = new THREE.SpriteMaterial({
          map: spriteTexture!,
          color: baseColor,
          transparent: true,
          opacity: 1,
          depthWrite: false
        });
        sprite = new THREE.Sprite(spriteMat);
        sprite.scale.setScalar(0.4 * radiusScale);
        sprite.position.copy(pos);
      }

      mesh.position.set(0, 0, 0);
      mesh.userData.index = i;

      const pointData: PointData = {
        mesh,
        sprite,
        originalPosition: pos.clone(),
        targetPosition: pos.clone(),
        originalScale: radiusScale,
        baseColor: baseColor.clone(),
        originalColor: baseColor.clone(),
        originalOpacity: 1,
        index: i,
        isHovered: false,
        isNeighbor: false,
        animatingIn: true,
        animatingOut: false,
        animProgress: 0
      };

      this.pointsGroup.add(mesh);
      if (sprite) this.pointsGroup.add(sprite);
      this.points.push(pointData);
    }

    setTimeout(() => {
      for (const p of oldPoints) {
        this.pointsGroup.remove(p.mesh);
        if (p.sprite) this.pointsGroup.remove(p.sprite);
        if (!p.mesh.geometry.attributes.position.count || p.mesh.geometry instanceof THREE.SphereGeometry) {
          if (p.mesh.geometry instanceof THREE.SphereGeometry && p.mesh.geometry !== oldPoints[0]?.mesh.geometry) {
            p.mesh.geometry.dispose();
          }
        }
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach(m => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
      }
    }, 350);
  }

  private findNeighbors(targetIdx: number, k: number = 5): number[] {
    if (!this.points[targetIdx]) return [];
    const target = this.points[targetIdx].originalPosition;
    const distances = this.points
      .filter((_, i) => i !== targetIdx)
      .map(p => ({ idx: p.index, dist: p.originalPosition.distanceToSquared(target) }));
    distances.sort((a, b) => a.dist - b.dist);
    return distances.slice(0, k).map(d => d.idx);
  }

  private clearNeighborLines(): void {
    if (this.neighborLines) {
      this.scene.remove(this.neighborLines);
      this.neighborLines.geometry.dispose();
      (this.neighborLines.material as THREE.Material).dispose();
      this.neighborLines = null;
    }
  }

  private drawNeighborLines(centerIdx: number, neighbors: number[]): void {
    this.clearNeighborLines();
    if (!this.points[centerIdx]) return;

    const points: THREE.Vector3[] = [];
    const center = this.points[centerIdx].originalPosition;
    for (const nIdx of neighbors) {
      if (!this.points[nIdx]) continue;
      points.push(center.clone());
      points.push(this.points[nIdx].originalPosition.clone());
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.6
    });
    this.neighborLines = new THREE.LineSegments(geometry, material);
    this.scene.add(this.neighborLines);
  }

  private resetPointState(p: PointData): void {
    if (p.isHovered || p.isNeighbor) {
      p.isHovered = false;
      p.isNeighbor = false;
      p.originalColor.copy(p.baseColor);
      p.originalOpacity = 1;
    }
  }

  update(deltaTime: number): void {
    const animSpeed = 3;

    for (const p of this.points) {
      if (p.animatingIn) {
        p.animProgress = Math.min(1, p.animProgress + deltaTime * animSpeed);
        const t = easeOutCubic(p.animProgress);
        p.mesh.position.lerpVectors(new THREE.Vector3(0, 0, 0), p.targetPosition, t);
        if (p.sprite) p.sprite.position.copy(p.mesh.position);

        const mat = p.mesh.material as THREE.Material & { opacity: number };
        mat.opacity = t;
        if (p.sprite) (p.sprite.material as THREE.SpriteMaterial).opacity = t;

        if (p.animProgress >= 1) p.animatingIn = false;
      } else if (p.animatingOut) {
        p.animProgress = Math.max(0, p.animProgress - deltaTime * animSpeed * 1.5);
        const mat = p.mesh.material as THREE.Material & { opacity: number };
        mat.opacity = p.animProgress;
        if (p.sprite) (p.sprite.material as THREE.SpriteMaterial).opacity = p.animProgress;
      }

      if (p.isHovered) {
        const targetScale = p.originalScale * 1.5;
        const currentScale = p.mesh.scale.x;
        const newScale = lerp(currentScale, targetScale, 0.2);
        p.mesh.scale.setScalar(newScale);
        if (p.sprite) p.sprite.scale.setScalar(newScale * 0.4);

        const mat = p.mesh.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
        mat.color.lerp(new THREE.Color(0xffffff), 0.2);
      } else if (p.isNeighbor) {
        const mat = p.mesh.material as THREE.Material & { opacity: number };
        mat.opacity = lerp(mat.opacity, 0.3, 0.2);
        if (p.sprite) (p.sprite.material as THREE.SpriteMaterial).opacity = lerp((p.sprite.material as THREE.SpriteMaterial).opacity, 0.3, 0.2);
      } else if (!p.animatingIn && !p.animatingOut) {
        const mat = p.mesh.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial & { opacity: number };
        mat.color.lerp(p.originalColor, 0.2);
        mat.opacity = lerp(mat.opacity, p.originalOpacity, 0.2);
        if (p.sprite) {
          (p.sprite.material as THREE.SpriteMaterial).opacity = lerp((p.sprite.material as THREE.SpriteMaterial).opacity, p.originalOpacity, 0.2);
        }
        const currentScale = p.mesh.scale.x;
        const newScale = lerp(currentScale, p.originalScale, 0.2);
        p.mesh.scale.setScalar(newScale);
        if (p.sprite) p.sprite.scale.setScalar(newScale * 0.4);
      }
    }

    this.checkHover();

    if (this.axisLabels) {
      this.axisLabels.x.lookAt(this.camera.position);
      this.axisLabels.y.lookAt(this.camera.position);
      this.axisLabels.z.lookAt(this.camera.position);
    }
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.points.map(p => p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const idx = intersects[0].object.userData.index as number;
      if (this.hoveredIndex !== idx) {
        if (this.hoveredIndex !== null) {
          const prev = this.points[this.hoveredIndex];
          if (prev) this.resetPointState(prev);
          const prevNeighbors = this.findNeighbors(this.hoveredIndex, 5);
          for (const n of prevNeighbors) {
            if (this.points[n]) this.resetPointState(this.points[n]);
          }
        }

        this.hoveredIndex = idx;
        const point = this.points[idx];
        if (point) {
          point.isHovered = true;
          const neighbors = this.findNeighbors(idx, 5);
          for (const n of neighbors) {
            if (this.points[n]) this.points[n].isNeighbor = true;
          }
          this.drawNeighborLines(idx, neighbors);
        }
      }
    } else {
      if (this.hoveredIndex !== null) {
        const prev = this.points[this.hoveredIndex];
        if (prev) this.resetPointState(prev);
        const prevNeighbors = this.findNeighbors(this.hoveredIndex, 5);
        for (const n of prevNeighbors) {
          if (this.points[n]) this.resetPointState(this.points[n]);
        }
        this.hoveredIndex = null;
        this.clearNeighborLines();
      }
    }
  }

  get2DProjectionCoords(): number[][] | null {
    if (this.mode === 'pca') {
      return this.dataManager.computePCA(this.datasetName).coords2d;
    } else if (this.mode === 'tsne') {
      return this.dataManager.computeTSNE(this.datasetName).coords2d;
    }
    return null;
  }

  getCurrentMode(): ReductionMode {
    return this.mode;
  }
}
