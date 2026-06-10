import * as THREE from 'three';

interface Particle {
  initialPosition: THREE.Vector3;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  baseColor: THREE.Color;
  currentColor: THREE.Color;
  size: number;
  baseSize: number;
  rotationSpeed: number;
  rotation: number;
  pulsePhase: number;
  pulseSpeed: number;
  isAttracted: boolean;
  targetPosition: THREE.Vector3;
  returning: boolean;
  returnProgress: number;
  returnStart: THREE.Vector3;
  colorOffset: { r: number; g: number; b: number };
  colorPhase: number;
}

interface TrailParticle {
  position: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

type EventCallback = (data?: unknown) => void;

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private points!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;
  private trailParticles: TrailParticle[] = [];
  private trailMesh!: THREE.Points;
  private trailGeometry!: THREE.BufferGeometry;
  private trailMaterial!: THREE.PointsMaterial;
  private maxParticles: number = 4500;
  private attractionStrength: number = 2.0;
  private rotationSpeed: number = 0.02;
  private particleBaseSize: number = 0.04;
  private isMouseDown: boolean = false;
  private mouseWorldPosition: THREE.Vector3 = new THREE.Vector3();
  private mouseVelocity: THREE.Vector3 = new THREE.Vector3();
  private lastMousePosition: THREE.Vector3 = new THREE.Vector3();
  private group: THREE.Group;
  private resetting: boolean = false;
  private resetProgress: number = 0;
  private preResetPositions: THREE.Vector3[] = [];
  private eventListeners: Map<string, EventCallback[]> = new Map();

