import * as THREE from 'three';

export interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: 'spark' | 'firework' | 'field';
}

export class VisualEffectManager {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private maxParticles: number = 500;
  private polarPulseMeshes: Map<string, THREE.Mesh> = new Map();
  private lightningMesh: THREE.Line | null = null;
  private lightningLife: number = 0;
  private shockwaveMesh: THREE.Mesh | null = null;
  private shockwaveLife: number = 0;
  private shockwaveRadius: number = 0;
  private fieldParticles: THREE.Points | null = null;
  private fieldParticleData: { vx: number; vy: number; phase: number }[] = [];
  private portalMeshes: Map<string, { mesh: THREE.Mesh; ring: THREE.Mesh }> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createFieldParticles();
  }

  private createFieldParticles(): void {
    const count = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3500;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1200;
      positions[i * 3 + 2] = -5;
      colors[i * 3] = 0.4;
      colors[i * 3 + 1] = 0.7;
      colors[i * 3 + 2] = 1.0;
      this.fieldParticleData.push({
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        phase: Math.random() * Math.PI * 2
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });

    this.fieldParticles = new THREE.Points(geometry, material);
    this.scene.add(this.fieldParticles);
  }

  public createSparkEffect(x: number, y: number, count: number = 8): void {
    if (this.particles.length >= this.maxParticles) return;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const geometry = new THREE.CircleGeometry(2, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, 5);

      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        type: 'spark'
      });
    }
  }

  public createPolarPulse(
    magnetId: string,
    x: number,
    y: number,
    polarity: 'N' | 'S',
    intensity: number
  ): void {
    let mesh = this.polarPulseMeshes.get(magnetId);
    if (!mesh) {
      const geometry = new THREE.RingGeometry(12, 20, 32);
      const material = new THREE.MeshBasicMaterial({
        color: polarity === 'N' ? 0xff4444 : 0x4488ff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, 2);
      this.scene.add(mesh);
      this.polarPulseMeshes.set(magnetId, mesh);
    }

    mesh.position.set(x, y, 2);
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(polarity === 'N' ? 0xff4444 : 0x4488ff);
    mat.opacity = Math.min(0.8, intensity * 0.015);
    const scale = 1 + intensity * 0.01;
    mesh.scale.set(scale, scale, 1);
  }

  public hidePolarPulse(magnetId: string): void {
    const mesh = this.polarPulseMeshes.get(magnetId);
    if (mesh) {
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }

  public createLightning(fromX: number, fromY: number, toX: number, toY: number): void {
    if (this.lightningMesh) {
      this.scene.remove(this.lightningMesh);
      this.lightningMesh.geometry.dispose();
    }

    const points: THREE.Vector3[] = [];
    const segments = 12;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = fromX + (toX - fromX) * t + (Math.random() - 0.5) * 30 * (1 - Math.abs(t - 0.5) * 2);
      const y = fromY + (toY - fromY) * t + (Math.random() - 0.5) * 30 * (1 - Math.abs(t - 0.5) * 2);
      points.push(new THREE.Vector3(x, y, 10));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xaa44ff,
      transparent: true,
      opacity: 1,
      linewidth: 3
    });

    this.lightningMesh = new THREE.Line(geometry, material);
    this.scene.add(this.lightningMesh);
    this.lightningLife = 0.5;
  }

  public createShockwave(x: number, y: number): void {
    if (this.shockwaveMesh) {
      this.scene.remove(this.shockwaveMesh);
      this.shockwaveMesh.geometry.dispose();
    }

    const geometry = new THREE.RingGeometry(5, 10, 48);
    const material = new THREE.MeshBasicMaterial({
      color: 0xaa44ff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    this.shockwaveMesh = new THREE.Mesh(geometry, material);
    this.shockwaveMesh.position.set(x, y, 8);
    this.scene.add(this.shockwaveMesh);
    this.shockwaveLife = 0.6;
    this.shockwaveRadius = 0;
  }

  public createFireworks(x: number, y: number): void {
    const colors = [0xffd700, 0xffaa00, 0xff6600, 0xffff66, 0xff4444];
    for (let burst = 0; burst < 3; burst++) {
      setTimeout(() => {
        const bx = x + (Math.random() - 0.5) * 60;
        const by = y + (Math.random() - 0.5) * 60;
        for (let i = 0; i < 40; i++) {
          if (this.particles.length >= this.maxParticles) break;
          const geometry = new THREE.CircleGeometry(3, 8);
          const material = new THREE.MeshBasicMaterial({
            color: colors[Math.floor(Math.random() * colors.length)],
            transparent: true,
            opacity: 1
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(bx, by, 6);

          const angle = (i / 40) * Math.PI * 2 + Math.random() * 0.3;
          const speed = 100 + Math.random() * 150;

          this.scene.add(mesh);
          this.particles.push({
            mesh,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.8 + Math.random() * 0.6,
            maxLife: 1.4,
            type: 'firework'
          });
        }
      }, burst * 200);
    }
  }

  public createPolarityRipple(x: number, y: number, polarity: 'N' | 'S'): void {
    const geometry = new THREE.RingGeometry(15, 20, 48);
    const material = new THREE.MeshBasicMaterial({
      color: polarity === 'N' ? 0xff6666 : 0x66aaff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 3);
    this.scene.add(mesh);

    const startTime = Date.now();
    const duration = 800;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = elapsed / duration;
      if (t >= 1) {
        this.scene.remove(mesh);
        geometry.dispose();
        material.dispose();
        return;
      }
      const scale = 1 + t * 4;
      mesh.scale.set(scale, scale, 1);
      material.opacity = 0.8 * (1 - t);
      requestAnimationFrame(animate);
    };
    animate();
  }

  public createPortalMesh(portalId: string, x: number, y: number): void {
    const geometry = new THREE.CircleGeometry(30, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x22cc66,
      transparent: true,
      opacity: 0.4
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 1);

    const ringGeo = new THREE.RingGeometry(25, 32, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x66ff99,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, y, 2);

    this.scene.add(mesh);
    this.scene.add(ring);
    this.portalMeshes.set(portalId, { mesh, ring });
  }

  public removePortalMesh(portalId: string): void {
    const p = this.portalMeshes.get(portalId);
    if (p) {
      this.scene.remove(p.mesh);
      this.scene.remove(p.ring);
      p.mesh.geometry.dispose();
      p.ring.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      (p.ring.material as THREE.Material).dispose();
      this.portalMeshes.delete(portalId);
    }
  }

  public teleportEffect(x: number, y: number, onComplete: () => void): void {
    let rings = 0;
    const createRing = () => {
      const geometry = new THREE.RingGeometry(10, 15, 32);
      const material = new THREE.MeshBasicMaterial({
        color: 0x66ff99,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.position.set(x, y, 7);
      this.scene.add(ring);

      const startTime = Date.now();
      const duration = 500;
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = elapsed / duration;
        if (t >= 1) {
          this.scene.remove(ring);
          geometry.dispose();
          material.dispose();
          return;
        }
        ring.scale.set(1 + t * 3, 1 + t * 3, 1);
        material.opacity = 0.9 * (1 - t);
        requestAnimationFrame(animate);
      };
      animate();

      rings++;
      if (rings < 3) {
        setTimeout(createRing, 120);
      } else {
        setTimeout(onComplete, 200);
      }
    };
    createRing();
  }

  public createBallFragments(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const size = 3 + Math.random() * 5;
      const geometry = new THREE.CircleGeometry(size, 6);
      const material = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, 4);

      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        type: 'spark'
      });
    }
  }

  public update(deltaTime: number, cameraX: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      if (p.type === 'firework') {
        p.vy += 150 * deltaTime;
      }

      p.mesh.position.x += p.vx * deltaTime;
      p.mesh.position.y += p.vy * deltaTime;
      p.vx *= 0.98;
      p.vy *= 0.98;

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (p.life / p.maxLife) * (p.type === 'firework' ? 1 : 0.8);
    }

    if (this.fieldParticles) {
      const positions = this.fieldParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < this.fieldParticleData.length; i++) {
        const data = this.fieldParticleData[i];
        data.phase += deltaTime * 2;
        positions[i * 3] += data.vx * deltaTime + Math.sin(data.phase) * 5 * deltaTime;
        positions[i * 3 + 1] += data.vy * deltaTime + Math.cos(data.phase) * 5 * deltaTime;

        if (positions[i * 3] < cameraX - 200) positions[i * 3] = cameraX + 2000 + Math.random() * 200;
        if (positions[i * 3] > cameraX + 2200) positions[i * 3] = cameraX - 200 - Math.random() * 200;
        if (positions[i * 3 + 1] < -700) positions[i * 3 + 1] = 700;
        if (positions[i * 3 + 1] > 700) positions[i * 3 + 1] = -700;
      }
      this.fieldParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (this.lightningMesh && this.lightningLife > 0) {
      this.lightningLife -= deltaTime;
      const mat = this.lightningMesh.material as THREE.LineBasicMaterial;
      mat.opacity = Math.max(0, this.lightningLife / 0.5);
      if (this.lightningLife <= 0) {
        this.scene.remove(this.lightningMesh);
        this.lightningMesh.geometry.dispose();
        this.lightningMesh = null;
      }
    }

    if (this.shockwaveMesh && this.shockwaveLife > 0) {
      this.shockwaveLife -= deltaTime;
      this.shockwaveRadius += 120 * deltaTime;
      const t = this.shockwaveLife / 0.6;
      const scale = this.shockwaveRadius / 10;
      this.shockwaveMesh.scale.set(scale, scale, 1);
      (this.shockwaveMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, t * 0.9);
      if (this.shockwaveLife <= 0) {
        this.scene.remove(this.shockwaveMesh);
        this.shockwaveMesh.geometry.dispose();
        this.shockwaveMesh = null;
      }
    }

    for (const { ring } of this.portalMeshes.values()) {
      ring.rotation.z += deltaTime * 2;
    }
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public dispose(): void {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
  }
}
