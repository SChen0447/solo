import * as THREE from 'three';
import { SceneController } from './sceneController';

export interface TrajectoryData {
  id: string;
  points: THREE.Vector3[];
  color: string;
  width: number;
  opacity: number;
  isSymmetricPair?: boolean;
  originalId?: string;
}

export interface TrajectoryExportData {
  points: { x: number; y: number; z: number }[];
  color: string;
  width: number;
  opacity: number;
}

export interface SculptureExportData {
  version: string;
  trajectories: TrajectoryExportData[];
}

interface TrajectoryMesh {
  tube: THREE.Mesh;
  glow?: THREE.Mesh;
}

const COLOR_PALETTE: string[] = [
  '#00d2ff',
  '#3a7bd5',
  '#ff00ff',
  '#00ff88',
  '#ffcc00',
  '#ff6b6b',
  '#a855f7',
  '#06b6d4',
];

const TUBE_RADIAL_SEGMENTS: number = 8;
const GLOW_SCALE: number = 1.8;
const GLOW_BASE_OPACITY: number = 0.3;

export class TrajectoryManager {
  private sceneController: SceneController;
  private trajectories: Map<string, TrajectoryData> = new Map();
  private trajectoryMeshes: Map<string, TrajectoryMesh> = new Map();
  private selectedTrajectoryId: string | null = null;

  private isDrawing: boolean = false;
  private currentPoints: THREE.Vector3[] = [];
  private currentColor: string = '#00d2ff';
  private currentLine: THREE.Line | null = null;
  private symmetricLine: THREE.Line | null = null;

  private symmetricMode: boolean = false;

  private minPointDistance: number = 0.02;
  private defaultWidth: number = 0.05;
  private defaultOpacity: number = 1.0;

  private pulseTime: number = 0;

  constructor(sceneController: SceneController) {
    this.sceneController = sceneController;
  }

  public startDrawing(screenX: number, screenY: number): void {
    const point = this.sceneController.screenToSphere(screenX, screenY);
    if (!point) return;

    this.isDrawing = true;
    this.currentPoints = [point.clone()];
    this.currentColor = this.getRandomColor();

    this.createCurrentPreviewLine();

    if (this.symmetricMode) {
      this.createSymmetricPreviewLine();
    }
  }

  public updateDrawing(screenX: number, screenY: number): void {
    if (!this.isDrawing) return;

    const point = this.sceneController.screenToSphere(screenX, screenY);
    if (!point) return;

    const lastPoint = this.currentPoints[this.currentPoints.length - 1];
    if (point.distanceTo(lastPoint) < this.minPointDistance) return;

    this.currentPoints.push(point.clone());
    this.updateCurrentPreviewLine();

    if (this.symmetricMode && this.symmetricLine) {
      this.updateSymmetricPreviewLine();
    }
  }

  public endDrawing(): void {
    if (!this.isDrawing) return;

    this.isDrawing = false;

    if (this.currentPoints.length < 2) {
      this.cleanupPreviewLines();
      this.currentPoints = [];
      return;
    }

    this.cleanupPreviewLines();

    const id = this.generateId();
    const trajectory: TrajectoryData = {
      id,
      points: [...this.currentPoints],
      color: this.currentColor,
      width: this.defaultWidth,
      opacity: this.defaultOpacity,
    };

    this.trajectories.set(id, trajectory);
    this.createTubeTrajectory(trajectory);

    if (this.symmetricMode) {
      const symmetricId = this.generateId();
      const symmetricPoints = this.currentPoints.map(p =>
        new THREE.Vector3(-p.x, p.y, -p.z)
      );
      const symmetricTrajectory: TrajectoryData = {
        id: symmetricId,
        points: symmetricPoints,
        color: this.currentColor,
        width: this.defaultWidth,
        opacity: this.defaultOpacity,
        isSymmetricPair: true,
        originalId: id,
      };
      this.trajectories.set(symmetricId, symmetricTrajectory);
      this.createTubeTrajectory(symmetricTrajectory);
    }

    this.currentPoints = [];

    this.selectTrajectory(id);
  }

  private cleanupPreviewLines(): void {
    if (this.currentLine) {
      this.sceneController.removeTrajectoryLine(this.currentLine);
      this.currentLine.geometry.dispose();
      (this.currentLine.material as THREE.Material).dispose();
      this.currentLine = null;
    }
    if (this.symmetricLine) {
      this.sceneController.removeTrajectoryLine(this.symmetricLine);
      this.symmetricLine.geometry.dispose();
      (this.symmetricLine.material as THREE.Material).dispose();
      this.symmetricLine = null;
    }
  }

