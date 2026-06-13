import * as THREE from 'three';
import gsap from 'gsap';

export interface StalactiteData {
  mesh: THREE.Mesh;
  isStalactite: boolean;
  height: number;
  baseRadius: number;
  index: number;
  originalScale: number;
  isActive: boolean;
  originalColor: THREE.Color;
  complementaryColor: THREE.Color;
  complementaryTween: gsap.core.Tween | null;
}

export interface RippleData {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  maxRadius: number;
}

const FLOW_SPEED = 20;
const ACTIVE_FLOW_MULTIPLIER = 3;
const ACTIVE_SCALE = 1.5;
const RECOVERY_TIME = 1.5;
const RIPPLE_MAX_RADIUS = 2;
const RIPPLE_DURATION = 1;

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vHeightRatio;

  void main() {
    vUv = uv;
    vNormal = normal;
    vPosition = position;
    vHeightRatio = position.y / 3.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uFlowSpeed;
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform float uIsActive;
  uniform vec3 uActiveColor;
  uniform float uStripeCount;
  uniform float uStripeWidth;
  uniform float uGlowIntensity;
  uniform float uComplementaryMix;
  uniform vec3 uComplementaryColor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vHeightRatio;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    float flowOffset = uTime * uFlowSpeed * 0.05;
    float stripe = sin((vUv.y + flowOffset) * uStripeCount * 3.14159 * 2.0);
    stripe = smoothstep(0.0, uStripeWidth, stripe * 0.5 + 0.5);

    vec3 color = mix(uBaseColor, uTipColor, vUv.y);

    if (uComplementaryMix > 0.0) {
      color = mix(color, uComplementaryColor, uComplementaryMix);
    }

    if (uIsActive > 0.5) {
      color = mix(color, uActiveColor, 0.8);
    }

    vec3 finalColor = color * (0.3 + stripe * 0.7);
    float glow = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0))) * 0.3;
    finalColor += color * glow * uGlowIntensity;

    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.0);
    finalColor += color * fresnel * 0.2;

    float alpha = 0.9 + stripe * 0.1;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const rippleVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const rippleFragmentShader = `
  uniform float uProgress;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center);
    float ring = smoothstep(uProgress - 0.1, uProgress, dist) * smoothstep(uProgress + 0.05, uProgress, dist);
    float alpha = ring * (1.0 - uProgress);
    gl_FragColor = vec4(uColor, alpha * 0.8);
  }
`;

export class StalactiteSystem {
  private scene: THREE.Scene;
  private stalactites: StalactiteData[] = [];
  private ripples: RippleData[] = [];
  private caveRadius: number;

  constructor(scene: THREE.Scene, caveRadius: number = 6) {
    this.scene = scene;
    this.caveRadius = caveRadius;
  }

  generate(count: number = 60): void {
    for (let i = 0; i < count; i++) {
      const isStalactite = Math.random() < 0.5;
      const height = 0.8 + Math.random() * 1.2;
      const baseRadius = 0.08 + Math.random() * 0.12;

      const phi = Math.random() * Math.PI * 2;
      const theta = isStalactite
        ? Math.random() * Math.PI * 0.35
        : Math.PI - Math.random() * Math.PI * 0.35;

      const r = this.caveRadius - 0.1;
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.cos(theta);
      const z = r * Math.sin(theta) * Math.sin(phi);

      const mesh = this.createStalactite(height, baseRadius, isStalactite);

      mesh.position.set(x, y, z);
      mesh.lookAt(0, 0, 0);
      mesh.rotateX(Math.PI / 2);

      if (isStalactite) {
        mesh.position.y += height * 0.1;
      } else {
        mesh.position.y -= height * 0.1;
      }

      const baseColor = new THREE.Color().setHSL(0.5 + Math.random() * 0.1, 0.9, 0.5);

      const complementaryBase = new THREE.Color().setHSL(
        (baseColor.getHSL({ h: 0, s: 0, l: 0 }).h + 0.5) % 1,
        0.9,
        0.6
      );

      const data: StalactiteData = {
        mesh,
        isStalactite,
        height,
        baseRadius,
        index: i,
        originalScale: 1,
        isActive: false,
        originalColor: baseColor.clone(),
        complementaryColor: complementaryBase,
        complementaryTween: null
      };

      (mesh as any).userData.stalactite = data;
      this.stalactites.push(data);
      this.scene.add(mesh);
    }
  }

