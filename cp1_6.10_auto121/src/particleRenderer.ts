import * as THREE from 'three';

export type VisualizationMode = 'sphere' | 'bars' | 'waveform';
export type ColorTheme = 'default' | 'cyan' | 'neon';

interface ParticleData {
  baseTheta: number;
  basePhi: number;
  baseRadius: number;
  currentTheta: number;
  currentPhi: number;
  currentRadius: number;
  targetRadius: number;
  baseSize: number;
  hue: number;
  freqIndex: number;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export class ParticleRenderer {
  private scene: THREE.Scene;
  public particles: THREE.Points | null = null;
  public bars: THREE.Mesh[] = [];
  public waveformLine: THREE.Line | null = null;
  private starfield: THREE.Points | null = null;
  private particleData: ParticleData[] = [];
  public particleCount: number = 1024;
  private mode: VisualizationMode = 'sphere';
  private theme: ColorTheme = 'default';
  private positions: Float32Array | null = null;
  private colors: Float32Array | null = null;
  private sizes: Float32Array | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private barsGroup: THREE.Group | null = null;
  private waveformGeometry: THREE.BufferGeometry | null = null;
  private rotationY: number = 0;

  private readonly SPHERE_RADIUS = 12;
  private readonly MAX_BASS_OFFSET = 5;
  private readonly BARS_COUNT = 128;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createStarfield();
    this.createParticles(this.particleCount);
    this.createBars();
    this.createWaveform();
  }

