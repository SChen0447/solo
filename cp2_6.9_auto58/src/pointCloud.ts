import * as THREE from 'three';
import { HandLandmark, HAND_CONNECTIONS } from './handTracker';

const POINT_COUNT = 5000;
const FINGER_TIP_INDICES = [4, 8, 12, 16, 20];
const PALM_CENTER_INDEX = 9;

interface ParticleData {
  baseOffset: THREE.Vector3;
  size: number;
  targetLandmarkIndex: number;
}

export class HandPointCloud {
  public group: THREE.Group;
  private points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private particleData: ParticleData[] = [];
  private jointSpheres: THREE.Mesh[] = [];
  private skeletonLines: THREE.Line[] = [];
  private currentLandmarks: THREE.Vector3[] = [];
  private targetLandmarks: THREE.Vector3[] = [];
  private baseScale: number = 1;
  private time: number = 0;
  private isFist: boolean = false;
  private currentColorMix: number = 0;
  private currentScale: number = 1;

  constructor() {
    this.group = new THREE.Group();
    this.positions = new Float32Array(POINT_COUNT * 3);
    this.colors = new Float32Array(POINT_COUNT * 3);
    this.initParticleData();
    this.points = this.createPointCloud();
    this.group.add(this.points);
    this.createSkeleton();
  }

  private initParticleData(): void {
    for (let i = 0; i < POINT_COUNT; i++) {
      const landmarkIdx = Math.floor(Math.random() * 21);
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.35;
      const heightOffset = (Math.random() - 0.5) * 0.2;

      this.particleData.push({
        baseOffset: new THREE.Vector3(
          Math.cos(angle) * radius,
          heightOffset,
          Math.sin(angle) * radius
        ),
        size: 2 + Math.random() * 2,
        targetLandmarkIndex: landmarkIdx
      });
    }
  }

  private createPointCloud(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    return points;
  }

  private createSkeleton(): void {
    for (let i = 0; i < 21; i++) {
      const geometry = new THREE.SphereGeometry(0.15, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: 0xFFD93D,
        transparent: true,
        opacity: 0.9
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.visible = false;
      this.jointSpheres.push(sphere);
      this.group.add(sphere);
    }

    for (const [, endIdx] of HAND_CONNECTIONS) {
      void endIdx;
      const points = [new THREE.Vector3(), new THREE.Vector3()];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x6C63FF,
        transparent: true,
        opacity: 0.3
      });
      const line = new THREE.Line(geometry, material);
      line.visible = false;
      this.skeletonLines.push(line);
      this.group.add(line);
    }
  }

  public updateLandmarks(landmarks: THREE.Vector3[]): void {
    this.targetLandmarks = landmarks.map((v) => v.clone());
    if (this.currentLandmarks.length === 0) {
      this.currentLandmarks = landmarks.map((v) => v.clone());
    }
  }

  public setFistState(isFist: boolean): void {
    this.isFist = isFist;
  }

  private lerpColor(a: THREE.Color, b: THREE.Color, t: number, out: THREE.Color): THREE.Color {
    out.r = a.r + (b.r - a.r) * t;
    out.g = a.g + (b.g - a.g) * t;
    out.b = a.b + (b.b - a.b) * t;
    return out;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    const targetScale = this.isFist ? 0.65 : 1;
    this.currentScale += (targetScale - this.currentScale) * 0.15;
    this.currentColorMix += ((this.isFist ? 1 : 0) - this.currentColorMix) * 0.15;

    const breathe = 1 + Math.sin(this.time * Math.PI) * 0.01;
    this.group.scale.setScalar(this.currentScale * breathe);

    const lerpFactor = Math.min(1, deltaTime * 8);
    for (let i = 0; i < this.currentLandmarks.length && i < this.targetLandmarks.length; i++) {
      this.currentLandmarks[i].lerp(this.targetLandmarks[i], lerpFactor);
    }

    const hasLandmarks = this.currentLandmarks.length >= 21;
    this.points.visible = hasLandmarks;

    if (hasLandmarks) {
      const palmCenter = this.currentLandmarks[PALM_CENTER_INDEX];
      const colorFingertip = new THREE.Color(0xFF6B6B);
      const colorPalm = new THREE.Color(0x4ECDC4);
      const colorFist = new THREE.Color(0xFF6B35);
      const tmpColor = new THREE.Color();

      for (let i = 0; i < POINT_COUNT; i++) {
        const data = this.particleData[i];
        const landmark = this.currentLandmarks[data.targetLandmarkIndex];
        const offset = data.baseOffset.clone().multiplyScalar(0.8);

        const pos = landmark.clone().add(offset);
        this.positions[i * 3] = pos.x;
        this.positions[i * 3 + 1] = pos.y;
        this.positions[i * 3 + 2] = pos.z;

        const isFingertip = FINGER_TIP_INDICES.includes(data.targetLandmarkIndex);
        const distToPalm = landmark.distanceTo(palmCenter);
        const maxDist = 1.5;
        let blend = Math.min(1, Math.max(0, distToPalm / maxDist));
        if (isFingertip) blend = Math.max(blend, 0.85);

        const baseColor = this.lerpColor(colorPalm, colorFingertip, blend, tmpColor.clone());
        const finalColor = this.lerpColor(baseColor, colorFist, this.currentColorMix, tmpColor);

        this.colors[i * 3] = finalColor.r;
        this.colors[i * 3 + 1] = finalColor.g;
        this.colors[i * 3 + 2] = finalColor.b;
      }

      const posAttr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      for (let i = 0; i < 21; i++) {
        this.jointSpheres[i].visible = true;
        this.jointSpheres[i].position.copy(this.currentLandmarks[i]);
      }

      for (let j = 0; j < HAND_CONNECTIONS.length; j++) {
        const [startIdx, endIdx] = HAND_CONNECTIONS[j];
        this.skeletonLines[j].visible = true;
        const linePos = this.skeletonLines[j].geometry.getAttribute('position') as THREE.BufferAttribute;
        linePos.setXYZ(0, this.currentLandmarks[startIdx].x, this.currentLandmarks[startIdx].y, this.currentLandmarks[startIdx].z);
        linePos.setXYZ(1, this.currentLandmarks[endIdx].x, this.currentLandmarks[endIdx].y, this.currentLandmarks[endIdx].z);
        linePos.needsUpdate = true;
      }
    } else {
      for (const s of this.jointSpheres) s.visible = false;
      for (const l of this.skeletonLines) l.visible = false;
    }
  }

  public reset(): void {
    this.currentLandmarks = [];
    this.targetLandmarks = [];
    this.isFist = false;
    this.currentScale = 1;
    this.currentColorMix = 0;
    this.group.scale.setScalar(1);
  }

  public hasValidData(): boolean {
    return this.currentLandmarks.length >= 21;
  }

  public getPalmPosition(): THREE.Vector3 | null {
    if (this.currentLandmarks.length >= 21) {
      return this.currentLandmarks[PALM_CENTER_INDEX].clone();
    }
    return null;
  }
}
