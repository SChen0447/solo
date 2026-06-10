import * as THREE from 'three';
import { SignalController, SignalPath } from './SignalController';

interface ParticleData {
  pathIndex: number;
  progress: number;
  speed: number;
  jitter: THREE.Vector3;
  jitterSpeed: number;
}

export class ParticleSystem {
  public points: THREE.Points;
  public trailLines: THREE.LineSegments | null = null;
  public showTrails: boolean = false;

  private particleCount: number = 10000;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  private particles: ParticleData[] = [];
  private signalController: SignalController;

  private baseParticleSpeed: number = 8;
  private minSize: number = 0.05;
  private maxSize: number = 0.25;

  private trailPositions: Float32Array | null = null;
  private trailColors: Float32Array | null = null;
  private maxTrailLength: number = 5;
  private trailHistory: THREE.Vector3[][] = [];

  constructor(signalController: SignalController) {
    this.signalController = signalController;
    this.geometry = new THREE.BufferGeometry();

    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);

    this.initParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.createParticleTexture() }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
          gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
          if (gl_FragColor.a < 0.05) discard;
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
  }

  private createParticleTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private initParticles(): void {
    const paths = this.signalController.paths.length > 0
      ? this.signalController.paths
      : [{ isReflected: false, strength: 1 } as SignalPath];

    for (let i = 0; i < this.particleCount; i++) {
      const pathIndex = Math.floor(Math.random() * Math.max(paths.length, 1));
      this.particles.push({
        pathIndex,
        progress: Math.random(),
        speed: 0.7 + Math.random() * 0.6,
        jitter: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        ),
        jitterSpeed: 0.5 + Math.random() * 1.5
      });
      this.trailHistory.push([]);
    }

    for (let i = 0; i < this.particleCount; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * 10;
      this.positions[i * 3 + 1] = Math.random() * 5;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      this.colors[i * 3] = 1;
      this.colors[i * 3 + 1] = 1;
      this.colors[i * 3 + 2] = 0;

      this.sizes[i] = this.maxSize;
    }
  }

  private getPointOnPath(path: SignalPath, progress: number): THREE.Vector3 {
    const points = path.points;
    if (points.length < 2) return points[0].clone();

    const totalSegments = points.length - 1;
    const segProgress = progress * totalSegments;
    const segIndex = Math.min(Math.floor(segProgress), totalSegments - 1);
    const localT = segProgress - segIndex;

    const p1 = points[segIndex];
    const p2 = points[segIndex + 1];

    return new THREE.Vector3().lerpVectors(p1, p2, localT);
  }

  public setShowTrails(show: boolean): void {
    this.showTrails = show;
    if (show && !this.trailLines) {
      this.createTrailLines();
    }
    if (this.trailLines) {
      this.trailLines.visible = show;
    }
  }

  private createTrailLines(): void {
    const trailCount = Math.min(this.particleCount, 2000);
    this.trailPositions = new Float32Array(trailCount * this.maxTrailLength * 2 * 3);
    this.trailColors = new Float32Array(trailCount * this.maxTrailLength * 2 * 3);

    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));

    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.trailLines = new THREE.LineSegments(trailGeo, trailMat);
    this.trailLines.visible = this.showTrails;
    this.trailLines.frustumCulled = false;
  }

  public update(deltaTime: number, time: number): void {
    const paths = this.signalController.paths;
    if (paths.length === 0) return;

    const signalStrength = this.signalController.signalStrength;

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];

      if (p.pathIndex >= paths.length) {
        p.pathIndex = Math.floor(Math.random() * paths.length);
      }

      const path = paths[p.pathIndex];
      const speedFactor = this.baseParticleSpeed / Math.max(path.length, 1);

      p.progress += deltaTime * p.speed * speedFactor;

      if (p.progress >= 1.0) {
        p.progress = 0;
        p.pathIndex = Math.floor(Math.random() * paths.length);
        p.jitter.set(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        );
      }

      const basePos = this.getPointOnPath(path, p.progress);

      const jitterOffset = Math.sin(time * p.jitterSpeed + i * 0.01) * 0.15;
      basePos.x += p.jitter.x * jitterOffset;
      basePos.y += p.jitter.y * jitterOffset;
      basePos.z += p.jitter.z * jitterOffset;

      this.positions[i * 3] = basePos.x;
      this.positions[i * 3 + 1] = basePos.y;
      this.positions[i * 3 + 2] = basePos.z;

      const distanceFactor = 1 - p.progress * 0.5;
      const particleStrength = signalStrength * path.strength * distanceFactor;
      const color = this.signalController.getParticleColor(
        Math.max(0.05, particleStrength),
        path.isReflected
      );

      this.colors[i * 3] = THREE.MathUtils.lerp(this.colors[i * 3], color.r, 0.2);
      this.colors[i * 3 + 1] = THREE.MathUtils.lerp(this.colors[i * 3 + 1], color.g, 0.2);
      this.colors[i * 3 + 2] = THREE.MathUtils.lerp(this.colors[i * 3 + 2], color.b, 0.2);

      const targetSize = THREE.MathUtils.lerp(this.minSize, this.maxSize, distanceFactor);
      this.sizes[i] = THREE.MathUtils.lerp(this.sizes[i], targetSize, 0.2);

      if (this.showTrails && this.trailLines && this.trailPositions && this.trailColors) {
        if (i < 2000) {
          this.trailHistory[i].push(basePos.clone());
          if (this.trailHistory[i].length > this.maxTrailLength) {
            this.trailHistory[i].shift();
          }

          const history = this.trailHistory[i];
          for (let t = 0; t < history.length - 1; t++) {
            const idx = (i * (this.maxTrailLength - 1) + t) * 6;
            const h1 = history[t];
            const h2 = history[t + 1];
            this.trailPositions[idx] = h1.x;
            this.trailPositions[idx + 1] = h1.y;
            this.trailPositions[idx + 2] = h1.z;
            this.trailPositions[idx + 3] = h2.x;
            this.trailPositions[idx + 4] = h2.y;
            this.trailPositions[idx + 5] = h2.z;

            const alpha = t / history.length;
            const tr = color.r * alpha;
            const tg = color.g * alpha;
            const tb = color.b * alpha;
            this.trailColors[idx] = tr;
            this.trailColors[idx + 1] = tg;
            this.trailColors[idx + 2] = tb;
            this.trailColors[idx + 3] = tr;
            this.trailColors[idx + 4] = tg;
            this.trailColors[idx + 5] = tb;
          }
        }
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    if (this.showTrails && this.trailLines) {
      this.trailLines.geometry.attributes.position.needsUpdate = true;
      this.trailLines.geometry.attributes.color.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    if (this.trailLines) {
      this.trailLines.geometry.dispose();
      (this.trailLines.material as THREE.Material).dispose();
    }
  }
}
