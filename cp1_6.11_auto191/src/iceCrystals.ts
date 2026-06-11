import * as THREE from 'three';

const ICE_PARTICLE_COUNT = 3500;

function createHexagonalTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.35;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, 'rgba(224, 240, 255, 0.9)');
  gradient.addColorStop(0.5, 'rgba(200, 220, 255, 0.6)');
  gradient.addColorStop(1, 'rgba(176, 208, 255, 0.0)');
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = 'rgba(200, 230, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const innerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.3);
  innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  innerGlow.addColorStop(1, 'rgba(200, 230, 255, 0.0)');
  ctx.fillStyle = innerGlow;
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export class IceCrystalSystem {
  private scene: THREE.Scene;
  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private rotationSpeeds: Float32Array = new Float32Array(0);
  private rotationAngles: Float32Array = new Float32Array(0);
  private opacityPhases: Float32Array = new Float32Array(0);
  private basePositions: Float32Array = new Float32Array(0);
  private particleCount = ICE_PARTICLE_COUNT;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildParticles();
  }

  private buildParticles(): void {
    const count = this.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    const rotations = new Float32Array(count);
    this.rotationSpeeds = new Float32Array(count);
    this.rotationAngles = new Float32Array(count);
    this.opacityPhases = new Float32Array(count);
    this.basePositions = new Float32Array(count * 3);

    const colorStart = new THREE.Color(0xe0f0ff);
    const colorEnd = new THREE.Color(0xb0d0ff);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 60;
      const y = Math.random() * 20 + 5;
      const z = (Math.random() - 0.5) * 30;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;

      const t = Math.random();
      const color = new THREE.Color().lerpColors(colorStart, colorEnd, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.8 + Math.random() * 1.7;
      opacities[i] = 0.3 + Math.random() * 0.5;
      rotations[i] = Math.random() * Math.PI * 2;
      this.rotationSpeeds[i] = 0.01 + Math.random() * 0.04;
      this.rotationAngles[i] = rotations[i];
      this.opacityPhases[i] = Math.random() * Math.PI * 2;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
    this.geometry.setAttribute('aRotation', new THREE.BufferAttribute(rotations, 1));

    const hexTexture = createHexagonalTexture();

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTexture: { value: hexTexture },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aOpacity;
        attribute float aRotation;
        varying vec3 vColor;
        varying float vOpacity;
        varying float vRotation;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vOpacity = aOpacity;
          vRotation = aRotation;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        varying vec3 vColor;
        varying float vOpacity;
        varying float vRotation;
        void main() {
          vec2 centered = gl_PointCoord - vec2(0.5);
          float cosR = cos(vRotation);
          float sinR = sin(vRotation);
          vec2 rotated = vec2(
            centered.x * cosR - centered.y * sinR,
            centered.x * sinR + centered.y * cosR
          );
          vec2 texCoord = rotated + vec2(0.5);
          vec4 texColor = texture2D(uTexture, texCoord);
          float glow = texColor.a;
          gl_FragColor = vec4(vColor * glow * 1.2, vOpacity * glow);
        }
      `,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  update(time: number): void {
    if (!this.geometry) return;

    const opacities = this.geometry.getAttribute('aOpacity') as THREE.BufferAttribute;
    const rotations = this.geometry.getAttribute('aRotation') as THREE.BufferAttribute;
    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;

    const opaArray = opacities.array as Float32Array;
    const rotArray = rotations.array as Float32Array;
    const posArray = positions.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      this.rotationAngles[i] += this.rotationSpeeds[i];
      rotArray[i] = this.rotationAngles[i];

      const baseOpacity = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(time * 1.5 + this.opacityPhases[i]));
      opaArray[i] = baseOpacity;

      const floatY = Math.sin(time * 0.3 + this.opacityPhases[i]) * 0.3;
      posArray[i * 3 + 1] = this.basePositions[i * 3 + 1] + floatY;
    }

    opacities.needsUpdate = true;
    rotations.needsUpdate = true;
    positions.needsUpdate = true;
  }

  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
    if (this.points) {
      this.scene.remove(this.points);
    }
  }
}
