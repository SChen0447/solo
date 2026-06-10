import * as THREE from 'three';

interface MeteorData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  duration: number;
  isRed: boolean;
  tail: THREE.Vector3[];
}

interface BrightStar {
  mesh: THREE.Mesh;
  baseScale: number;
  nextFlashTime: number;
  flashDuration: number;
  isFlashing: boolean;
  flashStart: number;
}

export class StarField {
  private group: THREE.Group;
  private staticStars: THREE.Points;
  private brightStars: BrightStar[] = [];
  private meteors: MeteorData[] = [];
  private meteorPoints: THREE.Points;
  private meteorGeometry: THREE.BufferGeometry;
  private maxMeteorParticles = 500;
  private nextMeteorTime: number;
  private startTime: number;
  private tailLength = 10;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.startTime = performance.now() * 0.001;
    this.nextMeteorTime = this.startTime + this.randomRange(5, 10);

    this.createStaticStars();
    this.createBrightStars();
    this.createMeteorSystem();

    scene.add(this.group);
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private createStaticStars(): void {
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    const white = new THREE.Color(0xffffff);
    const paleBlue = new THREE.Color(0xaac8ff);
    const tmpColor = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = this.randomRange(20, 60);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(this.randomRange(-1, 1));

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const t = Math.random();
      tmpColor.copy(white).lerp(paleBlue, t);
      colors[i3] = tmpColor.r;
      colors[i3 + 1] = tmpColor.g;
      colors[i3 + 2] = tmpColor.b;

      sizes[i] = this.randomRange(0.02, 0.08);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.staticStars = new THREE.Points(geometry, material);
    this.group.add(this.staticStars);
  }

  private createBrightStars(): void {
    const brightStarCount = 50;
    const geometry = new THREE.SphereGeometry(1, 8, 8);

    for (let i = 0; i < brightStarCount; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffddaa,
        transparent: true,
        opacity: 0.9
      });

      const mesh = new THREE.Mesh(geometry, material);

      const radius = this.randomRange(15, 50);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(this.randomRange(-0.8, 0.9));

