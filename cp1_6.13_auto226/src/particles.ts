import * as THREE from 'three';
import gsap from 'gsap';

export const COLOR_PALETTE = [
  0x6c63ff,
  0x48dbfb,
  0xfeca57,
  0xff9ff3,
  0x54a0ff,
  0xa29bfe,
  0xff6b6b,
  0x1dd1a1
];

export interface ParticleData {
  id: number;
  basePosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  color: THREE.Color;
  baseColor: THREE.Color;
  targetColor: THREE.Color;
  size: number;
  baseSize: number;
  opacity: number;
  baseOpacity: number;
  breathSpeed: number;
  breathPhase: number;
  isActivated: boolean;
  activationTime: number;
  spiralAngle: number;
  spiralSpeed: number;
  spiralRadius: number;
  driftOffset: THREE.Vector2;
  driftDirection: THREE.Vector2;
  driftPhase: number;
  driftSpeed: number;
  hasDrift: boolean;
  colorShiftTime: number;
}

export class ParticleSystem {
  public particles: ParticleData[] = [];
  public mesh: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;
  private count: number;
  private baseSize: number = 3;

  private vertexShader = `
    attribute float aSize;
    attribute float aOpacity;
    attribute vec3 aColor;
    attribute float aGlow;
    
    varying vec3 vColor;
    varying float vOpacity;
    varying float vGlow;
    
    void main() {
      vColor = aColor;
      vOpacity = aOpacity;
      vGlow = aGlow;
      
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  private fragmentShader = `
    varying vec3 vColor;
    varying float vOpacity;
    varying float vGlow;
    
