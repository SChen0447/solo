import * as THREE from 'three';

const MAX_PARTICLES = 1600;
const TRAIL_LENGTH = 5;

interface AccretionParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  angle: number;
  angularSpeed: number;
  spiralSpeed: number;
  age: number;
  trail: THREE.Vector3[];
  isJet: boolean;
  jetAxis: THREE.Vector3;
  life: number;
  maxLife: number;
  distortionOffset: THREE.Vector3;
  distortionVelocity: THREE.Vector3;
}

export class ParticleSystem {
  public group: THREE.Group;
  private scene: THREE.Scene;
  private particles: AccretionParticle[] = [];
  private particleMeshes: Map<AccretionParticle, THREE.Mesh[]> = new Map();
  private glowEffects: { mesh: THREE.Mesh; life: number; maxLife: number }[] = [];
  private lensFlareRing: THREE.Mesh | null = null;
  private lensFlareActive = false;
  private lensFlareTimer = 0;
  private jetTimer = 0;
  private mode: 'normal' | 'xray' = 'normal';
  private distortionActive = false;
  private distortionDirection = new THREE.Vector2();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.createLensFlareRing();
  }

  private createLensFlareRing() {
    const geometry = new THREE.RingGeometry(2.5, 4, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vDist;
        void main() {
          vUv = uv;
          vDist = length(position.xy);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform float uTime;
        varying vec2 vUv;
        varying float vDist;
        void main() {
          float alpha = uOpacity * (1.0 - smoothstep(2.5, 4.0, vDist));
          float pulse = 0.8 + 0.2 * sin(uTime * 8.0);
          gl_FragColor = vec4(vec3(1.0, 0.95, 0.85), alpha * pulse);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.lensFlareRing = new THREE.Mesh(geometry, material);
    this.lensFlareRing.rotation.x = -Math.PI / 2;
    this.lensFlareRing.visible = false;
    this.group.add(this.lensFlareRing);
  }

  public triggerLensFlare() {
    this.lensFlareActive = true;
    this.lensFlareTimer = 0.3;
    if (this.lensFlareRing) {
      this.lensFlareRing.visible = true;
    }
    for (const [particle, meshes] of this.particleMeshes) {
      for (const mesh of meshes) {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.setHex(0xffffff);
      }
    }
  }

  public setMode(mode: 'normal' | 'xray') {
    this.mode = mode;
    for (const [particle, meshes] of this.particleMeshes) {
      this.updateParticleColor(particle, meshes);
    }
  }

  public getMode(): 'normal' | 'xray' {
    return this.mode;
  }

  public setDistortion(active: boolean, direction: THREE.Vector2) {
    this.distortionActive = active;
    this.distortionDirection.copy(direction);
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  private createParticleMesh(color: number, size: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    return new THREE.Mesh(geometry, material);
  }

  private spawnAccretionParticle() {
    if (this.particles.length >= MAX_PARTICLES) return;

    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 1;
    const yOffset = (Math.random() - 0.5) * 0.3;

    const particle: AccretionParticle = {
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        yOffset,
        Math.sin(angle) * radius
      ),
      velocity: new THREE.Vector3(),
      radius,
      angle,
      angularSpeed: 0.8 + Math.random() * 0.4,
      spiralSpeed: 0.3 + Math.random() * 0.2,
      age: 0,
      trail: [],
      isJet: false,
      jetAxis: new THREE.Vector3(),
      life: 0,
      maxLife: 10,
      distortionOffset: new THREE.Vector3(),
      distortionVelocity: new THREE.Vector3()
    };

    const meshes: THREE.Mesh[] = [];
    const mainMesh = this.createParticleMesh(0xffaa44, 0.05);
    this.group.add(mainMesh);
    meshes.push(mainMesh);

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const trailMesh = this.createParticleMesh(0xffaa44, 0.05 * (1 - i / TRAIL_LENGTH));
      const trailMat = trailMesh.material as THREE.MeshBasicMaterial;
      trailMat.opacity = 0.4 * (1 - i / TRAIL_LENGTH);
      this.group.add(trailMesh);
      meshes.push(trailMesh);
    }

    this.particles.push(particle);
    this.particleMeshes.set(particle, meshes);
  }

  private spawnJetParticles() {
    if (this.particles.length + 160 > MAX_PARTICLES) return;

    for (const axisSign of [1, -1]) {
      for (let i = 0; i < 80; i++) {
        const spreadAngle = (Math.random() * 15 * Math.PI) / 180;
        const azimuth = Math.random() * Math.PI * 2;

        const direction = new THREE.Vector3(
          Math.sin(spreadAngle) * Math.cos(azimuth),
          axisSign * Math.cos(spreadAngle),
          Math.sin(spreadAngle) * Math.sin(azimuth)
        ).normalize();

        const speed = 2 + Math.random() * 1;

        const particle: AccretionParticle = {
          position: new THREE.Vector3(0, axisSign * 1.5, 0),
          velocity: direction.multiplyScalar(speed),
          radius: 0,
          angle: 0,
          angularSpeed: 0,
          spiralSpeed: 0,
          age: 0,
          trail: [],
          isJet: true,
          jetAxis: new THREE.Vector3(0, axisSign, 0),
          life: 0,
          maxLife: 0.5,
          distortionOffset: new THREE.Vector3(),
          distortionVelocity: new THREE.Vector3()
        };

        const meshes: THREE.Mesh[] = [];
        const mainMesh = this.createParticleMesh(0x4488ff, 0.1);
        this.group.add(mainMesh);
        meshes.push(mainMesh);

        for (let j = 0; j < TRAIL_LENGTH; j++) {
          const trailMesh = this.createParticleMesh(0x4488ff, 0.1 * (1 - j / TRAIL_LENGTH));
          const trailMat = trailMesh.material as THREE.MeshBasicMaterial;
          trailMat.opacity = 0.35 * (1 - j / TRAIL_LENGTH);
          this.group.add(trailMesh);
          meshes.push(trailMesh);
        }

        this.particles.push(particle);
        this.particleMeshes.set(particle, meshes);
      }
    }
  }

  private spawnGlowEffect(position: THREE.Vector3) {
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    this.group.add(mesh);
    this.glowEffects.push({ mesh, life: 0, maxLife: 0.2 });
  }

  private getParticleColor(particle: AccretionParticle): THREE.Color {
    if (this.mode === 'xray') {
      const speed = particle.isJet
        ? particle.velocity.length()
        : particle.angularSpeed * particle.radius;
      const brightness = Math.min(1, speed / 4);
      const gray = 0.1 + brightness * 0.9;
      return new THREE.Color(gray, gray, gray);
    }

    if (particle.isJet) {
      return new THREE.Color(0x4488ff);
    }

    const t = 1 - Math.max(0, (particle.radius - 1) / 2);
    if (t < 0.5) {
      const u = t * 2;
      return new THREE.Color().lerpColors(
        new THREE.Color(0xffaa44),
        new THREE.Color(0xff3300),
        u
      );
    } else {
      const u = (t - 0.5) * 2;
      return new THREE.Color().lerpColors(
        new THREE.Color(0xff3300),
        new THREE.Color(0x6600aa),
        u
      );
    }
  }

  private updateParticleColor(particle: AccretionParticle, meshes: THREE.Mesh[]) {
    const color = this.lensFlareActive && this.lensFlareTimer > 0
      ? new THREE.Color(0xffffff)
      : this.getParticleColor(particle);

    for (let i = 0; i < meshes.length; i++) {
      const mat = meshes[i].material as THREE.MeshBasicMaterial;
      if (i === 0) {
        mat.color.copy(color);
      } else {
        const trailColor = color.clone();
        mat.color.copy(trailColor);
      }
    }
  }

  public update(dt: number) {
    for (let i = 0; i < 8; i++) {
      this.spawnAccretionParticle();
    }

    this.jetTimer += dt;
    if (this.jetTimer >= 2) {
      this.jetTimer = 0;
      this.spawnJetParticles();
    }

    if (this.lensFlareActive) {
      this.lensFlareTimer -= dt;
      if (this.lensFlareRing) {
        const mat = this.lensFlareRing.material as THREE.ShaderMaterial;
        mat.uniforms.uTime.value += dt;
        mat.uniforms.uOpacity.value = Math.max(0, this.lensFlareTimer / 0.3) * 0.6;
      }
      if (this.lensFlareTimer <= 0) {
        this.lensFlareActive = false;
        if (this.lensFlareRing) {
          this.lensFlareRing.visible = false;
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;

      if (this.distortionActive) {
        const strength = 0.1;
        p.distortionVelocity.x += this.distortionDirection.x * strength * dt * 2;
        p.distortionVelocity.z += this.distortionDirection.y * strength * dt * 2;
      }
      p.distortionOffset.add(p.distortionVelocity.clone().multiplyScalar(dt));
      p.distortionVelocity.multiplyScalar(Math.pow(0.01, dt / 0.5));
      p.distortionOffset.multiplyScalar(Math.pow(0.01, dt / 0.5));

      if (p.isJet) {
        p.life += dt;
        p.position.add(p.velocity.clone().multiplyScalar(dt));

        if (p.life >= p.maxLife) {
          this.removeParticle(i);
          continue;
        }
      } else {
        p.radius -= p.spiralSpeed * dt;
        p.angularSpeed += 0.15 * dt;
        p.angle += p.angularSpeed * dt;

        if (p.radius <= 1) {
          this.spawnGlowEffect(p.position.clone());
          this.removeParticle(i);
          continue;
        }

        p.position.set(
          Math.cos(p.angle) * p.radius,
          (Math.random() - 0.5) * 0.05,
          Math.sin(p.angle) * p.radius
        );
      }

      p.trail.unshift(p.position.clone());
      if (p.trail.length > TRAIL_LENGTH) {
        p.trail.pop();
      }

      const meshes = this.particleMeshes.get(p);
      if (meshes) {
        this.updateParticleColor(p, meshes);

        const finalPos = p.position.clone().add(p.distortionOffset);
        meshes[0].position.copy(finalPos);

        for (let j = 0; j < p.trail.length && j + 1 < meshes.length; j++) {
          const trailPos = p.trail[j].clone().add(p.distortionOffset);
          meshes[j + 1].position.copy(trailPos);
        }
      }
    }

    for (let i = this.glowEffects.length - 1; i >= 0; i--) {
      const glow = this.glowEffects[i];
      glow.life += dt;
      const t = glow.life / glow.maxLife;
      const mat = glow.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.8 * (1 - t);
      glow.mesh.scale.setScalar(1 + t * 0.5);

      if (glow.life >= glow.maxLife) {
        this.group.remove(glow.mesh);
        glow.mesh.geometry.dispose();
        (glow.mesh.material as THREE.Material).dispose();
        this.glowEffects.splice(i, 1);
      }
    }
  }

  private removeParticle(index: number) {
    const p = this.particles[index];
    const meshes = this.particleMeshes.get(p);
    if (meshes) {
      for (const mesh of meshes) {
        this.group.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      this.particleMeshes.delete(p);
    }
    this.particles.splice(index, 1);
  }
}
