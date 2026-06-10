import * as THREE from 'three';

const vertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uWaveSpeed;

  varying float vHeight;
  varying vec3 vNormal;

  void main() {
    vHeight = (position.y + 4.0) / 8.0;

    vec3 pos = position;

    float wave1 = sin(pos.x * 0.4 + uTime * uWaveSpeed) * uAmplitude;
    float wave2 = sin(pos.x * 0.8 + uTime * uWaveSpeed * 1.5 + 1.0) * uAmplitude * 0.5;
    float jitter = sin(pos.x * 3.0 + uTime * 4.0) * 0.15 + cos(pos.y * 2.0 + uTime * 3.0) * 0.1;

    pos.z += wave1 + wave2 + jitter;

    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uHue;
  uniform float uHueOffset;

  varying float vHeight;
  varying vec3 vNormal;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    float hueBottom = uHue;
    float hueTop = uHue + 80.0 + uHueOffset;
    float hue = mix(hueBottom, hueTop, vHeight);
    hue = mod(hue, 360.0) / 360.0;

    float sat = mix(0.9, 0.7, vHeight);
    float val = mix(0.8, 1.0, vHeight);
    vec3 color = hsv2rgb(vec3(hue, sat, val));

    float pulse = sin(uTime * 1.5) * 0.15 + 0.85;
    float alpha = uOpacity * pulse * (0.4 + vHeight * 0.6);

    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
    alpha += fresnel * 0.1;

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

export interface AuroraControls {
  intensity: number;
  hue: number;
}

export class AuroraController {
  private group: THREE.Group;
  private layers: THREE.Mesh[] = [];
  private materials: THREE.ShaderMaterial[] = [];
  private startTime: number;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.startTime = performance.now() * 0.001;
    this.createAuroraLayers();
    scene.add(this.group);
  }

  private createAuroraLayers(): void {
    const width = 20;
    const height = 8;
    const widthSegments = 64;
    const heightSegments = 16;
    const layerSpacing = 1.5;

    for (let i = 0; i < 3; i++) {
      const geometry = new THREE.PlaneGeometry(
        width,
        height,
        widthSegments,
        heightSegments
      );

      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uAmplitude: { value: 1.5 },
          uWaveSpeed: { value: (2 * Math.PI) / 8 },
          uOpacity: { value: 0.45 },
          uHue: { value: 120 },
          uHueOffset: { value: i * 15 }
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = (i - 1) * layerSpacing;
      mesh.position.y = 1;
      mesh.rotation.x = -0.15;

      this.layers.push(mesh);
      this.materials.push(material);
      this.group.add(mesh);
    }
  }

  public update(time: number, controls: AuroraControls): void {
    const elapsed = time - this.startTime;
    const opacity = THREE.MathUtils.mapLinear(controls.intensity, 1, 10, 0.1, 1.0);
    const amplitude = THREE.MathUtils.mapLinear(controls.intensity, 1, 10, 0.5, 3.0);

    for (let i = 0; i < this.materials.length; i++) {
      const mat = this.materials[i];
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uOpacity.value = opacity * (0.7 + i * 0.15);
      mat.uniforms.uAmplitude.value = amplitude * (0.8 + i * 0.1);
      mat.uniforms.uHue.value = controls.hue;
    }
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public dispose(): void {
    this.layers.forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.ShaderMaterial).dispose();
    });
  }
}
