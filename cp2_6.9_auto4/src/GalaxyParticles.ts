import * as THREE from 'three';

export enum GalaxyShape {
  SPIRAL = 'spiral',
  GLOBULAR = 'globular',
  RING = 'ring',
  IRREGULAR = 'irregular'
}

export const SHAPE_LABELS: Record<GalaxyShape, string> = {
  [GalaxyShape.SPIRAL]: '旋涡星系',
  [GalaxyShape.GLOBULAR]: '球状星团',
  [GalaxyShape.RING]: '光环',
  [GalaxyShape.IRREGULAR]: '不规则星云'
};

const PARTICLE_COUNT = 4000;
const TRANSITION_DURATION = 1000;

const vertexShader = `
  attribute float aSize;
  attribute float aSeed;
  attribute float aColorOffset;
  
  uniform float uTime;
  uniform float uSpeedMultiplier;
  
  varying float vOpacity;
  varying float vColorOffset;
  
  void main() {
    vColorOffset = aColorOffset;
    
    float twinkle = sin(uTime * 2.0 * uSpeedMultiplier + aSeed * 10.0) * 0.3 + 0.7;
    vOpacity = twinkle;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    float sizeFactor = 300.0 / -mvPosition.z;
    gl_PointSize = aSize * sizeFactor * twinkle;
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  
  varying float vOpacity;
  varying float vColorOffset;
  
  vec3 warmToCool(float t) {
    vec3 warm = vec3(1.0, 0.84, 0.0);
    vec3 mid = vec3(1.0, 0.4, 0.6);
    vec3 cool = vec3(0.0, 0.75, 1.0);
    
    if (t < 0.5) {
      return mix(warm, mid, t * 2.0);
    } else {
      return mix(mid, cool, (t - 0.5) * 2.0);
    }
  }
  
  void main() {
    vec4 texColor = texture2D(uTexture, gl_PointCoord);
    if (texColor.a < 0.1) discard;
    
    vec3 color = warmToCool(vColorOffset);
    gl_FragColor = vec4(color, texColor.a * vOpacity);
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
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export class GalaxyParticles {
  public points: THREE.Points;
  public particleCount: number = PARTICLE_COUNT;
  
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  
  private time: number = 0;
  private speedMultiplier: number = 1;
  private currentShape: GalaxyShape = GalaxyShape.SPIRAL;
  
  private transitionStart: number = 0;
  private isTransitioning: boolean = false;
  
  private basePositions: Float32Array;
  private targetPositions: Float32Array;
  private animatedPositions: Float32Array;
  
  private sizes: Float32Array;
  private seeds: Float32Array;
  private colorOffsets: Float32Array;
  private angles: Float32Array;
  private radii: Float32Array;
  private heights: Float32Array;
  private rotationSpeeds: Float32Array;
  
  private clock: THREE.Clock;

  constructor(scene: THREE.Scene) {
    this.clock = new THREE.Clock();
    
    this.basePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.targetPositions = new Float32Array(PARTICLE_COUNT * 3);
    this.animatedPositions = new Float32Array(PARTICLE_COUNT * 3);
    
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.seeds = new Float32Array(PARTICLE_COUNT);
    this.colorOffsets = new Float32Array(PARTICLE_COUNT);
    this.angles = new Float32Array(PARTICLE_COUNT);
    this.radii = new Float32Array(PARTICLE_COUNT);
    this.heights = new Float32Array(PARTICLE_COUNT);
    this.rotationSpeeds = new Float32Array(PARTICLE_COUNT);
    
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeedMultiplier: { value: 1 },
        uTexture: { value: createParticleTexture() }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    this.generateParticleAttributes();
    this.generateSpiralPositions();
    this.copyArray(this.basePositions, this.animatedPositions);
    this.copyArray(this.basePositions, this.targetPositions);
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.animatedPositions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(this.seeds, 1));
    this.geometry.setAttribute('aColorOffset', new THREE.BufferAttribute(this.colorOffsets, 1));
    
    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }
  
  private copyArray(src: Float32Array, dst: Float32Array): void {
    for (let i = 0; i < src.length; i++) {
      dst[i] = src[i];
    }
  }
  
  private generateParticleAttributes(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.sizes[i] = Math.random() * 2.5 + 1.0;
      this.seeds[i] = Math.random();
      this.colorOffsets[i] = Math.random();
      this.angles[i] = Math.random() * Math.PI * 2;
      this.radii[i] = Math.random();
      this.heights[i] = (Math.random() - 0.5) * 2;
      this.rotationSpeeds[i] = 0.3 + Math.random() * 0.4;
    }
  }
  
  private generateSpiralPositions(): void {
    const arms = 4;
    const armSpread = 0.6;
    const maxRadius = 120;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = this.radii[i];
      const radius = t * maxRadius;
      const arm = Math.floor(this.seeds[i] * arms);
      const armAngle = (arm / arms) * Math.PI * 2;
      const spiralAngle = radius * 0.035;
      const spreadAngle = (Math.random() - 0.5) * armSpread * (1 - t * 0.6);
      
      const angle = armAngle + spiralAngle + spreadAngle;
      const heightJitter = this.heights[i] * 8 * (1 - t * 0.7);
      
      this.basePositions[i * 3] = Math.cos(angle) * radius;
      this.basePositions[i * 3 + 1] = heightJitter;
      this.basePositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
  }
  
  private generateGlobularPositions(): void {
    const maxRadius = 90;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.6) * maxRadius;
      
      this.basePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      this.basePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.basePositions[i * 3 + 2] = r * Math.cos(phi);
    }
  }
  
  private generateRingPositions(): void {
    const innerRadius = 50;
    const outerRadius = 110;
    const thickness = 8;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = this.angles[i] + (Math.random() - 0.5) * 0.15;
      const radius = innerRadius + this.radii[i] * (outerRadius - innerRadius);
      const height = (Math.random() - 0.5) * thickness * (0.5 + Math.abs(Math.sin(angle * 2)) * 0.5);
      const radiusJitter = (Math.random() - 0.5) * 6;
      
      this.basePositions[i * 3] = Math.cos(angle) * (radius + radiusJitter);
      this.basePositions[i * 3 + 1] = height;
      this.basePositions[i * 3 + 2] = Math.sin(angle) * (radius + radiusJitter);
    }
  }
  
  private generateIrregularPositions(): void {
    const scale = 100;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = this.radii[i];
      const theta = this.angles[i];
      const phi = this.heights[i] * Math.PI;
      
      const r = t * scale * (0.5 + Math.random() * 0.8);
      const jitter = (Math.random() - 0.5) * 40 * t;
      
      this.basePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta) + jitter;
      this.basePositions[i * 3 + 1] = r * Math.cos(phi) * 0.7 + (Math.random() - 0.5) * 30;
      this.basePositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * 25;
    }
  }
  
  public setShape(shape: GalaxyShape): void {
    if (shape === this.currentShape && !this.isTransitioning) return;
    
    this.currentShape = shape;
    
    for (let i = 0; i < this.animatedPositions.length; i++) {
      this.targetPositions[i] = this.animatedPositions[i];
    }
    
    switch (shape) {
      case GalaxyShape.SPIRAL:
        this.generateSpiralPositions();
        break;
      case GalaxyShape.GLOBULAR:
        this.generateGlobularPositions();
        break;
      case GalaxyShape.RING:
        this.generateRingPositions();
        break;
      case GalaxyShape.IRREGULAR:
        this.generateIrregularPositions();
        break;
    }
    
    this.isTransitioning = true;
    this.transitionStart = performance.now();
  }
  
  public setSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(0, Math.min(5, multiplier));
    this.material.uniforms.uSpeedMultiplier.value = this.speedMultiplier;
  }
  
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  
  public update(): void {
    const delta = this.clock.getDelta();
    this.time += delta * this.speedMultiplier;
    this.material.uniforms.uTime.value = this.time;
    
    let transitionT = 1;
    if (this.isTransitioning) {
      const elapsed = performance.now() - this.transitionStart;
      transitionT = Math.min(1, elapsed / TRANSITION_DURATION);
      if (transitionT >= 1) {
        this.isTransitioning = false;
      }
    }
    const easedT = this.easeInOutCubic(transitionT);
    
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const baseIdx = i * 3;
      const speed = this.rotationSpeeds[i] * this.speedMultiplier * delta;
      const currentAngle = this.angles[i] + this.time * speed * 0.5;
      const radius = Math.sqrt(
        this.basePositions[baseIdx] * this.basePositions[baseIdx] +
        this.basePositions[baseIdx + 2] * this.basePositions[baseIdx + 2]
      );
      
      let rotX, rotZ;
      if (this.currentShape === GalaxyShape.GLOBULAR) {
        rotX = this.basePositions[baseIdx];
        rotZ = this.basePositions[baseIdx + 2];
        const rotY = this.basePositions[baseIdx + 1];
        const yaw = this.time * speed * 0.3;
        const pitch = this.time * speed * 0.15 + this.seeds[i];
        rotX = radius * Math.sin(pitch) * Math.cos(yaw + this.seeds[i] * Math.PI);
        rotZ = radius * Math.sin(pitch) * Math.sin(yaw + this.seeds[i] * Math.PI);
        posArray[baseIdx] = this.lerp(this.targetPositions[baseIdx], rotX, easedT);
        posArray[baseIdx + 1] = this.lerp(this.targetPositions[baseIdx + 1], rotY, easedT);
        posArray[baseIdx + 2] = this.lerp(this.targetPositions[baseIdx + 2], rotZ, easedT);
      } else {
        rotX = Math.cos(currentAngle) * radius;
        rotZ = Math.sin(currentAngle) * radius;
        const wobble = Math.sin(this.time * 2 + this.seeds[i] * 8) * 1.5 * this.speedMultiplier;
        
        posArray[baseIdx] = this.lerp(this.targetPositions[baseIdx], rotX, easedT);
        posArray[baseIdx + 1] = this.lerp(this.targetPositions[baseIdx + 1], this.basePositions[baseIdx + 1] + wobble, easedT);
        posArray[baseIdx + 2] = this.lerp(this.targetPositions[baseIdx + 2], rotZ, easedT);
      }
    }
    
    posAttr.needsUpdate = true;
  }
  
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.material.uniforms.uTexture.value) {
      (this.material.uniforms.uTexture.value as THREE.Texture).dispose();
    }
  }
}
