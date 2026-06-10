import * as THREE from 'three';

const PARTICLE_COUNT = 5000;
const BASE_RADIUS = 10;

export type ColorTheme = 'aurora' | 'nebula' | 'solar';

interface ColorThemeConfig {
  core: THREE.Color;
  edge: THREE.Color;
}

const COLOR_THEMES: Record<ColorTheme, ColorThemeConfig> = {
  aurora: {
    core: new THREE.Color(0x00ffaa),
    edge: new THREE.Color(0x0066ff)
  },
  nebula: {
    core: new THREE.Color(0xff44aa),
    edge: new THREE.Color(0x8844ff)
  },
  solar: {
    core: new THREE.Color(0xffdd44),
    edge: new THREE.Color(0xff6622)
  }
};

interface PulseEffect {
  position: THREE.Vector3;
  startTime: number;
  duration: number;
}

export interface NebulaParams {
  density: number;
  rotationSpeed: number;
  colorTheme: ColorTheme;
}

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute vec3 aTargetColor;
  attribute float aColorTransition;
  
  uniform float uTime;
  uniform float uWaveAmplitude;
  uniform float uWaveFrequency;
  uniform float uRotationSpeed;
  uniform float uDensity;
  
  varying vec3 vColor;
  varying float vBrightness;
  varying vec3 vWorldPosition;
  
  void main() {
    vec3 pos = position;
    
    float rotAngle = uTime * uRotationSpeed;
    float cosR = cos(rotAngle);
    float sinR = sin(rotAngle);
    float x = pos.x * cosR - pos.z * sinR;
    float z = pos.x * sinR + pos.z * cosR;
    pos.x = x;
    pos.z = z;
    
    float wave = sin(uTime * uWaveFrequency + pos.y * 0.5) * uWaveAmplitude;
    pos.y += wave;
    
    pos *= uDensity;
    
    vec3 mixedColor = mix(aColor, aTargetColor, aColorTransition);
    vColor = mixedColor;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    
    vBrightness = 1.0;
    vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vBrightness;
  varying vec3 vWorldPosition;
  
  uniform vec3 uPulsePositions[10];
  uniform float uPulseTimes[10];
  uniform int uPulseCount;
  
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    if (dist > 0.5) {
      discard;
    }
    
    float glow = 1.0 - (dist * 2.0);
    glow = pow(glow, 2.0);
    
    float brightnessBoost = 1.0;
    
    for (int i = 0; i < 10; i++) {
      if (i >= uPulseCount) break;
      
      float pulseTime = uPulseTimes[i];
      if (pulseTime <= 0.0) continue;
      
      float pulseProgress = pulseTime;
      float pulseRadius = 0.5 + pulseProgress * 1.5;
      float pulseStrength = 1.0 - pulseProgress;
      
      vec3 diff = vWorldPosition - uPulsePositions[i];
      float d = length(diff);
      
      float ring = smoothstep(pulseRadius - 0.3, pulseRadius, d) * 
                   (1.0 - smoothstep(pulseRadius, pulseRadius + 0.3, d));
      
      float innerGlow = (1.0 - smoothstep(0.0, 0.5, d)) * pulseStrength;
      
      brightnessBoost += (ring * 2.0 + innerGlow * 3.0) * pulseStrength;
    }
    
    vec3 finalColor = vColor * glow * vBrightness * brightnessBoost;
    float alpha = glow * 0.8;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export class NebulaSystem {
  private scene: THREE.Scene;
  private points!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.ShaderMaterial;
  
  private initialPositions: Float32Array = new Float32Array(PARTICLE_COUNT * 3);
  private positions: Float32Array = new Float32Array(PARTICLE_COUNT * 3);
  private sizes: Float32Array = new Float32Array(PARTICLE_COUNT);
  private colors: Float32Array = new Float32Array(PARTICLE_COUNT * 3);
  private targetColors: Float32Array = new Float32Array(PARTICLE_COUNT * 3);
  private colorTransitions: Float32Array = new Float32Array(PARTICLE_COUNT);
  
  private pulses: PulseEffect[] = [];
  private pulsePositions: Float32Array = new Float32Array(30);
  private pulseTimes: Float32Array = new Float32Array(10);
  
  params: NebulaParams = {
    density: 1.0,
    rotationSpeed: 1.0,
    colorTheme: 'aurora'
  };
  
  private currentTheme: ColorTheme = 'aurora';
  private targetTheme: ColorTheme = 'aurora';
  private themeTransitionStart: number = 0;
  private readonly themeTransitionDuration: number = 0.5;
  
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private lastPulseTime: number = 0;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.init();
  }
  
  private init(): void {
    this.geometry = new THREE.BufferGeometry();
    this.generateParticles();
    this.setupMaterial();
    this.createPoints();
  }
  
  private generateParticles(): void {
    const theme = COLOR_THEMES[this.currentTheme];
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 1 / 3) * BASE_RADIUS;
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      this.initialPositions[i3] = x;
      this.initialPositions[i3 + 1] = y;
      this.initialPositions[i3 + 2] = z;
      
      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;
      
      this.sizes[i] = 0.05 + Math.random() * 0.25;
      
      const t = r / BASE_RADIUS;
      const color = theme.core.clone().lerp(theme.edge, t);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
      
      this.targetColors[i3] = color.r;
      this.targetColors[i3 + 1] = color.g;
      this.targetColors[i3 + 2] = color.b;
      
      this.colorTransitions[i] = 1.0;
    }
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aTargetColor', new THREE.BufferAttribute(this.targetColors, 3));
    this.geometry.setAttribute('aColorTransition', new THREE.BufferAttribute(this.colorTransitions, 1));
  }
  
  private setupMaterial(): void {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uWaveAmplitude: { value: 0.5 },
        uWaveFrequency: { value: 0.3 * Math.PI * 2 },
        uRotationSpeed: { value: this.params.rotationSpeed },
        uDensity: { value: this.params.density },
        uPulsePositions: { value: this.pulsePositions },
        uPulseTimes: { value: this.pulseTimes },
        uPulseCount: { value: 0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }
  
  private createPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }
  
  update(time: number, deltaTime: number): void {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uRotationSpeed.value = this.params.rotationSpeed;
    this.material.uniforms.uDensity.value = this.params.density;
    
    this.updateColorTransitions(deltaTime);
    this.updatePulses(time);
  }
  
  private updateColorTransitions(deltaTime: number): void {
    if (this.currentTheme === this.targetTheme) return;
    
    const elapsed = (performance.now() / 1000) - this.themeTransitionStart;
    const progress = Math.min(elapsed / this.themeTransitionDuration, 1.0);
    
    const transitionAttr = this.geometry.getAttribute('aColorTransition') as THREE.BufferAttribute;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      transitionAttr.array[i] = progress;
    }
    transitionAttr.needsUpdate = true;
    
    if (progress >= 1.0) {
      this.currentTheme = this.targetTheme;
      const colorAttr = this.geometry.getAttribute('aColor') as THREE.BufferAttribute;
      const targetColorAttr = this.geometry.getAttribute('aTargetColor') as THREE.BufferAttribute;
      for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
        colorAttr.array[i] = targetColorAttr.array[i];
      }
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        transitionAttr.array[i] = 1.0;
      }
      colorAttr.needsUpdate = true;
      transitionAttr.needsUpdate = true;
    }
  }
  
  private updatePulses(time: number): void {
    this.pulses = this.pulses.filter(pulse => {
      const elapsed = time - pulse.startTime;
      return elapsed < pulse.duration;
    });
    
    for (let i = 0; i < 10; i++) {
      const i3 = i * 3;
      if (i < this.pulses.length) {
        const pulse = this.pulses[i];
        const elapsed = time - pulse.startTime;
        const progress = elapsed / pulse.duration;
        
        this.pulsePositions[i3] = pulse.position.x;
        this.pulsePositions[i3 + 1] = pulse.position.y;
        this.pulsePositions[i3 + 2] = pulse.position.z;
        this.pulseTimes[i] = progress;
      } else {
        this.pulseTimes[i] = 0;
      }
    }
    
    this.material.uniforms.uPulsePositions.value = this.pulsePositions;
    this.material.uniforms.uPulseTimes.value = this.pulseTimes;
    this.material.uniforms.uPulseCount.value = this.pulses.length;
  }
  
  handleMouseMove(
    clientX: number,
    clientY: number,
    camera: THREE.Camera,
    canvasWidth: number,
    canvasHeight: number,
    time: number
  ): void {
    this.mouse.x = (clientX / canvasWidth) * 2 - 1;
    this.mouse.y = -(clientY / canvasHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, camera);
    
    const direction = this.raycaster.ray.direction.clone();
    const origin = this.raycaster.ray.origin.clone();
    
    const t = -origin.y / direction.y;
    if (t > 0) {
      const intersectPoint = origin.add(direction.multiplyScalar(t));
      
      if (time - this.lastPulseTime > 0.1) {
        const nearestPoint = this.findNearestParticle(intersectPoint);
        if (nearestPoint && nearestPoint.distance < 0.3) {
          this.addPulse(nearestPoint.position.clone(), time);
          this.lastPulseTime = time;
        }
      }
    }
  }
  
  private findNearestParticle(point: THREE.Vector3): { position: THREE.Vector3; distance: number } | null {
    let nearest: { position: THREE.Vector3; distance: number } | null = null;
    const density = this.params.density;
    
    for (let i = 0; i < PARTICLE_COUNT; i += 20) {
      const i3 = i * 3;
      const px = this.initialPositions[i3] * density;
      const py = this.initialPositions[i3 + 1] * density;
      const pz = this.initialPositions[i3 + 2] * density;
      
      const dx = point.x - px;
      const dy = point.y - py;
      const dz = point.z - pz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (!nearest || dist < nearest.distance) {
        nearest = {
          position: new THREE.Vector3(px, py, pz),
          distance: dist
        };
      }
    }
    
    return nearest;
  }
  
  private addPulse(position: THREE.Vector3, time: number): void {
    if (this.pulses.length >= 10) {
      this.pulses.shift();
    }
    this.pulses.push({
      position,
      startTime: time,
      duration: 1.0
    });
  }
  
  setColorTheme(theme: ColorTheme): void {
    if (theme === this.targetTheme) return;
    
    this.targetTheme = theme;
    this.themeTransitionStart = performance.now() / 1000;
    
    const colorAttr = this.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    const targetColorAttr = this.geometry.getAttribute('aTargetColor') as THREE.BufferAttribute;
    const transitionAttr = this.geometry.getAttribute('aColorTransition') as THREE.BufferAttribute;
    const newTheme = COLOR_THEMES[theme];
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      
      if (this.currentTheme === this.targetTheme) {
        colorAttr.array[i3] = targetColorAttr.array[i3];
        colorAttr.array[i3 + 1] = targetColorAttr.array[i3 + 1];
        colorAttr.array[i3 + 2] = targetColorAttr.array[i3 + 2];
      } else {
        const currentT = transitionAttr.array[i];
        colorAttr.array[i3] = THREE.MathUtils.lerp(
          colorAttr.array[i3],
          targetColorAttr.array[i3],
          currentT
        );
        colorAttr.array[i3 + 1] = THREE.MathUtils.lerp(
          colorAttr.array[i3 + 1],
          targetColorAttr.array[i3 + 1],
          currentT
        );
        colorAttr.array[i3 + 2] = THREE.MathUtils.lerp(
          colorAttr.array[i3 + 2],
          targetColorAttr.array[i3 + 2],
          currentT
        );
      }
      transitionAttr.array[i] = 0;
      
      const r = Math.sqrt(
        this.initialPositions[i3] * this.initialPositions[i3] +
        this.initialPositions[i3 + 1] * this.initialPositions[i3 + 1] +
        this.initialPositions[i3 + 2] * this.initialPositions[i3 + 2]
      );
      const t = r / BASE_RADIUS;
      const color = newTheme.core.clone().lerp(newTheme.edge, t);
      
      targetColorAttr.array[i3] = color.r;
      targetColorAttr.array[i3 + 1] = color.g;
      targetColorAttr.array[i3 + 2] = color.b;
    }
    
    colorAttr.needsUpdate = true;
    targetColorAttr.needsUpdate = true;
    transitionAttr.needsUpdate = true;
  }
  
  reset(): void {
    this.params.density = 1.0;
    this.params.rotationSpeed = 1.0;
    this.setColorTheme('aurora');
    this.pulses = [];
  }
  
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.points);
  }
}
