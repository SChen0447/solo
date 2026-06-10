import * as THREE from 'three';

export interface WaveParams {
  frequency: number;
  amplitude: number;
  wavelength: number;
}

export interface ColorTheme {
  name: string;
  waveColors: THREE.Color[];
  particleColors: THREE.Color[][];
  starBrightness: number;
  starTwinkleSpeed: number;
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    name: '星云极光',
    waveColors: [
      new THREE.Color('#88ccff'),
      new THREE.Color('#aa88ff'),
      new THREE.Color('#ff88cc')
    ],
    particleColors: [
      [new THREE.Color('#ff6633'), new THREE.Color('#ffcc33')],
      [new THREE.Color('#33ccff'), new THREE.Color('#33ffcc')],
      [new THREE.Color('#9933ff'), new THREE.Color('#ff33cc')]
    ],
    starBrightness: 0.8,
    starTwinkleSpeed: 1.0
  },
  {
    name: '熔岩深海',
    waveColors: [
      new THREE.Color('#ff4422'),
      new THREE.Color('#ff8844'),
      new THREE.Color('#ffcc66')
    ],
    particleColors: [
      [new THREE.Color('#ff2200'), new THREE.Color('#ff6600')],
      [new THREE.Color('#ff6600'), new THREE.Color('#ffaa00')],
      [new THREE.Color('#0044aa'), new THREE.Color('#0088ff')]
    ],
    starBrightness: 0.6,
    starTwinkleSpeed: 0.5
  },
  {
    name: '数据矩阵',
    waveColors: [
      new THREE.Color('#00ff88'),
      new THREE.Color('#00cc66'),
      new THREE.Color('#00aa44')
    ],
    particleColors: [
      [new THREE.Color('#00ff88'), new THREE.Color('#88ffcc')],
      [new THREE.Color('#00aaff'), new THREE.Color('#66ccff')],
      [new THREE.Color('#ff00aa'), new THREE.Color('#ff66cc')]
    ],
    starBrightness: 1.0,
    starTwinkleSpeed: 1.5
  }
];