  constructor(scene: THREE.Scene, viewportWidth: number = 1920) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.updateParticleCountForViewport(viewportWidth);
    this.init();
  }

  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => cb(data));
    }
  }

  updateParticleCountForViewport(width: number): void {
    if (width < 768) {
      this.maxParticles = 3000;
    } else {
      this.maxParticles = 4500;
    }
  }

  private init(): void {
    this.createParticles();
    this.createTrailSystem();
  }

  private createParticles(): void {
    this.geometry = new THREE.BufferGeometry();
    this.particles = [];

    for (let i = 0; i < this.maxParticles; i++) {
      const particle = this.createParticle();
      this.particles.push(particle);
    }

    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);

    for (let i = 0; i < this.maxParticles; i++) {
      positions[i * 3] = this.particles[i].position.x;
      positions[i * 3 + 1] = this.particles[i].position.y;
      positions[i * 3 + 2] = this.particles[i].position.z;

      colors[i * 3] = this.particles[i].currentColor.r;
      colors[i * 3 + 1] = this.particles[i].currentColor.g;
      colors[i * 3 + 2] = this.particles[i].currentColor.b;

      sizes[i] = this.particles[i].size;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: this.particleBaseSize,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);

    this.emit('particlesCreated', { count: this.maxParticles });
  }

  createParticle(): Particle {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = Math.cbrt(Math.random()) * 8;

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    const position = new THREE.Vector3(x, y, z);
    const initialPosition = position.clone();

    const colorStart = new THREE.Color('#ff6b6b');
    const colorEnd = new THREE.Color('#48dbfb');
    const t = Math.random();
    const baseColor = colorStart.clone().lerp(colorEnd, t);
    const currentColor = baseColor.clone();

    const baseSize = 0.8 + Math.random() * 0.6;

    return {
      initialPosition,
      position,
      velocity: new THREE.Vector3(0, 0, 0),
      baseColor,
      currentColor,
      size: baseSize,
      baseSize,
      rotationSpeed: 0.001 + Math.random() * 0.004,
      rotation: Math.random() * Math.PI * 2,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: (2 * Math.PI) / (1.5 + Math.random() * 1.5),
      isAttracted: false,
      targetPosition: new THREE.Vector3(),
      returning: false,
      returnProgress: 0,
      returnStart: new THREE.Vector3(),
      colorOffset: {
        r: Math.random() * Math.PI * 2,
        g: Math.random() * Math.PI * 2,
        b: Math.random() * Math.PI * 2,
      },
      colorPhase: Math.random() * 0.02,
    };
  }

  private createTrailSystem(): void {
    const maxTrailParticles = 500;
    this.trailGeometry = new THREE.BufferGeometry();

    const trailPositions = new Float32Array(maxTrailParticles * 3);
    const trailColors = new Float32Array(maxTrailParticles * 3);
    const trailSizes = new Float32Array(maxTrailParticles);

    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    this.trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));
    this.trailGeometry.setDrawRange(0, 0);

    this.trailMaterial = new THREE.PointsMaterial({
      size: 0.2,
      color: new THREE.Color('#f39c12'),
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.trailMesh = new THREE.Points(this.trailGeometry, this.trailMaterial);
    this.group.add(this.trailMesh);
  }

  setParticleSize(size: number): void {
    this.particleBaseSize = size;
    this.material.size = size;
  }

  setAttractionStrength(strength: number): void {
    this.attractionStrength = strength;
  }

  setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  setMouseDown(down: boolean, worldPos?: THREE.Vector3): void {
    this.isMouseDown = down;
    if (worldPos) {
      this.mouseWorldPosition.copy(worldPos);
      this.lastMousePosition.copy(worldPos);
    }

    if (!down) {
      for (const particle of this.particles) {
        if (particle.isAttracted) {
          particle.returning = true;
          particle.returnProgress = 0;
          particle.returnStart.copy(particle.position);
          particle.isAttracted = false;
        }
      }
    }
  }

  setMousePosition(worldPos: THREE.Vector3, deltaTime: number): void {
    this.mouseVelocity.subVectors(worldPos, this.lastMousePosition);
    if (deltaTime > 0) {
      this.mouseVelocity.divideScalar(deltaTime);
    }
    this.lastMousePosition.copy(worldPos);
    this.mouseWorldPosition.copy(worldPos);

    if (this.isMouseDown && Math.random() < 0.6) {
      this.addTrailParticle(worldPos);
    }
  }

  private addTrailParticle(position: THREE.Vector3): void {
    if (this.trailParticles.length < 500) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      );
      this.trailParticles.push({
        position: position.clone().add(offset),
        life: 0.8,
        maxLife: 0.8,
        size: 0.15 + Math.random() * 0.1,
      });
    }
  }

  reset(): void {
    this.resetting = true;
    this.resetProgress = 0;
    this.preResetPositions = this.particles.map((p) => p.position.clone());
    this.emit('resetStarted');
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  updateParticles(deltaTime: number): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    if (this.resetting) {
      this.resetProgress += deltaTime;
      const t = Math.min(this.resetProgress / 1.0, 1);
      const eased = this.easeOutCubic(t);

      for (let i = 0; i < this.particles.length; i++) {
        const particle = this.particles[i];
        particle.position.lerpVectors(this.preResetPositions[i], particle.initialPosition, eased);
        particle.velocity.set(0, 0, 0);
        particle.isAttracted = false;
        particle.returning = false;

        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;

        const pulse = 1 + 0.15 * Math.sin(particle.pulsePhase);
        sizes[i] = particle.baseSize * pulse;

        colors[i * 3] = particle.currentColor.r;
        colors[i * 3 + 1] = particle.currentColor.g;
        colors[i * 3 + 2] = particle.currentColor.b;
      }

      if (t >= 1) {
        this.resetting = false;
        this.preResetPositions = [];
      }
    } else {
      for (let i = 0; i < this.particles.length; i++) {
        const particle = this.particles[i];

        if (particle.returning) {
          particle.returnProgress += deltaTime;
          const t = Math.min(particle.returnProgress / 0.5, 1);
          const eased = this.easeOutCubic(t);
          particle.position.lerpVectors(particle.returnStart, particle.initialPosition, eased);

          if (t >= 1) {
            particle.returning = false;
          }
        } else if (this.isMouseDown) {
          const distanceToMouse = particle.position.distanceTo(this.mouseWorldPosition);
          const attractRadius = 5.0;

          if (distanceToMouse < attractRadius || particle.isAttracted) {
            particle.isAttracted = true;

            const direction = new THREE.Vector3()
              .subVectors(this.mouseWorldPosition, particle.position)
              .normalize();

            const speedBoost = this.mouseVelocity.length() * 0.02;
            const attractionForce = (this.attractionStrength * (1 - distanceToMouse / attractRadius)) + speedBoost;

            particle.velocity.add(direction.multiplyScalar(attractionForce * deltaTime * 60));
            particle.velocity.multiplyScalar(0.92);
            particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime * 60));
          } else {
            particle.velocity.multiplyScalar(0.95);
            particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime * 60));
          }
        } else {
          particle.velocity.multiplyScalar(0.98);
          particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime * 60));
        }

        particle.pulsePhase += particle.pulseSpeed * deltaTime;
        particle.rotation += particle.rotationSpeed * deltaTime * 60;
        particle.colorPhase += deltaTime * 0.5;

        const colorVariation = 10 / 255;
        particle.currentColor.r = particle.baseColor.r + Math.sin(particle.colorPhase + particle.colorOffset.r) * colorVariation;
        particle.currentColor.g = particle.baseColor.g + Math.sin(particle.colorPhase + particle.colorOffset.g) * colorVariation;
        particle.currentColor.b = particle.baseColor.b + Math.sin(particle.colorPhase + particle.colorOffset.b) * colorVariation;

        particle.currentColor.r = Math.max(0, Math.min(1, particle.currentColor.r));
        particle.currentColor.g = Math.max(0, Math.min(1, particle.currentColor.g));
        particle.currentColor.b = Math.max(0, Math.min(1, particle.currentColor.b));

        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;

        const pulse = 1 + 0.15 * Math.sin(particle.pulsePhase);
        sizes[i] = particle.baseSize * pulse;

        colors[i * 3] = particle.currentColor.r;
        colors[i * 3 + 1] = particle.currentColor.g;
        colors[i * 3 + 2] = particle.currentColor.b;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    this.group.rotation.y += this.rotationSpeed * deltaTime * 60;

    this.updateTrailParticles(deltaTime);
  }

  private updateTrailParticles(deltaTime: number): void {
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      this.trailParticles[i].life -= deltaTime;
      if (this.trailParticles[i].life <= 0) {
        this.trailParticles.splice(i, 1);
      }
    }

    const trailPositions = this.trailGeometry.attributes.position.array as Float32Array;
    const trailColors = this.trailGeometry.attributes.color.array as Float32Array;
    const trailSizes = this.trailGeometry.attributes.size.array as Float32Array;

    const trailColor = new THREE.Color('#f39c12');

    for (let i = 0; i < this.trailParticles.length; i++) {
      const trail = this.trailParticles[i];
      const alpha = trail.life / trail.maxLife;

      trailPositions[i * 3] = trail.position.x;
      trailPositions[i * 3 + 1] = trail.position.y;
      trailPositions[i * 3 + 2] = trail.position.z;

      trailColors[i * 3] = trailColor.r;
      trailColors[i * 3 + 1] = trailColor.g;
      trailColors[i * 3 + 2] = trailColor.b;

      trailSizes[i] = trail.size * alpha;
    }

    this.trailGeometry.setDrawRange(0, this.trailParticles.length);
    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
    this.trailGeometry.attributes.size.needsUpdate = true;
    this.trailMaterial.opacity = 0.8;
  }

  getParticlePositions(): Float32Array {
    return this.geometry.attributes.position.array as Float32Array;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    this.group.remove(this.points);
    this.group.remove(this.trailMesh);
    this.scene.remove(this.group);
  }
}
