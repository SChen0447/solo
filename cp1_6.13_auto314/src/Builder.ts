import * as THREE from 'three';

export interface TimeOfDay {
  hour: number;
  phase: 'dawn' | 'noon' | 'dusk' | 'night';
}

interface SkeletonData {
  mesh: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  baseRadius: number;
  pulseSpeed: number;
  pulsePhase: number;
  pulseAmplitude: number;
  baseColor: THREE.Color;
  material: THREE.MeshStandardMaterial;
}

interface MembraneData {
  mesh: THREE.Mesh;
  baseColor: THREE.Color;
  material: THREE.ShaderMaterial;
}

const membraneVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const membraneFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  void main() {
    float flowOffset = uTime * 0.15;
    vec2 uvAnimated = vUv + vec2(flowOffset * 0.3, flowOffset * 0.2);
    
    float n1 = noise(uvAnimated * 20.0);
    float n2 = noise(uvAnimated * 40.0 + 5.0);
    float combined = (n1 + n2 * 0.5) * 0.66;
    
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
    float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.5 + 0.5;
    
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0) * 0.3;
    
    vec3 baseColor = uColor * (0.7 + combined * 0.6) * diffuse;
    baseColor += fresnel * vec3(0.3, 0.5, 0.8);
    
    float alpha = uOpacity * (0.7 + combined * 0.5);
    
    gl_FragColor = vec4(baseColor, alpha);
  }
