import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Point2D } from './drawBoard';

export interface CurveAnimatorParams {
  segments: number;
  particleCount: number;
  particleSizeScale: number;
  animationSpeed: number;
  curveY: number;
}

export class CurveAnimator {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private curve: THREE.CatmullRomCurve3 | null = null;
  private curveMesh: THREE.Line | null = null;
  private nodes: THREE.Mesh[] = [];
  private particles: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.PointsMaterial | null = null;
  private trailParticles: THREE.Points | null = null;
  private trailGeometry: THREE.BufferGeometry | null = null;
  private trailMaterial: THREE.PointsMaterial | null = null;
  private ground: THREE.Mesh | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private animationId: number = 0;
  private time: number = 0;
  private params: CurveAnimatorParams;
  private canvas: HTMLCanvasElement;
  private container: HTMLElement;

  private trailLength: number = 20;
  private trailOffsets: number[] = [];

  constructor(containerId: string, canvasId: string) {
    const container = document.getElementById(containerId);
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!container || !canvas) {
      throw new Error('Container or canvas element not found');
    }
    this.container = container;
    this.canvas = canvas;

    this.params = {
      segments: 64,
      particleCount: 200,
      particleSizeScale: 1.0,
      animationSpeed: 1.0,
      curveY: 0
    };

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.init();
    this.setupDefaultCurve();
    this.animate();
  }

  private init(): void {
    this.scene.background = null;

    this.camera.position.set(3, 2, 5);
    this.camera.lookAt(0, 0, 0);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 20;

    this.createGround();
    this.createLights();
    this.setupResize();

    for (let i = 0; i < this.trailLength; i++) {
      this.trailOffsets.push((i + 1) / (this.trailLength + 1) * 0.1);
    }
  }

  private createGround(): void {
    const gridHelper = new THREE.GridHelper(10, 20, 0x1a3a5c, 0x0f1f2f);
    gridHelper.position.y = -0.5;
    this.scene.add(gridHelper);
    this.gridHelper = gridHelper;

    const groundGeometry = new THREE.CircleGeometry(5, 64);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a1628,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    this.scene.add(ground);
    this.ground = ground;
  }

  private createLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00ffff, 0.8, 20);
    pointLight1.position.set(3, 3, 3);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff00ff, 0.8, 20);
    pointLight2.position.set(-3, 2, -3);
    this.scene.add(pointLight2);
  }

  private setupResize(): void {
    const resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    resizeObserver.observe(this.container);
  }

  private resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private setupDefaultCurve(): void {
    const defaultPoints: Point2D[] = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 2;
      defaultPoints.push({
        x: 100 + Math.cos(angle) * 60,
        y: 100 + Math.sin(angle) * 60
      });
    }
    this.updateCurve(defaultPoints);
  }

  public updateCurve(points: Point2D[]): void {
    this.clearCurve();

    if (points.length < 2) {
      return;
    }

    const threePoints: THREE.Vector3[] = points.map(p => {
      const x = (p.x - 100) / 100 * 2;
      const z = (p.y - 100) / 100 * 2;
      return new THREE.Vector3(x, this.params.curveY, z);
    });

    this.curve = new THREE.CatmullRomCurve3(threePoints, false, 'catmullrom', 0.5);

    this.createCurveLine();
    this.createCurveNodes(threePoints);
    this.createParticles();
  }

  private clearCurve(): void {
    if (this.curveMesh) {
      this.scene.remove(this.curveMesh);
      this.curveMesh.geometry.dispose();
      (this.curveMesh.material as THREE.Material).dispose();
      this.curveMesh = null;
    }

    for (const node of this.nodes) {
      this.scene.remove(node);
      node.geometry.dispose();
      (node.material as THREE.Material).dispose();
    }
    this.nodes = [];

    this.clearParticles();
  }

  private clearParticles(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particleGeometry?.dispose();
      this.particleMaterial?.dispose();
      this.particles = null;
    }
    if (this.trailParticles) {
      this.scene.remove(this.trailParticles);
      this.trailGeometry?.dispose();
      this.trailMaterial?.dispose();
      this.trailParticles = null;
    }
  }

  private createCurveLine(): void {
    if (!this.curve) return;

    const points = this.curve.getPoints(this.params.segments);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const colors = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      const color = this.lerpColor(0x0066ff, 0x9933ff, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.curveMesh = line;
  }

  private createCurveNodes(points: THREE.Vector3[]): void {
    const geometry = new THREE.SphereGeometry(0.05, 16, 16);

    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      const colorHex = this.lerpColorHex(0x0066ff, 0x9933ff, t);
      const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.3,
        metalness: 0.5,
        roughness: 0.3
      });

      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.copy(points[i]);
      this.scene.add(sphere);
      this.nodes.push(sphere);
    }
  }

  private createParticles(): void {
    this.clearParticles();
    if (!this.curve) return;

    const count = this.params.particleCount;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const offsets = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      offsets[i] = i / count;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    (geometry.attributes as any).offset = new THREE.BufferAttribute(offsets, 1);

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    this.particles = particles;
    this.particleGeometry = geometry;
    this.particleMaterial = material;

    this.createTrailParticles(count);
    this.updateParticlePositions(0);
  }

  private createTrailParticles(count: number): void {
    if (!this.curve) return;

    const trailCount = count * this.trailLength;

    const positions = new Float32Array(trailCount * 3);
    const colors = new Float32Array(trailCount * 3);
    const alphas = new Float32Array(trailCount);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    this.trailParticles = particles;
    this.trailGeometry = geometry;
    this.trailMaterial = material;
  }

  private updateParticlePositions(time: number): void {
    if (!this.curve || !this.particles || !this.particleGeometry) return;

    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    const offsets = (this.particleGeometry.attributes as any).offset.array as Float32Array;
    const count = this.params.particleCount;

    const speed = this.params.animationSpeed * 0.15;
    const sizeScale = this.params.particleSizeScale;

    const tmpVec = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      let t = (offsets[i] + time * speed) % 1;
      this.curve.getPointAt(t, tmpVec);

      positions[i * 3] = tmpVec.x;
      positions[i * 3 + 1] = tmpVec.y;
      positions[i * 3 + 2] = tmpVec.z;

      const sizeT = this.getSizeFactor(t);
      const baseSize = 0.02 + sizeT * 0.06;

      const color = this.lerpColor(0x00ffff, 0xff00ff, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      if (this.particleMaterial) {
        this.particleMaterial.size = baseSize * sizeScale;
      }
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;

    this.updateTrailParticles(time);
  }

  private updateTrailParticles(time: number): void {
    if (!this.curve || !this.trailParticles || !this.trailGeometry) return;

    const positions = this.trailGeometry.attributes.position.array as Float32Array;
    const colors = this.trailGeometry.attributes.color.array as Float32Array;
    const count = this.params.particleCount;
    const sizeScale = this.params.particleSizeScale;
    const speed = this.params.animationSpeed * 0.15;

    const tmpVec = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const baseOffset = i / count;

      for (let j = 0; j < this.trailLength; j++) {
        const idx = i * this.trailLength + j;
        let t = (baseOffset + time * speed - this.trailOffsets[j]) % 1;
        if (t < 0) t += 1;

        this.curve.getPointAt(t, tmpVec);
        positions[idx * 3] = tmpVec.x;
        positions[idx * 3 + 1] = tmpVec.y;
        positions[idx * 3 + 2] = tmpVec.z;

        const alpha = (1 - j / this.trailLength) * 0.3;
        const color = this.lerpColor(0x00ffff, 0xff00ff, t);
        colors[idx * 3] = color.r * alpha;
        colors[idx * 3 + 1] = color.g * alpha;
        colors[idx * 3 + 2] = color.b * alpha;
      }
    }

    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;

    if (this.trailMaterial) {
      this.trailMaterial.size = 0.03 * sizeScale;
    }
  }

  private getSizeFactor(t: number): number {
    const mid = 0.5;
    const dist = Math.abs(t - mid);
    const normalized = 1 - dist / mid;
    return Math.max(0, normalized);
  }

  private lerpColor(hex1: number, hex2: number, t: number): { r: number; g: number; b: number } {
    const r1 = (hex1 >> 16) & 255;
    const g1 = (hex1 >> 8) & 255;
    const b1 = hex1 & 255;
    const r2 = (hex2 >> 16) & 255;
    const g2 = (hex2 >> 8) & 255;
    const b2 = hex2 & 255;

    return {
      r: (r1 + (r2 - r1) * t) / 255,
      g: (g1 + (g2 - g1) * t) / 255,
      b: (b1 + (b2 - b1) * t) / 255
    };
  }

  private lerpColorHex(hex1: number, hex2: number, t: number): number {
    const r1 = (hex1 >> 16) & 255;
    const g1 = (hex1 >> 8) & 255;
    const b1 = hex1 & 255;
    const r2 = (hex2 >> 16) & 255;
    const g2 = (hex2 >> 8) & 255;
    const b2 = hex2 & 255;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  public setParams(params: Partial<CurveAnimatorParams>): void {
    const needsCurveRebuild =
      params.segments !== undefined && params.segments !== this.params.segments ||
      params.curveY !== undefined && params.curveY !== this.params.curveY;

    const needsParticleRebuild =
      params.particleCount !== undefined && params.particleCount !== this.params.particleCount;

    Object.assign(this.params, params);

    if (needsCurveRebuild && this.curve) {
      const points = this.curve.points;
      const point2d: Point2D[] = points.map(v => ({
        x: (v.x / 2) * 100 + 100,
        y: (v.z / 2) * 100 + 100
      }));
      this.updateCurve(point2d);
    } else if (needsParticleRebuild && this.curve) {
      this.createParticles();
    }
  }

  public getParams(): CurveAnimatorParams {
    return { ...this.params };
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.time += 0.016 * this.params.animationSpeed;

    this.controls.update();
    this.updateParticlePositions(this.time);
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.clearCurve();
    if (this.ground) {
      this.scene.remove(this.ground);
      this.ground.geometry.dispose();
      (this.ground.material as THREE.Material).dispose();
    }
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      (this.gridHelper.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
    this.controls.dispose();
  }
}
