import * as THREE from 'three';
import gsap from 'gsap';
import {
  ColorGradient,
  DEFAULT_COLORS,
  GOLD_COLORS,
  randomRange,
  generateColorGradientArray,
  lerpColorArray,
  clamp,
  easeOutCubic,
  degToRad,
  randomPointInCone,
  randomPointOnSphere,
  getDirectionColors,
  createWoodTexture,
  createPaperTexture
} from './utils';

export interface InteractionData {
  isDragging: boolean;
  dragX: number;
  dragY: number;
  dragSpeed: number;
  targetRotationX: number;
  targetRotationY: number;
}

export interface ExplosionState {
  isActive: boolean;
  startTime: number;
  duration: number;
  gatherStartTime: number;
  gatherDuration: number;
  originalPositions: Float32Array | null;
}

interface ParticleData {
  velocity: THREE.Vector3;
  state: 'waiting' | 'falling' | 'landed' | 'exploding' | 'gathering';
  targetPosition: THREE.Vector3 | null;
  angularVelocity: number;
}

const PARTICLE_COUNT = 10000;
const CONE_HEIGHT = 3;
const CONE_BOTTOM_RADIUS = 1.5;
const CONE_TOP_RADIUS = 0.3;
const NECK_RADIUS = 0.15;
const BASE_FALL_SPEED = 0.6;
const FALL_RATE = 50;
const MAX_TILT_X = degToRad(30);
const MAX_TILT_Y = degToRad(45);
const MAX_TILT_EFFECT = degToRad(25);

export class SandClock {
  public group: THREE.Group;
  public glassMeshes: THREE.Mesh[] = [];
  
  private scene: THREE.Scene;
  private particles!: THREE.Points;
  private particlePositions!: Float32Array;
  private particleColors!: Float32Array;
  private particleSizes!: Float32Array;
  private particleData: ParticleData[] = [];
  
  private topCone!: THREE.Mesh;
  private bottomCone!: THREE.Mesh;
  private topBase!: THREE.Mesh;
  private bottomBase!: THREE.Mesh;
  private groundPlatform!: THREE.Mesh;
  
  private defaultColors!: Float32Array;
  private targetColors!: Float32Array;
  private currentColorGradient: ColorGradient = DEFAULT_COLORS;
  private colorTransitionProgress: number = 1;
  private colorTransitionDuration: number = 1.2;
  private colorTransitionStartTime: number = 0;
  private isTransitioningColor: boolean = false;
  
  private baseParticleSize: number = 0.035;
  private currentParticleSize: number = 0.035;
  
  private particlesInTop: number = PARTICLE_COUNT;
  private particlesInBottom: number = 0;
  private fallAccumulator: number = 0;
  private landedCounter: number = 0;
  
  private explosionState: ExplosionState = {
    isActive: false,
    startTime: 0,
    duration: 1.5,
    gatherStartTime: 0,
    gatherDuration: 2,
    originalPositions: null
  };
  
  private impactSparks: THREE.Mesh[] = [];
  private explosionLight!: THREE.PointLight;
  
  private woodTexture!: THREE.Texture;
  private paperTexture!: THREE.Texture;
  
  private currentRotationX: number = degToRad(5);
  private currentRotationY: number = 0;
  private targetRotationX: number = degToRad(5);
  private targetRotationY: number = 0;
  
  private clock: THREE.Clock = new THREE.Clock();
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.woodTexture = createWoodTexture();
    this.paperTexture = createPaperTexture();
    
