import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uBaseColor;
  uniform vec3 uTargetColor;
  uniform float uColorTransition;
  uniform float uErythemaIntensity;
  uniform float uPigmentationLevel;
  uniform float uTime;
  uniform float uPeelingLevel;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                           + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                            dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec3 skinColor = mix(uBaseColor, uTargetColor, uColorTransition);

    float noise1 = snoise(vUv * 8.0 + uTime * 0.05);
    float noise2 = snoise(vUv * 16.0 + vec2(uTime * 0.03, -uTime * 0.02));
    float noise3 = snoise(vUv * 32.0);
    float combinedNoise = (noise1 + noise2 * 0.5 + noise3 * 0.25) / 1.75;
    float erythemaNoise = (combinedNoise + 1.0) * 0.5;

    float erythemaThreshold = 1.0 - uErythemaIntensity * 0.8;
    float erythemaMask = smoothstep(erythemaThreshold, erythemaThreshold + 0.15, erythemaNoise);
    erythemaMask *= uErythemaIntensity;

    vec3 erythemaColor = vec3(0.85, 0.15, 0.15);
    skinColor = mix(skinColor, erythemaColor, erythemaMask * 0.7);

    float pigmentDarken = uPigmentationLevel * 0.15;
    skinColor *= (1.0 - pigmentDarken);

    vec3 emissiveTint = vec3(0.3, 0.15, 0.05) * uPigmentationLevel * 0.15;

    if (uPeelingLevel > 0.0) {
      float peelNoise = snoise(vUv * 40.0 + vec2(uTime * 0.1, uTime * 0.05));
      float peelPattern = fract(peelNoise * 5.0 + uTime * 0.3);
      float peelMask = smoothstep(0.85 - uPeelingLevel * 0.3, 0.95, peelPattern) * uPeelingLevel;
      vec3 peelColor = vec3(0.95, 0.9, 0.85);
      skinColor = mix(skinColor, peelColor, peelMask * 0.6);
    }

    float particleNoise = snoise(vUv * 50.0 + vec2(uTime * 2.0));
    float particleMask = smoothstep(0.92, 0.98, particleNoise) * erythemaMask * 0.8;
    float particleFlicker = 0.5 + 0.5 * sin(uTime * 15.0 + particleNoise * 50.0);
    vec3 particleColor = vec3(1.0, 0.2, 0.2);
    skinColor += particleColor * particleMask * particleFlicker * 0.5;

    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
    float sheen = fresnel * (0.1 + uPigmentationLevel * 0.15);
    skinColor += vec3(0.8, 0.75, 0.7) * sheen;

    vec3 finalColor = skinColor + emissiveTint;
    finalColor = clamp(finalColor, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class FaceModel {
  public mesh: THREE.Mesh;
  public group: THREE.Group;
  private material: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry;
  private currentColor: THREE.Color;
  private targetColor: THREE.Color;
  private colorTransitionStart: number = 0;
  private colorTransitionDuration: number = 500;
  private isTransitioning: boolean = false;
  private rotationTargetY: number = 0;
  private rotationCurrentY: number = 0;
  private zoomTarget: number = 5;
  private zoomCurrent: number = 5;

  constructor() {
    this.currentColor = new THREE.Color('#F5D0B5');
    this.targetColor = this.currentColor.clone();
    this.geometry = this._createFaceGeometry();
    this.material = this._createShaderMaterial();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group = new THREE.Group();
    this.group.add(this.mesh);
  }

  private _createFaceGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(1.5, 32, 32);
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);

      const x = vertex.x;
      const y = vertex.y;
      const z = vertex.z;

      vertex.y += 0.15;
      vertex.z *= 1.1;

      if (y > 0.3) {
        vertex.z -= 0.08 * Math.pow(Math.max(0, y - 0.3), 0.5);
        vertex.x *= 1 + 0.05 * Math.max(0, y - 0.3);
      }

      if (y < -0.2 && y > -0.9) {
        vertex.z += 0.15 * Math.sin(Math.PI * (y + 0.2) / 0.7);
        vertex.x *= 0.98;
      }

      if (y < -0.9) {
        const chinFactor = Math.max(0, (-y - 0.9) / 0.6);
        vertex.z -= 0.1 * chinFactor;
        vertex.x *= (1 - 0.15 * chinFactor);
        vertex.y -= 0.05 * chinFactor;
      }

      if (y > -0.1 && y < 0.3) {
        const noseFactor = Math.cos(Math.PI * (y - 0.1) / 0.4);
        const noseWidth = Math.exp(-Math.pow(x / 0.25, 2));
        vertex.z += 0.25 * noseFactor * noseWidth;
      }

      if (y > 0.15 && y < 0.55) {
        const eyeYFactor = Math.exp(-Math.pow((y - 0.35) / 0.15, 2));
        const eyeXFactorLeft = Math.exp(-Math.pow((x + 0.45) / 0.15, 2));
        const eyeXFactorRight = Math.exp(-Math.pow((x - 0.45) / 0.15, 2));
        vertex.z -= 0.12 * eyeYFactor * (eyeXFactorLeft + eyeXFactorRight);
      }

      if (y > 0.5 && y < 0.9) {
        const browFactor = Math.exp(-Math.pow((y - 0.7) / 0.12, 2));
        const browX = Math.exp(-Math.pow(x / 0.6, 2));
        vertex.z += 0.04 * browFactor * browX;
      }

      if (y > -0.6 && y < -0.1) {
        const cheekFactor = Math.exp(-Math.pow((y + 0.3) / 0.2, 2));
        const cheekXLeft = Math.exp(-Math.pow((x + 0.55) / 0.25, 2));
        const cheekXRight = Math.exp(-Math.pow((x - 0.55) / 0.25, 2));
        vertex.z += 0.08 * cheekFactor * (cheekXLeft + cheekXRight);
      }

      if (y > -0.9 && y < -0.4) {
        const mouthFactor = Math.exp(-Math.pow((y + 0.65) / 0.12, 2));
        const mouthX = Math.exp(-Math.pow(x / 0.3, 2));
        vertex.z -= 0.04 * mouthFactor * mouthX;
      }

      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  private _createShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uBaseColor: { value: this.currentColor.clone() },
        uTargetColor: { value: this.targetColor.clone() },
        uColorTransition: { value: 1.0 },
        uErythemaIntensity: { value: 0.0 },
        uPigmentationLevel: { value: 0.0 },
        uTime: { value: 0.0 },
        uPeelingLevel: { value: 0.0 }
      }
    });
  }

  setSkinColor(hexColor: string): void {
    this.currentColor = this.targetColor.clone();
    this.targetColor = new THREE.Color(hexColor);
    this.material.uniforms.uBaseColor.value.copy(this.currentColor);
    this.material.uniforms.uTargetColor.value.copy(this.targetColor);
    this.colorTransitionStart = performance.now();
    this.isTransitioning = true;
  }

  setErythema(intensity: number): void {
    this.material.uniforms.uErythemaIntensity.value = Math.max(0, Math.min(1, intensity));
  }

  setPigmentation(level: number): void {
    this.material.uniforms.uPigmentationLevel.value = Math.max(0, Math.min(1, level));
  }

  setPeeling(level: number): void {
    this.material.uniforms.uPeelingLevel.value = Math.max(0, Math.min(1, level));
  }

  setRotationY(angle: number): void {
    this.rotationTargetY = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, angle));
  }

  setZoom(distance: number): void {
    this.zoomTarget = Math.max(3, Math.min(8, distance));
  }

  getZoom(): number {
    return this.zoomCurrent;
  }

  update(deltaTime: number): void {
    const now = performance.now();
    this.material.uniforms.uTime.value += deltaTime;

    if (this.isTransitioning) {
      const elapsed = now - this.colorTransitionStart;
      const progress = Math.min(1, elapsed / this.colorTransitionDuration);
      this.material.uniforms.uColorTransition.value = easeInOutCubic(progress);
      if (progress >= 1) {
        this.isTransitioning = false;
        this.currentColor = this.targetColor.clone();
      }
    }

    this.rotationCurrentY += (this.rotationTargetY - this.rotationCurrentY) * 0.1;
    this.mesh.rotation.y = this.rotationCurrentY;

    this.zoomCurrent += (this.zoomTarget - this.zoomCurrent) * 0.1;
  }
}

