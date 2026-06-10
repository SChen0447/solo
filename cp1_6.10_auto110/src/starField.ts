import * as THREE from 'three';

export interface StarInfo {
  id: number;
  brightness: number;
  constellation: string;
}

const CONSTELLATIONS = [
  '猎鹰座', '玉衡座', '天璇座', '紫微座',
  '天狼座', '织女座', '牛郎座', '北斗座',
  '参宿座', '南十字座', '仙女座', '天龙座'
];

interface StarData {
  baseBrightness: number;
  phase: number;
  frequency: number;
  constellation: string;
  baseSize: number;
}

export class StarField {
  private scene: THREE.Scene;
  private count: number;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private starsData: StarData[] = [];
  private highlightedIndex: number = -1;
  private highlightStartTime: number = 0;
  private readonly HIGHLIGHT_DURATION = 0.8;
  private readonly HIGHLIGHT_SCALE = 1.5;
  private readonly HIGHLIGHT_COLOR = new THREE.Color('#ffeb3b');
  private baseColors: Float32Array;
  private baseSizes: Float32Array;

  constructor(scene: THREE.Scene, count: number) {
    this.scene = scene;
    this.count = count;

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.baseColors = new Float32Array(this.count * 3);
    this.baseSizes = new Float32Array(this.count);
    this.initStars();

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  private initStars(): void {
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      const radius = 180 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const baseBrightness = 0.3 + Math.random() * 0.7;
      const size = 0.3 + Math.random() * 0.9;

      colors[i * 3] = baseBrightness;
      colors[i * 3 + 1] = baseBrightness;
      colors[i * 3 + 2] = baseBrightness;

      sizes[i] = size;
      this.baseSizes[i] = size;

      this.baseColors[i * 3] = baseBrightness;
      this.baseColors[i * 3 + 1] = baseBrightness;
      this.baseColors[i * 3 + 2] = baseBrightness;

      this.starsData.push({
        baseBrightness,
        phase: Math.random() * Math.PI * 2,
        frequency: (2 + Math.random() * 3) / 1000,
        constellation: CONSTELLATIONS[Math.floor(Math.random() * CONSTELLATIONS.length)],
        baseSize: size
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  }

  update(time: number): void {
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < this.count; i++) {
      const star = this.starsData[i];
      const twinkle = 0.5 + 0.5 * Math.sin(time * star.frequency + star.phase);
      const brightness = star.baseBrightness * (0.6 + 0.4 * twinkle);

      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
      sizes[i] = star.baseSize;
    }

    if (this.highlightedIndex >= 0) {
      const elapsed = (time - this.highlightStartTime) / 1000;
      if (elapsed >= this.HIGHLIGHT_DURATION) {
        this.highlightedIndex = -1;
      } else {
        const t = 1 - elapsed / this.HIGHLIGHT_DURATION;
        const idx = this.highlightedIndex;
        const baseColor = this.starsData[idx].baseBrightness;
        const mixR = baseColor + (this.HIGHLIGHT_COLOR.r - baseColor) * t;
        const mixG = baseColor + (this.HIGHLIGHT_COLOR.g - baseColor) * t;
        const mixB = baseColor + (this.HIGHLIGHT_COLOR.b - baseColor) * t;
        colors[idx * 3] = mixR;
        colors[idx * 3 + 1] = mixG;
        colors[idx * 3 + 2] = mixB;
        sizes[idx] = this.starsData[idx].baseSize * (1 + (this.HIGHLIGHT_SCALE - 1) * t);
      }
    }

    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  handleClick(intersect: THREE.Intersection, time: number): StarInfo | null {
    if (intersect.object !== this.points) return null;
    const index = intersect.index;
    if (index === undefined) return null;

    this.highlightedIndex = index;
    this.highlightStartTime = time;

    const star = this.starsData[index];
    return {
      id: index,
      brightness: parseFloat(star.baseBrightness.toFixed(2)),
      constellation: star.constellation
    };
  }

  getPoints(): THREE.Points {
    return this.points;
  }

  get totalCount(): number {
    return this.count;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.points);
  }
}