  private createStalactite(
    height: number,
    baseRadius: number,
    isStalactite: boolean
  ): THREE.Mesh {
    const geometry = new THREE.ConeGeometry(baseRadius, height, 16, 8, true);

    if (!isStalactite) {
      geometry.rotateX(Math.PI);
    }

    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      const heightRatio = (vertex.y + height / 2) / height;
      const noise = (Math.sin(vertex.y * 8 + vertex.x * 3) * 0.5 + 0.5) * 0.1;
      const radiusFactor = 1 + noise * (1 - heightRatio * 0.5);

      const radialDist = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
      if (radialDist > 0.001) {
        vertex.x *= radiusFactor;
        vertex.z *= radiusFactor;
      }
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geometry.computeVertexNormals();

    const baseHue = 0.5 + Math.random() * 0.05;
    const tipHue = 0.85 + Math.random() * 0.05;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uFlowSpeed: { value: FLOW_SPEED },
        uBaseColor: { value: new THREE.Color().setHSL(baseHue, 0.9, 0.4) },
        uTipColor: { value: new THREE.Color().setHSL(tipHue, 0.9, 0.6) },
        uIsActive: { value: 0 },
        uActiveColor: { value: new THREE.Color(0xffd700) },
        uStripeCount: { value: 6 + Math.random() * 4 },
        uStripeWidth: { value: 0.4 },
        uGlowIntensity: { value: 1.0 },
        uComplementaryMix: { value: 0 },
        uComplementaryColor: { value: new THREE.Color(0xff6b6b) }
      }
    });

    return new THREE.Mesh(geometry, material);
  }

  getStalactites(): StalactiteData[] {
    return this.stalactites;
  }

  activateStalactite(data: StalactiteData): void {
    if (data.isActive) return;
    data.isActive = true;

    const material = data.mesh.material as THREE.ShaderMaterial;

    gsap.to(material.uniforms.uFlowSpeed, {
      value: FLOW_SPEED * ACTIVE_FLOW_MULTIPLIER,
      duration: 0.2,
      ease: 'power2.out'
    });

    gsap.to(material.uniforms.uIsActive, {
      value: 1,
      duration: 0.2,
      ease: 'power2.out'
    });

    gsap.to(data.mesh.scale, {
      x: ACTIVE_SCALE,
      y: ACTIVE_SCALE,
      z: ACTIVE_SCALE,
      duration: 0.3,
      ease: 'back.out(2)'
    });

    this.createRipple(data.mesh.position);
    this.triggerNeighborEffect(data);
  }

  deactivateStalactite(data: StalactiteData): void {
    if (!data.isActive) return;
    data.isActive = false;

    const material = data.mesh.material as THREE.ShaderMaterial;

    gsap.to(material.uniforms.uFlowSpeed, {
      value: FLOW_SPEED,
      duration: RECOVERY_TIME,
      ease: 'power2.out'
    });

    gsap.to(material.uniforms.uIsActive, {
      value: 0,
      duration: RECOVERY_TIME,
      ease: 'power2.out'
    });

    gsap.to(data.mesh.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: RECOVERY_TIME,
      ease: 'elastic.out(1, 0.5)'
    });
  }

  private createRipple(position: THREE.Vector3): void {
    const geometry = new THREE.PlaneGeometry(RIPPLE_MAX_RADIUS * 2, RIPPLE_MAX_RADIUS * 2, 1, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader: rippleVertexShader,
      fragmentShader: rippleFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(0xffd700) }
      }
    });

    const ripple = new THREE.Mesh(geometry, material);
    ripple.position.copy(position);

    const dirToCenter = position.clone().negate().normalize();
    ripple.lookAt(position.clone().add(dirToCenter));

    this.scene.add(ripple);

    const rippleData: RippleData = {
      mesh: ripple,
      startTime: performance.now() / 1000,
      duration: RIPPLE_DURATION,
      maxRadius: RIPPLE_MAX_RADIUS
    };

    this.ripples.push(rippleData);

    gsap.to(material.uniforms.uProgress, {
      value: 1,
      duration: RIPPLE_DURATION,
      ease: 'power2.out',
      onComplete: () => {
        this.scene.remove(ripple);
        geometry.dispose();
        material.dispose();
        const idx = this.ripples.indexOf(rippleData);
        if (idx > -1) {
          this.ripples.splice(idx, 1);
        }
      }
    });
  }

  private triggerNeighborEffect(activeData: StalactiteData): void {
    const neighbors = this.findNearestNeighbors(activeData, 5);

    neighbors.forEach((neighbor) => {
      if (neighbor.complementaryTween) {
        neighbor.complementaryTween.kill();
      }

      const material = neighbor.mesh.material as THREE.ShaderMaterial;

      const complementaryColor = new THREE.Color();
      const baseHsl = { h: 0, s: 0, l: 0 };
      neighbor.originalColor.getHSL(baseHsl);
      complementaryColor.setHSL((baseHsl.h + 0.5) % 1, 0.9, 0.6);

      material.uniforms.uComplementaryColor.value = complementaryColor;

      neighbor.complementaryTween = gsap.to(material.uniforms.uComplementaryMix, {
        value: 1,
        duration: 0.15,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          neighbor.complementaryTween = null;
        }
      });
    });
  }

  private findNearestNeighbors(
    data: StalactiteData,
    count: number
  ): StalactiteData[] {
    const distances = this.stalactites
      .filter((s) => s !== data)
      .map((s) => ({
        stalactite: s,
        distance: s.mesh.position.distanceTo(data.mesh.position)
      }))
      .sort((a, b) => a.distance - b.distance);

    return distances.slice(0, count).map((d) => d.stalactite);
  }

  update(time: number, _delta: number): void {
    this.stalactites.forEach((data) => {
      const material = data.mesh.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = time;
    });
  }

  updateParallax(cameraRotation: { x: number; y: number }): void {
    this.stalactites.forEach((data) => {
      const material = data.mesh.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value += cameraRotation.y * 0.01;
    });
  }
}