export function createParticleSystem(): THREE.Points {
  const particleCount = 100;
  const positions = new Float32Array(particleCount * 3);
  const velocities: THREE.Vector3[] = [];

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 12;
    positions[i3 + 1] = (Math.random() - 0.5) * 10;
    positions[i3 + 2] = (Math.random() - 0.5) * 8 - 2;
    velocities.push(new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.01
    ));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.04,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true
  });

  const particles = new THREE.Points(geometry, material);
  (particles as any).velocities = velocities;

  return particles;
}

export function updateParticles(particles: THREE.Points): void {
  const positions = particles.geometry.attributes.position as THREE.BufferAttribute;
  const velocities = (particles as any).velocities as THREE.Vector3[];

  for (let i = 0; i < velocities.length; i++) {
    const i3 = i * 3;
    positions.array[i3] += velocities[i].x;
    positions.array[i3 + 1] += velocities[i].y;
    positions.array[i3 + 2] += velocities[i].z;

    if (Math.abs(positions.array[i3]) > 6) velocities[i].x *= -1;
    if (Math.abs(positions.array[i3 + 1]) > 5) velocities[i].y *= -1;
    if (positions.array[i3 + 2] > 2 || positions.array[i3 + 2] < -6) velocities[i].z *= -1;
  }

  positions.needsUpdate = true;
}