`;

export class Builder {
  public readonly container: THREE.Group;
  private skeletons: SkeletonData[] = [];
  private membranes: MembraneData[] = [];
  private clock: THREE.Clock;

  private static readonly COLORS = {
    dawn: new THREE.Color('#ff9f43'),
    noon: new THREE.Color('#48dbfb'),
    dusk: new THREE.Color('#a29bfe'),
    night: new THREE.Color('#2d3436'),
    skeletonStart: new THREE.Color('#ff6b6b'),
    skeletonEnd: new THREE.Color('#a29bfe'),
  };

  constructor() {
    this.container = new THREE.Group();
    this.container.name = 'LightRidgeDome';
    this.clock = new THREE.Clock();
    this.buildSkeletons();
    this.buildMembranes();
  }

  private buildSkeletons(): void {
    const skeletonCount = 200;
    const domeHeight = 2.5;
    const baseRadius = 2.0;

    for (let i = 0; i < skeletonCount; i++) {
      const t = i / (skeletonCount - 1);
      const baseColor = Builder.COLORS.skeletonStart.clone().lerp(
        Builder.COLORS.skeletonEnd,
        t
      );

      const angle1 = t * Math.PI * 2;
      const angle2 = (t + 0.005) * Math.PI * 2;

      const points: THREE.Vector3[] = [];
      const segmentCount = 50;

      for (let j = 0; j <= segmentCount; j++) {
        const segT = j / segmentCount;
        const heightFactor = Math.sin(segT * Math.PI);
        const radiusFactor = Math.cos(segT * Math.PI * 0.5);
        const y = domeHeight * heightFactor;
        const r = baseRadius * radiusFactor;

        const wobble = Math.sin(segT * Math.PI * 3 + i * 0.3) * 0.05 * heightFactor;
        const x = Math.cos(angle1) * r + wobble * Math.sin(angle2);
        const z = Math.sin(angle1) * r + wobble * Math.cos(angle2);

        points.push(new THREE.Vector3(x, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeRadius = 0.08 + Math.random() * 0.04;
      const geometry = new THREE.TubeGeometry(curve, 80, tubeRadius, 12, false);

      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: baseColor,
        emissiveIntensity: 0.4,
        metalness: 0.3,
        roughness: 0.2,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;

      const data: SkeletonData = {
        mesh,
        curve,
        baseRadius: tubeRadius,
        pulseSpeed: 3 + Math.random() * 4,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseAmplitude: 1.02 + Math.random() * 0.03,
        baseColor,
        material,
      };

      this.skeletons.push(data);
      this.container.add(mesh);
    }
  }

  private buildMembranes(): void {
    const membraneCount = Math.floor(this.skeletons.length * 0.6);

    for (let i = 0; i < membraneCount; i++) {
      const skeletonIdx1 = Math.floor(Math.random() * this.skeletons.length);
      let skeletonIdx2 = (skeletonIdx1 + 1 + Math.floor(Math.random() * 4)) % this.skeletons.length;

      const skel1 = this.skeletons[skeletonIdx1];
      const skel2 = this.skeletons[skeletonIdx2];

      const segments = 20;
      const geometry = new THREE.PlaneGeometry(1, 1, segments, 8);
      const positions = geometry.attributes.position as THREE.BufferAttribute;

      for (let s = 0; s <= segments; s++) {
        for (let r = 0; r <= 8; r++) {
          const idx = s * 9 + r;
          const segT = s / segments;
          const radiusT = r / 8;

          const p1 = skel1.curve.getPoint(segT);
          const p2 = skel2.curve.getPoint(segT);

          const mix = radiusT;
          const x = p1.x + (p2.x - p1.x) * mix;
          const y = p1.y + (p2.y - p1.y) * mix;
          const z = p1.z + (p2.z - p1.z) * mix;

          positions.setXYZ(idx, x, y, z);
        }
      }

      geometry.computeVertexNormals();
      geometry.attributes.position.needsUpdate = true;

      const baseColor = skel1.baseColor.clone().lerp(skel2.baseColor, 0.5);

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: baseColor },
          uOpacity: { value: 0.2 + Math.random() * 0.3 },
          uTime: { value: 0 },
        },
        vertexShader: membraneVertexShader,
        fragmentShader: membraneFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const mesh = new THREE.Mesh(geometry, material);
      this.membranes.push({ mesh, baseColor, material });
      this.container.add(mesh);
    }
  }

  private interpolatePhaseColor(hour: number): THREE.Color {
    const c = Builder.COLORS;
    if (hour < 5 || hour >= 22) {
      return c.night.clone();
    } else if (hour >= 5 && hour < 8) {
      const t = (hour - 5) / 3;
      return c.night.clone().lerp(c.dawn, t);
    } else if (hour >= 8 && hour < 11) {
      const t = (hour - 8) / 3;
      return c.dawn.clone().lerp(c.noon, t);
    } else if (hour >= 11 && hour < 14) {
      return c.noon.clone();
    } else if (hour >= 14 && hour < 17) {
      const t = (hour - 14) / 3;
      return c.noon.clone().lerp(c.dusk, t);
    } else if (hour >= 17 && hour < 20) {
      const t = (hour - 17) / 3;
      return c.dusk.clone().lerp(c.dusk, 1);
    } else {
      const t = (hour - 20) / 2;
      return c.dusk.clone().lerp(c.night, t);
    }
  }

  private getMembraneOpacityRange(hour: number): { min: number; max: number } {
    if (hour < 5 || hour >= 22) {
      return { min: 0.2, max: 0.35 };
    } else if ((hour >= 5 && hour < 8) || (hour >= 17 && hour < 22)) {
      return { min: 0.3, max: 0.5 };
    } else {
      return { min: 0.35, max: 0.6 };
    }
  }

  public update(hour: number): void {
    const elapsed = this.clock.getElapsedTime();
    const phaseColor = this.interpolatePhaseColor(hour);
    const opacityRange = this.getMembraneOpacityRange(hour);

    for (let i = 0; i < this.skeletons.length; i++) {
      const skel = this.skeletons[i];
      const t = i / (this.skeletons.length - 1);

      const skeletonColor = Builder.COLORS.skeletonStart.clone().lerp(
        Builder.COLORS.skeletonEnd,
        t
      );
      const finalColor = skeletonColor.clone().lerp(phaseColor, 0.55);

      skel.material.color.copy(finalColor);
      skel.material.emissive.copy(finalColor);

      const nightFactor = (hour < 5 || hour >= 20) ? 1.2 : (hour >= 5 && hour < 8 || hour >= 17 && hour < 20) ? 1.0 : 0.7;
      skel.material.emissiveIntensity = 0.4 * nightFactor;

      const pulse = 1 + (skel.pulseAmplitude - 1) *
        Math.sin(elapsed * skel.pulseSpeed + skel.pulsePhase);
      skel.mesh.scale.setScalar(pulse);
    }

    for (let i = 0; i < this.membranes.length; i++) {
      const mem = this.membranes[i];
      const targetColor = mem.baseColor.clone().lerp(phaseColor, 0.5);
      mem.material.uniforms.uColor.value.copy(targetColor);

      const t = i / Math.max(this.membranes.length - 1, 1);
      const opacity = opacityRange.min + t * (opacityRange.max - opacityRange.min);
      mem.material.uniforms.uOpacity.value = opacity;
      mem.material.uniforms.uTime.value = elapsed;
    }
  }

  public getPhase(hour: number): 'dawn' | 'noon' | 'dusk' | 'night' {
    if (hour >= 5 && hour < 10) return 'dawn';
    if (hour >= 10 && hour < 15) return 'noon';
    if (hour >= 15 && hour < 20) return 'dusk';
    return 'night';
  }
}
