import * as THREE from 'three';
import { GPUComputationRenderer, Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import { MAX_GRAVITY_SOURCES } from './gravityManager';

export const PARTICLE_COUNT = 15000;
export const PARTICLE_RADIUS = 10;
export const BOUNDARY_RADIUS = 30;

const COLOR_PALETTE = [
  new THREE.Color(0x1a0033),
  new THREE.Color(0x7b2d8e),
  new THREE.Color(0xff66b2),
  new THREE.Color(0x4a4eff),
];

export interface SimParams {
  gravityConstant: number;
  maxVelocity: number;
  particleSizeMultiplier: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private gpuCompute: GPUComputationRenderer;
  private positionVariable: Variable;
  private velocityVariable: Variable;
  private particles: THREE.Points;
  private particleMaterial: THREE.ShaderMaterial;
  private params: SimParams;
  private textureSize: number;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    params: SimParams
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.params = params;

    this.textureSize = Math.ceil(Math.sqrt(PARTICLE_COUNT));

    this.gpuCompute = new GPUComputationRenderer(
      this.textureSize,
      this.textureSize,
      renderer
    );

    if (!this.renderer.capabilities.isWebGL2) {
      this.gpuCompute.setDataType(THREE.HalfFloatType);
    }

    const dtPosition = this.gpuCompute.createTexture();
    const dtVelocity = this.gpuCompute.createTexture();

    this.fillPositionTexture(dtPosition);
    this.fillVelocityTexture(dtVelocity);

    this.velocityVariable = this.gpuCompute.addVariable(
      'textureVelocity',
      this.getVelocityFragmentShader(),
      dtVelocity
    );
    this.positionVariable = this.gpuCompute.addVariable(
      'texturePosition',
      this.getPositionFragmentShader(),
      dtPosition
    );

    this.gpuCompute.setVariableDependencies(this.velocityVariable, [
      this.positionVariable,
      this.velocityVariable,
    ]);
    this.gpuCompute.setVariableDependencies(this.positionVariable, [
      this.positionVariable,
      this.velocityVariable,
    ]);

    const velocityUniforms = (this.velocityVariable.material as THREE.ShaderMaterial).uniforms;
    velocityUniforms['uGravityConstant'] = { value: this.params.gravityConstant };
    velocityUniforms['uMaxVelocity'] = { value: this.params.maxVelocity };
    velocityUniforms['uGravityCount'] = { value: 0 };
    velocityUniforms['uGravityPositions'] = {
      value: new Float32Array(MAX_GRAVITY_SOURCES * 3),
    };
    velocityUniforms['uGravityStrengths'] = {
      value: new Float32Array(MAX_GRAVITY_SOURCES),
    };
    velocityUniforms['uTime'] = { value: 0 };

    const positionUniforms = (this.positionVariable.material as THREE.ShaderMaterial).uniforms;
    positionUniforms['uBoundaryRadius'] = { value: BOUNDARY_RADIUS };
    positionUniforms['uTime'] = { value: 0 };

    const error = this.gpuCompute.init();
    if (error !== null) {
      console.error('GPUComputationRenderer init error:', error);
    }

    this.particleMaterial = this.createParticleMaterial();
    this.particles = this.createParticles();
    this.scene.add(this.particles);
  }

  private fillPositionTexture(texture: THREE.DataTexture): void {
    const arr = texture.image.data;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 4;
      const pos = this.randomPointInSphere(PARTICLE_RADIUS);
      arr[idx] = pos.x;
      arr[idx + 1] = pos.y;
      arr[idx + 2] = pos.z;
      arr[idx + 3] = 1.0;
    }

    for (let i = PARTICLE_COUNT * 4; i < arr.length; i += 4) {
      arr[i] = 0;
      arr[i + 1] = 0;
      arr[i + 2] = 0;
      arr[i + 3] = 1;
    }
  }

  private fillVelocityTexture(texture: THREE.DataTexture): void {
    const arr = texture.image.data;
    for (let i = 0; i < arr.length; i += 4) {
      arr[i] = 0;
      arr[i + 1] = 0;
      arr[i + 2] = 0;
      arr[i + 3] = 1;
    }
  }

  private randomPointInSphere(radius: number): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random());

    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }

  private getColorForPosition(pos: THREE.Vector3): THREE.Color {
    const dist = pos.length() / PARTICLE_RADIUS;
    const t = Math.min(Math.max(dist, 0), 1) * (COLOR_PALETTE.length - 1);
    const i = Math.floor(t);
    const f = t - i;

    if (i >= COLOR_PALETTE.length - 1) {
      return COLOR_PALETTE[COLOR_PALETTE.length - 1];
    }

    const c1 = COLOR_PALETTE[i];
    const c2 = COLOR_PALETTE[i + 1];
    return c1.clone().lerp(c2, f);
  }

  private createParticleMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        texturePosition: { value: null },
        uSizeMultiplier: { value: this.params.particleSizeMultiplier },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        uniform sampler2D texturePosition;
        uniform float uSizeMultiplier;
        uniform float uPixelRatio;

        attribute float aSize;
        attribute vec3 aColor;
        attribute vec2 aUv;

        varying vec3 vColor;

        void main() {
          vColor = aColor;

          vec4 pos = texture2D(texturePosition, aUv);
          vec4 mvPosition = modelViewMatrix * vec4(pos.xyz, 1.0);

          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * uSizeMultiplier * uPixelRatio * (300.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);

          if (dist > 0.5) discard;

          float core = smoothstep(0.5, 0.0, dist);
          float glow1 = smoothstep(0.5, 0.3, dist) * 0.5;
          float glow2 = smoothstep(0.5, 0.15, dist) * 0.2;

          float alpha = core + glow1 + glow2;
          alpha = clamp(alpha, 0.0, 1.0);

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  private createParticles(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const total = this.textureSize * this.textureSize;

    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const sizes = new Float32Array(total);
    const uvs = new Float32Array(total * 2);

    for (let i = 0; i < total; i++) {
      const i3 = i * 3;
      const i2 = i * 2;

      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;

      const pos = this.randomPointInSphere(PARTICLE_RADIUS);
      const color = this.getColorForPosition(pos);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = 2 + Math.random() * 4;

      uvs[i2] = (i % this.textureSize) / this.textureSize;
      uvs[i2 + 1] = Math.floor(i / this.textureSize) / this.textureSize;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aUv', new THREE.BufferAttribute(uvs, 2));

    geometry.setDrawRange(0, PARTICLE_COUNT);

    return new THREE.Points(geometry, this.particleMaterial);
  }

  private getPositionFragmentShader(): string {
    return `
      uniform sampler2D texturePosition;
      uniform sampler2D textureVelocity;
      uniform float uBoundaryRadius;
      uniform float uTime;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      vec3 randomInSphere(float seed) {
        float u = hash(vec3(seed * 1.3, seed * 2.7, seed * 4.1));
        float v = hash(vec3(seed * 5.3, seed * 7.1, seed * 3.7));
        float theta = 2.0 * 3.14159265359 * u;
        float phi = acos(2.0 * v - 1.0);
        float r = uBoundaryRadius * 0.9;

        return vec3(
          r * sin(phi) * cos(theta),
          r * sin(phi) * sin(theta),
          r * cos(phi)
        );
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        vec4 position = texture2D(texturePosition, uv);
        vec3 velocity = texture2D(textureVelocity, uv).xyz;

        vec3 newPos = position.xyz + velocity;

        float dist = length(newPos);
        if (dist > uBoundaryRadius) {
          float seed = position.x * 1000.0 + position.y * 100.0 + position.z * 10.0 + uTime;
          newPos = randomInSphere(seed);
        }

        gl_FragColor = vec4(newPos, 1.0);
      }
    `;
  }

  private getVelocityFragmentShader(): string {
    return `
      uniform sampler2D texturePosition;
      uniform sampler2D textureVelocity;
      uniform float uGravityConstant;
      uniform float uMaxVelocity;
      uniform int uGravityCount;
      uniform vec3 uGravityPositions[${MAX_GRAVITY_SOURCES}];
      uniform float uGravityStrengths[${MAX_GRAVITY_SOURCES}];
      uniform float uTime;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        vec3 position = texture2D(texturePosition, uv).xyz;
        vec3 velocity = texture2D(textureVelocity, uv).xyz;

        vec3 acceleration = vec3(0.0);

        for (int i = 0; i < ${MAX_GRAVITY_SOURCES}; i++) {
          if (i >= uGravityCount) break;

          vec3 delta = uGravityPositions[i] - position;
          float distSq = dot(delta, delta);
          float minDist = 0.5;
          distSq = max(distSq, minDist * minDist);
          float dist = sqrt(distSq);

          float force = uGravityConstant * uGravityStrengths[i] / distSq;
          acceleration += normalize(delta) * force;
        }

        velocity += acceleration;

        float speed = length(velocity);
        if (speed > uMaxVelocity) {
          velocity = normalize(velocity) * uMaxVelocity;
        }

        velocity *= 0.995;

        gl_FragColor = vec4(velocity, 1.0);
      }
    `;
  }

  updateParams(params: Partial<SimParams>): void {
    if (params.gravityConstant !== undefined) {
      this.params.gravityConstant = params.gravityConstant;
      const uniforms = (this.velocityVariable.material as THREE.ShaderMaterial).uniforms;
      uniforms['uGravityConstant'].value = params.gravityConstant;
    }
    if (params.maxVelocity !== undefined) {
      this.params.maxVelocity = params.maxVelocity;
      const uniforms = (this.velocityVariable.material as THREE.ShaderMaterial).uniforms;
      uniforms['uMaxVelocity'].value = params.maxVelocity;
    }
    if (params.particleSizeMultiplier !== undefined) {
      this.params.particleSizeMultiplier = params.particleSizeMultiplier;
      this.particleMaterial.uniforms['uSizeMultiplier'].value = params.particleSizeMultiplier;
    }
  }

  updateGravityData(positions: Float32Array, strengths: Float32Array, count: number): void {
    const uniforms = (this.velocityVariable.material as THREE.ShaderMaterial).uniforms;
    uniforms['uGravityCount'].value = count;
    uniforms['uGravityPositions'].value = positions;
    uniforms['uGravityStrengths'].value = strengths;
  }

  reset(): void {
    const dtPosition = this.gpuCompute.createTexture();
    const dtVelocity = this.gpuCompute.createTexture();

    this.fillPositionTexture(dtPosition);
    this.fillVelocityTexture(dtVelocity);

    const posVar = this.positionVariable;
    const velVar = this.velocityVariable;

    this.gpuCompute.renderTexture(dtPosition, posVar.renderTargets[0]);
    this.gpuCompute.renderTexture(dtPosition, posVar.renderTargets[1]);
    this.gpuCompute.renderTexture(dtVelocity, velVar.renderTargets[0]);
    this.gpuCompute.renderTexture(dtVelocity, velVar.renderTargets[1]);
  }

  update(time: number): void {
    const velUniforms = (this.velocityVariable.material as THREE.ShaderMaterial).uniforms;
    const posUniforms = (this.positionVariable.material as THREE.ShaderMaterial).uniforms;
    velUniforms['uTime'].value = time;
    posUniforms['uTime'].value = time;

    this.gpuCompute.compute();

    this.particleMaterial.uniforms['texturePosition'].value =
      this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;
  }

  onResize(): void {
    this.particleMaterial.uniforms['uPixelRatio'].value = Math.min(
      window.devicePixelRatio,
      2
    );
  }

  dispose(): void {
    this.scene.remove(this.particles);
    this.particles.geometry.dispose();
    this.particleMaterial.dispose();
    this.gpuCompute.dispose();
  }
}
