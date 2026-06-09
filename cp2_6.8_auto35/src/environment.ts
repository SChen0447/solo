import * as THREE from 'three';

export type DayNightMode = 'day' | 'night';

interface EnvState {
  bgColor: THREE.Color;
  ambientIntensity: number;
  directionalIntensity: number;
  groundColor: THREE.Color;
  starOpacity: number;
  fogDensity: number;
  fogColor: THREE.Color;
}

export class Environment {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;

  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private hemisphereLight: THREE.HemisphereLight;
  private ground: THREE.Mesh;

  private stars: THREE.Points;
  private starCount: number = 800;

  private dayState: EnvState;
  private nightState: EnvState;
  private currentState: EnvState;
  private targetMode: DayNightMode = 'night';
  private currentMode: DayNightMode = 'night';
  private transitionProgress: number = 1;
  private transitionDuration: number = 0.5;

  private tempColor: THREE.Color = new THREE.Color();

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.dayState = {
      bgColor: new THREE.Color(0x87ceeb),
      ambientIntensity: 0.6,
      directionalIntensity: 1.0,
      groundColor: new THREE.Color(0xcccccc),
      starOpacity: 0,
      fogDensity: 0.015,
      fogColor: new THREE.Color(0xaaddff)
    };

    this.nightState = {
      bgColor: new THREE.Color(0x0a0a1a),
      ambientIntensity: 0.15,
      directionalIntensity: 0.3,
      groundColor: new THREE.Color(0x222233),
      starOpacity: 1,
      fogDensity: 0.02,
      fogColor: new THREE.Color(0x0a0a1a)
    };

    this.currentState = { ...this.nightState };

    this.ambientLight = new THREE.AmbientLight(0xffffff, this.nightState.ambientIntensity);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, this.nightState.directionalIntensity);
    this.directionalLight.position.set(10, 20, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 100;
    this.directionalLight.shadow.camera.left = -30;
    this.directionalLight.shadow.camera.right = 30;
    this.directionalLight.shadow.camera.top = 30;
    this.directionalLight.shadow.camera.bottom = -30;
    this.directionalLight.shadow.bias = -0.0001;
    this.scene.add(this.directionalLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x8888ff, 0x444466, 0.3);
    this.scene.add(this.hemisphereLight);

    const groundGeometry = new THREE.PlaneGeometry(200, 200, 1, 1);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: this.nightState.groundColor,
      roughness: 0.9,
      metalness: 0.1
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.stars = this.createStars();
    this.scene.add(this.stars);

    this.scene.fog = new THREE.FogExp2(this.nightState.fogColor, this.nightState.fogDensity);

    this.applyState(this.nightState);
  }

  private createStars(): THREE.Points {
    const positions = new Float32Array(this.starCount * 3);
    const colors = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);

    for (let i = 0; i < this.starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5 + 0.1;
      const radius = 80 + Math.random() * 40;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) + 20;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const brightness = 0.7 + Math.random() * 0.3;
      const colorTint = Math.random();
      if (colorTint < 0.7) {
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness;
        colors[i * 3 + 2] = brightness;
      } else if (colorTint < 0.85) {
        colors[i * 3] = brightness * 0.8;
        colors[i * 3 + 1] = brightness * 0.9;
        colors[i * 3 + 2] = brightness;
      } else {
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness * 0.9;
        colors[i * 3 + 2] = brightness * 0.8;
      }

      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: this.nightState.starOpacity,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    return new THREE.Points(geometry, material);
  }

  public update(deltaTime: number): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress += deltaTime / this.transitionDuration;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.currentMode = this.targetMode;
      }

      const t = this.easeInOutCubic(this.transitionProgress);
      const fromState = this.currentMode === 'day' ? this.dayState : this.nightState;
      const toState = this.targetMode === 'day' ? this.dayState : this.nightState;

      this.currentState.bgColor = fromState.bgColor.clone().lerp(toState.bgColor, t);
      this.currentState.ambientIntensity = THREE.MathUtils.lerp(fromState.ambientIntensity, toState.ambientIntensity, t);
      this.currentState.directionalIntensity = THREE.MathUtils.lerp(fromState.directionalIntensity, toState.directionalIntensity, t);
      this.currentState.groundColor = fromState.groundColor.clone().lerp(toState.groundColor, t);
      this.currentState.starOpacity = THREE.MathUtils.lerp(fromState.starOpacity, toState.starOpacity, t);
      this.currentState.fogDensity = THREE.MathUtils.lerp(fromState.fogDensity, toState.fogDensity, t);
      this.currentState.fogColor = fromState.fogColor.clone().lerp(toState.fogColor, t);

      this.applyState(this.currentState);
    }

    const starPositions = this.stars.geometry.attributes.position as THREE.BufferAttribute;
    const time = Date.now() * 0.0001;
    for (let i = 0; i < this.starCount; i += 3) {
      const idx = i * 3;
      const x = starPositions.array[idx] as number;
      const z = starPositions.array[idx + 2] as number;
      const newX = x * Math.cos(time * 0.1) - z * Math.sin(time * 0.1);
      const newZ = x * Math.sin(time * 0.1) + z * Math.cos(time * 0.1);
      starPositions.array[idx] = newX;
      starPositions.array[idx + 2] = newZ;
    }
    starPositions.needsUpdate = true;
  }

  private applyState(state: EnvState): void {
    this.renderer.setClearColor(state.bgColor);
    this.ambientLight.intensity = state.ambientIntensity;
    this.directionalLight.intensity = state.directionalIntensity;
    (this.ground.material as THREE.MeshStandardMaterial).color.copy(state.groundColor);
    (this.stars.material as THREE.PointsMaterial).opacity = state.starOpacity;

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = state.fogDensity;
      this.scene.fog.color.copy(state.fogColor);
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public setMode(mode: DayNightMode): void {
    if (this.targetMode === mode) return;
    this.targetMode = mode;
    this.transitionProgress = 0;
  }

  public toggleMode(): DayNightMode {
    const newMode = this.currentMode === 'day' ? 'night' : 'day';
    this.setMode(newMode);
    return newMode;
  }

  public getMode(): DayNightMode {
    return this.targetMode;
  }

  public isNight(): boolean {
    const nightThreshold = 0.5;
    if (this.currentMode === 'night' && this.transitionProgress >= 1) return true;
    if (this.currentMode === 'day' && this.transitionProgress >= 1) return false;

    const toNight = this.targetMode === 'night';
    const progress = this.easeInOutCubic(this.transitionProgress);
    return toNight ? progress > nightThreshold : (1 - progress) > nightThreshold;
  }

  public dispose(): void {
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.directionalLight);
    this.scene.remove(this.hemisphereLight);
    this.scene.remove(this.ground);
    this.scene.remove(this.stars);

    this.ambientLight.dispose();
    this.directionalLight.dispose();
    this.hemisphereLight.dispose();
    (this.ground.material as THREE.Material).dispose();
    this.ground.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.stars.geometry.dispose();
  }
}
