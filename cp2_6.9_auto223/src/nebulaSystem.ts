import * as THREE from 'three';
import { vertexShader, fragmentShader } from './shaders';

export type AlphaCurveType = 'linear' | 'sigmoid' | 'gaussian';
export type BlendMode = 'additive' | 'multiply' | 'normal';

export interface ParticleParams {
  particleCount: number;
  sizeMin: number;
  sizeMax: number;
  alphaCurve: AlphaCurveType;
  rotationSpeed: number;
  turbulenceStrength: number;
  turbulenceFrequency: number;
  colorStart: string;
  colorEnd: string;
  blendMode: BlendMode;
}

export const defaultParams: ParticleParams = {
  particleCount: 100000,
  sizeMin: 0.05,
  sizeMax: 0.3,
  alphaCurve: 'linear',
  rotationSpeed: 0.002,
  turbulenceStrength: 0.1,
  turbulenceFrequency: 0.5,
  colorStart: '#C084FC',
  colorEnd: '#22D3EE',
  blendMode: 'additive'
};

export class ParticleSystem {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private params: ParticleParams;
  private startTime: number = 0;

  constructor(scene: THREE.Scene, params: ParticleParams = defaultParams) {
    this.params = { ...params };
    this.startTime = performance.now();

    this.geometry = new THREE.BufferGeometry();

    this.initGeometry();
    this.material = this.createMaterial();
    this.points = new THREE.Points(this.geometry, this.material);

    scene.add(this.points);
  }

  private initGeometry(): void {
    const count = this.params.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const distances = new Float32Array(count);

    const colorStart = new THREE.Color(this.params.colorStart);
    const colorEnd = new THREE.Color(this.params.colorEnd);
    const maxRadius = 5.0;
    const numArms = 4;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const t = Math.pow(Math.random(), 0.8);
      const armIndex = Math.floor(Math.random() * numArms);
      const armOffset = (armIndex / numArms) * Math.PI * 2;
      const radius = t * maxRadius;
      const armTwist = radius * 1.5;
      const randomAngle = (Math.random() - 0.5) * 0.8;
      const angle = armOffset + armTwist + randomAngle;

      const radialSpread = (Math.random() - 0.5) * (0.4 + radius * 0.25);
      const x = Math.cos(angle) * (radius + radialSpread);
      const z = Math.sin(angle) * (radius + radialSpread);

      const verticalSpread = 0.6 + radius * 0.25;
      const y = (Math.random() - 0.5) * verticalSpread * 2 + (Math.random() - 0.5) * 0.4;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      const distRatio = Math.min(radius / maxRadius, 1.0);
      distances[i] = distRatio;

      const colorJitter = (Math.random() - 0.5) * 0.08;
      const lerpT = Math.max(0, Math.min(1, distRatio + colorJitter));
      const mixedColor = colorStart.clone().lerp(colorEnd, lerpT);
      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;

      sizes[i] = this.params.sizeMin + Math.random() * (this.params.sizeMax - this.params.sizeMin);
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aDistance', new THREE.BufferAttribute(distances, 1));
  }

  private createMaterial(): THREE.ShaderMaterial {
    let blending: THREE.Blending;
    let depthWrite: boolean;

    switch (this.params.blendMode) {
      case 'additive':
        blending = THREE.AdditiveBlending;
        depthWrite = false;
        break;
      case 'multiply':
        blending = THREE.MultiplyBlending;
        depthWrite = false;
        break;
      default:
        blending = THREE.NormalBlending;
        depthWrite = true;
    }

    let alphaCurveInt: number;
    switch (this.params.alphaCurve) {
      case 'sigmoid':
        alphaCurveInt = 1;
        break;
      case 'gaussian':
        alphaCurveInt = 2;
        break;
      default:
        alphaCurveInt = 0;
    }

    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uTurbulenceStrength: { value: this.params.turbulenceStrength },
        uTurbulenceFrequency: { value: this.params.turbulenceFrequency },
        uAlphaMin: { value: 0.3 },
        uAlphaMax: { value: 1.0 },
        uAlphaCurve: { value: alphaCurveInt }
      },
      transparent: true,
      blending,
      depthWrite,
      vertexColors: true
    });
  }

  public update(deltaTime: number): void {
    const elapsed = (performance.now() - this.startTime) * 0.001;
    this.material.uniforms.uTime.value = elapsed;

    this.points.rotation.y += this.params.rotationSpeed;
  }

  public updateParam<K extends keyof ParticleParams>(key: K, value: ParticleParams[K]): void {
    const needsRebuild = [
      'particleCount',
      'sizeMin',
      'sizeMax',
      'colorStart',
      'colorEnd'
    ].includes(key as string);

    this.params[key] = value;

    if (needsRebuild) {
      this.rebuild();
    } else {
      this.updateShaderParams();
    }
  }

  private updateShaderParams(): void {
    this.material.uniforms.uTurbulenceStrength.value = this.params.turbulenceStrength;
    this.material.uniforms.uTurbulenceFrequency.value = this.params.turbulenceFrequency;

    let alphaCurveInt: number;
    switch (this.params.alphaCurve) {
      case 'sigmoid':
        alphaCurveInt = 1;
        break;
      case 'gaussian':
        alphaCurveInt = 2;
        break;
      default:
        alphaCurveInt = 0;
    }
    this.material.uniforms.uAlphaCurve.value = alphaCurveInt;

    let blending: THREE.Blending;
    let depthWrite: boolean;
    switch (this.params.blendMode) {
      case 'additive':
        blending = THREE.AdditiveBlending;
        depthWrite = false;
        break;
      case 'multiply':
        blending = THREE.MultiplyBlending;
        depthWrite = false;
        break;
      default:
        blending = THREE.NormalBlending;
        depthWrite = true;
    }
    this.material.blending = blending;
    this.material.depthWrite = depthWrite;
    this.material.needsUpdate = true;
  }

  private rebuild(): void {
    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    this.initGeometry();
    this.points.geometry = this.geometry;
    this.points.rotation.y = 0;
  }

  public getParams(): ParticleParams {
    return { ...this.params };
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
