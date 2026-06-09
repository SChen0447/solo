import * as THREE from 'three';
import { Beacon, BeaconType } from './beaconSystem';

export class CurveRenderer {
  private scene: THREE.Scene;
  private curve: THREE.CatmullRomCurve3 | null = null;
  private curveLine: THREE.Line | null = null;
  private curveLineGlow: THREE.Line | null = null;
  private particles: THREE.Points | null = null;
  private particleCount = 30;
  private particleSpeeds: Float32Array = new Float32Array(30);
  private particleOffsets: Float32Array = new Float32Array(30);
  private gridLines: THREE.LineSegments | null = null;
  private gridHalos: THREE.Points | null = null;
  private haloPhases: Float32Array = new Float32Array(0);
  private curveLength: number = 0;
  private hasCurve: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  update(beacons: Beacon[]): void {
    this.clearCurve();
    this.clearGrid();

    if (beacons.length >= 4) {
      this.buildCurve(beacons);
      this.buildParticles();
    }

    if (beacons.length >= 2) {
      this.buildGrid(beacons);
    }
  }

  animate(delta: number, time: number): void {
    if (this.particles && this.hasCurve && this.curve) {
      const positions = this.particles.geometry.attributes.position.array as Float32Array;
      const colors = this.particles.geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < this.particleCount; i++) {
        this.particleOffsets[i] = (this.particleOffsets[i] + delta * 0.2) % this.curveLength;
        const t = this.curveLength > 0 ? this.particleOffsets[i] / this.curveLength : 0;
        const point = this.curve.getPointAt(t);
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;

        const color = this.lerpColor(0xff88aa, 0x88bbff, t);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.geometry.attributes.color.needsUpdate = true;
    }

    if (this.gridHalos) {
      const alpha = this.gridHalos.geometry.attributes.aAlpha as THREE.BufferAttribute;
      const arr = alpha.array as Float32Array;
      for (let i = 0; i < arr.length; i++) {
        const phase = this.haloPhases[i] || 0;
        arr[i] = 0.05 + 0.05 * (0.5 + 0.5 * Math.sin(time * (Math.PI * 2 / 1.5) + phase));
      }
      alpha.needsUpdate = true;
    }
  }

  getCurveLength(): number {
    return this.curveLength;
  }

  private buildCurve(beacons: Beacon[]): void {
    const sorted = [...beacons].sort((a, b) => {
      const orderA = a.type === BeaconType.START ? 0 : a.type === BeaconType.CONTROL ? 1 : 2;
      const orderB = b.type === BeaconType.START ? 0 : b.type === BeaconType.CONTROL ? 1 : 2;
      return orderA - orderB;
    });

    const start = sorted[0];
    const controls = sorted.filter(b => b.type === BeaconType.CONTROL);
    const end = sorted[sorted.length - 1];

    const curvePoints = [
      start.mesh.position.clone(),
      ...controls.map(c => c.mesh.position.clone()),
      end.mesh.position.clone()
    ];

    this.curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.5);
    const points = this.curve.getPoints(200);
    this.curveLength = this.curve.getLength();

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const colors = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      const color = this.lerpColor(0xff88aa, 0x88bbff, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      linewidth: 2
    });
    this.curveLine = new THREE.Line(geometry, material);
    this.scene.add(this.curveLine);

    const glowMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      linewidth: 6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.curveLineGlow = new THREE.Line(geometry, glowMaterial);
    this.scene.add(this.curveLineGlow);

    this.hasCurve = true;
  }

  private buildParticles(): void {
    if (!this.curve) return;

    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      this.particleOffsets[i] = (i / this.particleCount) * this.curveLength;
      this.particleSpeeds[i] = 0.8 + Math.random() * 0.4;
      const t = this.particleOffsets[i] / this.curveLength;
      const point = this.curve.getPointAt(t);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      const color = this.lerpColor(0xff88aa, 0x88bbff, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 3 + Math.random() * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float aSize;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0);
          alpha = alpha * alpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private buildGrid(beacons: Beacon[]): void {
    const positions: number[] = [];
    const colors: number[] = [];
    const haloPositions: number[] = [];
    const haloAlphas: number[] = [];
    this.haloPhases = new Float32Array(0);

    const valid = beacons.slice(0, Math.min(beacons.length, 4));

    for (let i = 0; i < valid.length; i++) {
      for (let j = i + 1; j < valid.length; j++) {
        const a = valid[i].mesh.position;
        const b = valid[j].mesh.position;

        positions.push(a.x, a.y, a.z);
        positions.push(b.x, b.y, b.z);

        const gridColor = new THREE.Color(0x88aaff);
        colors.push(gridColor.r, gridColor.g, gridColor.b);
        colors.push(gridColor.r, gridColor.g, gridColor.b);

        const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
        haloPositions.push(mid.x, mid.y, mid.z);
        haloAlphas.push(0.1);
      }
    }

    if (positions.length > 0) {
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
        linewidth: 0.5
      });
      this.gridLines = new THREE.LineSegments(lineGeometry, lineMaterial);
      this.scene.add(this.gridLines);
    }

    if (haloPositions.length > 0) {
      this.haloPhases = new Float32Array(haloPositions.length / 3);
      for (let i = 0; i < this.haloPhases.length; i++) {
        this.haloPhases[i] = Math.random() * Math.PI * 2;
      }

      const haloGeometry = new THREE.BufferGeometry();
      haloGeometry.setAttribute('position', new THREE.Float32BufferAttribute(haloPositions, 3));
      haloGeometry.setAttribute('aAlpha', new THREE.Float32BufferAttribute(haloAlphas, 1));

      const haloMaterial = new THREE.ShaderMaterial({
        vertexShader: `
          attribute float aAlpha;
          varying float vAlpha;
          void main() {
            vAlpha = aAlpha;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 8.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying float vAlpha;
          void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            if (dist > 0.5) discard;
            float alpha = (1.0 - dist * 2.0) * vAlpha;
            gl_FragColor = vec4(0.8, 0.85, 1.0, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.gridHalos = new THREE.Points(haloGeometry, haloMaterial);
      this.scene.add(this.gridHalos);
    }
  }

  private clearCurve(): void {
    if (this.curveLine) {
      this.scene.remove(this.curveLine);
      this.curveLine.geometry.dispose();
      (this.curveLine.material as THREE.Material).dispose();
      this.curveLine = null;
    }
    if (this.curveLineGlow) {
      this.scene.remove(this.curveLineGlow);
      (this.curveLineGlow.material as THREE.Material).dispose();
      this.curveLineGlow = null;
    }
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
      this.particles = null;
    }
    this.curve = null;
    this.curveLength = 0;
    this.hasCurve = false;
  }

  private clearGrid(): void {
    if (this.gridLines) {
      this.scene.remove(this.gridLines);
      this.gridLines.geometry.dispose();
      (this.gridLines.material as THREE.Material).dispose();
      this.gridLines = null;
    }
    if (this.gridHalos) {
      this.scene.remove(this.gridHalos);
      this.gridHalos.geometry.dispose();
      (this.gridHalos.material as THREE.Material).dispose();
      this.gridHalos = null;
    }
  }

  private lerpColor(hex1: number, hex2: number, t: number): THREE.Color {
    const c1 = new THREE.Color(hex1);
    const c2 = new THREE.Color(hex2);
    return c1.lerp(c2, t);
  }

  dispose(): void {
    this.clearCurve();
    this.clearGrid();
  }
}