  private createCurrentPreviewLine(): void {
    const geometry = new THREE.BufferGeometry().setFromPoints(this.currentPoints);
    const material = new THREE.LineBasicMaterial({
      color: this.currentColor,
      transparent: true,
      opacity: 0.8,
    });

    this.currentLine = new THREE.Line(geometry, material);
    this.sceneController.addTrajectoryLine(this.currentLine);
  }

  private createSymmetricPreviewLine(): void {
    const symmetricPoints = this.currentPoints.map(p =>
      new THREE.Vector3(-p.x, p.y, -p.z)
    );
    const geometry = new THREE.BufferGeometry().setFromPoints(symmetricPoints);
    const material = new THREE.LineBasicMaterial({
      color: this.currentColor,
      transparent: true,
      opacity: 0.5,
    });

    this.symmetricLine = new THREE.Line(geometry, material);
    this.sceneController.addTrajectoryLine(this.symmetricLine);
  }

  private updateCurrentPreviewLine(): void {
    if (!this.currentLine) return;

    const positions = new Float32Array(this.currentPoints.length * 3);
    for (let i = 0; i < this.currentPoints.length; i++) {
      positions[i * 3] = this.currentPoints[i].x;
      positions[i * 3 + 1] = this.currentPoints[i].y;
      positions[i * 3 + 2] = this.currentPoints[i].z;
    }

    this.currentLine.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    this.currentLine.geometry.computeBoundingSphere();
  }

  private updateSymmetricPreviewLine(): void {
    if (!this.symmetricLine) return;

    const positions = new Float32Array(this.currentPoints.length * 3);
    for (let i = 0; i < this.currentPoints.length; i++) {
      positions[i * 3] = -this.currentPoints[i].x;
      positions[i * 3 + 1] = this.currentPoints[i].y;
      positions[i * 3 + 2] = -this.currentPoints[i].z;
    }

    this.symmetricLine.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    this.symmetricLine.geometry.computeBoundingSphere();
  }

  private createTubeTrajectory(trajectory: TrajectoryData): void {
    if (trajectory.points.length < 2) return;

    const curve = new THREE.CatmullRomCurve3(trajectory.points);
    curve.curveType = 'catmullrom';
    curve.tension = 0.1;

    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      Math.max(trajectory.points.length - 1, 20),
      trajectory.width,
      TUBE_RADIAL_SEGMENTS,
      false
    );

    const tubeMaterial = new THREE.MeshPhongMaterial({
      color: trajectory.color,
      transparent: true,
      opacity: trajectory.opacity,
      shininess: 100,
      side: THREE.DoubleSide,
    });

    const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
    (tubeMesh as any).userData = { trajectoryId: trajectory.id, isTube: true };
    this.sceneController.addTrajectoryLine(tubeMesh);

    const glowGeometry = new THREE.TubeGeometry(
      curve,
      Math.max(trajectory.points.length - 1, 20),
      trajectory.width * GLOW_SCALE,
      TUBE_RADIAL_SEGMENTS,
      false
    );

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: trajectory.color,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    (glowMesh as any).userData = { trajectoryId: trajectory.id, isGlow: true };
    this.sceneController.addTrajectoryLine(glowMesh);

