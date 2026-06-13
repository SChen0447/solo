import * as THREE from 'three';
import { StarNode } from './StarNode';

export class ConstellationLine {
  public mesh: THREE.Line;
  public glowMesh: THREE.Line;
  public starNodes: StarNode[] = [];

  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;
  private glowGeometry: THREE.BufferGeometry;
  private glowMaterial: THREE.LineBasicMaterial;

  private startColor: THREE.Color = new THREE.Color(0x4a9eff);
  private endColor: THREE.Color = new THREE.Color(0xa855f7);
  private curvePoints: THREE.Vector3[] = [];
  private targetCurvePoints: THREE.Vector3[] = [];
  private smoothFactor: number = 0.1;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.LineBasicMaterial({
      color: this.startColor,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    this.mesh = new THREE.Line(this.geometry, this.material);
    this.mesh.renderOrder = 1;

    this.glowGeometry = new THREE.BufferGeometry();
    this.glowMaterial = new THREE.LineBasicMaterial({
      color: this.startColor,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      linewidth: 3
    });

    this.glowMesh = new THREE.Line(this.glowGeometry, this.glowMaterial);
    this.glowMesh.renderOrder = 0;
  }

  public addStarNode(starNode: StarNode): boolean {
    if (this.starNodes.length >= 15) return false;
    if (this.starNodes.includes(starNode)) return false;

    this.starNodes.push(starNode);
    this.updateTargetCurve();
    return true;
  }

  public removeStarNode(starNode: StarNode): void {
    const index = this.starNodes.indexOf(starNode);
    if (index > -1) {
      this.starNodes.splice(index, 1);
      this.updateTargetCurve();
    }
  }

  public clear(): void {
    this.starNodes.forEach(star => star.deselect());
    this.starNodes = [];
    this.curvePoints = [];
    this.targetCurvePoints = [];
    this.updateGeometry();
  }

  public getSelectedCount(): number {
    return this.starNodes.length;
  }

  private updateTargetCurve(): void {
    if (this.starNodes.length < 2) {
      this.targetCurvePoints = [];
      return;
    }

    this.targetCurvePoints = [];
    const positions = this.starNodes.map(s => s.position.clone());

    if (positions.length === 2) {
      this.targetCurvePoints = [positions[0], positions[1]];
    } else {
      const curve = new THREE.CatmullRomCurve3(positions, false, 'catmullrom', 0.5);
      const segments = positions.length * 20;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        this.targetCurvePoints.push(curve.getPoint(t));
      }
    }

    if (this.curvePoints.length === 0) {
      this.curvePoints = this.targetCurvePoints.map(p => p.clone());
    }
  }

  public update(deltaTime: number): void {
    if (this.starNodes.length < 2) {
      this.updateGeometry();
      return;
    }

    this.updateTargetCurve();

    if (this.curvePoints.length !== this.targetCurvePoints.length) {
      this.curvePoints = this.targetCurvePoints.map(p => p.clone());
    } else {
      for (let i = 0; i < this.curvePoints.length; i++) {
        this.curvePoints[i].lerp(this.targetCurvePoints[i], this.smoothFactor);
      }
    }

    this.updateGeometry();
  }

  private updateGeometry(): void {
    const pointCount = this.curvePoints.length;
    if (pointCount < 2) {
      this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
      this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 3));
      this.glowGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
      this.glowGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 3));
      return;
    }

    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);
    const tempColor = new THREE.Color();

    for (let i = 0; i < pointCount; i++) {
      const t = i / (pointCount - 1);
      const point = this.curvePoints[i];

      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      tempColor.lerpColors(this.startColor, this.endColor, t);
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;

    this.glowGeometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    this.glowGeometry.setAttribute('color', new THREE.BufferAttribute(colors.slice(), 3));
    this.glowGeometry.attributes.position.needsUpdate = true;
    this.glowGeometry.attributes.color.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.glowGeometry.dispose();
    this.glowMaterial.dispose();
  }
}