  private createStarfield(): void {
    const count = 500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = 200 * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      colors[i * 3] = 0.7 + Math.random() * 0.3;
      colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
      colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;

      sizes[i] = 1 + Math.random() * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true
    });

    this.starfield = new THREE.Points(geo, mat);
    this.scene.add(this.starfield);
  }

  private getThemeColor(t: number): THREE.Color {
    const c = new THREE.Color();
    switch (this.theme) {
      case 'cyan':
        c.setHex(0x00d4aa);
        return c;
      case 'neon':
        if (t < 0.5) {
          c.setRGB(1, 0, 119 / 255 * (1 - t * 2));
          c.lerp(new THREE.Color(0xff0077), t * 2);
        } else {
          c.setRGB(0, 1, 136 / 255 * ((t - 0.5) * 2));
          c.lerp(new THREE.Color(0x00ff88), (t - 0.5) * 2);
        }
        return c;
      case 'default':
      default:
        const tt = (t % 1 + 1) % 1;
        if (tt < 0.5) {
          c.lerpColors(new THREE.Color(0xff6b6b), new THREE.Color(0x4ecdc4), tt * 2);
        } else {
          c.lerpColors(new THREE.Color(0x4ecdc4), new THREE.Color(0xff6b6b), (tt - 0.5) * 2);
        }
        return c;
    }
  }

  public createParticles(count: number): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }

    this.particleCount = count;
    this.particleData = [];
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = this.SPHERE_RADIUS;
      const size = 0.08 + Math.random() * 0.22;
      const hue = i / count;

      this.particleData.push({
        baseTheta: theta,
        basePhi: phi,
        baseRadius: radius,
        currentTheta: theta,
        currentPhi: phi,
        currentRadius: radius,
        targetRadius: radius,
        baseSize: size,
        hue: hue,
        freqIndex: Math.floor((i / count) * 512)
      });

      this.positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      this.positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      this.positions[i * 3 + 2] = radius * Math.cos(phi);

      const c = this.getThemeColor(hue);
      this.colors[i * 3] = c.r;
      this.colors[i * 3 + 1] = c.g;
      this.colors[i * 3 + 2] = c.b;

      this.sizes[i] = size;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(this.geometry, material);
    this.particles.visible = this.mode === 'sphere';
    this.scene.add(this.particles);
  }

  private createBars(): void {
    if (this.barsGroup) {
      this.scene.remove(this.barsGroup);
    }
    this.barsGroup = new THREE.Group();
    this.bars = [];

    for (let i = 0; i < this.BARS_COUNT; i++) {
      const geo = new THREE.BoxGeometry(0.3, 0.1, 0.3);
      const c = this.getThemeColor(i / this.BARS_COUNT);
      const mat = new THREE.MeshBasicMaterial({
        color: c,
        transparent: true,
        opacity: 0.7
      });
      const bar = new THREE.Mesh(geo, mat);
      const angle = (i / this.BARS_COUNT) * Math.PI * 2;
      bar.position.set(
        Math.cos(angle) * this.SPHERE_RADIUS * 1.5,
        0,
        Math.sin(angle) * this.SPHERE_RADIUS * 1.5
      );
      bar.lookAt(0, 0, 0);
      this.bars.push(bar);
      this.barsGroup.add(bar);
    }
    this.barsGroup.visible = this.mode === 'bars';
    this.scene.add(this.barsGroup);
  }

  private createWaveform(): void {
    if (this.waveformLine) {
      this.scene.remove(this.waveformLine);
      this.waveformLine.geometry.dispose();
      (this.waveformLine.material as THREE.Material).dispose();
    }
    const points = 512;
    const positions = new Float32Array(points * 3);
    const colors = new Float32Array(points * 3);

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = this.SPHERE_RADIUS * 1.8;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      const c = this.getThemeColor(i / points);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    this.waveformGeometry = new THREE.BufferGeometry();
    this.waveformGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.waveformGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    });

    this.waveformLine = new THREE.Line(this.waveformGeometry, mat);
    this.waveformLine.visible = this.mode === 'waveform';
    this.scene.add(this.waveformLine);
  }

  public setMode(mode: VisualizationMode): void {
    this.mode = mode;
    if (this.particles) this.particles.visible = mode === 'sphere';
    if (this.barsGroup) this.barsGroup.visible = mode === 'bars';
    if (this.waveformLine) this.waveformLine.visible = mode === 'waveform';
  }

  public setColorTheme(theme: ColorTheme): void {
    this.theme = theme;
    if (this.colors && this.particleData.length > 0) {
      for (let i = 0; i < this.particleData.length; i++) {
        const c = this.getThemeColor(this.particleData[i].hue);
        this.colors[i * 3] = c.r;
        this.colors[i * 3 + 1] = c.g;
        this.colors[i * 3 + 2] = c.b;
      }
      if (this.geometry) {
        (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      }
    }
    this.bars.forEach((bar, i) => {
      const c = this.getThemeColor(i / this.bars.length);
      (bar.material as THREE.MeshBasicMaterial).color.copy(c);
    });
    if (this.waveformGeometry) {
      const cols = this.waveformGeometry.attributes.color as THREE.BufferAttribute;
      for (let i = 0; i < cols.count; i++) {
        const c = this.getThemeColor(i / cols.count);
        cols.setXYZ(i, c.r, c.g, c.b);
      }
      cols.needsUpdate = true;
    }
  }

  public update(
    frequencyData: Uint8Array,
    bassEnergy: number,
    midEnergy: number,
    highEnergy: number,
    deltaTime: number
  ): void {
    this.rotationY += 0.05 * deltaTime;
    if (this.particles) {
      this.particles.rotation.y = this.rotationY;
    }
    if (this.barsGroup) {
      this.barsGroup.rotation.y = this.rotationY;
    }
    if (this.waveformLine) {
      this.waveformLine.rotation.y = this.rotationY;
    }

    if (this.starfield) {
      const pos = this.starfield.geometry.attributes.position as THREE.BufferAttribute;
      const col = this.starfield.geometry.attributes.color as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const flicker = 0.3 + Math.sin(performance.now() / 1000 + i) * 0.2 + Math.random() * 0.2;
        const alpha = Math.min(0.7, Math.max(0.3, flicker));
        col.setXYZ(i, alpha, alpha, alpha * 1.1);
      }
      col.needsUpdate = true;
    }

    if (this.mode === 'sphere' && this.particles && this.positions && this.colors && this.sizes) {
      const bassFactor = bassEnergy;
      const midFactor = midEnergy;
      const highFactor = highEnergy;

      for (let i = 0; i < this.particleData.length; i++) {
        const p = this.particleData[i];
        const freqVal = frequencyData[p.freqIndex] / 255;

        const rotSpeed = lerp(0.2, 1.0, midFactor);
        p.currentTheta = lerp(p.currentTheta, p.baseTheta + rotSpeed * (performance.now() / 1000), 0.05);

        const jitter = (Math.random() - 0.5) * 2 * highFactor * 2;
        const jitterPhi = (Math.random() - 0.5) * highFactor * 0.5;

        const radiusOffset = bassFactor * this.MAX_BASS_OFFSET + freqVal * 2;
        p.targetRadius = p.baseRadius + radiusOffset;
        p.currentRadius = lerp(p.currentRadius, p.targetRadius, 0.1);

        const phi = p.currentPhi + jitterPhi;
        const r = p.currentRadius + jitter;
        this.positions[i * 3] = r * Math.sin(phi) * Math.cos(p.currentTheta);
        this.positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(p.currentTheta);
        this.positions[i * 3 + 2] = r * Math.cos(phi);

        const brightness = lerp(0.3, 1.0, freqVal * 0.5 + bassFactor * 0.3 + highFactor * 0.2);
        const baseColor = this.getThemeColor(p.hue);
        this.colors[i * 3] = baseColor.r * brightness;
        this.colors[i * 3 + 1] = baseColor.g * brightness;
        this.colors[i * 3 + 2] = baseColor.b * brightness;

        this.sizes[i] = p.baseSize * (0.8 + brightness * 0.8);
      }

      (this.geometry!.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this.geometry!.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      (this.geometry!.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    }

    if (this.mode === 'bars' && this.bars.length > 0) {
      for (let i = 0; i < this.BARS_COUNT; i++) {
        const freqIdx = Math.floor((i / this.BARS_COUNT) * frequencyData.length);
        const val = frequencyData[freqIdx] / 255;
        const height = Math.max(0.1, val * 15);
        this.bars[i].scale.y = height;
        const brightness = lerp(0.3, 1.0, val);
        (this.bars[i].material as THREE.MeshBasicMaterial).opacity = 0.4 + val * 0.5;
        const baseC = this.getThemeColor(i / this.BARS_COUNT);
        (this.bars[i].material as THREE.MeshBasicMaterial).color.setRGB(
          baseC.r * brightness,
          baseC.g * brightness,
          baseC.b * brightness
        );
      }
    }

    if (this.mode === 'waveform' && this.waveformGeometry) {
      const pos = this.waveformGeometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const angle = (i / pos.count) * Math.PI * 2;
        const freqIdx = Math.floor((i / pos.count) * frequencyData.length);
        const val = frequencyData[freqIdx] / 255;
        const r = this.SPHERE_RADIUS * 1.8 + val * 8;
        const y = Math.sin(i * 0.3 + performance.now() / 500) * val * 5;
        pos.setXYZ(i, Math.cos(angle) * r, y, Math.sin(angle) * r);
      }
      pos.needsUpdate = true;
    }
  }
}
