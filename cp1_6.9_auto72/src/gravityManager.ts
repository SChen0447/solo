import * as THREE from 'three';

export interface GravitySource {
  id: number;
  position: THREE.Vector3;
  strength: number;
  mesh: THREE.Mesh;
  isRemoving: boolean;
  removeStartTime: number;
}

export const MAX_GRAVITY_SOURCES = 10;
export const DEFAULT_STRENGTH = 3.0;
export const GRAVITY_SOURCE_RADIUS = 0.3;

export class GravityManager {
  private scene: THREE.Scene;
  private sources: GravitySource[] = [];
  private nextId = 0;
  private tempColor = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  createGravitySource(position: THREE.Vector3, strength: number = DEFAULT_STRENGTH): GravitySource | null {
    if (this.sources.length >= MAX_GRAVITY_SOURCES) {
      return null;
    }

    const geometry = new THREE.SphereGeometry(GRAVITY_SOURCE_RADIUS, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uScale: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position * uScale, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float uScale;
        void main() {
          float dist = length(vPosition) / 0.3;
          float alpha = (1.0 - dist) * 0.6;
          alpha = clamp(alpha, 0.0, 0.6);
          vec3 color = mix(vec3(0.3, 1.0, 0.4), vec3(0.1, 0.6, 0.2), dist);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData.gravitySourceId = this.nextId;

    this.scene.add(mesh);

    const source: GravitySource = {
      id: this.nextId,
      position: mesh.position,
      strength,
      mesh,
      isRemoving: false,
      removeStartTime: 0,
    };

    this.sources.push(source);
    this.nextId++;

    return source;
  }

  removeGravitySource(id: number): void {
    const source = this.sources.find((s) => s.id === id);
    if (!source || source.isRemoving) return;

    source.isRemoving = true;
    source.removeStartTime = performance.now();
  }

  removeAll(): void {
    for (const source of this.sources) {
      if (!source.isRemoving) {
        source.isRemoving = true;
        source.removeStartTime = performance.now();
      }
    }
  }

  getSourceById(id: number): GravitySource | undefined {
    return this.sources.find((s) => s.id === id);
  }

  getSources(): GravitySource[] {
    return this.sources.filter((s) => !s.isRemoving);
  }

  getCount(): number {
    return this.sources.filter((s) => !s.isRemoving).length;
  }

  getSourcePositionsArray(): Float32Array {
    const active = this.getSources();
    const arr = new Float32Array(MAX_GRAVITY_SOURCES * 3);
    for (let i = 0; i < active.length; i++) {
      arr[i * 3] = active[i].position.x;
      arr[i * 3 + 1] = active[i].position.y;
      arr[i * 3 + 2] = active[i].position.z;
    }
    return arr;
  }

  getSourceStrengthsArray(): Float32Array {
    const active = this.getSources();
    const arr = new Float32Array(MAX_GRAVITY_SOURCES);
    for (let i = 0; i < active.length; i++) {
      arr[i] = active[i].strength;
    }
    return arr;
  }

  update(delta: number): void {
    const REMOVE_DURATION = 200;
    const now = performance.now();

    for (let i = this.sources.length - 1; i >= 0; i--) {
      const source = this.sources[i];

      if (source.isRemoving) {
        const elapsed = now - source.removeStartTime;
        const t = Math.min(elapsed / REMOVE_DURATION, 1.0);
        const scale = 1.0 - t;

        const material = source.mesh.material as THREE.ShaderMaterial;
        if (material.uniforms && material.uniforms.uScale) {
          material.uniforms.uScale.value = scale;
        }

        if (t >= 1.0) {
          this.scene.remove(source.mesh);
          source.mesh.geometry.dispose();
          if (Array.isArray(source.mesh.material)) {
            source.mesh.material.forEach((m) => m.dispose());
          } else {
            source.mesh.material.dispose();
          }
          this.sources.splice(i, 1);
        }
      }
    }
  }

  dispose(): void {
    for (const source of this.sources) {
      this.scene.remove(source.mesh);
      source.mesh.geometry.dispose();
      if (Array.isArray(source.mesh.material)) {
        source.mesh.material.forEach((m) => m.dispose());
      } else {
        source.mesh.material.dispose();
      }
    }
    this.sources = [];
  }
}
