import * as THREE from 'three';
import { EmotionData, NEUTRAL_EMOTION } from './EmotionData';

const PARTICLE_COUNT = 5000;
const STAR_COUNT = 200;

interface ParticleState {
  basePosition: THREE.Vector3;
  velocity: THREE.Vector3;
  phase: number;
  sizeOffset: number;
  hueOffset: number;
}

interface TransitionState {
  active: boolean;
  startTime: number;
  duration: number;
  fromColor: THREE.Color;
  toColor: THREE.Color;
  fromSpeed: number;
  toSpeed: number;
  fromRadius: number;
  toRadius: number;
  fromSaturation: number;
  toSaturation: number;
  fromSize: number;
  toSize: number;
  fromRotationSpeed: number;
  toRotationSpeed: number;
}

export class ParticleCloud {
  private scene: THREE.Scene;
  private container: THREE.Group;
  private particles: THREE.Points;
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.ShaderMaterial;
  private stars: THREE.Points;

  private particleStates: ParticleState[] = [];
  private currentEmotion: EmotionData = { ...NEUTRAL_EMOTION };
  private intensity: number = 50;
  private isPlaying: boolean = true;
  private rotationAngle: number = 0;

  private colorTransition: TransitionState | null = null;
  private paramTransition: TransitionState | null = null;

  private currentSpeedMultiplier: number = 1.0;
  private currentClusterRadius: number = 5.0;
  private currentSaturation: number = 65;
  private currentParticleSize: number = 0.06;
  private currentRotationSpeed: number = (2 * Math.PI) / 60;

  private targetSpeedMultiplier: number = 1.0;
  private targetClusterRadius: number = 5.0;
  private targetSaturation: number = 65;
  private targetParticleSize: number = 0.06;
  private targetRotationSpeed: number = (2 * Math.PI) / 60;

  private time: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.container = new THREE.Group();
    this.scene.add(this.container);

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleMaterial = this.createParticleMaterial();
    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.container.add(this.particles);

    this.stars = this.createStars();
    this.scene.add(this.stars);

