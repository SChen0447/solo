import * as THREE from 'three';

export class EnergyBubble {
  private scene: THREE.Scene;
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private glowMesh: THREE.Mesh;
  private glowMaterial: THREE.MeshBasicMaterial;
  private onActivated: () => void;
  public isActivated: boolean = false;
  private readonly BUBBLE_RADIUS = 0.8;
  private readonly ROTATION_PERIOD = 5;

  private readonly vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vPosition = position;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  private readonly fragmentShader = `
    uniform float uTime;
    uniform float uActivated;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      float time = uTime * 0.167;
      
      float hue = mod(time + vUv.x * 2.0 + vUv.y * 1.5, 1.0);
      hue = mix(0.0, 0.66, hue);
      
      vec3 baseColor = hsv2rgb(vec3(hue, 0.8, 1.0));
      
      float wave1 = sin(vPosition.x * 4.0 + uTime * 2.0) * 0.5 + 0.5;
      float wave2 = sin(vPosition.y * 5.0 + uTime * 1.5 + 1.0) * 0.5 + 0.5;
      float wave3 = sin(vPosition.z * 3.0 + uTime * 2.5 + 2.0) * 0.5 + 0.5;
      float waves = (wave1 + wave2 + wave3) / 3.0;
      
      float bands = sin((vUv.y + uTime * 0.3) * 20.0) * 0.5 + 0.5;
      bands = smoothstep(0.4, 0.6, bands);
      
      float flowNoise = noise(vUv * 10.0 + uTime * 0.5);
      float flow = sin((vUv.x + flowNoise * 0.3 + uTime * 0.2) * 15.0) * 0.5 + 0.5;
      
      float pattern = mix(waves, bands, 0.4);
      pattern = mix(pattern, flow, 0.3);
      
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.0);
      
      vec3 finalColor = mix(baseColor * 0.6, baseColor, pattern);
      finalColor += fresnel * vec3(0.3, 0.5, 1.0);
      
      float pulseIntensity = 0.8 + sin(uTime * 2.0) * 0.2;
      float activatedBoost = uActivated * 0.5;
      finalColor *= pulseIntensity + activatedBoost;
      
      float alpha = 0.5 + fresnel * 0.4 + pattern * 0.1;
      alpha = min(alpha, 0.9);
      alpha *= 0.6 + uActivated * 0.4;
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  constructor(scene: THREE.Scene, onActivated: () => void) {
    this.scene = scene;
    this.onActivated = onActivated;

    this.material = new THREE.ShaderMaterial({
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uActivated: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const geometry = new THREE.SphereGeometry(this.BUBBLE_RADIUS, 64, 64);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.set(0, 0, 0);
    this.mesh.userData = { type: 'energyBubble' };
    this.scene.add(this.mesh);

    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const glowGeometry = new THREE.SphereGeometry(this.BUBBLE_RADIUS * 1.3, 32, 32);
    this.glowMesh = new THREE.Mesh(glowGeometry, this.glowMaterial);
    this.glowMesh.position.copy(this.mesh.position);
    this.scene.add(this.glowMesh);

    const ambientLight = new THREE.PointLight(0xff8844, 0.5, 5);
    ambientLight.position.copy(this.mesh.position);
    this.scene.add(ambientLight);
  }

  public handleClick(raycaster: THREE.Raycaster): void {
    if (this.isActivated) return;

    const intersects = raycaster.intersectObject(this.mesh);
    if (intersects.length > 0) {
      this.activate();
    }
  }

  private activate(): void {
    this.isActivated = true;
    this.material.uniforms.uActivated.value = 1;

    this.glowMaterial.color.setHex(0x00ccff);
    this.glowMaterial.opacity = 0.4;

    this.onActivated();
  }

  public update(delta: number, elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;

    const rotationSpeed = (Math.PI * 2) / this.ROTATION_PERIOD;
    this.mesh.rotation.y += rotationSpeed * delta;
    this.mesh.rotation.x += rotationSpeed * 0.5 * delta;

    this.glowMesh.rotation.y -= rotationSpeed * 0.7 * delta;
    this.glowMesh.rotation.z += rotationSpeed * 0.3 * delta;

    const pulseScale = 1 + Math.sin(elapsed * 2) * 0.05;
    this.glowMesh.scale.setScalar(pulseScale * (this.isActivated ? 1.5 : 1.3));

    if (this.isActivated) {
      const colorShift = (Math.sin(elapsed * 0.5) + 1) / 2;
      const r = Math.floor(255 * (1 - colorShift * 0.5));
      const g = Math.floor(200 * (0.5 + colorShift * 0.5));
      const b = Math.floor(255 * (0.3 + colorShift * 0.7));
      this.glowMaterial.color.setRGB(r / 255, g / 255, b / 255);
    }
  }
}
