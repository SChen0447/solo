import * as THREE from 'three';
import { FlameParticle, AshParticle, WindParams } from './flameParticle';

const BASE_PARTICLE_COUNT = 600;
const MIN_PARTICLE_COUNT = 500;
const MAX_PARTICLE_COUNT = 1000;
const WIND_BURST_COUNT = 900;
const WIND_DURATION = 1.5 * 60;
const WIND_BURST_PARTICLES_DURATION = 0.8 * 60;
const ASH_BURST_COUNT = 80;
const HALO_RADIUS = 150;
const HALO_PULSE_PERIOD = 60;

export class FireManager {
  private scene: THREE.Scene;
  private flameParticles: FlameParticle[] = [];
  private ashParticles: AshParticle[] = [];
  private flameMaterial: THREE.SpriteMaterial;
  private ashMaterial: THREE.SpriteMaterial;
  private haloMesh: THREE.Mesh;
  private haloLight: THREE.PointLight;
  private woodLight: THREE.PointLight;
  private groundLight: THREE.PointLight;
  private targetParticleCount: number = BASE_PARTICLE_COUNT;
  private burstCountdown: number = 0;
  private time: number = 0;
  private centerX: number = 0;
  private centerZ: number = 0;
  private lastFps: number = 60;
  private fpsCounter: number = 0;
  private fpsTimer: number = 0;

  wind: WindParams = {
    direction: 0,
    intensity: 0,
    active: false,
    timeRemaining: 0
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const flameCanvas = this.createParticleCanvas('#FFD700', 64);
    const flameTexture = new THREE.CanvasTexture(flameCanvas);
    this.flameMaterial = new THREE.SpriteMaterial({
      map: flameTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xffffff
    });

    const ashCanvas = this.createParticleCanvas('#C0C0C0', 32);
    const ashTexture = new THREE.CanvasTexture(ashCanvas);
    this.ashMaterial = new THREE.SpriteMaterial({
      map: ashTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xffffff
    });

    const haloGeometry = new THREE.PlaneGeometry(HALO_RADIUS * 2.5, HALO_RADIUS * 2.5);
    const haloCanvas = this.createHaloCanvas();
    const haloTexture = new THREE.CanvasTexture(haloCanvas);
    const haloMaterial = new THREE.MeshBasicMaterial({
      map: haloTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: 0.2
    });
    this.haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
    this.haloMesh.rotation.x = -Math.PI / 2;
    this.haloMesh.position.set(0, 2, 0);
    this.scene.add(this.haloMesh);

    this.haloLight = new THREE.PointLight(0xFF8C30, 2, 200, 2);
    this.haloLight.position.set(0, 25, 0);
    this.scene.add(this.haloLight);

    this.woodLight = new THREE.PointLight(0xFF6622, 1.2, 80, 2);
    this.woodLight.position.set(0, 5, 0);
    this.scene.add(this.woodLight);

    this.groundLight = new THREE.PointLight(0xFF5522, 0.8, 150, 2);
    this.groundLight.position.set(0, 0.5, 0);
    this.scene.add(this.groundLight);

    this.initParticles();
  }

  private createParticleCanvas(color: string, size: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,230,180,0.9)');
    gradient.addColorStop(0.6, 'rgba(255,180,100,0.5)');
    gradient.addColorStop(1, 'rgba(255,100,50,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  private createHaloCanvas(): HTMLCanvasElement {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,200,100,0.9)');
    gradient.addColorStop(0.3, 'rgba(255,140,50,0.5)');
    gradient.addColorStop(0.6, 'rgba(200,80,120,0.2)');
    gradient.addColorStop(1, 'rgba(100,60,150,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  private initParticles() {
    for (let i = 0; i < BASE_PARTICLE_COUNT; i++) {
      const particle = new FlameParticle(this.centerX, this.centerZ, this.flameMaterial);
      particle.life = Math.random() * particle.maxLife;
      this.flameParticles.push(particle);
      this.scene.add(particle.mesh);
    }
  }

  triggerWind(): boolean {
    if (this.wind.active) return false;

    const direction = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 2 + (Math.random() - 0.5) * 0.5);
    const tiltAngle = (15 + Math.random() * 10) * Math.PI / 180;
    const intensity = Math.tan(tiltAngle);

    this.wind = {
      direction,
      intensity,
      active: true,
      timeRemaining: WIND_DURATION
    };

    this.targetParticleCount = WIND_BURST_COUNT;
    this.burstCountdown = WIND_BURST_PARTICLES_DURATION;

    const flameCenterY = 30;
    for (let i = 0; i < ASH_BURST_COUNT; i++) {
      const ash = new AshParticle(this.centerX, flameCenterY, this.centerZ, this.ashMaterial);
      this.ashParticles.push(ash);
      this.scene.add(ash.mesh);
    }

