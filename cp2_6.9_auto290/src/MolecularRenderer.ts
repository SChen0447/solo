import * as THREE from 'three';
import { MoleculeData, CollisionEvent } from './SimulationEngine';

export class MolecularRenderer {
  private scene: THREE.Scene;
  private moleculeGroup: THREE.Group;
  private collisionGroup: THREE.Group;
  private moleculeMeshes: Map<number, { mesh: THREE.Mesh; glow: THREE.Mesh }> = new Map();
  private sphereGeometry: THREE.SphereGeometry;
  private glowGeometry: THREE.SphereGeometry;
  private maxSpeed: number = 3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.moleculeGroup = new THREE.Group();
    this.collisionGroup = new THREE.Group();
    this.scene.add(this.moleculeGroup);
    this.scene.add(this.collisionGroup);
    this.sphereGeometry = new THREE.SphereGeometry(1, 24, 24);
    this.glowGeometry = new THREE.SphereGeometry(1, 16, 16);
  }

  private getColorFromSpeed(speed: number): THREE.Color {
    const t = Math.min(1, speed / this.maxSpeed);
    
    if (t < 0.33) {
      const localT = t / 0.33;
      return new THREE.Color().lerpColors(
        new THREE.Color(0x0000FF),
        new THREE.Color(0x00FFFF),
        localT
      );
    } else if (t < 0.66) {
      const localT = (t - 0.33) / 0.33;
      return new THREE.Color().lerpColors(
        new THREE.Color(0x00FFFF),
        new THREE.Color(0xFFFF00),
        localT
      );
    } else {
      const localT = (t - 0.66) / 0.34;
      return new THREE.Color().lerpColors(
        new THREE.Color(0xFFFF00),
        new THREE.Color(0xFF0000),
        localT
      );
    }
  }

  private createMoleculeMesh(radius: number): { mesh: THREE.Mesh; glow: THREE.Mesh } {
    const material = new THREE.MeshPhongMaterial({
      color: 0x0000FF,
      emissive: 0x000033,
      shininess: 100,
      specular: 0x444444,
      transparent: true,
      opacity: 0.95
    });

    const mesh = new THREE.Mesh(this.sphereGeometry, material);
    mesh.scale.setScalar(radius);

    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x00FFFF) },
        intensity: { value: 0.5 }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensity;
        varying vec3 vNormal;
        void main() {
          float glow = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(glowColor, glow * intensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });

    const glow = new THREE.Mesh(this.glowGeometry, glowMaterial);
    glow.scale.setScalar(radius * 1.6);

    return { mesh, glow };
  }

  public update(molecules: MoleculeData[], collisions: CollisionEvent[]): void {
    const currentIds = new Set<number>();

    let maxSpd = 0;
    for (const m of molecules) {
      if (m.speed > maxSpd) maxSpd = m.speed;
    }
    this.maxSpeed = Math.max(this.maxSpeed * 0.95, maxSpd * 1.2, 1.5);

    for (const molecule of molecules) {
      currentIds.add(molecule.id);
      let pair = this.moleculeMeshes.get(molecule.id);

      if (!pair) {
        pair = this.createMoleculeMesh(molecule.radius);
        this.moleculeGroup.add(pair.mesh);
        this.moleculeGroup.add(pair.glow);
        this.moleculeMeshes.set(molecule.id, pair);
      }

      pair.mesh.position.set(molecule.x, molecule.y, molecule.z);
      pair.glow.position.set(molecule.x, molecule.y, molecule.z);
      pair.mesh.scale.setScalar(molecule.radius);
      pair.glow.scale.setScalar(molecule.radius * 1.6);

      const color = this.getColorFromSpeed(molecule.speed);
      const material = pair.mesh.material as THREE.MeshPhongMaterial;
      material.color.copy(color);
      material.emissive.copy(color).multiplyScalar(0.3);
      material.needsUpdate = true;

      const glowMaterial = pair.glow.material as THREE.ShaderMaterial;
      glowMaterial.uniforms.glowColor.value.copy(color);
      glowMaterial.uniforms.intensity.value = 0.3 + Math.min(1, molecule.speed / this.maxSpeed) * 0.7;
      glowMaterial.needsUpdate = true;
    }

    for (const [id, pair] of this.moleculeMeshes) {
      if (!currentIds.has(id)) {
        this.moleculeGroup.remove(pair.mesh);
        this.moleculeGroup.remove(pair.glow);
        pair.mesh.geometry.dispose();
        (pair.mesh.material as THREE.Material).dispose();
        pair.glow.geometry.dispose();
        (pair.glow.material as THREE.Material).dispose();
        this.moleculeMeshes.delete(id);
      }
    }

    this.updateCollisions(collisions);
  }

  private updateCollisions(collisions: CollisionEvent[]): void {
    while (this.collisionGroup.children.length > 0) {
      const child = this.collisionGroup.children[0] as THREE.Mesh;
      this.collisionGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) (child.material as THREE.Material).dispose();
    }

    const now = performance.now() / 1000;
    for (const collision of collisions) {
      const age = now - collision.time;
      if (age > 0.3) continue;

      const alpha = 1 - age / 0.3;
      const size = 0.3 + age * 1.5;

      const material = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: alpha,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const geometry = new THREE.SphereGeometry(size * 0.15, 8, 8);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(collision.x, collision.y, collision.z);
      this.collisionGroup.add(mesh);
    }
  }

  public dispose(): void {
    for (const [, pair] of this.moleculeMeshes) {
      pair.mesh.geometry.dispose();
      (pair.mesh.material as THREE.Material).dispose();
      pair.glow.geometry.dispose();
      (pair.glow.material as THREE.Material).dispose();
    }
    this.sphereGeometry.dispose();
    this.glowGeometry.dispose();
    this.moleculeMeshes.clear();
  }
}
