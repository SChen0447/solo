import * as THREE from 'three';

export type PresetName = 'dawn' | 'noon' | 'dusk' | 'night';

export const PRESET_NAMES: Record<PresetName, string> = {
  dawn: '清晨',
  noon: '正午',
  dusk: '黄昏',
  night: '夜晚'
};

interface LightingPreset {
  ambientColor: number;
  ambientIntensity: number;
  directionalColor: number;
  directionalIntensity: number;
  skyTopColor: number;
  skyBottomColor: number;
  buildingEmissive: number;
  hasStars: boolean;
}

const PRESETS: Record<PresetName, LightingPreset> = {
  dawn: {
    ambientColor: 0xFFE4B5,
    ambientIntensity: 0.6,
    directionalColor: 0xFFD700,
    directionalIntensity: 1.2,
    skyTopColor: 0x87CEEB,
    skyBottomColor: 0xFFE4B5,
    buildingEmissive: 0.15,
    hasStars: false
  },
  noon: {
    ambientColor: 0xFFFFFF,
    ambientIntensity: 0.9,
    directionalColor: 0xFFFFFF,
    directionalIntensity: 1.8,
    skyTopColor: 0x1E90FF,
    skyBottomColor: 0x87CEEB,
    buildingEmissive: 0.05,
    hasStars: false
  },
  dusk: {
    ambientColor: 0xFF7F50,
    ambientIntensity: 0.5,
    directionalColor: 0xFF6347,
    directionalIntensity: 0.9,
    skyTopColor: 0x2E0854,
    skyBottomColor: 0xFF4500,
    buildingEmissive: 0.35,
    hasStars: false
  },
  night: {
    ambientColor: 0x191970,
    ambientIntensity: 0.25,
    directionalColor: 0x000022,
    directionalIntensity: 0.4,
    skyTopColor: 0x0B0B1A,
    skyBottomColor: 0x1A1A2E,
    buildingEmissive: 0.7,
    hasStars: true
  }
};

const TRANSITION_DURATION = 3000;

interface TweenState {
  startPreset: LightingPreset;
  targetPreset: LightingPreset;
  startTime: number;
}

export class LightingController {
  private scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private skyMesh: THREE.Mesh;
  private skyTopColor: THREE.Color;
  private skyBottomColor: THREE.Color;
  private stars: THREE.Points | null = null;
  private currentPreset: PresetName;
  private currentPresetData: LightingPreset;
  private tweenState: TweenState | null = null;
  private onEmissiveChange: ((intensity: number) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.ambientLight = new THREE.AmbientLight(PRESETS.night.ambientColor, PRESETS.night.ambientIntensity);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(PRESETS.night.directionalColor, PRESETS.night.directionalIntensity);
    this.directionalLight.position.set(50, 100, 50);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 500;
    this.directionalLight.shadow.camera.left = -150;
    this.directionalLight.shadow.camera.right = 150;
    this.directionalLight.shadow.camera.top = 150;
    this.directionalLight.shadow.camera.bottom = -150;
    this.scene.add(this.directionalLight);

    this.skyTopColor = new THREE.Color(PRESETS.night.skyTopColor);
    this.skyBottomColor = new THREE.Color(PRESETS.night.skyBottomColor);
    this.skyMesh = this.createSkyDome();
    this.scene.add(this.skyMesh);

    this.currentPreset = 'night';
    this.currentPresetData = { ...PRESETS.night };

    this.createStars();
  }

  private createSkyDome(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(300, 32, 15);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: this.skyTopColor.clone() },
        bottomColor: { value: this.skyBottomColor.clone() },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });

    return new THREE.Mesh(geometry, material);
  }

  private createStars(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    const starSizes: number[] = [];

    for (let i = 0; i < 2000; i++) {
      const radius = 200 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
      starSizes.push(0.5 + Math.random() * 1.5);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 1.2,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true
    });

    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);
  }

  public setEmissiveCallback(callback: (intensity: number) => void): void {
    this.onEmissiveChange = callback;
  }

  public setPreset(preset: PresetName): void {
    if (preset === this.currentPreset && !this.tweenState) return;

    this.tweenState = {
      startPreset: { ...this.currentPresetData },
      targetPreset: { ...PRESETS[preset] },
      startTime: performance.now()
    };

    this.currentPreset = preset;
  }

  public getPreset(): PresetName {
    return this.currentPreset;
  }

  public getPresetDisplayName(): string {
    return PRESET_NAMES[this.currentPreset];
  }

  private lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
    return a.clone().lerp(b, t);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public update(timestamp: number): void {
    if (!this.tweenState) return;

    const elapsed = timestamp - this.tweenState.startTime;
    const rawProgress = Math.min(elapsed / TRANSITION_DURATION, 1);
    const progress = this.easeInOut(rawProgress);

    const { startPreset, targetPreset } = this.tweenState;

    this.ambientLight.color.copy(
      this.lerpColor(new THREE.Color(startPreset.ambientColor), new THREE.Color(targetPreset.ambientColor), progress)
    );
    this.ambientLight.intensity = this.lerp(startPreset.ambientIntensity, targetPreset.ambientIntensity, progress);

    this.directionalLight.color.copy(
      this.lerpColor(new THREE.Color(startPreset.directionalColor), new THREE.Color(targetPreset.directionalColor), progress)
    );
    this.directionalLight.intensity = this.lerp(startPreset.directionalIntensity, targetPreset.directionalIntensity, progress);

    const skyMat = this.skyMesh.material as THREE.ShaderMaterial;
    skyMat.uniforms.topColor.value.copy(
      this.lerpColor(new THREE.Color(startPreset.skyTopColor), new THREE.Color(targetPreset.skyTopColor), progress)
    );
    skyMat.uniforms.bottomColor.value.copy(
      this.lerpColor(new THREE.Color(startPreset.skyBottomColor), new THREE.Color(targetPreset.skyBottomColor), progress)
    );

    const newEmissive = this.lerp(startPreset.buildingEmissive, targetPreset.buildingEmissive, progress);
    if (this.onEmissiveChange) {
      this.onEmissiveChange(newEmissive);
    }

    if (this.stars) {
      const starMat = this.stars.material as THREE.PointsMaterial;
      const startOpacity = startPreset.hasStars ? 1 : 0;
      const endOpacity = targetPreset.hasStars ? 1 : 0;
      starMat.opacity = this.lerp(startOpacity, endOpacity, progress);
    }

    if (rawProgress >= 1) {
      this.currentPresetData = { ...targetPreset };
      this.tweenState = null;
    }
  }

  public isTransitioning(): boolean {
    return this.tweenState !== null;
  }

  public adjustLight(ambientDelta: number, directionalDelta: number): void {
    this.ambientLight.intensity = Math.max(0, Math.min(3, this.ambientLight.intensity + ambientDelta));
    this.directionalLight.intensity = Math.max(0, Math.min(3, this.directionalLight.intensity + directionalDelta));
  }
}