    return true;
  }

  setCenter(x: number, z: number) {
    this.centerX = x;
    this.centerZ = z;
  }

  private adjustParticleCount() {
    const currentActive = this.flameParticles.filter(p => !p.isDying).length;
    const diff = this.targetParticleCount - currentActive;

    if (diff > 0) {
      const toAdd = Math.min(diff, 15);
      for (let i = 0; i < toAdd; i++) {
        if (this.flameParticles.length < MAX_PARTICLE_COUNT) {
          const particle = new FlameParticle(this.centerX, this.centerZ, this.flameMaterial);
          this.flameParticles.push(particle);
          this.scene.add(particle.mesh);
        }
      }
    }
  }

  update(deltaTime: number) {
    this.time += 1;
    this.fpsCounter++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 1) {
      this.lastFps = this.fpsCounter / this.fpsTimer;
      this.fpsCounter = 0;
      this.fpsTimer = 0;

      if (this.lastFps < 50 && this.targetParticleCount > MIN_PARTICLE_COUNT) {
        this.targetParticleCount = Math.max(MIN_PARTICLE_COUNT, this.targetParticleCount - 50);
      } else if (this.lastFps > 58 && this.targetParticleCount < BASE_PARTICLE_COUNT && !this.wind.active) {
        this.targetParticleCount = Math.min(BASE_PARTICLE_COUNT, this.targetParticleCount + 20);
      }
    }

    if (this.wind.active) {
      this.wind.timeRemaining -= 1;
      const t = 1 - this.wind.timeRemaining / WIND_DURATION;
      const easeFactor = Math.sin(t * Math.PI);
      this.wind.intensity *= (1 - 0.003);

      if (this.wind.timeRemaining <= 0) {
        this.wind.active = false;
        this.wind.intensity = 0;
      }
    }

    if (this.burstCountdown > 0) {
      this.burstCountdown -= 1;
      if (this.burstCountdown <= 0) {
        this.targetParticleCount = BASE_PARTICLE_COUNT;
      }
    }

    this.adjustParticleCount();

    for (let i = this.flameParticles.length - 1; i >= 0; i--) {
      const particle = this.flameParticles[i];
      const shouldRemove = particle.update(this.wind, this.time);

      if (shouldRemove) {
        this.scene.remove(particle.mesh);
        (particle.mesh.material as THREE.Material).dispose();
        this.flameParticles.splice(i, 1);
      } else if (!particle.isDying && this.flameParticles.length > MIN_PARTICLE_COUNT && this.targetParticleCount < this.flameParticles.length) {
        if (particle.life > particle.maxLife * 0.95) {
          particle.isDying = true;
        }
      }
    }

    for (let i = this.ashParticles.length - 1; i >= 0; i--) {
      const ash = this.ashParticles[i];
      const shouldRemove = ash.update();
      if (shouldRemove) {
        this.scene.remove(ash.mesh);
        (ash.mesh.material as THREE.Material).dispose();
        this.ashParticles.splice(i, 1);
      }
    }

    const pulse = 0.85 + Math.sin(this.time * Math.PI * 2 / HALO_PULSE_PERIOD) * 0.15;
    const windBoost = this.wind.active ? 1 + this.wind.intensity * 0.3 : 1;
    const intensityMod = pulse * windBoost;

    const haloMat = this.haloMesh.material as THREE.MeshBasicMaterial;
    haloMat.opacity = 0.2 * intensityMod;
    const haloScale = 1 + Math.sin(this.time * 0.02) * 0.05;
    this.haloMesh.scale.set(haloScale, haloScale, haloScale);
    this.haloMesh.position.y = 2 + Math.sin(this.time * 0.03) * 1;

    this.haloLight.intensity = 2 * intensityMod;
    this.haloLight.position.y = 25 + Math.sin(this.time * 0.02) * 3;

    this.woodLight.intensity = 1.2 * intensityMod;
    this.groundLight.intensity = 0.8 * intensityMod;

    const lightSway = this.wind.active ? Math.cos(this.wind.direction) * this.wind.intensity * 8 : 0;
    this.haloLight.position.x = lightSway;
    this.woodLight.position.x = lightSway * 0.5;
    this.groundLight.position.x = lightSway * 0.3;
  }

  getFlameParticles(): FlameParticle[] {
    return this.flameParticles;
  }

  getParticleCount(): number {
    return this.flameParticles.length + this.ashParticles.length;
  }

  getFps(): number {
    return this.lastFps;
  }

  getHaloMesh(): THREE.Mesh {
    return this.haloMesh;
  }
}
