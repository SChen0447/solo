import * as THREE from 'three';
import type { StarData, ConstellationData } from './types';

export class ConstellationLine {
  private constellation: ConstellationData;
  private starMap: Map<string, StarData>;
  private lineGroup: THREE.Group;
  private lines: THREE.Line[] = [];
  private label: THREE.Sprite | null = null;
  private centerPosition: THREE.Vector3;
  private radius: number;
  private isVisible: boolean = false;
  private animationProgress: number = 0;
  private animationDuration: number = 1000;
  private animationStartTime: number = 0;
  private pulseIntensity: number = 1;
  private baseOpacity: number = 0.6;

  constructor(
    constellation: ConstellationData,
    starMap: Map<string, StarData>,
    radius: number = 100
  ) {
    this.constellation = constellation;
    this.starMap = starMap;
    this.radius = radius;
    this.centerPosition = new THREE.Vector3();
    this.lineGroup = new THREE.Group();
    this.lineGroup.name = `constellation_${constellation.id}`;

    this.createLines();
    this.createLabel();
    this.calculateCenter();
  }

  private getStarPosition(starId: string): THREE.Vector3 | null {
    const star = this.starMap.get(starId);
    if (!star) return null;

    const x = this.radius * Math.cos(star.dec) * Math.cos(star.ra);
    const y = this.radius * Math.sin(star.dec);
    const z = this.radius * Math.cos(star.dec) * Math.sin(star.ra);

    return new THREE.Vector3(x, y, z);
  }

  private createLines(): void {
    const starIds = this.constellation.stars;

    for (let i = 0; i < starIds.length - 1; i++) {
      const startPos = this.getStarPosition(starIds[i]);
      const endPos = this.getStarPosition(starIds[i + 1]);

      if (!startPos || !endPos) continue;

      const geometry = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
      const material = new THREE.LineBasicMaterial({
        color: 0xd4af37,
        transparent: true,
        opacity: 0,
        linewidth: 2,
      });

      const line = new THREE.Line(geometry, material);
      line.userData = { startPos, endPos, index: i, total: starIds.length - 1 };
      this.lines.push(line);
      this.lineGroup.add(line);
    }
  }

  private createLabel(): void {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(212, 175, 55, 0.9)';
    context.font = 'bold 28px "SimSun", "宋体", serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(this.constellation.name, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    this.label = new THREE.Sprite(material);
    this.label.scale.set(15, 3.75, 1);
    this.lineGroup.add(this.label);
  }

  private calculateCenter(): void {
    const starIds = this.constellation.stars;
    let center = new THREE.Vector3();
    let count = 0;

    for (const starId of starIds) {
      const pos = this.getStarPosition(starId);
      if (pos) {
        center.add(pos);
        count++;
      }
    }

    if (count > 0) {
      center.divideScalar(count);
      center.normalize().multiplyScalar(this.radius * 1.08);
      this.centerPosition.copy(center);

      if (this.label) {
        this.label.position.copy(center);
        const labelOffset = center.clone().normalize().multiplyScalar(5);
        this.label.position.add(labelOffset);
      }
    }
  }

  public show(): void {
    if (this.isVisible) return;
    this.isVisible = true;
    this.animationStartTime = performance.now();
    this.animationProgress = 0;
    this.lineGroup.visible = true;
  }

  public hide(): void {
    this.isVisible = false;
    this.animationProgress = 0;

    for (const line of this.lines) {
      (line.material as THREE.LineBasicMaterial).opacity = 0;
    }

    if (this.label) {
      (this.label.material as THREE.SpriteMaterial).opacity = 0;
    }

    this.lineGroup.visible = false;
  }

  public update(time: number, camera: THREE.Camera): void {
    if (!this.isVisible && this.animationProgress <= 0) return;

    const elapsed = time - this.animationStartTime;

    if (this.isVisible && this.animationProgress < 1) {
      this.animationProgress = Math.min(1, elapsed / this.animationDuration);
    }

    const centerIdx = this.constellation.centerStarIndex;
    const totalLines = this.lines.length;

    for (let i = 0; i < totalLines; i++) {
      const line = this.lines[i];
      const distanceFromCenter = Math.abs(i - centerIdx) / Math.max(1, totalLines / 2);
      const delay = distanceFromCenter * 0.3;
      const lineProgress = Math.max(0, Math.min(1, (this.animationProgress - delay) / (1 - delay)));

      const easeProgress = 1 - Math.pow(1 - lineProgress, 3);
      const pulse = 1 + 0.15 * Math.sin(time * 0.003 * this.pulseIntensity + i * 0.5);
      const opacity = this.baseOpacity * easeProgress * pulse;

      (line.material as THREE.LineBasicMaterial).opacity = opacity;
    }

    if (this.label) {
      const labelProgress = Math.min(1, this.animationProgress / 0.8);
      const easeLabel = 1 - Math.pow(1 - labelProgress, 2);
      const pulse = 1 + 0.1 * Math.sin(time * 0.002 * this.pulseIntensity);
      (this.label.material as THREE.SpriteMaterial).opacity = 0.9 * easeLabel * pulse;

      this.label.lookAt(camera.position);
    }
  }

  public setPulseIntensity(intensity: number): void {
    this.pulseIntensity = intensity;
  }

  public getGroup(): THREE.Group {
    return this.lineGroup;
  }

  public getCenterPosition(): THREE.Vector3 {
    return this.centerPosition.clone();
  }

  public getName(): string {
    return this.constellation.name;
  }

  public getId(): string {
    return this.constellation.id;
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  public dispose(): void {
    for (const line of this.lines) {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }

    if (this.label) {
      const mat = this.label.material as THREE.SpriteMaterial;
      if (mat.map) mat.map.dispose();
      mat.dispose();
    }

    this.lines = [];
  }
}
