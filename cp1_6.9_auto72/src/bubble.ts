import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

const noise3D = createNoise3D();

export enum BubbleState {
  GROWING = 'growing',
  FLOATING = 'floating',
  MERGING = 'merging',
  POPPING = 'popping',
  DEAD = 'dead'
}

export interface BubbleConfig {
  position: THREE.Vector3;
  targetRadius: number;
  color: THREE.Color;
  growDuration?: number;
}

export class Bubble {
  public mesh: THREE.Mesh;
  public position: THREE.Vector3;
  public targetRadius: number;
  public currentRadius: number;
  public color: THREE.Color;
  public targetColor: THREE.Color;
  public state: BubbleState;
  public age: number;
  public lifeTime: number;
  public velocity: THREE.Vector3;
  public wobbleOffset: number;
  public wobbleSpeed: number;
  public wobbleAmplitude: number;
  public riseSpeed: number;
  public stateTimer: number;
  public growDuration: number;
  public mergePartner: Bubble | null;
  public mergeProgress: number;
  public material: THREE.ShaderMaterial;
  public speedMultiplier: number;
  public colorTransitionProgress: number;

  private static vertexShader = `
    uniform float uTime;
    uniform float uRadius;
    uniform float uRefractionAmount;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying float vNoise;

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      float noise = sin(pos.x * 10.0 + uTime) * cos(pos.y * 10.0 + uTime * 0.7) * 0.02;
      noise += sin(uTime + pos.x * 5.0) * cos(uTime * 0.8 + pos.z * 5.0) * 0.015;
      vNoise = noise;
      
      pos += normal * noise;
      pos += normal * uRefractionAmount;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vViewPosition = -mvPosition.xyz;
      vNormal = normalize(normalMatrix * normal);
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  private static fragmentShader = `
    uniform vec3 uColorStart;
    uniform vec3 uColorEnd;
    uniform float uTime;
    uniform float uColorOffset;
    uniform float uOpacity;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying float vNoise;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      
      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
      
      float colorMix = (vUv.y + sin(uTime * 0.5 + vUv.x * 6.28) * 0.3 + uColorOffset);
      colorMix = fract(colorMix);
      vec3 baseColor = mix(uColorStart, uColorEnd, colorMix);
      
      vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
      float specular = pow(max(dot(reflect(-lightDir, normal), viewDir), 0.0), 64.0);
      
      vec3 highlight = vec3(1.0, 0.95, 1.0) * specular * 0.8;
      vec3 rimLight = vec3(0.8, 0.6, 1.0) * fresnel * 0.6;
      