    this.trajectoryMeshes.set(trajectory.id, {
      tube: tubeMesh,
      glow: glowMesh,
    });
  }

  private disposeTubeTrajectory(id: string): void {
    const mesh = this.trajectoryMeshes.get(id);
    if (!mesh) return;

    if (mesh.tube) {
      this.sceneController.removeTrajectoryLine(mesh.tube);
      mesh.tube.geometry.dispose();
      (mesh.tube.material as THREE.Material).dispose();
    }

    if (mesh.glow) {
      this.sceneController.removeTrajectoryLine(mesh.glow);
      mesh.glow.geometry.dispose();
      (mesh.glow.material as THREE.Material).dispose();
    }

    this.trajectoryMeshes.delete(id);
  }

  public selectTrajectory(id: string | null): void {
    if (this.selectedTrajectoryId && this.selectedTrajectoryId !== id) {
      this.setTrajectorySelected(this.selectedTrajectoryId, false);
    }

    this.selectedTrajectoryId = id;

    if (id) {
      this.setTrajectorySelected(id, true);
    }
  }

  private setTrajectorySelected(id: string, selected: boolean): void {
    const trajectory = this.trajectories.get(id);
    const mesh = this.trajectoryMeshes.get(id);
    if (!trajectory || !mesh) return;

    const tubeMaterial = mesh.tube.material as THREE.MeshPhongMaterial;

    if (selected) {
      tubeMaterial.emissive = new THREE.Color(0xffffff);
      tubeMaterial.emissiveIntensity = 0.3;
    } else {
      tubeMaterial.emissive = new THREE.Color(0x000000);
      tubeMaterial.emissiveIntensity = 0;
    }

    this.updateTubeScale(id, selected ? 1.5 : 1.0);
  }

  private updateTubeScale(id: string, scale: number): void {
    const trajectory = this.trajectories.get(id);
    const mesh = this.trajectoryMeshes.get(id);
    if (!trajectory || !mesh) return;

    const targetWidth = trajectory.width * scale;

    const curve = new THREE.CatmullRomCurve3(trajectory.points);
    curve.curveType = 'catmullrom';
    curve.tension = 0.1;

    const newTubeGeometry = new THREE.TubeGeometry(
      curve,
      Math.max(trajectory.points.length - 1, 20),
      targetWidth,
      TUBE_RADIAL_SEGMENTS,
      false
    );

    if (mesh.tube) {
      mesh.tube.geometry.dispose();
      mesh.tube.geometry = newTubeGeometry;
    }

    if (mesh.glow) {
      const newGlowGeometry = new THREE.TubeGeometry(
        curve,
        Math.max(trajectory.points.length - 1, 20),
        targetWidth * GLOW_SCALE,
        TUBE_RADIAL_SEGMENTS,
        false
      );
      mesh.glow.geometry.dispose();
      mesh.glow.geometry = newGlowGeometry;
    }
  }

  public getSelectedTrajectoryId(): string | null {
    return this.selectedTrajectoryId;
  }

  public getSelectedTrajectory(): TrajectoryData | null {
    if (!this.selectedTrajectoryId) return null;
    return this.trajectories.get(this.selectedTrajectoryId) || null;
  }

  public updateSelectedWidth(width: number): void {
    if (!this.selectedTrajectoryId) return;
    const trajectory = this.trajectories.get(this.selectedTrajectoryId);
    if (!trajectory) return;

    trajectory.width = width;

    const symmetricPair = this.findSymmetricPair(this.selectedTrajectoryId);
    if (symmetricPair) {
      symmetricPair.width = width;
      this.rebuildTube(symmetricPair.id);
    }

    this.rebuildTube(this.selectedTrajectoryId);

    if (this.selectedTrajectoryId) {
      this.setTrajectorySelected(this.selectedTrajectoryId, true);
    }
  }

  private rebuildTube(id: string): void {
    const trajectory = this.trajectories.get(id);
    if (!trajectory) return;

    this.disposeTubeTrajectory(id);
    this.createTubeTrajectory(trajectory);
  }

  public updateSelectedOpacity(opacity: number): void {
    if (!this.selectedTrajectoryId) return;
    const trajectory = this.trajectories.get(this.selectedTrajectoryId);
    if (!trajectory) return;

    trajectory.opacity = opacity;

    const mesh = this.trajectoryMeshes.get(this.selectedTrajectoryId);
    if (mesh?.tube) {
      (mesh.tube.material as THREE.MeshPhongMaterial).opacity = opacity;
    }

    const symmetricPair = this.findSymmetricPair(this.selectedTrajectoryId);
    if (symmetricPair) {
      symmetricPair.opacity = opacity;
      const symMesh = this.trajectoryMeshes.get(symmetricPair.id);
      if (symMesh?.tube) {
        (symMesh.tube.material as THREE.MeshPhongMaterial).opacity = opacity;
      }
    }
  }

  private findSymmetricPair(id: string): TrajectoryData | null {
    const trajectory = this.trajectories.get(id);
    if (!trajectory) return null;

    for (const [, t] of this.trajectories) {
      if (t.isSymmetricPair && t.originalId === id) {
        return t;
      }
      if (trajectory.isSymmetricPair && trajectory.originalId === t.id) {
        return t;
      }
    }
    return null;
  }

  public deleteSelectedTrajectory(): void {
    if (!this.selectedTrajectoryId) return;

    const toDelete: string[] = [this.selectedTrajectoryId];

    const symmetricPair = this.findSymmetricPair(this.selectedTrajectoryId);
    if (symmetricPair) {
      toDelete.push(symmetricPair.id);
    }

    for (const id of toDelete) {
      this.disposeTubeTrajectory(id);
      this.trajectories.delete(id);
    }

    this.selectedTrajectoryId = null;
  }

  public clearAllTrajectories(): void {
    for (const id of this.trajectories.keys()) {
      this.disposeTubeTrajectory(id);
    }

    this.trajectories.clear();
    this.trajectoryMeshes.clear();
    this.selectedTrajectoryId = null;
    this.isDrawing = false;
    this.currentPoints = [];

    this.cleanupPreviewLines();
  }

  public setSymmetricMode(enabled: boolean): void {
    this.symmetricMode = enabled;
  }

  public getSymmetricMode(): boolean {
    return this.symmetricMode;
  }

  public getTrajectoryCount(): number {
    return this.trajectories.size;
  }

  public isDrawingActive(): boolean {
    return this.isDrawing;
  }

  private getRandomColor(): string {
    const index = Math.floor(Math.random() * COLOR_PALETTE.length);
    return COLOR_PALETTE[index];
  }

  private generateId(): string {
    return 'traj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  public exportToJSON(): string {
    const trajectories: TrajectoryExportData[] = [];

    for (const [, t] of this.trajectories) {
      if (t.isSymmetricPair) continue;

      trajectories.push({
        points: t.points.map(p => ({ x: p.x, y: p.y, z: p.z })),
        color: t.color,
        width: t.width,
        opacity: t.opacity,
      });
    }

    const data: SculptureExportData = {
      version: '1.0',
      trajectories,
    };

    return JSON.stringify(data, null, 2);
  }

  public importFromJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr) as SculptureExportData;

      if (!data.trajectories || !Array.isArray(data.trajectories)) {
        return false;
      }

      this.clearAllTrajectories();

      for (const tData of data.trajectories) {
        const id = this.generateId();
        const points = tData.points.map(p => new THREE.Vector3(p.x, p.y, p.z));

        const trajectory: TrajectoryData = {
          id,
          points,
          color: tData.color,
          width: tData.width || this.defaultWidth,
          opacity: tData.opacity || this.defaultOpacity,
        };

        this.trajectories.set(id, trajectory);
        this.createTubeTrajectory(trajectory);
      }

      return true;
    } catch (e) {
      console.error('Failed to import JSON:', e);
      return false;
    }
  }

  public handleClick(screenX: number, screenY: number): boolean {
    const rect = this.sceneController.getCanvasRect();
    const mouse = new THREE.Vector2(
      ((screenX - rect.left) / rect.width) * 2 - 1,
      -((screenY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.sceneController.getCamera());

    const tubeMeshes: THREE.Mesh[] = [];
    for (const [, mesh] of this.trajectoryMeshes) {
      if (mesh.tube) {
        tubeMeshes.push(mesh.tube);
      }
    }

    const intersects = raycaster.intersectObjects(tubeMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const trajectoryId = (hit.object as any).userData?.trajectoryId;
      if (trajectoryId) {
        this.selectTrajectory(trajectoryId);
        return true;
      }
    }

    this.selectTrajectory(null);
    return false;
  }

  public updatePulse(time: number): void {
    this.pulseTime = time;

    if (!this.selectedTrajectoryId) {
      for (const [, mesh] of this.trajectoryMeshes) {
        if (mesh.glow) {
          (mesh.glow.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      }
      return;
    }

    const pulseIntensity = (Math.sin(time * 3) + 1) / 2;
    const glowOpacity = GLOW_BASE_OPACITY + pulseIntensity * 0.4;

    const selectedMesh = this.trajectoryMeshes.get(this.selectedTrajectoryId);
    if (selectedMesh?.glow) {
      (selectedMesh.glow.material as THREE.MeshBasicMaterial).opacity = glowOpacity;
    }

    const symmetricPair = this.findSymmetricPair(this.selectedTrajectoryId);
    if (symmetricPair) {
      const symMesh = this.trajectoryMeshes.get(symmetricPair.id);
      if (symMesh?.glow) {
        (symMesh.glow.material as THREE.MeshBasicMaterial).opacity = glowOpacity * 0.6;
      }
    }
  }

  public rebuildAllLines(): void {
    for (const id of Array.from(this.trajectories.keys())) {
      this.rebuildTube(id);
    }
  }
}
