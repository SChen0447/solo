import * as THREE from 'three';

export interface QuakeMarkerOptions {
  lat: number;
  lng: number;
  depth: number;
  magnitude: number;
  earthRadius: number;
}

export class QuakeMarker {
  public group: THREE.Group;
  public marker: THREE.Mesh;
  public glow: THREE.Mesh;
  public data: QuakeMarkerOptions;
  public baseScale: number;
  public isHovered: boolean = false;
  public isVisible: boolean = true;
  public targetOpacity: number = 1;
  public currentOpacity: number = 0;

  private pulsePhase: number;
  private pulseSpeed: number;

  constructor(options: QuakeMarkerOptions) {
    this.data = options;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.8 + Math.random() * 0.6;

    this.baseScale = this.calculateSize(options.magnitude);
    const color = this.calculateColor(options.depth);

    this.group = new THREE.Group();
    this.group.userData = { marker: this };

    const geometry = new THREE.SphereGeometry(1, 16, 16);

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
    });

    this.marker = new THREE.Mesh(geometry, material);
    this.marker.scale.setScalar(this.baseScale);
    this.group.add(this.marker);

    const glowGeometry = new THREE.SphereGeometry(1.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });

    this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glow.scale.setScalar(this.baseScale);
    this.group.add(this.glow);

    this.updatePosition(options.lat, options.lng, options.earthRadius);
    this.group.visible = false;
  }

  private calculateSize(magnitude: number): number {
    if (magnitude < 4) return 0.3;
    if (magnitude < 6) return 0.6;
    return 1.0;
  }

  private calculateColor(depth: number): THREE.Color {
    if (depth <= 30) return new THREE.Color(0x4ade80);
    if (depth <= 100) return new THREE.Color(0xfbbf24);
    if (depth <= 300) return new THREE.Color(0xf87171);
    return new THREE.Color(0xa855f7);
  }

  private updatePosition(lat: number, lng: number, earthRadius: number): void {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    const radius = earthRadius + 0.05;

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    this.group.position.set(x, y, z);
    this.group.lookAt(0, 0, 0);
  }

  public update(delta: number, time: number): void {
    const pulse = Math.sin(time * this.pulseSpeed + this.pulsePhase) * 0.15 + 1;
    const targetScale = this.isHovered ? this.baseScale * 1.5 : this.baseScale;

    this.marker.scale.lerp(
      new THREE.Vector3(targetScale * pulse, targetScale * pulse, targetScale * pulse),
      0.1
    );
    this.glow.scale.lerp(
      new THREE.Vector3(targetScale * pulse * 1.8, targetScale * pulse * 1.8, targetScale * pulse * 1.8),
      0.1
    );

    if (this.isHovered) {
      (this.marker.material as THREE.MeshBasicMaterial).color.set(0xffd93d);
      (this.glow.material as THREE.MeshBasicMaterial).color.set(0xffd93d);
      (this.glow.material as THREE.MeshBasicMaterial).opacity = 0.5;
    } else {
      const color = this.calculateColor(this.data.depth);
      (this.marker.material as THREE.MeshBasicMaterial).color.copy(color);
      (this.glow.material as THREE.MeshBasicMaterial).color.copy(color);
      (this.glow.material as THREE.MeshBasicMaterial).opacity = 0.3;
    }

    if (this.currentOpacity !== this.targetOpacity) {
      const diff = this.targetOpacity - this.currentOpacity;
      this.currentOpacity += diff * Math.min(1, delta * 3);

      if (Math.abs(this.targetOpacity - this.currentOpacity) < 0.01) {
        this.currentOpacity = this.targetOpacity;
      }

      (this.marker.material as THREE.MeshBasicMaterial).opacity = this.currentOpacity * 0.9;
      (this.glow.material as THREE.MeshBasicMaterial).opacity = this.currentOpacity * 0.3;

      this.group.visible = this.currentOpacity > 0.01;
    }
  }

  public setVisible(visible: boolean, animate: boolean = true): void {
    this.isVisible = visible;
    this.targetOpacity = visible ? 1 : 0;

    if (!animate) {
      this.currentOpacity = visible ? 1 : 0;
      (this.marker.material as THREE.MeshBasicMaterial).opacity = this.currentOpacity * 0.9;
      (this.glow.material as THREE.MeshBasicMaterial).opacity = this.currentOpacity * 0.3;
      this.group.visible = visible;
    }
  }

  public setHovered(hovered: boolean): void {
    this.isHovered = hovered;
  }

  public dispose(): void {
    this.marker.geometry.dispose();
    (this.marker.material as THREE.Material).dispose();
    this.glow.geometry.dispose();
    (this.glow.material as THREE.Material).dispose();
  }
}

export function createSharedGeometries() {
  const sphereGeo = new THREE.SphereGeometry(1, 16, 16);
  const glowGeo = new THREE.SphereGeometry(1.5, 16, 16);
  return { sphereGeo, glowGeo };
}