    this.init();
  }
  
  private init(): void {
    this.createGlassModel();
    this.createWoodenBases();
    this.createGroundPlatform();
    this.createParticleSystem();
    this.createLights();
    
    this.group.rotation.x = this.currentRotationX;
    this.scene.add(this.group);
  }
  
  private createGlassModel(): void {
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe0f0ff,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
      ior: 1.5,
      side: THREE.DoubleSide
    });
    
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    });
    
    const topConeGeometry = new THREE.ConeGeometry(
      CONE_BOTTOM_RADIUS,
      CONE_HEIGHT,
      64,
      1,
      true
    );
    topConeGeometry.translate(0, CONE_HEIGHT / 2, 0);
    this.topCone = new THREE.Mesh(topConeGeometry, glassMaterial);
    this.topCone.position.y = CONE_HEIGHT / 2 + 0.05;
    
    const bottomConeGeometry = new THREE.ConeGeometry(
      CONE_BOTTOM_RADIUS,
      CONE_HEIGHT,
      64,
      1,
      true
    );
    bottomConeGeometry.rotateX(Math.PI);
    bottomConeGeometry.translate(0, -CONE_HEIGHT / 2, 0);
    this.bottomCone = new THREE.Mesh(bottomConeGeometry, glassMaterial);
    this.bottomCone.position.y = -CONE_HEIGHT / 2 - 0.05;
    
    const topEdges = new THREE.EdgesGeometry(topConeGeometry);
    const topEdgeLines = new THREE.LineSegments(topEdges, edgeMaterial);
    topEdgeLines.position.copy(this.topCone.position);
    
    const bottomEdges = new THREE.EdgesGeometry(bottomConeGeometry);
    const bottomEdgeLines = new THREE.LineSegments(bottomEdges, edgeMaterial);
    bottomEdgeLines.position.copy(this.bottomCone.position);
    
    const neckGeometry = new THREE.TorusGeometry(NECK_RADIUS * 1.2, 0.02, 16, 32);
    const neckMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5
    });
    const neckRing = new THREE.Mesh(neckGeometry, neckMaterial);
    neckRing.rotation.x = Math.PI / 2;
    
    this.glassMeshes = [this.topCone, this.bottomCone];
    
    this.group.add(this.topCone, this.bottomCone);
    this.group.add(topEdgeLines, bottomEdgeLines);
    this.group.add(neckRing);
  }
  
  private createWoodenBases(): void {
    const baseGeometry = new THREE.CylinderGeometry(1, 1, 0.2, 64);
    
    const baseVertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      uniform float uNoiseAmount;
      uniform float uTime;
      
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
          i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }
      
      void main() {
        vNormal = normal;
        vPosition = position;
        float noise = snoise(position * 5.0 + uTime * 0.1) * uNoiseAmount;
        vec3 newPosition = position + normal * noise;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `;
    
    const baseFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      uniform sampler2D uWoodTexture;
      uniform float uWearAmount;
      
      void main() {
        vec2 uv = vec2(vPosition.x * 0.5 + 0.5, vPosition.y * 0.5 + 0.5);
        vec4 woodColor = texture2D(uWoodTexture, uv * 2.0);
        
        float edgeFactor = 1.0 - abs(dot(vNormal, vec3(0.0, 1.0, 0.0)));
        float wear = edgeFactor * uWearAmount;
        
        vec3 wornColor = mix(woodColor.rgb, vec3(0.3, 0.2, 0.1), wear * 0.5);
        float alpha = 1.0 - wear * 0.3;
        
        gl_FragColor = vec4(wornColor, alpha);
      }
    `;
    
    const baseMaterial = new THREE.ShaderMaterial({
      vertexShader: baseVertexShader,
      fragmentShader: baseFragmentShader,
      uniforms: {
        uNoiseAmount: { value: 0.2 },
        uTime: { value: 0 },
        uWoodTexture: { value: this.woodTexture },
        uWearAmount: { value: 0.3 }
      },
      transparent: true
    });
    
    this.topBase = new THREE.Mesh(baseGeometry, baseMaterial);
    this.topBase.position.y = CONE_HEIGHT + 0.15;
    this.topBase.castShadow = true;
    this.topBase.receiveShadow = true;
    
    this.bottomBase = new THREE.Mesh(baseGeometry, baseMaterial.clone());
    (this.bottomBase.material as THREE.ShaderMaterial).uniforms.uWoodTexture.value = this.woodTexture;
    this.bottomBase.position.y = -CONE_HEIGHT - 0.15;
    this.bottomBase.castShadow = true;
    this.bottomBase.receiveShadow = true;
    
    this.group.add(this.topBase, this.bottomBase);
  }
  
  private createGroundPlatform(): void {
    const platformGeometry = new THREE.CylinderGeometry(3, 3, 0.1, 64);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5e6c8,
      transparent: true,
      opacity: 0.4,
      roughness: 0.8,
      metalness: 0.1,
      map: this.paperTexture
    });
    
    this.groundPlatform = new THREE.Mesh(platformGeometry, platformMaterial);
    this.groundPlatform.position.y = -CONE_HEIGHT - 0.5;
    this.groundPlatform.receiveShadow = true;
    
    this.scene.add(this.groundPlatform);
  }
  
  private createParticleSystem(): void {
    const geometry = new THREE.BufferGeometry();
    
    this.particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.particleColors = new Float32Array(PARTICLE_COUNT * 3);
    this.particleSizes = new Float32Array(PARTICLE_COUNT);
    
    this.defaultColors = generateColorGradientArray(DEFAULT_COLORS, PARTICLE_COUNT);
    this.targetColors = new Float32Array(this.defaultColors);
    this.particleColors.set(this.defaultColors);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pos = randomPointInCone(
        CONE_HEIGHT,
        CONE_BOTTOM_RADIUS,
        CONE_TOP_RADIUS,
        false
      );
      pos.y += CONE_HEIGHT / 2 + 0.05;
      
      this.particlePositions[i * 3] = pos.x;
      this.particlePositions[i * 3 + 1] = pos.y;
      this.particlePositions[i * 3 + 2] = pos.z;
      
      this.particleSizes[i] = randomRange(0.02, 0.05);
      
      this.particleData.push({
        velocity: new THREE.Vector3(0, 0, 0),
        state: 'waiting',
        targetPosition: null,
        angularVelocity: randomRange(-0.5, 0.5)
      });
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: this.baseParticleSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.particles = new THREE.Points(geometry, particleMaterial);
    this.group.add(this.particles);
  }
  
  private createLights(): void {
    this.explosionLight = new THREE.PointLight(0xffd700, 0, 2.5);
    this.explosionLight.position.set(0, 0, 0);
    this.group.add(this.explosionLight);
  }
  
  public updateRotation(targetX: number, targetY: number): void {
    this.targetRotationX = clamp(targetX, -MAX_TILT_X, MAX_TILT_X);
    this.targetRotationY = clamp(targetY, -MAX_TILT_Y, MAX_TILT_Y);
  }
  
  public updateColors(dx: number, dy: number): void {
    const newGradient = getDirectionColors(dx, dy);
    if (newGradient !== this.currentColorGradient) {
      this.currentColorGradient = newGradient;
      this.targetColors = generateColorGradientArray(newGradient, PARTICLE_COUNT);
      this.colorTransitionProgress = 0;
      this.colorTransitionStartTime = performance.now();
      this.isTransitioningColor = true;
    }
  }
  
  public triggerExplosion(): void {
    if (this.explosionState.isActive) return;
    
    this.explosionState = {
      isActive: true,
      startTime: performance.now(),
      duration: 1500,
      gatherStartTime: 0,
      gatherDuration: 2000,
      originalPositions: new Float32Array(this.particlePositions)
    };
    
    const goldColors = generateColorGradientArray(GOLD_COLORS, PARTICLE_COUNT);
    this.particleColors.set(goldColors);
    (this.particles.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const direction = randomPointOnSphere(1);
      const speed = randomRange(0.4, 0.8);
      this.particleData[i].velocity.copy(direction).multiplyScalar(speed);
      this.particleData[i].state = 'exploding';
    }
    
    gsap.to(this.explosionLight, {
      intensity: 0.8,
      duration: 0.1,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(this.explosionLight, {
          intensity: 0,
          duration: 0.4,
          ease: 'power2.in'
        });
      }
    });
    
    setTimeout(() => {
      this.startGathering();
    }, 1500);
  }
  
  private startGathering(): void {
    this.explosionState.gatherStartTime = performance.now();
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const targetPos = randomPointInCone(
        CONE_HEIGHT,
        CONE_BOTTOM_RADIUS,
        CONE_TOP_RADIUS,
        false
      );
      targetPos.y += CONE_HEIGHT / 2 + 0.05;
      
      this.particleData[i].state = 'gathering';
      this.particleData[i].targetPosition = targetPos;
      this.particleData[i].velocity.set(0, 0, 0);
    }
    
    this.particlesInTop = PARTICLE_COUNT;
    this.particlesInBottom = 0;
    this.fallAccumulator = 0;
    this.landedCounter = 0;
  }
  
  private resetAfterExplosion(): void {
    this.explosionState.isActive = false;
    this.explosionState.originalPositions = null;
    
    this.isTransitioningColor = true;
    this.colorTransitionProgress = 0;
    this.colorTransitionStartTime = performance.now();
    this.targetColors = new Float32Array(this.defaultColors);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particleData[i].state = 'waiting';
      this.particleData[i].targetPosition = null;
    }
  }
  
  public update(deltaTime: number, dragSpeed: number): void {
    const time = this.clock.getElapsedTime();
    
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.1;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.1;
    this.group.rotation.x = this.currentRotationX;
    this.group.rotation.y = this.currentRotationY;
    
    (this.topBase.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    (this.bottomBase.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    
    const tiltAmount = Math.max(
      Math.abs(this.currentRotationX - degToRad(5)),
      Math.abs(this.currentRotationY)
    );
    const normalizedTilt = clamp(tiltAmount / MAX_TILT_EFFECT, 0, 1);
    this.currentParticleSize = this.baseParticleSize + normalizedTilt * 0.025;
    (this.particles.material as THREE.PointsMaterial).size = this.currentParticleSize;
    
    if (this.isTransitioningColor) {
      const elapsed = (performance.now() - this.colorTransitionStartTime) / 1000;
      this.colorTransitionProgress = clamp(elapsed / this.colorTransitionDuration, 0, 1);
      
      lerpColorArray(
        this.defaultColors,
        this.targetColors,
        this.colorTransitionProgress,
        this.particleColors
      );
      (this.particles.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      
      if (this.colorTransitionProgress >= 1) {
        this.isTransitioningColor = false;
        this.defaultColors = new Float32Array(this.targetColors);
      }
    }
    
    if (this.explosionState.isActive) {
      if (this.explosionState.gatherStartTime > 0) {
        const gatherElapsed = (performance.now() - this.explosionState.gatherStartTime) / 1000;
        const gatherProgress = clamp(gatherElapsed / (this.explosionState.gatherDuration / 1000), 0, 1);
        const easedProgress = easeOutCubic(gatherProgress);
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const data = this.particleData[i];
          if (data.state === 'gathering' && data.targetPosition) {
            const idx = i * 3;
            const startX = this.explosionState.originalPositions![idx];
            const startY = this.explosionState.originalPositions![idx + 1];
            const startZ = this.explosionState.originalPositions![idx + 2];
            
            this.particlePositions[idx] = startX + (data.targetPosition.x - startX) * easedProgress;
            this.particlePositions[idx + 1] = startY + (data.targetPosition.y - startY) * easedProgress;
            this.particlePositions[idx + 2] = startZ + (data.targetPosition.z - startZ) * easedProgress;
          }
        }
        
        if (gatherProgress >= 1) {
          this.resetAfterExplosion();
        }
      } else {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const data = this.particleData[i];
          if (data.state === 'exploding') {
            const idx = i * 3;
            this.particlePositions[idx] += data.velocity.x * deltaTime * 2;
            this.particlePositions[idx + 1] += data.velocity.y * deltaTime * 2;
            this.particlePositions[idx + 2] += data.velocity.z * deltaTime * 2;
            
            data.velocity.y -= 0.5 * deltaTime;
            data.velocity.multiplyScalar(0.99);
          }
        }
      }
      
      (this.particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      return;
    }
    
    const speedMultiplier = 1 + clamp(dragSpeed * 0.5, 0, 1);
    const currentFallSpeed = BASE_FALL_SPEED * speedMultiplier;
    const currentFallRate = FALL_RATE * speedMultiplier;
    
    this.fallAccumulator += currentFallRate * deltaTime;
    while (this.fallAccumulator >= 1 && this.particlesInTop > 0) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        if (this.particleData[i].state === 'waiting') {
          this.particleData[i].state = 'falling';
          this.particlesInTop--;
          break;
        }
      }
      this.fallAccumulator--;
    }
    
    const gravity = new THREE.Vector3(0, -currentFallSpeed, 0);
    const tiltVector = new THREE.Vector3(
      Math.sin(this.currentRotationY) * 0.3,
      0,
      Math.sin(this.currentRotationX - degToRad(5)) * 0.3
    );
    gravity.add(tiltVector);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const data = this.particleData[i];
      const idx = i * 3;
      
      if (data.state === 'falling') {
        const y = this.particlePositions[idx + 1];
        
        if (y > 0.1) {
          const distFromCenter = Math.sqrt(
            this.particlePositions[idx] ** 2 + 
            this.particlePositions[idx + 2] ** 2
          );
          
          if (distFromCenter > NECK_RADIUS) {
            const toCenter = new THREE.Vector3(
              -this.particlePositions[idx],
              0,
              -this.particlePositions[idx + 2]
            ).normalize();
            this.particlePositions[idx] += toCenter.x * deltaTime * 2;
            this.particlePositions[idx + 2] += toCenter.z * deltaTime * 2;
          }
          
          this.particlePositions[idx + 1] += gravity.y * deltaTime;
          this.particlePositions[idx] += gravity.x * deltaTime * 0.5;
          this.particlePositions[idx + 2] += gravity.z * deltaTime * 0.5;
          
        } else if (y <= 0.1 && y > -0.1) {
          if (Math.random() < 0.3) {
            this.particlePositions[idx] += randomRange(-0.02, 0.02);
            this.particlePositions[idx + 2] += randomRange(-0.02, 0.02);
          }
          this.particlePositions[idx + 1] += gravity.y * deltaTime;
          
        } else {
          this.particlePositions[idx + 1] += gravity.y * deltaTime * 0.8;
          
          const bottomConeY = -CONE_HEIGHT / 2 - 0.05;
          const distFromBottom = y - bottomConeY;
          const coneProgress = 1 - (distFromBottom / -CONE_HEIGHT);
          const currentRadius = CONE_TOP_RADIUS + (CONE_BOTTOM_RADIUS - CONE_TOP_RADIUS) * coneProgress;
          
          const distFromCenter = Math.sqrt(
            this.particlePositions[idx] ** 2 + 
            this.particlePositions[idx + 2] ** 2
          );
          
          if (distFromCenter > currentRadius * 0.9) {
            const toCenter = new THREE.Vector3(
              -this.particlePositions[idx],
              0,
              -this.particlePositions[idx + 2]
            ).normalize();
            this.particlePositions[idx] += toCenter.x * deltaTime;
            this.particlePositions[idx + 2] += toCenter.z * deltaTime;
          }
          
          if (y <= bottomConeY + 0.1) {
            data.state = 'landed';
            this.particlesInBottom++;
            this.particlePositions[idx + 1] = bottomConeY + 0.05;
            
            this.landedCounter++;
            if (this.landedCounter % 10 === 0) {
              this.createImpactSpark(
                this.particlePositions[idx],
                this.particlePositions[idx + 1],
                this.particlePositions[idx + 2]
              );
            }
          }
        }
        
        const rotationAngle = data.angularVelocity * deltaTime * 0.5;
        const cos = Math.cos(rotationAngle);
        const sin = Math.sin(rotationAngle);
        const px = this.particlePositions[idx];
        const pz = this.particlePositions[idx + 2];
        this.particlePositions[idx] = px * cos - pz * sin;
        this.particlePositions[idx + 2] = px * sin + pz * cos;
      }
    }
    
    (this.particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    
    this.updateImpactSparks(deltaTime);
  }
  
  private createImpactSpark(x: number, y: number, z: number): void {
    const sparkGeometry = new THREE.SphereGeometry(0.01, 8, 8);
    const sparkMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    
    const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
    spark.position.set(x, y, z);
    spark.userData = {
      startTime: performance.now(),
      duration: 100
    };
    
    this.group.add(spark);
    this.impactSparks.push(spark);
  }
  
  private updateImpactSparks(_deltaTime: number): void {
    const now = performance.now();
    
    for (let i = this.impactSparks.length - 1; i >= 0; i--) {
      const spark = this.impactSparks[i];
      const elapsed = now - spark.userData.startTime;
      const progress = elapsed / spark.userData.duration;
      
      if (progress >= 1) {
        this.group.remove(spark);
        spark.geometry.dispose();
        (spark.material as THREE.Material).dispose();
        this.impactSparks.splice(i, 1);
      } else {
        (spark.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - progress);
        spark.scale.setScalar(1 + progress * 2);
      }
    }
  }
  
  public getGlassMeshes(): THREE.Mesh[] {
    return this.glassMeshes;
  }
  
  public getGroup(): THREE.Group {
    return this.group;
  }
  
  public resize(scale: number): void {
    this.group.scale.setScalar(scale);
  }
  
  public dispose(): void {
    this.scene.remove(this.group);
    this.scene.remove(this.groundPlatform);
    
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
    
    this.woodTexture.dispose();
    this.paperTexture.dispose();
  }
}
