import * as THREE from 'three';
import { ParticleSystem } from './particles';

type WeaveMode = 'linear' | 'spiral' | 'scatter';

const COLOR_PALETTE = [
  '#ff6677',
  '#66ff77',
  '#7766ff',
  '#ffcc66',
  '#66ccff'
];

interface RayData {
  line: THREE.Line;
  points: THREE.Vector3[];
  color: THREE.Color;
  birthTime: number;
  geometry: THREE.BufferGeometry;
  material: THREE.LineBasicMaterial;
}

interface RingData {
  mesh: THREE.Mesh;
  colorIndex: number;
  clickAnim: number;
  baseScale: number;
}

export class Loom {
  private scene: THREE.Scene;
  private particles: ParticleSystem;

  public platform!: THREE.Mesh;
  private platformBaseY = 0;

  public colorRings: RingData[] = [];
  public rays: RayData[] = [];

  public currentColor: THREE.Color;
  public currentColorIndex = 0;
  public weaveMode: WeaveMode = 'linear';
  public rayCount = 0;

  private isDrawing = false;
  private currentRay: RayData | null = null;
  private lastPointerPos: THREE.Vector3 | null = null;
  private spiralAngle = 0;

  private weaveTriggerPending = false;

  private readonly PLATFORM_RADIUS = 3;
  private readonly RING_COUNT = 6;
  private readonly RING_OUTER = 0.4;
  private readonly RING_INNER = 0.2;
  private readonly LINE_WIDTH = 0.03;
  private readonly BREATH_PERIOD = 0.5;
  private readonly RAYS_PER_WEAVE = 12;
  private readonly WEAVE_RAY_COUNT = 3;

  constructor(scene: THREE.Scene, particles: ParticleSystem) {
    this.scene = scene;
    this.particles = particles;
    this.currentColor = new THREE.Color(COLOR_PALETTE[0]);

    this.createPlatform();
    this.createColorRings();
  }

  private createPlatform(): void {
    const geometry = new THREE.CircleGeometry(this.PLATFORM_RADIUS, 64);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color('#4444aa') },
        uColorB: { value: new THREE.Color('#aa44aa') }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying vec2 vUv;

        void main() {
          float dist = length(vUv - 0.5) * 2.0;
          vec3 baseColor = mix(uColorB, uColorA, dist);

          float pulse = 0.5 + 0.5 * sin(uTime * 1.5);
          float glow = (1.0 - dist) * (0.3 + 0.25 * pulse);

          vec3 finalColor = baseColor + glow * vec3(0.8, 0.6, 1.0);
          float alpha = 0.55 + 0.15 * pulse;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.platform = new THREE.Mesh(geometry, material);
    this.platform.rotation.x = -Math.PI / 2;
    this.platform.position.y = this.platformBaseY;
    this.scene.add(this.platform);
  }

  private createColorRings(): void {
    for (let i = 0; i < this.RING_COUNT; i++) {
      const colorIndex = i % COLOR_PALETTE.length;
      const color = new THREE.Color(COLOR_PALETTE[colorIndex]);

      const tubeRadius = (this.RING_OUTER - this.RING_INNER) / 2;
      const ringRadius = (this.RING_OUTER + this.RING_INNER) / 2;
      const geometry = new THREE.TorusGeometry(ringRadius, tubeRadius, 16, 48);

      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.85
      });

      const mesh = new THREE.Mesh(geometry, material);

      const angle = (i / this.RING_COUNT) * Math.PI * 2;
      const ringDist = this.PLATFORM_RADIUS + 0.8;
      mesh.position.set(
        Math.cos(angle) * ringDist,
        0.3,
        Math.sin(angle) * ringDist
      );
      mesh.rotation.x = -Math.PI / 2;

