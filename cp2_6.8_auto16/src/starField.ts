import * as THREE from 'three';
import { StarData } from './starData';

const vertexShader = `
  attribute float size;
  attribute float opacity;
  attribute float highlight;
  attribute float neighborGlow;
  
  varying vec3 vColor;
  varying float vOpacity;
  
  void main() {
    vColor = color;
    vOpacity = opacity * (1.0 + highlight * 0.5 + neighborGlow * 0.3);
    
    float scale = 1.0 + highlight * 0.3 + neighborGlow * 0.15;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * scale * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vOpacity;
  
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha = pow(alpha, 1.5);
    
    vec3 color = vColor;
    float glow = exp(-dist * 3.0) * 0.5;
    color += glow * vColor;
    
    gl_FragColor = vec4(color, alpha * vOpacity);
  }
`;

export class StarField {
  public stars: StarData[];
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private opacities: Float32Array;
  private highlights: Float32Array;
  private neighborGlows: Float32Array;
  private originalSizes: Float32Array;
  private originalOpacities: Float32Array;

  private targetOpacities: Float32Array;
  private targetHighlights: Float32Array;
  private targetNeighborGlows: Float32Array;

  private rotationSpeed: number = 0.00035;
  private magnitudeThreshold: number = 6;

  private starGroup: THREE.Group;

  constructor(stars: StarData[]) {
    this.stars = stars;
    this.starGroup = new THREE.Group();

    this.geometry = new THREE.BufferGeometry();
    const count = stars.length;

    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.opacities = new Float32Array(count);
    this.highlights = new Float32Array(count);
    this.neighborGlows = new Float32Array(count);
    this.originalSizes = new Float32Array(count);
    this.originalOpacities = new Float32Array(count);
    this.targetOpacities = new Float32Array(count);
    this.targetHighlights = new Float32Array(count);
    this.targetNeighborGlows = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const star = stars[i];

      this.positions[i * 3] = star.position[0];
      this.positions[i * 3 + 1] = star.position[1];
      this.positions[i * 3 + 2] = star.position[2];

      const color = new THREE.Color(star.color);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      const baseSize = 1.5 + star.brightness * 4;
      this.sizes[i] = baseSize;
      this.originalSizes[i] = baseSize;

      const distanceFactor = 1 - (star.distance - 100) / 400;
      const baseOpacity = 0.3 + star.brightness * 0.7 * Math.max(0.3, distanceFactor);
      this.opacities[i] = baseOpacity;
      this.originalOpacities[i] = baseOpacity;
      this.targetOpacities[i] = baseOpacity;

      this.highlights[i] = 0;
      this.neighborGlows[i] = 0;
      this.targetHighlights[i] = 0;
      this.targetNeighborGlows[i] = 0;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('opacity', new THREE.BufferAttribute(this.opacities, 1));
    this.geometry.setAttribute('highlight', new THREE.BufferAttribute(this.highlights, 1));
    this.geometry.setAttribute('neighborGlow', new THREE.BufferAttribute(this.neighborGlows, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {},
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.starGroup.add(this.points);
  }

  public getObject3D(): THREE.Group {
    return this.starGroup;
  }

  public update(deltaTime: number): void {
    this.starGroup.rotation.y += this.rotationSpeed * deltaTime * 60;

    const opacityAttr = this.geometry.getAttribute('opacity') as THREE.BufferAttribute;
    const highlightAttr = this.geometry.getAttribute('highlight') as THREE.BufferAttribute;
    const neighborGlowAttr = this.geometry.getAttribute('neighborGlow') as THREE.BufferAttribute;

    let needsUpdate = false;
    const easeFactor = 0.15;

    for (let i = 0; i < this.stars.length; i++) {
      if (Math.abs(this.opacities[i] - this.targetOpacities[i]) > 0.001) {
        this.opacities[i] += (this.targetOpacities[i] - this.opacities[i]) * easeFactor;
        opacityAttr.array[i] = this.opacities[i];
        needsUpdate = true;
      }

      if (Math.abs(this.highlights[i] - this.targetHighlights[i]) > 0.001) {
        this.highlights[i] += (this.targetHighlights[i] - this.highlights[i]) * easeFactor;
        highlightAttr.array[i] = this.highlights[i];
        needsUpdate = true;
      }

      if (Math.abs(this.neighborGlows[i] - this.targetNeighborGlows[i]) > 0.001) {
        this.neighborGlows[i] += (this.targetNeighborGlows[i] - this.neighborGlows[i]) * easeFactor;
        neighborGlowAttr.array[i] = this.neighborGlows[i];
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      opacityAttr.needsUpdate = true;
      highlightAttr.needsUpdate = true;
      neighborGlowAttr.needsUpdate = true;
    }
  }

  public setMagnitudeThreshold(threshold: number): void {
    this.magnitudeThreshold = threshold;

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      if (star.magnitude <= threshold) {
        this.targetOpacities[i] = this.originalOpacities[i];
      } else {
        this.targetOpacities[i] = 0;
      }
    }
  }

  public highlightStar(index: number): void {
    for (let i = 0; i < this.stars.length; i++) {
      this.targetHighlights[i] = 0;
      this.targetNeighborGlows[i] = 0;
    }

    if (index >= 0 && index < this.stars.length) {
      this.targetHighlights[index] = 1;

      const targetStar = this.stars[index];
      const neighbors: { index: number; dist: number }[] = [];

      for (let i = 0; i < this.stars.length; i++) {
        if (i === index) continue;
        const s = this.stars[i];
        const dx = s.position[0] - targetStar.position[0];
        const dy = s.position[1] - targetStar.position[1];
        const dz = s.position[2] - targetStar.position[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (neighbors.length < 5) {
          neighbors.push({ index: i, dist });
          neighbors.sort((a, b) => a.dist - b.dist);
        } else if (dist < neighbors[neighbors.length - 1].dist) {
          neighbors[neighbors.length - 1] = { index: i, dist };
          neighbors.sort((a, b) => a.dist - b.dist);
        }
      }

      for (const n of neighbors) {
        this.targetNeighborGlows[n.index] = 1;
      }
    }
  }

  public clearHighlight(): void {
    for (let i = 0; i < this.stars.length; i++) {
      this.targetHighlights[i] = 0;
      this.targetNeighborGlows[i] = 0;
    }
  }

  public getStarPosition(index: number): THREE.Vector3 {
    const star = this.stars[index];
    const pos = new THREE.Vector3(star.position[0], star.position[1], star.position[2]);
    return pos.applyQuaternion(this.starGroup.quaternion);
  }

  public getStarWorldPosition(index: number): THREE.Vector3 {
    const star = this.stars[index];
    return new THREE.Vector3(star.position[0], star.position[1], star.position[2]);
  }

  public getRotationSpeed(): number {
    return this.rotationSpeed;
  }

  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }
}
