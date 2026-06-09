import * as THREE from 'three';
import { FlowField } from './flowField';

export type ParticlePhase = 'rain' | 'mixed' | 'ice';

export interface CloudParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  phase: ParticlePhase;
}

const vertexShader = `
  attribute float radius;
  attribute float alpha;
  attribute vec3 phaseColor;
  
  varying float vAlpha;
  varying vec3 vPhaseColor;
  varying float vDepth;
  
  void main() {
    vAlpha = alpha;
    vPhaseColor = phaseColor;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPosition.z;
    
    float pointSize = radius * 300.0 / max(vDepth, 0.1);
    gl_PointSize = clamp(pointSize, 1.0, 64.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying float vAlpha;
  varying vec3 vPhaseColor;
  varying float vDepth;
  
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    if (dist > 0.5) discard;
    
    float core = smoothstep(0.5, 0.0, dist);
    float glow = smoothstep(0.5, 0.3, dist) * 0.6;
    
    float depthFade = 1.0 - smoothstep(10.0, 50.0, vDepth);
    depthFade = max(depthFade, 0.3);
    
    float finalAlpha = (core + glow) * vAlpha * depthFade;
    
    vec3 glowColor = vPhaseColor * 1.3;
    vec3 finalColor = mix(vPhaseColor, glowColor, glow * 0.5);
    
    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

function createParticleTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function getPhaseForHeight(y: number): ParticlePhase {
  if (y < 1.0) return 'rain';
  if (y < 3.0) return 'mixed';
  return 'ice';
}

function getColorForPhase(phase: ParticlePhase, y: number): THREE.Color {
  const color = new THREE.Color();
  switch (phase) {
    case 'rain':
      color.set(0x4A90D9);
      break;
    case 'mixed':
      const t = (y - 1.0) / 2.0;
      color.setRGB(
        0.29 + t * 0.71,
        0.56 + t * 0.44,
        0.85 + t * 0.15
      );
      break;
    case 'ice':
      color.set(0xFFFFFF);
      break;
  }
  return color;
}

function getAlphaForPhase(phase: ParticlePhase): number {
  switch (phase) {
    case 'rain': return 0.3;
    case 'mixed': return 0.5;
    case 'ice': return 0.7;
  }
}

export class CloudParticles {
  private count: number;
  private positions: Float32Array;
  private radii: Float32Array;
  private alphas: Float32Array;
  private colors: Float32Array;
  private velocities: Float32Array;
  private flowField: FlowField;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private cloudBounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  private particleTexture: THREE.Texture;

  constructor(count: number, flowField: FlowField) {
    this.count = count;
    this.flowField = flowField;
    
    this.cloudBounds = {
      minX: -4, maxX: 4,
      minY: 0, maxY: 5,
      minZ: -4, maxZ: 4
    };

    this.positions = new Float32Array(count * 3);
    this.radii = new Float32Array(count);
    this.alphas = new Float32Array(count);
    this.colors = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);

    this.initializeParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('radius', new THREE.BufferAttribute(this.radii, 1));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));
    this.geometry.setAttribute('phaseColor', new THREE.BufferAttribute(this.colors, 3));

    this.particleTexture = createParticleTexture();

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        pointTexture: { value: this.particleTexture }
      }
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  private initializeParticles(): void {
    const centerX = (this.cloudBounds.minX + this.cloudBounds.maxX) / 2;
    const centerZ = (this.cloudBounds.minZ + this.cloudBounds.maxZ) / 2;
    const radiusX = (this.cloudBounds.maxX - this.cloudBounds.minX) / 2;
    const radiusZ = (this.cloudBounds.maxZ - this.cloudBounds.minZ) / 2;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      
      const angle = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.5);
      const x = centerX + Math.cos(angle) * r * radiusX;
      const z = centerZ + Math.sin(angle) * r * radiusZ;
      const y = this.cloudBounds.minY + Math.random() * (this.cloudBounds.maxY - this.cloudBounds.minY) * 
                (0.5 + Math.pow(Math.random(), 0.5) * 0.5);

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      this.velocities[i3] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;

      this.radii[i] = 0.05 + Math.random() * 0.25;

      const phase = getPhaseForHeight(y);
      const color = getColorForPhase(phase, y);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
      this.alphas[i] = getAlphaForPhase(phase);
    }
  }

  private respawnParticle(i: number): void {
    const i3 = i * 3;
    const centerX = (this.cloudBounds.minX + this.cloudBounds.maxX) / 2;
    const centerZ = (this.cloudBounds.minZ + this.cloudBounds.maxZ) / 2;
    const radiusX = (this.cloudBounds.maxX - this.cloudBounds.minX) / 2;
    const radiusZ = (this.cloudBounds.maxZ - this.cloudBounds.minZ) / 2;

    const angle = Math.random() * Math.PI * 2;
    const r = Math.pow(Math.random(), 0.5);
    this.positions[i3] = centerX + Math.cos(angle) * r * radiusX;
    this.positions[i3 + 1] = this.cloudBounds.minY + Math.random() * 0.5;
    this.positions[i3 + 2] = centerZ + Math.sin(angle) * r * radiusZ;

    this.velocities[i3] = 0;
    this.velocities[i3 + 1] = 0;
    this.velocities[i3 + 2] = 0;
  }

  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05);
    let performanceAlpha = 1.0;

    if (this.count > 45000) {
      performanceAlpha = Math.max(0.3, 1 - (this.count - 45000) / 10000);
    }

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      const x = this.positions[i3];
      const y = this.positions[i3 + 1];
      const z = this.positions[i3 + 2];

      const flowVelocity = this.flowField.getVelocity(x, y, z);
      
      this.velocities[i3] += flowVelocity.x * dt * 0.5;
      this.velocities[i3 + 1] += flowVelocity.y * dt * 0.5;
      this.velocities[i3 + 2] += flowVelocity.z * dt * 0.5;

      this.velocities[i3] *= 0.95;
      this.velocities[i3 + 1] *= 0.95;
      this.velocities[i3 + 2] *= 0.95;

      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;

      const currentY = this.positions[i3 + 1];
      if (currentY < this.cloudBounds.minY || 
          currentY > this.cloudBounds.maxY ||
          this.positions[i3] < this.cloudBounds.minX - 1 ||
          this.positions[i3] > this.cloudBounds.maxX + 1 ||
          this.positions[i3 + 2] < this.cloudBounds.minZ - 1 ||
          this.positions[i3 + 2] > this.cloudBounds.maxZ + 1) {
        this.respawnParticle(i);
        continue;
      }

      const phase = getPhaseForHeight(currentY);
      const color = getColorForPhase(phase, currentY);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
      this.alphas[i] = getAlphaForPhase(phase) * performanceAlpha;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.alpha as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.phaseColor as THREE.BufferAttribute).needsUpdate = true;
  }

  public getPoints(): THREE.Points {
    return this.points;
  }

  public getCount(): number {
    return this.count;
  }

  public getStats() {
    let rain = 0, mixed = 0, ice = 0;
    for (let i = 0; i < this.count; i++) {
      const y = this.positions[i * 3 + 1];
      const phase = getPhaseForHeight(y);
      if (phase === 'rain') rain++;
      else if (phase === 'mixed') mixed++;
      else ice++;
    }
    return { rain, mixed, ice, total: this.count };
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.particleTexture.dispose();
  }
}