    this.initParticles();
    this.updateColorUniforms(new THREE.Color(NEUTRAL_EMOTION.color));
  }

  private createParticleMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseHue: { value: 0 },
        uSaturation: { value: 0.65 },
        uLightness: { value: 0.55 },
        uHueShift: { value: 0.04 },
        uSize: { value: 0.06 }
      },
      vertexShader: `
        attribute float aPhase;
        attribute float aSizeOffset;
        attribute float aHueOffset;
        
        uniform float uTime;
        uniform float uSize;
        
        varying float vPhase;
        varying float vHueOffset;
        
        void main() {
          vPhase = aPhase;
          vHueOffset = aHueOffset;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float pulseSize = uSize * (1.0 + aSizeOffset) * (0.85 + 0.15 * sin(uTime * 2.0 + aPhase * 6.28));
          gl_PointSize = pulseSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBaseHue;
        uniform float uSaturation;
        uniform float uLightness;
        uniform float uHueShift;
        
        varying float vPhase;
        varying float vHueOffset;
        
        vec3 hsl2rgb(float h, float s, float l) {
          h = mod(h, 1.0);
          float c = (1.0 - abs(2.0 * l - 1.0)) * s;
          float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
          float m = l - c * 0.5;
          vec3 rgb;
          if (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
          else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
          else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
          else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
          else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
          else rgb = vec3(c, 0.0, x);
          return rgb + m;
        }
        
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          
          float alpha = smoothstep(0.5, 0.0, dist);
          float glow = smoothstep(0.5, 0.15, dist) * 0.6;
          float core = smoothstep(0.25, 0.0, dist);
          
          float breath = 0.7 + 0.3 * sin(uTime * 3.33 + vPhase * 6.28);
          float hue = uBaseHue + vHueOffset * uHueShift;
          float lightness = uLightness * breath;
          
          vec3 color = hsl2rgb(hue, uSaturation, clamp(lightness, 0.35, 0.85));
          vec3 glowColor = hsl2rgb(hue, uSaturation * 0.8, clamp(lightness * 1.2, 0.4, 0.9));
          
          vec3 finalColor = color * (core * 1.2 + 0.3) + glowColor * glow;
          float finalAlpha = min(alpha + glow * 0.5, 0.95);
          
          gl_FragColor = vec4(finalColor, finalAlpha * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  private createStars(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);
    const phases = new Float32Array(STAR_COUNT);
    const sizes = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const radius = 40 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      phases[i] = Math.random();
      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float aPhase;
        attribute float aSize;
        uniform float uTime;
        varying float vPhase;
        
        void main() {
          vPhase = aPhase;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float twinkle = 0.5 + 0.5 * sin(uTime * 2.0 + aPhase * 6.28);
          gl_PointSize = aSize * twinkle * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying float vPhase;
        
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          
          float twinkle = 0.5 + 0.5 * sin(uTime * 2.5 + vPhase * 6.28);
          float alpha = smoothstep(0.5, 0.0, dist) * (0.4 + 0.6 * twinkle);
          
          gl_FragColor = vec4(0.9, 0.92, 1.0, alpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
  }

  private initParticles(): void {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const phases = new Float32Array(PARTICLE_COUNT);
    const sizeOffsets = new Float32Array(PARTICLE_COUNT);
    const hueOffsets = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radius = this.currentClusterRadius * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const speed = 0.15 + Math.random() * 0.25;
      const angle = Math.random() * Math.PI * 2;
      const vAngle = (Math.random() - 0.5) * 0.5;

      this.particleStates.push({
        basePosition: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          Math.cos(angle) * Math.cos(vAngle) * speed,
          Math.sin(vAngle) * speed,
          Math.sin(angle) * Math.cos(vAngle) * speed
        ),
        phase: Math.random(),
        sizeOffset: (Math.random() - 0.5) * 0.6,
        hueOffset: Math.random() * 2 - 1
      });

      phases[i] = this.particleStates[i].phase;
      sizeOffsets[i] = this.particleStates[i].sizeOffset;
      hueOffsets[i] = this.particleStates[i].hueOffset;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.particleGeometry.setAttribute('aSizeOffset', new THREE.BufferAttribute(sizeOffsets, 1));
    this.particleGeometry.setAttribute('aHueOffset', new THREE.BufferAttribute(hueOffsets, 1));
  }

  private updateColorUniforms(targetColor: THREE.Color): void {
    const hsl = { h: 0, s: 0, l: 0 };
    targetColor.getHSL(hsl);
    this.particleMaterial.uniforms.uBaseHue.value = hsl.h;
    this.particleMaterial.uniforms.uLightness.value = hsl.l;
  }

  public setEmotion(emotion: EmotionData): void {
    const fromColor = this.hexToColor(this.currentEmotion.color);
    const toColor = this.hexToColor(emotion.color);

    this.colorTransition = {
      active: true,
      startTime: this.time,
      duration: 2.0,
      fromColor,
      toColor,
      fromSpeed: this.currentSpeedMultiplier,
      toSpeed: emotion.speedMultiplier,
      fromRadius: this.currentClusterRadius,
      toRadius: emotion.clusterRadius,
      fromSaturation: this.currentSaturation,
      toSaturation: this.computeSaturation(this.intensity),
      fromSize: this.currentParticleSize,
      toSize: this.computeParticleSize(this.intensity),
      fromRotationSpeed: this.currentRotationSpeed,
      toRotationSpeed: this.computeRotationSpeed(this.intensity)
    };

    this.targetSpeedMultiplier = emotion.speedMultiplier;
    this.targetClusterRadius = emotion.clusterRadius;
    this.targetSaturation = this.computeSaturation(this.intensity);
    this.targetParticleSize = this.computeParticleSize(this.intensity);
    this.targetRotationSpeed = this.computeRotationSpeed(this.intensity);

    this.currentEmotion = { ...emotion };
    this.particleMaterial.uniforms.uHueShift.value = Math.abs(emotion.hueShift) / 360;
  }

  public setIntensity(value: number): void {
    const newSaturation = this.computeSaturation(value);
    const newSize = this.computeParticleSize(value);
    const newRotationSpeed = this.computeRotationSpeed(value);

    this.paramTransition = {
      active: true,
      startTime: this.time,
      duration: 0.5,
      fromColor: new THREE.Color(),
      toColor: new THREE.Color(),
      fromSpeed: this.currentSpeedMultiplier,
      toSpeed: this.targetSpeedMultiplier,
      fromRadius: this.currentClusterRadius,
      toRadius: this.targetClusterRadius,
      fromSaturation: this.currentSaturation,
      toSaturation: newSaturation,
      fromSize: this.currentParticleSize,
      toSize: newSize,
      fromRotationSpeed: this.currentRotationSpeed,
      toRotationSpeed: newRotationSpeed
    };

    this.targetSaturation = newSaturation;
    this.targetParticleSize = newSize;
    this.targetRotationSpeed = newRotationSpeed;
    this.intensity = value;
  }

  public setPlaying(playing: boolean): void {
    this.isPlaying = playing;
  }

  public getPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentEmotion(): EmotionData {
    return this.currentEmotion;
  }

  private computeSaturation(intensity: number): number {
    return 0.3 + (intensity / 100) * 0.7;
  }

  private computeParticleSize(intensity: number): number {
    return 0.02 + (intensity / 100) * 0.1;
  }

  private computeRotationSpeed(intensity: number): number {
    const maxSpeed = (2 * Math.PI) / 15;
    const minSpeed = (2 * Math.PI) / 120;
    return minSpeed + (intensity / 100) * (maxSpeed - minSpeed);
  }

  private hexToColor(hex: string): THREE.Color {
    return new THREE.Color(hex);
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private lerpHSL(from: THREE.Color, to: THREE.Color, t: number): THREE.Color {
    const fromHSL = { h: 0, s: 0, l: 0 };
    const toHSL = { h: 0, s: 0, l: 0 };
    from.getHSL(fromHSL);
    to.getHSL(toHSL);

    let dh = toHSL.h - fromHSL.h;
    if (dh > 0.5) dh -= 1;
    if (dh < -0.5) dh += 1;

    const h = fromHSL.h + dh * t;
    const s = fromHSL.s + (toHSL.s - fromHSL.s) * t;
    const l = fromHSL.l + (toHSL.l - fromHSL.l) * t;

    const result = new THREE.Color();
    result.setHSL(((h % 1) + 1) % 1, s, l);
    return result;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    this.particleMaterial.uniforms.uTime.value = this.time;
    (this.stars.material as THREE.ShaderMaterial).uniforms.uTime.value = this.time;

    if (this.colorTransition && this.colorTransition.active) {
      const t = Math.min((this.time - this.colorTransition.startTime) / this.colorTransition.duration, 1);
      const eased = this.easeOut(t);

      const interpolatedColor = this.lerpHSL(this.colorTransition.fromColor, this.colorTransition.toColor, eased);
      this.updateColorUniforms(interpolatedColor);

      this.currentSpeedMultiplier = this.colorTransition.fromSpeed + (this.colorTransition.toSpeed - this.colorTransition.fromSpeed) * eased;
      this.currentClusterRadius = this.colorTransition.fromRadius + (this.colorTransition.toRadius - this.colorTransition.fromRadius) * eased;

      if (t >= 1) {
        this.colorTransition.active = false;
      }
    }

    if (this.paramTransition && this.paramTransition.active) {
      const t = Math.min((this.time - this.paramTransition.startTime) / this.paramTransition.duration, 1);
      const eased = this.easeOut(t);

      this.currentSaturation = this.paramTransition.fromSaturation + (this.paramTransition.toSaturation - this.paramTransition.fromSaturation) * eased;
      this.currentParticleSize = this.paramTransition.fromSize + (this.paramTransition.toSize - this.paramTransition.fromSize) * eased;
      this.currentRotationSpeed = this.paramTransition.fromRotationSpeed + (this.paramTransition.toRotationSpeed - this.paramTransition.fromRotationSpeed) * eased;

      if (t >= 1) {
        this.paramTransition.active = false;
      }
    }

    this.particleMaterial.uniforms.uSaturation.value = this.currentSaturation;
    this.particleMaterial.uniforms.uSize.value = this.currentParticleSize;

    if (this.isPlaying) {
      this.rotationAngle += this.currentRotationSpeed * deltaTime;
      this.container.rotation.y = this.rotationAngle;

      const positions = this.particleGeometry.attributes.position.array as Float32Array;
      const speedMul = this.currentSpeedMultiplier;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const state = this.particleStates[i];
        const basePos = state.basePosition;
        const vel = state.velocity;

        const oscillation = Math.sin(this.time * 1.5 + state.phase * Math.PI * 2) * 0.3;
        const targetRadiusFactor = this.currentClusterRadius / 5.0;

        positions[i * 3] = basePos.x * targetRadiusFactor + vel.x * oscillation * speedMul;
        positions[i * 3 + 1] = basePos.y * targetRadiusFactor + vel.y * oscillation * speedMul;
        positions[i * 3 + 2] = basePos.z * targetRadiusFactor + vel.z * oscillation * speedMul;
      }

      this.particleGeometry.attributes.position.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    (this.stars.geometry as THREE.BufferGeometry).dispose();
    (this.stars.material as THREE.ShaderMaterial).dispose();
    this.scene.remove(this.container);
    this.scene.remove(this.stars);
  }
}
