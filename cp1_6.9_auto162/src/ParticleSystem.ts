import * as THREE from 'three';
import { COLOR_THEMES } from './WaveManager';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  layerIndex: number;
  shockwaveForce: THREE.Vector3;
  shockwaveTimer: number;
}

const particleVertexShader = `
  attribute float aSize;
  attribute float aLife;
  attribute float aMaxLife;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vLife;

  uniform float uPixelRatio;
  uniform float uSizeScale;

  void main() {
    vColor = aColor;
    vLife = aLife / aMaxLife;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    float lifeRatio = clamp(1.0 - vLife, 0.0, 1.0);
    float size = aSize * uPixelRatio * uSizeScale * lifeRatio;
    
    gl_PointSize = size;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vLife;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    if (dist > 0.5) {
      discard;
    }
    
    float alpha = smoothstep(0.5, 0.0, dist);
    alpha *= (1.0 - vLife);
    
    float glow = smoothstep(0.5, 0.0, dist) * 0.5 + 0.5;
    vec3 finalColor = vColor * glow;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  
  private readonly maxParticles = 3000;
  private readonly maxSpawnPerFrame = 50;
  private readonly layerCount = 3;
  
  private currentThemeIndex = 0;
  private targetThemeIndex = 0;
  private themeTransitionProgress = 1.0;
  private readonly themeTransitionDuration = 1.5;
  
  private pixelRatio = 1;

  constructor(scene: THREE.Scene, pixelRatio: number) {
    this.scene = scene;
    this.pixelRatio = pixelRatio;
    
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    this.geometry.setAttribute('aSize', new THREE.Float32BufferAttribute([], 1));
    this.geometry.setAttribute('aLife', new THREE.Float32BufferAttribute([], 1));
    this.geometry.setAttribute('aMaxLife', new THREE.Float32BufferAttribute([], 1));
    this.geometry.setAttribute('aColor', new THREE.Float32BufferAttribute([], 3));
    
    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uPixelRatio: { value: pixelRatio },
        uSizeScale: { value: 1.0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  public spawnParticles(peakPositions: THREE.Vector3[], layerColors: THREE.Color[][]): void {
    const toSpawn = Math.min(
      this.maxSpawnPerFrame,
      peakPositions.length * 5,
      this.maxParticles - this.particles.length
    );
    
    for (let i = 0; i < toSpawn; i++) {
      if (this.particles.length >= this.maxParticles) break;
      
      const peak = peakPositions[Math.floor(Math.random() * peakPositions.length)];
      const layerIndex = Math.floor(Math.random() * this.layerCount);
      
      const colorStart = COLOR_THEMES[this.currentThemeIndex].particleColors[layerIndex];
      const colorEnd = COLOR_THEMES[this.targetThemeIndex].particleColors[layerIndex];
      const t = this.themeTransitionProgress;
      
      const colorT = Math.random();
      const baseColor = colorStart[0].clone().lerp(colorStart[1], colorT);
      const targetColor = colorEnd[0].clone().lerp(colorEnd[1], colorT);
      const finalColor = baseColor.lerp(targetColor, t);
      
      const particle: Particle = {
        position: peak.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          0,
          (Math.random() - 0.5) * 0.5
        )),
        velocity: this.createConeVelocity(),
        color: finalColor,
        life: 0,
        maxLife: 2 + Math.random() * 2,
        layerIndex,
        shockwaveForce: new THREE.Vector3(),
        shockwaveTimer: 0
      };
      
      this.particles.push(particle);
    }
  }

  private createConeVelocity(): THREE.Vector3 {
    const speed = 0.5 + Math.random() * 1.0;
    const coneAngle = Math.PI / 6;
    
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * coneAngle;
    
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    ).normalize().multiplyScalar(speed);
  }

  public applyShockwaves(shockwaves: { center: THREE.Vector3; radius: number; strength: number }[]): void {
    for (const particle of this.particles) {
      for (const shock of shockwaves) {
        const dx = particle.position.x - shock.center.x;
        const dz = particle.position.z - shock.center.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < shock.radius + 0.5 && dist > shock.radius - 0.5) {
          const pushForce = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(shock.strength);
          particle.shockwaveForce.add(pushForce);
          particle.shockwaveTimer = 0.5;
        }
      }
    }
  }

  public setTheme(index: number): void {
    if (index >= 0 && index < COLOR_THEMES.length && index !== this.targetThemeIndex) {
      this.targetThemeIndex = index;
      this.themeTransitionProgress = 0;
    }
  }

  public update(deltaTime: number): void {
    if (this.themeTransitionProgress < 1.0) {
      this.themeTransitionProgress = Math.min(
        1.0,
        this.themeTransitionProgress + deltaTime / this.themeTransitionDuration
      );
      if (this.themeTransitionProgress >= 1.0) {
        this.currentThemeIndex = this.targetThemeIndex;
      }
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaTime;
      
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      
      p.position.addScaledVector(p.velocity, deltaTime);
      p.velocity.y -= deltaTime * 0.1;
      
      if (p.shockwaveTimer > 0) {
        p.position.addScaledVector(p.shockwaveForce, deltaTime);
        p.shockwaveTimer -= deltaTime;
        p.shockwaveForce.multiplyScalar(0.95);
      }
    }
    
    this.updateBufferGeometry();
  }

  private updateBufferGeometry(): void {
    const count = this.particles.length;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const lives = new Float32Array(count);
    const maxLives = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    const currentTheme = COLOR_THEMES[this.currentThemeIndex];
    const targetTheme = COLOR_THEMES[this.targetThemeIndex];
    const themeT = this.themeTransitionProgress;
    
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      
      const lifeRatio = 1 - (p.life / p.maxLife);
      sizes[i] = 6 * lifeRatio;
      lives[i] = p.life;
      maxLives[i] = p.maxLife;
      
      const colorStart = currentTheme.particleColors[p.layerIndex];
      const colorEnd = targetTheme.particleColors[p.layerIndex];
      const t = Math.random();
      const c1 = colorStart[0].clone().lerp(colorStart[1], t);
      const c2 = colorEnd[0].clone().lerp(colorEnd[1], t);
      const finalColor = c1.lerp(c2, themeT);
      
      colors[i * 3] = finalColor.r;
      colors[i * 3 + 1] = finalColor.g;
      colors[i * 3 + 2] = finalColor.b;
    }
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aLife', new THREE.BufferAttribute(lives, 1));
    this.geometry.setAttribute('aMaxLife', new THREE.BufferAttribute(maxLives, 1));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    
    this.geometry.attributes.position.needsUpdate = true;
  }

  public setPixelRatio(ratio: number): void {
    this.pixelRatio = ratio;
    this.material.uniforms.uPixelRatio.value = ratio;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
    this.particles = [];
  }
}
