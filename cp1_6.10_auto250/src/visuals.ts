import * as THREE from 'three';
import type { ParticleData } from './simulation';
import type { SceneManager } from './scene';

function createCircleTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.5)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createDiskTexture(): THREE.Texture {
  const width = 512;
  const height = 64;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  for (let x = 0; x < width; x++) {
    const t = x / width;
    for (let y = 0; y < height; y++) {
      const yT = y / height;
      const distFromCenter = Math.abs(yT - 0.5) * 2;
      const verticalFade = Math.pow(1 - distFromCenter, 2);

      const spiral = Math.sin(t * Math.PI * 12 + yT * Math.PI * 4) * 0.5 + 0.5;
      const baseAlpha = (0.15 + 0.25 * (1 - t)) * verticalFade * (0.6 + 0.4 * spiral);

      const r = 255;
      const g = Math.floor(68 + (170 - 68) * t);
      const b = 0;
      const a = Math.floor(baseAlpha * 255);

      ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export class ParticleFlow {
  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private circleTexture: THREE.Texture;
  private sceneManager: SceneManager;
  private maxParticles: number;

  constructor(sceneManager: SceneManager, maxParticles: number) {
    this.sceneManager = sceneManager;
    this.maxParticles = maxParticles;
    this.circleTexture = createCircleTexture();
    this.createParticleSystem();
  }

  private createParticleSystem(): void {
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);
    const alphas = new Float32Array(this.maxParticles);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.circleTexture },
        pixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float pixelRatio;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          gl_FragColor = vec4(vColor, vAlpha) * texColor;
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }) as unknown as THREE.PointsMaterial;

    this.points = this.sceneManager.addParticleStream(this.geometry, this.material);
  }

  public update(data: ParticleData): void {
    if (!this.geometry || !this.points) return;

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    const alphaAttr = this.geometry.getAttribute('alpha') as THREE.BufferAttribute;

    const count = data.activeCount;
    const posArray = posAttr.array as Float32Array;
    const colorArray = colorAttr.array as Float32Array;
    const sizeArray = sizeAttr.array as Float32Array;
    const alphaArray = alphaAttr.array as Float32Array;

    posArray.set(data.positions);
    colorArray.set(data.colors);
    sizeArray.set(data.sizes);
    alphaArray.set(data.alphas);

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;

    this.geometry.setDrawRange(0, count);
    this.geometry.computeBoundingSphere();
  }

  public resizeMaxParticles(newMax: number): void {
    if (!this.points || !this.geometry || !this.material) return;

    this.sceneManager.removeObject(this.points);
    this.geometry.dispose();
    this.maxParticles = newMax;
    this.createParticleSystem();
  }

  public dispose(): void {
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    this.circleTexture.dispose();
  }
}

export class AccretionDisk {
  private mesh: THREE.Mesh | null = null;
  private geometry: THREE.RingGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private diskTexture: THREE.Texture;
  private sceneManager: SceneManager;
  private time: number = 0;
  private precessionAngle: number = 0;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.diskTexture = createDiskTexture();
    this.createDisk();
  }

  private createDisk(): void {
    const innerRadius = 0.5;
    const outerRadius = 3.0;
    const thetaSegments = 256;
    const phiSegments = 16;

    this.geometry = new THREE.RingGeometry(
      innerRadius,
      outerRadius,
      thetaSegments,
      phiSegments
    );

    const uvs = this.geometry.attributes.uv;
    const positions = this.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const r = Math.sqrt(x * x + y * y);
      const t = (r - innerRadius) / (outerRadius - innerRadius);
      uvs.setXY(i, t, 0.5);
    }
    uvs.needsUpdate = true;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        diskTexture: { value: this.diskTexture },
        time: { value: 0 },
        innerColor: { value: new THREE.Color(0xff4400) },
        outerColor: { value: new THREE.Color(0xffaa00) },
        precessionAngle: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vRadius;
        void main() {
          vUv = uv;
          vRadius = length(position.xy);
          vec3 pos = position;
          float fade = smoothstep(0.5, 3.0, vRadius);
          pos.z += (sin(vRadius * 8.0 + time * 0.0) * 0.01) * (1.0 - fade * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D diskTexture;
        uniform float time;
        uniform vec3 innerColor;
        uniform vec3 outerColor;
        uniform float precessionAngle;
        varying vec2 vUv;
        varying float vRadius;

        void main() {
          float t = vUv.x;
          float spiral = sin(vRadius * 15.0 - time * 2.0 + precessionAngle) * 0.5 + 0.5;
          vec3 color = mix(innerColor, outerColor, t);
          float density = 1.0 - t * 0.6;
          float verticalFade = 1.0 - smoothstep(0.0, 1.0, abs(vUv.y - 0.5) * 2.0);
          float alpha = (0.15 + 0.25 * density) * verticalFade * (0.7 + 0.3 * spiral);
          vec4 tex = texture2D(diskTexture, vUv);
          gl_FragColor = vec4(color, alpha * tex.a);
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.mesh = this.sceneManager.addDiskLine(this.geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
  }

  public update(deltaTime: number, precessionAngle: number, center: THREE.Vector3): void {
    this.time += deltaTime;
    this.precessionAngle = precessionAngle;

    if (this.material) {
      this.material.uniforms.time.value = this.time;
      this.material.uniforms.precessionAngle.value = this.precessionAngle;
    }

    if (this.mesh) {
      this.mesh.position.copy(center);
    }
  }

  public dispose(): void {
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    this.diskTexture.dispose();
  }
}