      mesh.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );

      const scale = this.randomRange(0.1, 0.2);
      mesh.scale.setScalar(scale);

      this.brightStars.push({
        mesh,
        baseScale: scale,
        nextFlashTime: this.startTime + this.randomRange(0, 1.5),
        flashDuration: this.randomRange(0.2, 0.5),
        isFlashing: false,
        flashStart: 0
      });

      this.group.add(mesh);
    }
  }

  private createMeteorSystem(): void {
    const positions = new Float32Array(this.maxMeteorParticles * 3);
    const colors = new Float32Array(this.maxMeteorParticles * 3);
    const sizes = new Float32Array(this.maxMeteorParticles);

    this.meteorGeometry = new THREE.BufferGeometry();
    this.meteorGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.meteorGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.meteorGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.meteorGeometry.setDrawRange(0, 0);

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.meteorPoints = new THREE.Points(this.meteorGeometry, material);
    this.group.add(this.meteorPoints);
  }

  private spawnMeteor(): void {
    const isRed = Math.random() < 0.05;

    const angle = this.randomRange(30, 60) * (Math.PI / 180);
    const side = Math.random() < 0.5 ? -1 : 1;

    const startX = this.randomRange(-25, 25);
    const startY = this.randomRange(8, 15);
    const startZ = this.randomRange(-5, 10);

    const speed = this.randomRange(30, 45);
    const vx = Math.cos(angle) * speed * side;
    const vy = -Math.sin(angle) * speed;
    const vz = this.randomRange(-5, 5);

    const tail: THREE.Vector3[] = [];
    const startPos = new THREE.Vector3(startX, startY, startZ);
    for (let i = 0; i < this.tailLength; i++) {
      tail.push(startPos.clone());
    }

    this.meteors.push({
      position: startPos.clone(),
      velocity: new THREE.Vector3(vx, vy, vz),
      life: 1.0,
      duration: 0.8,
      isRed,
      tail
    });
  }

  private updateBrightStars(time: number): void {
    for (const star of this.brightStars) {
      if (star.isFlashing) {
        const elapsed = time - star.flashStart;
        if (elapsed >= star.flashDuration) {
          star.isFlashing = false;
          star.nextFlashTime = time + this.randomRange(1.0, 2.0);
          star.mesh.scale.setScalar(star.baseScale);
          (star.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
        } else {
          const t = elapsed / star.flashDuration;
          const flash = Math.sin(t * Math.PI);
          star.mesh.scale.setScalar(star.baseScale * (1 + flash * 0.8));
          (star.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 + flash * 0.1;
        }
      } else if (time >= star.nextFlashTime) {
        star.isFlashing = true;
        star.flashStart = time;
        star.flashDuration = this.randomRange(0.2, 0.5);
      }
    }
  }

  private updateMeteors(dt: number, time: number, camera: THREE.Camera): void {
    if (time >= this.nextMeteorTime) {
      this.spawnMeteor();
      this.nextMeteorTime = time + this.randomRange(5, 10);
    }

    const positions = this.meteorGeometry.attributes.position.array as Float32Array;
    const colors = this.meteorGeometry.attributes.color.array as Float32Array;
    const sizes = this.meteorGeometry.attributes.size.array as Float32Array;

    let particleIndex = 0;
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(matrix);

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const meteor = this.meteors[i];

      meteor.life -= dt / meteor.duration;

      if (meteor.life <= 0) {
        this.meteors.splice(i, 1);
        continue;
      }

      meteor.position.addScaledVector(meteor.velocity, dt);

      meteor.tail.unshift(meteor.position.clone());
      if (meteor.tail.length > this.tailLength) {
        meteor.tail.pop();
      }

      const headColor = meteor.isRed ? new THREE.Color(0xff4444) : new THREE.Color(0xffffff);
      const tailColor = meteor.isRed ? new THREE.Color(0xffaa00) : new THREE.Color(0x44aaff);

      for (let j = 0; j < meteor.tail.length && particleIndex < this.maxMeteorParticles; j++) {
        const tp = meteor.tail[j];

        const sphere = new THREE.Sphere(tp, 0.5);
        if (!frustum.intersectsSphere(sphere) && j > 2) {
          continue;
        }

        const i3 = particleIndex * 3;
        positions[i3] = tp.x;
        positions[i3 + 1] = tp.y;
        positions[i3 + 2] = tp.z;

        const t = j / meteor.tail.length;
        const tmpColor = new THREE.Color().copy(headColor).lerp(tailColor, t);
        const alpha = meteor.life * (1 - t);
        colors[i3] = tmpColor.r * alpha;
        colors[i3 + 1] = tmpColor.g * alpha;
        colors[i3 + 2] = tmpColor.b * alpha;

        sizes[particleIndex] = (1 - t) * meteor.life * this.randomRange(0.1, 0.25);

        particleIndex++;
      }
    }

    this.meteorGeometry.setDrawRange(0, particleIndex);
    this.meteorGeometry.attributes.position.needsUpdate = true;
    this.meteorGeometry.attributes.color.needsUpdate = true;
    this.meteorGeometry.attributes.size.needsUpdate = true;
  }

  public update(time: number, dt: number, camera: THREE.Camera): void {
    this.updateBrightStars(time);
    this.updateMeteors(dt, time, camera);
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public getTotalParticles(): number {
    return 3000 + this.brightStars.length + this.meteors.length * this.tailLength;
  }

  public dispose(): void {
    (this.staticStars.geometry as THREE.BufferGeometry).dispose();
    (this.staticStars.material as THREE.PointsMaterial).dispose();

    for (const star of this.brightStars) {
      (star.mesh.geometry as THREE.BufferGeometry).dispose();
      (star.mesh.material as THREE.MeshBasicMaterial).dispose();
    }

    this.meteorGeometry.dispose();
    (this.meteorPoints.material as THREE.PointsMaterial).dispose();
  }
}
