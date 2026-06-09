import * as THREE from 'three';
import type { GeoPoint } from './dataLoader';
import { getTemperatureColorHex } from './dataLoader';

export interface BarData {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  geoPoint: GeoPoint;
  baseHeight: number;
  targetScale: number;
  currentScale: number;
}

const EARTH_RADIUS = 5;
const STAR_COUNT = 2000;
const BAR_MIN_HEIGHT = 0.3;
const BAR_MAX_HEIGHT = 2.0;
const BAR_RADIUS = 0.3;
const TEMP_MIN = -10;
const TEMP_MAX = 40;

export class EarthRenderer {
  public earthGroup: THREE.Group;
  public stars: THREE.Points;
  public bars: BarData[] = [];
  public barGroup: THREE.Group;

  constructor() {
    this.earthGroup = new THREE.Group();
    this.barGroup = new THREE.Group();
    this.stars = this.createStarfield();
    this.earthGroup.add(this.createEarth());
    this.earthGroup.add(this.barGroup);
  }

  private createEarth(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 48, 48);
    const canvas = this.createEarthTexture();
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'earth';

    const atmosphere = this.createAtmosphere();
    mesh.add(atmosphere);

    return mesh;
  }

  private createAtmosphere(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.03, 48, 48);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4A90D9,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private createEarthTexture(): HTMLCanvasElement {
    const width = 1024;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const oceanGradient = ctx.createLinearGradient(0, 0, 0, height);
    oceanGradient.addColorStop(0, '#2A5FB0');
    oceanGradient.addColorStop(0.5, '#3A7BD5');
    oceanGradient.addColorStop(1, '#2A5FB0');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#E8E8E8';
    this.drawLowPolyContinent(ctx, width, height);

    ctx.fillStyle = '#DADADA';
    this.drawLowPolyContinent2(ctx, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const s = Math.random() * 2 + 0.5;
      ctx.fillRect(x, y, s, s);
    }

    return canvas;
  }

  private drawLowPolyContinent(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.22);
    ctx.lineTo(w * 0.12, h * 0.18);
    ctx.lineTo(w * 0.22, h * 0.15);
    ctx.lineTo(w * 0.28, h * 0.22);
    ctx.lineTo(w * 0.30, h * 0.35);
    ctx.lineTo(w * 0.24, h * 0.42);
    ctx.lineTo(w * 0.18, h * 0.48);
    ctx.lineTo(w * 0.10, h * 0.45);
    ctx.lineTo(w * 0.06, h * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.45, h * 0.18);
    ctx.lineTo(w * 0.52, h * 0.15);
    ctx.lineTo(w * 0.58, h * 0.20);
    ctx.lineTo(w * 0.60, h * 0.32);
    ctx.lineTo(w * 0.55, h * 0.45);
    ctx.lineTo(w * 0.48, h * 0.50);
    ctx.lineTo(w * 0.44, h * 0.40);
    ctx.lineTo(w * 0.43, h * 0.28);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.62, h * 0.12);
    ctx.lineTo(w * 0.75, h * 0.10);
    ctx.lineTo(w * 0.88, h * 0.18);
    ctx.lineTo(w * 0.92, h * 0.30);
    ctx.lineTo(w * 0.88, h * 0.40);
    ctx.lineTo(w * 0.78, h * 0.45);
    ctx.lineTo(w * 0.68, h * 0.42);
    ctx.lineTo(w * 0.62, h * 0.32);
    ctx.lineTo(w * 0.60, h * 0.22);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.55);
    ctx.lineTo(w * 0.24, h * 0.52);
    ctx.lineTo(w * 0.28, h * 0.62);
    ctx.lineTo(w * 0.26, h * 0.78);
    ctx.lineTo(w * 0.20, h * 0.88);
    ctx.lineTo(w * 0.14, h * 0.82);
    ctx.lineTo(w * 0.12, h * 0.68);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.52);
    ctx.lineTo(w * 0.52, h * 0.50);
    ctx.lineTo(w * 0.55, h * 0.60);
    ctx.lineTo(w * 0.50, h * 0.72);
    ctx.lineTo(w * 0.44, h * 0.68);
    ctx.lineTo(w * 0.41, h * 0.58);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.78, h * 0.55);
    ctx.lineTo(w * 0.88, h * 0.52);
    ctx.lineTo(w * 0.92, h * 0.62);
    ctx.lineTo(w * 0.87, h * 0.75);
    ctx.lineTo(w * 0.80, h * 0.72);
    ctx.lineTo(w * 0.76, h * 0.64);
    ctx.closePath();
    ctx.fill();
  }

  private drawLowPolyContinent2(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.beginPath();
    ctx.moveTo(w * 0.70, h * 0.15);
    ctx.lineTo(w * 0.82, h * 0.12);
    ctx.lineTo(w * 0.90, h * 0.22);
    ctx.lineTo(w * 0.85, h * 0.28);
    ctx.lineTo(w * 0.75, h * 0.25);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.08, h * 0.78);
    ctx.lineTo(w * 0.18, h * 0.75);
    ctx.lineTo(w * 0.25, h * 0.82);
    ctx.lineTo(w * 0.20, h * 0.92);
    ctx.lineTo(w * 0.10, h * 0.88);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.52, h * 0.82);
    ctx.lineTo(w * 0.60, h * 0.80);
    ctx.lineTo(w * 0.65, h * 0.88);
    ctx.lineTo(w * 0.58, h * 0.94);
    ctx.lineTo(w * 0.50, h * 0.90);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.90, h * 0.80);
    ctx.lineTo(w * 0.96, h * 0.78);
    ctx.lineTo(w * 0.98, h * 0.88);
    ctx.lineTo(w * 0.92, h * 0.92);
    ctx.closePath();
    ctx.fill();

    for (let i = 0; i < 30; i++) {
      const x = w * (0.05 + Math.random() * 0.9);
      const y = h * (0.1 + Math.random() * 0.8);
      const r = Math.random() * 8 + 3;
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.8, y - r * 0.2);
      ctx.lineTo(x + r * 0.5, y + r * 0.7);
      ctx.lineTo(x - r * 0.6, y + r * 0.5);
      ctx.lineTo(x - r * 0.8, y - r * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }

  private createStarfield(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const radius = 80 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 1.0;

      sizes[i] = 1 + Math.random() * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    stars.name = 'stars';
    return stars;
  }

  public createBars(geoPoints: GeoPoint[]): void {
    geoPoints.forEach(point => {
      const { mesh, glowMesh, baseHeight } = this.createSingleBar(point);
      this.barGroup.add(mesh);
      this.barGroup.add(glowMesh);
      this.bars.push({
        mesh,
        glowMesh,
        geoPoint: point,
        baseHeight,
        targetScale: 1,
        currentScale: 1
      });
    });
  }

  private createSingleBar(point: GeoPoint): { mesh: THREE.Mesh; glowMesh: THREE.Mesh; baseHeight: number } {
    const t = Math.max(0, Math.min(1, (point.temperature - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)));
    const height = BAR_MIN_HEIGHT + (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT) * t;

    const phi = (90 - point.lat) * (Math.PI / 180);
    const theta = (point.lon + 180) * (Math.PI / 180);

    const x = -EARTH_RADIUS * Math.sin(phi) * Math.cos(theta);
    const y = EARTH_RADIUS * Math.cos(phi);
    const z = EARTH_RADIUS * Math.sin(phi) * Math.sin(theta);

    const direction = new THREE.Vector3(x, y, z).normalize();

    const geometry = new THREE.CylinderGeometry(BAR_RADIUS, BAR_RADIUS, height, 12, 1, false);
    const colorHex = getTemperatureColorHex(point.temperature);

    const material = new THREE.MeshStandardMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.75,
      emissive: colorHex,
      emissiveIntensity: 0.35,
      metalness: 0.2,
      roughness: 0.4
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(direction.clone().multiplyScalar(EARTH_RADIUS + height / 2));
    mesh.lookAt(direction.clone().multiplyScalar(EARTH_RADIUS + height + 5));
    mesh.rotateX(Math.PI / 2);
    mesh.userData = { type: 'bar', geoPoint: point, baseHeight: height };

    const glowGeometry = new THREE.CylinderGeometry(BAR_RADIUS * 1.6, BAR_RADIUS * 1.8, height * 1.05, 12, 1, false);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      depthWrite: false
    });

    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.copy(mesh.position);
    glowMesh.rotation.copy(mesh.rotation);
    glowMesh.userData = { type: 'bar-glow', parentBar: mesh };

    return { mesh, glowMesh, baseHeight: height };
  }

  public setBarsVisible(visible: boolean): void {
    this.barGroup.visible = visible;
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.bars.forEach(bar => {
      const diff = bar.targetScale - bar.currentScale;
      bar.currentScale += diff * Math.min(1, deltaTime * 8);

      const scaleY = bar.baseHeight * bar.currentScale;
      bar.mesh.scale.y = bar.currentScale;
      bar.glowMesh.scale.y = bar.currentScale;

      const direction = new THREE.Vector3().copy(bar.mesh.position).normalize();
      const newPos = direction.clone().multiplyScalar(EARTH_RADIUS + scaleY / 2);
      bar.mesh.position.copy(newPos);
      bar.glowMesh.position.copy(newPos);

      const glowPulse = 0.12 + 0.06 * Math.sin(elapsedTime * 2 + bar.geoPoint.lon * 0.05);
      (bar.glowMesh.material as THREE.MeshBasicMaterial).opacity = glowPulse;
    });

    this.stars.rotation.y += deltaTime * 0.005;
  }
}
