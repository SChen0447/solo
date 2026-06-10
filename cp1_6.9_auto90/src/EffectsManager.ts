import * as THREE from 'three';
import { GemData } from './GemManager';

interface ParticleEffect {
  points: THREE.Points;
  velocities: Float32Array;
  life: number;
  maxLife: number;
  type: 'explosion' | 'gem-halo' | 'resonance' | 'shockwave';
  gemId?: number;
}

export class EffectsManager {
  public scene: THREE.Scene;
  private effects: ParticleEffect[] = [];
  private shockwaves: { mesh: THREE.Mesh; life: number; maxLife: number; color: THREE.Color }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public createExplosion(position: THREE.Vector3, color: THREE.Color): void {
    const count = 50;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 1.5 + Math.random() * 2;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i * 3 + 2] = Math.cos(phi) * speed;

      sizes[i] = 0.05 + Math.random() * 0.05;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.effects.push({
      points,
      velocities,
      life: 0,
      maxLife: 0.6,
      type: 'explosion',
    });

    this.createShockwave(position, color);
  }

  private createShockwave(position: THREE.Vector3, color: THREE.Color): void {
    const geometry = new THREE.RingGeometry(0.05, 0.15, 32);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.lookAt(position.clone().add(new THREE.Vector3(0, 1, 0)));
    this.scene.add(mesh);

    this.shockwaves.push({
      mesh,
      life: 0,
      maxLife: 0.5,
      color: color.clone(),
    });
  }

  public createGemParticles(gem: GemData): void {
    const count = 12;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.4 + Math.random() * 0.1;
      positions[i * 3] = gem.mesh.position.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = gem.mesh.position.y + Math.sin(angle * 2) * 0.2;
      positions[i * 3 + 2] = gem.mesh.position.z + Math.sin(angle) * radius;

      colors[i * 3] = gem.color.r;
      colors[i * 3 + 1] = gem.color.g;
      colors[i * 3 + 2] = gem.color.b;

      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;

      sizes[i] = 0.02;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    gem.mesh.add(points);

    this.effects.push({
      points,
      velocities,
      life: 0,
      maxLife: Infinity,
      type: 'gem-halo',
      gemId: gem.id,
    });
  }

  public removeGemParticles(gem: GemData): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      if (effect.type === 'gem-halo' && effect.gemId === gem.id) {
        this.scene.remove(effect.points);
        effect.points.geometry.dispose();
        (effect.points.material as THREE.Material).dispose();
        this.effects.splice(i, 1);
      }
    }
  }

  public createResonanceParticles(position: THREE.Vector3, color: THREE.Color): void {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const complement = new THREE.Color().setHSL(
      (color.getHSL({ h: 0, s: 0, l: 0 }).h + 0.5) % 1,
      0.8,
      0.6
    );

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const useComplement = Math.random() > 0.5;
      const c = useComplement ? complement : color;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 3;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed + 1;
      velocities[i * 3 + 2] = Math.cos(phi) * speed;

      sizes[i] = 0.04 + Math.random() * 0.06;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.effects.push({
      points,
      velocities,
      life: 0,
      maxLife: 2,
      type: 'resonance',
    });
  }

  public update(time: number, delta: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];

      if (effect.type === 'gem-halo') {
        const positions = effect.points.geometry.attributes.position as THREE.BufferAttribute;
        const posArray = positions.array as Float32Array;
        const phases = (effect.points.geometry.attributes.phase as THREE.BufferAttribute).array as Float32Array;
        const count = positions.count;

        const parentPos = new THREE.Vector3();
        effect.points.getWorldPosition(parentPos);

        for (let j = 0; j < count; j++) {
          const angle = time * 0.8 + (j / count) * Math.PI * 2;
          const radius = 0.35 + Math.sin(time + phases[j]) * 0.08;
          const height = Math.sin(time * 1.2 + phases[j]) * 0.15;
          posArray[j * 3] = Math.cos(angle) * radius;
          posArray[j * 3 + 1] = height;
          posArray[j * 3 + 2] = Math.sin(angle) * radius;
        }
        positions.needsUpdate = true;

        const mat = effect.points.material as THREE.PointsMaterial;
        mat.opacity = 0.3 + Math.sin(time * 2) * 0.2;
      } else {
        effect.life += delta;
        const t = effect.life / effect.maxLife;

        if (t >= 1) {
          this.scene.remove(effect.points);
          effect.points.geometry.dispose();
          (effect.points.material as THREE.Material).dispose();
          this.effects.splice(i, 1);
          continue;
        }

        const positions = effect.points.geometry.attributes.position as THREE.BufferAttribute;
        const posArray = positions.array as Float32Array;
        const count = positions.count;

        for (let j = 0; j < count; j++) {
          posArray[j * 3] += effect.velocities[j * 3] * delta;
          posArray[j * 3 + 1] += effect.velocities[j * 3 + 1] * delta;
          posArray[j * 3 + 2] += effect.velocities[j * 3 + 2] * delta;

          if (effect.type === 'explosion') {
            effect.velocities[j * 3 + 1] -= delta * 2;
            effect.velocities[j * 3] *= 0.98;
            effect.velocities[j * 3 + 1] *= 0.98;
            effect.velocities[j * 3 + 2] *= 0.98;
          } else if (effect.type === 'resonance') {
            effect.velocities[j * 3 + 1] -= delta * 0.5;
          }
        }
        positions.needsUpdate = true;

        const mat = effect.points.material as THREE.PointsMaterial;
        if (effect.type === 'explosion') {
          mat.opacity = 1 - t;
          mat.size = 0.1 * (1 - t * 0.5);
        } else if (effect.type === 'resonance') {
          mat.opacity = 1 - t * 0.8;
        }
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += delta;
      const t = sw.life / sw.maxLife;

      if (t >= 1) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        (sw.mesh.material as THREE.Material).dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }

      const scale = 0.3 + t * 3;
      sw.mesh.scale.setScalar(scale);
      const mat = sw.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.8 * (1 - t);
    }
  }
}