const vertexShader = `
  uniform float uTime;
  uniform float uFrequency;
  uniform float uAmplitude;
  uniform float uWavelength;
  uniform float uLayerOffset;
  uniform vec3 uColorStart;
  uniform vec3 uColorEnd;
  uniform float uColorMix;

  varying float vElevation;
  varying vec3 vColor;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    float wave1 = sin(pos.x * uFrequency * 0.5 + uTime * 1.5 + uLayerOffset) * 0.5;
    float wave2 = cos(pos.y * uFrequency * 0.5 + uTime * 1.2 + uLayerOffset * 0.7) * 0.3;
    float wave3 = sin((pos.x + pos.y) * uFrequency * 0.3 + uTime + uLayerOffset * 0.5) * 0.2;
    float wave4 = cos((pos.x - pos.y) * uFrequency * 0.4 + uTime * 0.8 + uLayerOffset * 0.3) * 0.2;
    
    float elevation = (wave1 + wave2 + wave3 + wave4) * uAmplitude;
    pos.z += elevation;
    vElevation = elevation;
    
    float colorT = smoothstep(-uAmplitude, uAmplitude, elevation);
    colorT = mix(colorT, uColorMix, 0.3);
    vColor = mix(uColorStart, uColorEnd, colorT);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying float vElevation;
  varying vec3 vColor;
  varying vec2 vUv;
  
  uniform float uOpacity;
  uniform float uAmplitude;

  void main() {
    float alpha = uOpacity;
    float glow = smoothstep(0.0, uAmplitude, vElevation) * 0.5 + 0.5;
    vec3 finalColor = vColor * glow;
    
    float edgeX = smoothstep(0.0, 0.02, vUv.x) * (1.0 - smoothstep(0.98, 1.0, vUv.x));
    float edgeY = smoothstep(0.0, 0.02, vUv.y) * (1.0 - smoothstep(0.98, 1.0, vUv.y));
    alpha *= edgeX * edgeY;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

interface WaveLayer {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  layerOffset: number;
  layerIndex: number;
  geometry: THREE.PlaneGeometry;
}

export class WaveManager {
  private scene: THREE.Scene;
  private layers: WaveLayer[] = [];
  private currentParams: WaveParams = { frequency: 2.0, amplitude: 1.0, wavelength: 2.5 };
  private targetParams: WaveParams = { frequency: 2.0, amplitude: 1.0, wavelength: 2.5 };
  private readonly transitionSpeed = 2.0;
  private readonly layerCount = 3;
  private readonly gridSize = 12;
  private readonly segments = 64;
  private readonly layerSpacing = 2;
  
  private currentThemeIndex = 0;
  private targetThemeIndex = 0;
  private themeTransitionProgress = 1.0;
  private readonly themeTransitionDuration = 1.5;
  
  private shockwaves: { mesh: THREE.Mesh; startTime: number; duration: number; center: THREE.Vector3; velocity: THREE.Vector3 }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createWaves();
  }

  private createWaves() {
    for (let i = 0; i < this.layerCount; i++) {
      const geometry = new THREE.PlaneGeometry(
        this.gridSize,
        this.gridSize,
        this.segments,
        this.segments
      );

      const theme = COLOR_THEMES[this.currentThemeIndex];
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uFrequency: { value: this.currentParams.frequency },
          uAmplitude: { value: this.currentParams.amplitude },
          uWavelength: { value: this.currentParams.wavelength },
          uLayerOffset: { value: i * Math.PI * 0.5 },
          uColorStart: { value: theme.waveColors[i] },
          uColorEnd: { value: theme.waveColors[(i + 1) % this.layerCount] },
          uColorMix: { value: i / (this.layerCount - 1) },
          uOpacity: { value: 0.4 }
        },
        transparent: true,
        side: THREE.DoubleSide,
        wireframe: false
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = i * this.layerSpacing - this.layerSpacing;

      this.scene.add(mesh);
      this.layers.push({
        mesh,
        material,
        layerOffset: i * Math.PI * 0.5,
        layerIndex: i,
        geometry
      });
    }
  }

  public setParams(params: Partial<WaveParams>) {
    if (params.frequency !== undefined) {
      this.targetParams.frequency = THREE.MathUtils.clamp(params.frequency, 0.5, 5.0);
    }
    if (params.amplitude !== undefined) {
      this.targetParams.amplitude = THREE.MathUtils.clamp(params.amplitude, 0.2, 2.0);
    }
    if (params.wavelength !== undefined) {
      this.targetParams.wavelength = THREE.MathUtils.clamp(params.wavelength, 1.0, 4.0);
    }
  }

  public getParams(): WaveParams {
    return { ...this.currentParams };
  }

  public setTheme(index: number) {
    if (index >= 0 && index < COLOR_THEMES.length && index !== this.targetThemeIndex) {
      this.targetThemeIndex = index;
      this.themeTransitionProgress = 0;
    }
  }

  public getCurrentTheme(): ColorTheme {
    return COLOR_THEMES[this.currentThemeIndex];
  }

  public getThemeIndex(): number {
    return this.currentThemeIndex;
  }

  public createShockwave(worldPosition: THREE.Vector3): void {
    const geometry = new THREE.RingGeometry(0.1, 0.2, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(worldPosition);
    mesh.position.y += 0.5;

    this.scene.add(mesh);
    this.shockwaves.push({
      mesh,
      startTime: performance.now(),
      duration: 2000,
      center: worldPosition.clone(),
      velocity: new THREE.Vector3()
    });
  }

  public getActiveShockwaves(): { center: THREE.Vector3; radius: number; strength: number }[] {
    const now = performance.now();
    const result: { center: THREE.Vector3; radius: number; strength: number }[] = [];

    for (const wave of this.shockwaves) {
      const elapsed = now - wave.startTime;
      if (elapsed < wave.duration) {
        const progress = elapsed / wave.duration;
        const radius = progress * 2.0;
        const strength = (1 - progress) * 0.3;
        result.push({
          center: wave.center.clone(),
          radius,
          strength
        });
      }
    }
    return result;
  }

  public getPeakPositions(): THREE.Vector3[] {
    const peaks: THREE.Vector3[] = [];
    const maxPeaksPerFrame = 10;

    for (const layer of this.layers) {
      const positions = layer.geometry.attributes.position;
      const layerPeaks: { pos: THREE.Vector3; height: number }[] = [];

      for (let i = 0; i < positions.count; i += 2) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);

        if (z > this.currentParams.amplitude * 0.8) {
          const worldPos = new THREE.Vector3(x, layer.mesh.position.y, -y);
          layerPeaks.push({ pos: worldPos, height: z });
        }
      }

      layerPeaks.sort((a, b) => b.height - a.height);
      const limit = Math.min(maxPeaksPerFrame, Math.ceil(layerPeaks.length / 5));
      for (let i = 0; i < limit; i++) {
        if (Math.random() < 0.3) {
          peaks.push(layerPeaks[i].pos);
        }
      }
    }

    return peaks;
  }

  public getLayerColors(): THREE.Color[][] {
    const colors: THREE.Color[][] = [];
    const currentTheme = COLOR_THEMES[this.currentThemeIndex];
    const targetTheme = COLOR_THEMES[this.targetThemeIndex];
    const t = this.themeTransitionProgress;

    for (let i = 0; i < this.layerCount; i++) {
      const layerColors: THREE.Color[] = [];
      for (let j = 0; j < 2; j++) {
        const c = currentTheme.particleColors[i][j].clone().lerp(targetTheme.particleColors[i][j], t);
        layerColors.push(c);
      }
      colors.push(layerColors);
    }
    return colors;
  }

  public update(deltaTime: number): void {
    const now = performance.now();

    this.currentParams.frequency = THREE.MathUtils.lerp(
      this.currentParams.frequency,
      this.targetParams.frequency,
      deltaTime * this.transitionSpeed
    );
    this.currentParams.amplitude = THREE.MathUtils.lerp(
      this.currentParams.amplitude,
      this.targetParams.amplitude,
      deltaTime * this.transitionSpeed
    );
    this.currentParams.wavelength = THREE.MathUtils.lerp(
      this.currentParams.wavelength,
      this.targetParams.wavelength,
      deltaTime * this.transitionSpeed
    );

    if (this.themeTransitionProgress < 1.0) {
      this.themeTransitionProgress = Math.min(
        1.0,
        this.themeTransitionProgress + deltaTime / this.themeTransitionDuration
      );
      if (this.themeTransitionProgress >= 1.0) {
        this.currentThemeIndex = this.targetThemeIndex;
      }
    }

    const currentTheme = COLOR_THEMES[this.currentThemeIndex];
    const targetTheme = COLOR_THEMES[this.targetThemeIndex];
    const themeT = this.themeTransitionProgress;

    for (const layer of this.layers) {
      layer.material.uniforms.uTime.value = now * 0.001;
      layer.material.uniforms.uFrequency.value = this.currentParams.frequency;
      layer.material.uniforms.uAmplitude.value = this.currentParams.amplitude;
      layer.material.uniforms.uWavelength.value = this.currentParams.wavelength;

      const startColor = currentTheme.waveColors[layer.layerIndex].clone()
        .lerp(targetTheme.waveColors[layer.layerIndex], themeT);
      const endColor = currentTheme.waveColors[(layer.layerIndex + 1) % this.layerCount].clone()
        .lerp(targetTheme.waveColors[(layer.layerIndex + 1) % this.layerCount], themeT);

      layer.material.uniforms.uColorStart.value = startColor;
      layer.material.uniforms.uColorEnd.value = endColor;
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const wave = this.shockwaves[i];
      const elapsed = now - wave.startTime;

      if (elapsed >= wave.duration) {
        this.scene.remove(wave.mesh);
        (wave.mesh.geometry as THREE.BufferGeometry).dispose();
        (wave.mesh.material as THREE.Material).dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }

      const progress = elapsed / wave.duration;
      const innerRadius = progress * 2.0;
      const outerRadius = innerRadius + 0.1;

      wave.mesh.geometry.dispose();
      wave.mesh.geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
      (wave.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - progress);
    }
  }

  public resize(width: number, height: number): void {
    for (const layer of this.layers) {
      layer.material.needsUpdate = true;
    }
  }

  public getLayers(): WaveLayer[] {
    return this.layers;
  }

  public getCurrentAmplitude(): number {
    return this.currentParams.amplitude;
  }

  public dispose(): void {
    for (const layer of this.layers) {
      this.scene.remove(layer.mesh);
      layer.geometry.dispose();
      layer.material.dispose();
    }
    for (const wave of this.shockwaves) {
      this.scene.remove(wave.mesh);
      wave.mesh.geometry.dispose();
      (wave.mesh.material as THREE.Material).dispose();
    }
    this.layers = [];
    this.shockwaves = [];
  }
}
