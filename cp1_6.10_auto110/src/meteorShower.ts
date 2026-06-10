import * as THREE from 'three';

interface Meteor {
  active: boolean;
  startTime: number;
  duration: number;
  startPos: THREE.Vector3;
  velocity: THREE.Vector3;
  gravity: number;
  particleCount: number;
}

export class MeteorShower {
  private scene: THREE.Scene;
  private streams: number;
  private perStream: number;
  private totalParticles: number;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private meteors: Meteor[] = [];
  private pool: Meteor[] = [];
  private light: THREE.PointLight;

  private frequency: number = 10;
  private speedMultiplier: number = 1;
  private lastSpawn: number = 0;
  private nextSpawnInterval: number = 10000;

  private _lastMeteorTime: Date | null = null;
  private isBurst: boolean = false;
  private burstEndTime: number = 0;
  private burstMultiplier: number = 1;

  private readonly TRAIL_LENGTH = 15;
  private readonly BASE_DURATION = 1500;
  private readonly COLOR_WHITE = new THREE.Color('#ffffff');
  private readonly COLOR_BLUE = new THREE.Color('#4fc3f7');
  private readonly SPHERE_RADIUS = 200;

  constructor(scene: THREE.Scene, streams: number, perStream: number) {
    this.scene = scene;
    this.streams = streams;
    this.perStream = perStream;
    this.totalParticles = streams * perStream * this.TRAIL_LENGTH;

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.initParticles();
    this.initPool();

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    this.light = new THREE.PointLight(0x4fc3f7, 0.3, 50);
    this.scene.add(this.light);

    this.scheduleNextSpawn(0);
  }

  private initParticles(): void {
    const positions = new Float32Array(this.totalParticles * 3);
    const colors = new Float32Array(this.totalParticles * 3);
    const alphas = new Float32Array(this.totalParticles);

    for (let i = 0; i < this.totalParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -1000;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 0;
      colors[i * 3 + 2] = 0;
      alphas[i] = 0;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  private initPool(): void {
    const maxMeteors = this.streams * this.perStream * 3;
    for (let i = 0; i < maxMeteors; i++) {
      this.pool.push({
        active: false,
        startTime: 0,
        duration: this.BASE_DURATION,
        startPos: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        gravity: 0.5,
        particleCount: this.TRAIL_LENGTH
      });
    }
  }

  private scheduleNextSpawn(time: number): void {
    const baseInterval = this.frequency * 1000;
    this.nextSpawnInterval = baseInterval * (0.5 + Math.random());
    this.lastSpawn = time;
  }

  private getMeteorFromPool(): Meteor | null {
    for (const m of this.pool) {
      if (!m.active) return m;
    }
    return null;
  }

  private spawnMeteor(time: number): void {
    const meteor = this.getMeteorFromPool();
    if (!meteor) return;

    meteor.active = true;
    meteor.startTime = time;
    meteor.duration = this.BASE_DURATION / this.speedMultiplier;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.5 + Math.PI * 0.25;
    const radius = this.SPHERE_RADIUS * 1.2;

    meteor.startPos.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );

    const dirToCenter = meteor.startPos.clone().negate().normalize();
    const speed = (0.3 + Math.random() * 0.2) * this.speedMultiplier;
    meteor.velocity.copy(dirToCenter).multiplyScalar(speed);
    meteor.gravity = 0.1 + Math.random() * 0.1;

    const tangent = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize().multiplyScalar(speed * 0.3);
    meteor.velocity.add(tangent);

    this._lastMeteorTime = new Date();
    this.meteors.push(meteor);
  }

  private spawnStream(time: number): void {
    const count = Math.floor(this.perStream * this.burstMultiplier);
    for (let i = 0; i < count; i++) {
      setTimeout(() => this.spawnMeteor(time + i * 30), i * 30);
    }
  }

  private checkBurst(time: number): void {
    if (this.isBurst) {
      if (time >= this.burstEndTime) {
        this.isBurst = false;
        this.burstMultiplier = 1;
      }
      return;
    }
    const sinceLastBurst = time - (this.burstEndTime - 3000);
    const burstInterval = (5000 + Math.random() * 10000);
    if (sinceLastBurst > burstInterval && Math.random() < 0.002) {
      this.isBurst = true;
      this.burstMultiplier = 3;
      this.burstEndTime = time + 3000;
    }
  }

  update(delta: number, time: number): void {
    this.checkBurst(time);

    if (time - this.lastSpawn >= this.nextSpawnInterval) {
      for (let s = 0; s < this.streams; s++) {
        this.spawnStream(time);
      }
      this.scheduleNextSpawn(time);
    }

    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < this.totalParticles; i++) {
      positions[i * 3 + 1] = -1000;
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 0;
      colors[i * 3 + 2] = 0;
    }

    let particleIdx = 0;
    const activeMeteors: Meteor[] = [];
    let hasActiveMeteor = false;

    for (const meteor of this.meteors) {
      const elapsed = time - meteor.startTime;
      const t = elapsed / meteor.duration;

      if (t >= 1) {
        meteor.active = false;
        continue;
      }
      activeMeteors.push(meteor);
      hasActiveMeteor = true;

      for (let i = 0; i < this.TRAIL_LENGTH; i++) {
        if (particleIdx >= this.totalParticles) break;
        const trailT = t - (i * 0.015);
        if (trailT < 0) continue;

        const pos = meteor.startPos.clone()
          .add(meteor.velocity.clone().multiplyScalar(elapsed - i * 20))
          .add(new THREE.Vector3(0, -meteor.gravity * Math.pow(elapsed - i * 20, 2) * 0.0001, 0));

        const alpha = Math.max(0, 0.8 * (1 - i / this.TRAIL_LENGTH) * (1 - t * 0.5));
        const colorMix = i / this.TRAIL_LENGTH;
        const r = this.COLOR_WHITE.r * (1 - colorMix) + this.COLOR_BLUE.r * colorMix;
        const g = this.COLOR_WHITE.g * (1 - colorMix) + this.COLOR_BLUE.g * colorMix;
        const b = this.COLOR_WHITE.b * (1 - colorMix) + this.COLOR_BLUE.b * colorMix;

        positions[particleIdx * 3] = pos.x;
        positions[particleIdx * 3 + 1] = pos.y;
        positions[particleIdx * 3 + 2] = pos.z;
        colors[particleIdx * 3] = r * alpha;
        colors[particleIdx * 3 + 1] = g * alpha;
        colors[particleIdx * 3 + 2] = b * alpha;

        particleIdx++;
      }
    }

    if (hasActiveMeteor && activeMeteors.length > 0) {
      const head = activeMeteors[0];
      const elapsed = time - head.startTime;
      const headPos = head.startPos.clone()
        .add(head.velocity.clone().multiplyScalar(elapsed));
      this.light.position.copy(headPos);
      this.light.intensity = 0.3;
    } else {
      this.light.intensity = 0;
    }

    this.meteors = activeMeteors;
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  setFrequency(seconds: number): void {
    this.frequency = Math.max(1, Math.min(30, seconds));
  }

  setSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(0.5, Math.min(2, multiplier));
  }

  get lastMeteorTime(): Date | null {
    return this._lastMeteorTime;
  }

  triggerBurst(): void {
    this.isBurst = true;
    this.burstMultiplier = 3;
    this.burstEndTime = performance.now() + 3000;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.points);
    this.scene.remove(this.light);
  }
}