      vec3 finalColor = baseColor + highlight + rimLight;
      float finalAlpha = (0.35 + fresnel * 0.4 + specular * 0.2) * uOpacity;
      
      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `;

  constructor(config: BubbleConfig) {
    this.position = config.position.clone();
    this.targetRadius = config.targetRadius;
    this.currentRadius = 0.01;
    this.color = config.color.clone();
    this.targetColor = config.color.clone();
    this.state = BubbleState.GROWING;
    this.age = 0;
    this.lifeTime = 30 + Math.random() * 30;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.wobbleOffset = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 1 + Math.random();
    this.wobbleAmplitude = 0.15 + Math.random() * 0.1;
    this.riseSpeed = 0.2 + Math.random() * 0.3;
    this.stateTimer = 0;
    this.growDuration = config.growDuration || 0.5;
    this.mergePartner = null;
    this.mergeProgress = 0;
    this.speedMultiplier = 1;
    this.colorTransitionProgress = 1;

    this.material = new THREE.ShaderMaterial({
      vertexShader: Bubble.vertexShader,
      fragmentShader: Bubble.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: this.currentRadius },
        uColorStart: { value: new THREE.Color() },
        uColorEnd: { value: new THREE.Color() },
        uColorOffset: { value: Math.random() },
        uOpacity: { value: 1 },
        uRefractionAmount: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.updateColors();

    const geometry = new THREE.SphereGeometry(1, 48, 48);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(this.position);
    this.mesh.scale.setScalar(this.currentRadius);
    this.mesh.userData.bubble = this;
  }

  private updateColors(): void {
    const hsl = { h: 0, s: 0, l: 0 };
    this.color.getHSL(hsl);
    
    const startHSL = { h: (hsl.h + 0.05) % 1, s: Math.min(hsl.s + 0.1, 1), l: Math.min(hsl.l + 0.1, 1) };
    const endHSL = { h: (hsl.h + 0.55) % 1, s: Math.min(hsl.s + 0.15, 1), l: Math.max(hsl.l - 0.1, 0.3) };
    
    this.material.uniforms.uColorStart.value.setHSL(startHSL.h, startHSL.s, startHSL.l);
    this.material.uniforms.uColorEnd.value.setHSL(endHSL.h, endHSL.s, endHSL.l);
  }

  public setTargetColor(color: THREE.Color, transition: boolean = true): void {
    this.targetColor = color.clone();
    if (!transition) {
      this.color.copy(color);
      this.colorTransitionProgress = 1;
      this.updateColors();
    } else {
      this.colorTransitionProgress = 0;
    }
  }

  public startMerge(partner: Bubble): void {
    this.state = BubbleState.MERGING;
    this.mergePartner = partner;
    this.mergeProgress = 0;
    this.stateTimer = 0;
  }

  public startPop(): void {
    if (this.state === BubbleState.POPPING || this.state === BubbleState.DEAD) return;
    this.state = BubbleState.POPPING;
    this.stateTimer = 0;
  }

  public update(delta: number, time: number, waveRefraction: number = 0): void {
    this.age += delta;
    this.stateTimer += delta;

    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress = Math.min(1, this.colorTransitionProgress + delta * 2);
      this.color.lerp(this.targetColor, delta * 2);
      this.updateColors();
    }

    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uRefractionAmount.value = waveRefraction;

    switch (this.state) {
      case BubbleState.GROWING:
        this.updateGrowing(delta);
        break;
      case BubbleState.FLOATING:
        this.updateFloating(delta, time);
        break;
      case BubbleState.MERGING:
        this.updateMerging(delta);
        break;
      case BubbleState.POPPING:
        this.updatePopping(delta);
        break;
    }

    this.mesh.position.copy(this.position);
    this.mesh.scale.setScalar(this.currentRadius);
    this.material.uniforms.uRadius.value = this.currentRadius;
  }

  private updateGrowing(delta: number): void {
    const progress = Math.min(1, this.stateTimer / this.growDuration);
    const eased = 1 - Math.pow(1 - progress, 3);
    this.currentRadius = eased * this.targetRadius;
    
    if (progress >= 1) {
      this.state = BubbleState.FLOATING;
      this.currentRadius = this.targetRadius;
    }
  }

  private updateFloating(delta: number, time: number): void {
    this.position.y += this.riseSpeed * this.speedMultiplier * delta;
    
    const wobble = Math.sin(time * this.wobbleSpeed + this.wobbleOffset) * this.wobbleAmplitude;
    this.position.x += wobble * delta * 0.5;
    
    const maxRadius = 4.5;
    const distFromCenter = Math.sqrt(this.position.x ** 2 + this.position.z ** 2);
    if (distFromCenter > maxRadius - this.currentRadius) {
      const angle = Math.atan2(this.position.z, this.position.x);
      const newDist = maxRadius - this.currentRadius;
      this.position.x = Math.cos(angle) * newDist;
      this.position.z = Math.sin(angle) * newDist;
    }

    if (this.position.y + this.currentRadius > 4) {
      this.startPop();
    }

    if (this.currentRadius > 1.5) {
      this.startPop();
    }
  }

  private updateMerging(delta: number): void {
    if (!this.mergePartner) {
      this.state = BubbleState.FLOATING;
      return;
    }

    const mergeDuration = 0.3;
    this.mergeProgress = Math.min(1, this.stateTimer / mergeDuration);
    
    const partnerPos = this.mergePartner.position;
    this.position.lerp(partnerPos, delta * 8);
    
    const scaleDown = 1 - this.mergeProgress * 0.3;
    this.currentRadius = this.targetRadius * scaleDown;

    if (this.mergeProgress >= 1) {
      this.state = BubbleState.DEAD;
    }
  }

  private updatePopping(delta: number): void {
    const popDuration = 0.2;
    const progress = Math.min(1, this.stateTimer / popDuration);
    
    this.material.uniforms.uOpacity.value = 1 - progress;
    
    const popScale = 1 + progress * 0.3;
    this.mesh.scale.setScalar(this.currentRadius * popScale);

    if (progress >= 1) {
      this.state = BubbleState.DEAD;
    }
  }

  public isDead(): boolean {
    return this.state === BubbleState.DEAD;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