    void main() {
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      
      if (dist > 0.5) {
        discard;
      }
      
      float core = 1.0 - smoothstep(0.0, 0.3, dist);
      float glow = 1.0 - smoothstep(0.2, 0.5, dist);
      glow = pow(glow, 2.0) * vGlow;
      
      vec3 finalColor = vColor * core + vColor * glow * 0.5;
      float finalOpacity = vOpacity * (core + glow * 0.6);
      
      gl_FragColor = vec4(finalColor, finalOpacity);
    }
  `;

  constructor(count: number) {
    this.count = Math.min(count, 3500);
    this.geometry = new THREE.BufferGeometry();
    this.material = this.createShaderMaterial();
    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  private createShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  public createParticles(width: number, height: number): void {
    const positions = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const opacities = new Float32Array(this.count);
    const colors = new Float32Array(this.count * 3);
    const glows = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;
      const z = (Math.random() - 0.5) * 20;

      const colorIndex = Math.floor(Math.random() * 6);
      const color = new THREE.Color(COLOR_PALETTE[colorIndex]);

      const size = 1 + Math.random() * 3;
      const opacity = 0.8 + Math.random() * 0.2;

      const particle: ParticleData = {
        id: i,
        basePosition: new THREE.Vector3(x, y, z),
        currentPosition: new THREE.Vector3(x, y, z),
        targetPosition: new THREE.Vector3(x, y, z),
        color: color.clone(),
        baseColor: color.clone(),
        targetColor: color.clone(),
        size: size,
        baseSize: size,
        opacity: opacity,
        baseOpacity: opacity,
        breathSpeed: 3 + Math.random() * 2,
        breathPhase: Math.random() * Math.PI * 2,
        isActivated: false,
        activationTime: 0,
        spiralAngle: 0,
        spiralSpeed: 0,
        spiralRadius: 0,
        driftOffset: new THREE.Vector2(),
        driftDirection: new THREE.Vector2(),
        driftPhase: 0,
        driftSpeed: 1,
        hasDrift: false,
        colorShiftTime: 0
      };

      this.particles.push(particle);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      sizes[i] = size * this.baseSize;
      opacities[i] = opacity;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      glows[i] = 0.5 + Math.random() * 0.5;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('aGlow', new THREE.BufferAttribute(glows, 1));
  }

  public activateParticle(particle: ParticleData, time: number): void {
    if (particle.isActivated) return;

    particle.isActivated = true;
    particle.activationTime = time;
    particle.color.setHex(0xff6b6b);
    particle.size = 5;

    const colorIndex = Math.floor(Math.random() * COLOR_PALETTE.length);
    particle.targetColor.setHex(COLOR_PALETTE[colorIndex]);

    particle.spiralAngle = 0;
    particle.spiralSpeed = (Math.PI * 2) / 0.8;
    particle.spiralRadius = 8;

    gsap.to(particle, {
      size: particle.baseSize,
      duration: 1.2,
      ease: 'power2.out'
    });

    gsap.to(particle.color, {
      r: particle.targetColor.r,
      g: particle.targetColor.g,
      b: particle.targetColor.b,
      duration: 1.5,
      ease: 'power2.out',
      onUpdate: () => {
        particle.baseColor.copy(particle.color);
      }
    });

    particle.spiralAngle = 0;
    gsap.to(particle, {
      spiralAngle: Math.PI * 2,
      duration: 0.8,
      ease: 'power2.out',
      onComplete: () => {
        particle.spiralSpeed = 0;
        particle.spiralRadius = 0;
      }
    });

    gsap.delayedCall(1.5, () => {
      particle.isActivated = false;
    });
  }

  public addDrift(particle: ParticleData, direction: THREE.Vector2, time: number): void {
    particle.hasDrift = true;
    particle.driftDirection.set(direction.y, -direction.x).normalize();
    particle.driftPhase = time;
    particle.driftSpeed = 5 + Math.random() * 5;

    gsap.delayedCall(3, () => {
      particle.hasDrift = false;
    });
  }

  public update(time: number, _delta: number, viewAngle: { theta: number; phi: number }): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const sizes = this.geometry.attributes.aSize.array as Float32Array;
    const opacities = this.geometry.attributes.aOpacity.array as Float32Array;
    const colors = this.geometry.attributes.aColor.array as Float32Array;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      const breath = 0.7 + 0.3 * Math.sin(time * p.breathSpeed + p.breathPhase);
      p.opacity = p.baseOpacity * breath;

      let spiralX = 0;
      let spiralY = 0;
      if (p.spiralSpeed > 0) {
        const currentSpiralAngle = time * p.spiralSpeed;
        spiralX = Math.cos(currentSpiralAngle) * p.spiralRadius;
        spiralY = Math.sin(currentSpiralAngle) * p.spiralRadius;
      }

      let driftX = 0;
      let driftY = 0;
      if (p.hasDrift) {
        const driftAmount = Math.sin((time - p.driftPhase) * Math.PI * 2) * p.driftSpeed;
        driftX = p.driftDirection.x * driftAmount;
        driftY = p.driftDirection.y * driftAmount;
      }

      const parallaxFactor = 0.02;
      const parallaxX = p.currentPosition.z * Math.sin(viewAngle.theta) * parallaxFactor;
      const parallaxY = p.currentPosition.z * Math.sin(viewAngle.phi) * parallaxFactor;

      p.currentPosition.x = p.basePosition.x + spiralX + driftX + parallaxX;
      p.currentPosition.y = p.basePosition.y + spiralY + driftY + parallaxY;
      p.currentPosition.z = p.basePosition.z;

      positions[i * 3] = p.currentPosition.x;
      positions[i * 3 + 1] = p.currentPosition.y;
      positions[i * 3 + 2] = p.currentPosition.z;

      sizes[i] = p.size * this.baseSize;
      opacities[i] = p.opacity;
      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aOpacity.needsUpdate = true;
    this.geometry.attributes.aColor.needsUpdate = true;
  }

  public shiftAllColors(hueOffset: number): void {
    for (const p of this.particles) {
      const hsl = { h: 0, s: 0, l: 0 };
      p.baseColor.getHSL(hsl);
      hsl.h = (hsl.h + hueOffset / 360) % 1;
      p.baseColor.setHSL(hsl.h, hsl.s, hsl.l);
      p.color.copy(p.baseColor);
      p.targetColor.copy(p.baseColor);
    }
  }

  public randomizePositions(width: number, height: number): void {
    for (const p of this.particles) {
      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;
      const z = (Math.random() - 0.5) * 20;
      p.basePosition.set(x, y, z);
      p.targetPosition.copy(p.basePosition);
    }
  }

  public setBaseSize(size: number): void {
    this.baseSize = size;
  }

  public getBaseSize(): number {
    return this.baseSize;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