      this.scene.add(mesh);
      this.colorRings.push({
        mesh,
        colorIndex,
        clickAnim: 0,
        baseScale: 1
      });
    }
  }

  public handlePointerDown(position: THREE.Vector3): void {
    this.isDrawing = true;
    this.lastPointerPos = position.clone();
    this.spiralAngle = 0;
    this.createRay(position);
  }

  public handlePointerMove(position: THREE.Vector3): void {
    if (!this.isDrawing || !this.currentRay) return;
    this.lastPointerPos = position.clone();

    if (this.weaveMode === 'linear') {
      this.addLinearPoint(position);
    } else if (this.weaveMode === 'spiral') {
      this.addSpiralPoint(position);
    }
  }

  public handlePointerUp(position: THREE.Vector3): void {
    if (!this.isDrawing) return;

    if (this.weaveMode === 'scatter' && this.lastPointerPos) {
      this.createScatterRays(this.lastPointerPos);
    }

    this.isDrawing = false;
    this.currentRay = null;
    this.lastPointerPos = null;

    this.rayCount++;
    if (this.rayCount % this.RAYS_PER_WEAVE === 0 && this.rayCount > 0) {
      this.weaveTriggerPending = true;
    }
  }

  public handleColorRingClick(ringIndex: number): void {
    if (ringIndex < 0 || ringIndex >= this.colorRings.length) return;

    const ring = this.colorRings[ringIndex];
    this.currentColorIndex = ring.colorIndex;
    this.currentColor = new THREE.Color(COLOR_PALETTE[ring.colorIndex]);
    ring.clickAnim = 0.3;

    this.particles.emitColorBurst(
      ring.mesh.position.clone(),
      new THREE.Color(COLOR_PALETTE[ring.colorIndex]),
      10
    );
  }

  public toggleWeaveMode(): WeaveMode {
    const modes: WeaveMode[] = ['linear', 'spiral', 'scatter'];
    const idx = modes.indexOf(this.weaveMode);
    this.weaveMode = modes[(idx + 1) % modes.length];
    return this.weaveMode;
  }

  public getModeDisplayName(): string {
    switch (this.weaveMode) {
      case 'linear': return '线性编织';
      case 'spiral': return '螺旋编织';
      case 'scatter': return '散射编织';
    }
  }

  private createRay(startPos: THREE.Vector3): RayData {
    const points = [startPos.clone()];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(
      new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), 3
    ));

    const material = new THREE.LineBasicMaterial({
      color: this.currentColor.clone(),
      transparent: true,
      opacity: 0.6,
      linewidth: 1
    });

    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    this.scene.add(line);

    const ray: RayData = {
      line,
      points,
      color: this.currentColor.clone(),
      birthTime: performance.now() / 1000,
      geometry,
      material
    };

    this.rays.push(ray);
    this.currentRay = ray;
    return ray;
  }

  private addLinearPoint(pos: THREE.Vector3): void {
    if (!this.currentRay) return;
    const last = this.currentRay.points[this.currentRay.points.length - 1];
    if (last.distanceTo(pos) < 0.05) return;

    this.currentRay.points.push(pos.clone());
    this.updateRayGeometry(this.currentRay);
  }

  private addSpiralPoint(center: THREE.Vector3): void {
    if (!this.currentRay) return;

    this.spiralAngle += 0.25;
    const radius = 0.5;
    const spiralPos = new THREE.Vector3(
      center.x + Math.cos(this.spiralAngle) * radius,
      center.y + 0.01,
      center.z + Math.sin(this.spiralAngle) * radius
    );

    this.currentRay.points.push(spiralPos);
    this.updateRayGeometry(this.currentRay);
  }

  private createScatterRays(center: THREE.Vector3): void {
    const rayCount = 8;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const length = 1.2 + Math.random() * 0.8;
      const endPos = new THREE.Vector3(
        center.x + Math.cos(angle) * length,
        center.y + 0.01,
        center.z + Math.sin(angle) * length
      );

      const ray = this.createRay(center.clone());
      ray.points.push(endPos.clone());
      this.updateRayGeometry(ray);
      this.rayCount++;
    }
  }

  private updateRayGeometry(ray: RayData): void {
    const positions = new Float32Array(ray.points.length * 3);
    for (let i = 0; i < ray.points.length; i++) {
      positions[i * 3] = ray.points[i].x;
      positions[i * 3 + 1] = ray.points[i].y;
      positions[i * 3 + 2] = ray.points[i].z;
    }
    ray.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    ray.geometry.computeBoundingSphere();
  }

  private triggerWeaveAnimation(): void {
    if (this.rays.length < this.WEAVE_RAY_COUNT) return;

    const recent = this.rays.slice(-this.WEAVE_RAY_COUNT);

    const mixedColor = new THREE.Color(0, 0, 0);
    recent.forEach(r => mixedColor.add(r.color));
    mixedColor.multiplyScalar(1 / recent.length);

    const allPoints: THREE.Vector3[] = [];
    recent.forEach(r => allPoints.push(...r.points));

    if (allPoints.length >= 3) {
      const centroid = new THREE.Vector3();
      allPoints.forEach(p => centroid.add(p));
      centroid.divideScalar(allPoints.length);
      centroid.y += 0.1;

      this.particles.emitGlowPoint(centroid, mixedColor, 2.0);
    }

    this.weaveTriggerPending = false;
  }

  public update(delta: number, time: number): void {
    const platformMat = this.platform.material as THREE.ShaderMaterial;
    platformMat.uniforms.uTime.value = time;

    const floatOffset = Math.sin(time * (Math.PI * 2 / 3)) * 0.05;
    this.platform.position.y = this.platformBaseY + floatOffset;

    for (let i = this.rays.length - 1; i >= 0; i--) {
      const ray = this.rays[i];
      const age = time - ray.birthTime;

      const breathPhase = (age / this.BREATH_PERIOD) * Math.PI;
      const breathOpacity = 0.5 + 0.5 * Math.sin(breathPhase);
      const baseOpacity = Math.max(0, 1 - age * 0.08);
      ray.material.opacity = Math.min(0.85, baseOpacity * (0.4 + 0.6 * breathOpacity));

      const fadeThreshold = 10;
      if (age > fadeThreshold && ray.material.opacity <= 0.02) {
        this.scene.remove(ray.line);
        ray.geometry.dispose();
        ray.material.dispose();
        this.rays.splice(i, 1);
      }
    }

    for (const ring of this.colorRings) {
      if (ring.clickAnim > 0) {
        ring.clickAnim -= delta;
        const t = 1 - (ring.clickAnim / 0.3);
        const scale = t < 0.5
          ? 1 - t * 0.6
          : 0.7 + (t - 0.5) * 0.6;
        ring.mesh.scale.setScalar(scale);
        if (ring.clickAnim <= 0) {
          ring.clickAnim = 0;
          ring.mesh.scale.setScalar(1);
        }
      }

      ring.mesh.position.y = 0.3 + Math.sin(time * 1.2 + ring.colorIndex) * 0.08;
    }

    if (this.weaveTriggerPending) {
      this.triggerWeaveAnimation();
    }
  }

  public dispose(): void {
    this.scene.remove(this.platform);
    (this.platform.geometry as THREE.BufferGeometry).dispose();
    (this.platform.material as THREE.Material).dispose();

    for (const ring of this.colorRings) {
      this.scene.remove(ring.mesh);
      (ring.mesh.geometry as THREE.BufferGeometry).dispose();
      (ring.mesh.material as THREE.Material).dispose();
    }
    this.colorRings = [];

    for (const ray of this.rays) {
      this.scene.remove(ray.line);
      ray.geometry.dispose();
      ray.material.dispose();
    }
    this.rays = [];
  }
}

export { COLOR_PALETTE };
