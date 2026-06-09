import * as THREE from 'three';

export interface CelestialBody {
  name: string;
  radius: number;
  mesh: THREE.Mesh;
  angle: number;
  orbitRadius: number;
  orbitSpeed: number;
  rotationSpeed: number;
}

export class SolarSystem {
  public scene: THREE.Scene;
  public sun!: THREE.Mesh;
  public sunGlow!: THREE.Mesh;
  public earth!: THREE.Mesh;
  public moon!: THREE.Mesh;
  public moonHalo!: THREE.Mesh;

  public sunGroup: THREE.Group;
  public earthOrbitGroup: THREE.Group;
  public earthGroup: THREE.Group;

  public earthOrbitLine!: THREE.Line;
  public moonOrbitLine!: THREE.Line;

  public earthOrbitMarkers: THREE.Points;
  public moonOrbitMarkers: THREE.Points;

  private sunAngle: number = 0;
  private earthAngle: number = 0;
  private moonAngle: number = 0;

  private defaultEarthOrbitRadius: number = 15;
  private moonOrbitRadius: number = 3.2;
  private earthOrbitSpeed: number = 0.5 * (Math.PI / 180);
  private moonOrbitSpeed: number = (0.5 * (Math.PI / 180)) * (365 / 29.5);
  private sunRotationSpeed: number = 0.002;
  private earthRotationSpeed: number = 0.01;
  private moonRotationSpeed: number = 0.005;

  public raycaster: THREE.Raycaster;
  public bodies: CelestialBody[] = [];

  private gridHelper: THREE.GridHelper;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sunGroup = new THREE.Group();
    this.earthOrbitGroup = new THREE.Group();
    this.earthGroup = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.earthOrbitMarkers = new THREE.Points();
    this.moonOrbitMarkers = new THREE.Points();
    this.gridHelper = new THREE.GridHelper(20, 20, 0x4488ff, 0x4488ff);

    this.init();
  }

  private init(): void {
    this.createGrid();
    this.createSun();
    this.createEarthOrbit();
    this.createEarth();
    this.createMoonOrbit();
    this.createMoon();
    this.registerBodies();
  }

  private createGrid(): void {
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = 0.15;
    (this.gridHelper.material as THREE.Material).depthWrite = false;
    this.scene.add(this.gridHelper);
  }

  private createSunTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, '#fff5a0');
    gradient.addColorStop(0.3, '#ffcc33');
    gradient.addColorStop(0.6, '#ff8800');
    gradient.addColorStop(1, '#cc4400');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 15 + 3;
      const alpha = Math.random() * 0.4 + 0.1;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,220,100,${alpha})`);
      g.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createSun(): void {
    const sunGeo = new THREE.SphereGeometry(2, 64, 64);
    const sunMat = new THREE.MeshBasicMaterial({
      map: this.createSunTexture(),
      color: 0xffffff
    });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.name = 'Sun';
    this.sunGroup.add(this.sun);

    const glowGeo = new THREE.SphereGeometry(2.8, 64, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sunGlow = new THREE.Mesh(glowGeo, glowMat);
    this.sunGlow.name = 'SunGlow';
    this.sunGroup.add(this.sunGlow);

    const pointLight = new THREE.PointLight(0xffffff, 2, 100);
    pointLight.position.set(0, 0, 0);
    this.sunGroup.add(pointLight);

    this.scene.add(this.sunGroup);
  }

  private createOrbitLine(radius: number): THREE.Line {
    const segments = 128;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x66aaff,
      transparent: true,
      opacity: 0.2,
      depthWrite: false
    });
    return new THREE.Line(geo, mat);
  }

  private createOrbitMarkers(radius: number): THREE.Points {
    const count = 15;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(theta) * radius;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x88bbff,
      size: 0.08,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
      depthWrite: false
    });
    return new THREE.Points(geo, mat);
  }

  private createEarthOrbit(): void {
    this.earthOrbitLine = this.createOrbitLine(this.defaultEarthOrbitRadius);
    this.scene.add(this.earthOrbitLine);

    this.earthOrbitMarkers = this.createOrbitMarkers(this.defaultEarthOrbitRadius);
    this.scene.add(this.earthOrbitMarkers);
  }

  private createEarthTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const oceanGrad = ctx.createLinearGradient(0, 0, 0, size);
    oceanGrad.addColorStop(0, '#1a5490');
    oceanGrad.addColorStop(0.5, '#1e6091');
    oceanGrad.addColorStop(1, '#134e7a');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#2d7a3d';
    for (let i = 0; i < 12; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      const w = Math.random() * 150 + 60;
      const h = Math.random() * 100 + 40;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, h / 2, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#4aa85a';
    for (let i = 0; i < 20; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      const r = Math.random() * 25 + 8;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#e8f0f5';
    for (let i = 0; i < 8; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size * 0.15;
      const w = Math.random() * 200 + 80;
      const h = Math.random() * 30 + 10;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 8; i++) {
      const cx = Math.random() * size;
      const cy = size - Math.random() * size * 0.15;
      const w = Math.random() * 200 + 80;
      const h = Math.random() * 30 + 10;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private createEarth(): void {
    const earthGeo = new THREE.SphereGeometry(0.6, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: this.createEarthTexture(),
      roughness: 0.8,
      metalness: 0.1
    });
    this.earth = new THREE.Mesh(earthGeo, earthMat);
    this.earth.name = 'Earth';
    this.earth.rotation.z = THREE.MathUtils.degToRad(23.5);

    this.earthGroup.add(this.earth);
    this.earthGroup.position.set(this.defaultEarthOrbitRadius, 0, 0);
    this.earthOrbitGroup.add(this.earthGroup);
    this.scene.add(this.earthOrbitGroup);
  }

  private createMoonOrbit(): void {
    this.moonOrbitLine = this.createOrbitLine(this.moonOrbitRadius);
    this.earthGroup.add(this.moonOrbitLine);

    this.moonOrbitMarkers = this.createOrbitMarkers(this.moonOrbitRadius);
    this.earthGroup.add(this.moonOrbitMarkers);
  }

  private createMoonTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#9a9a9a';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 500; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 2;
      ctx.fillStyle = `rgba(80,80,80,${Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 25; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      const r = Math.random() * 20 + 6;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgba(60,60,60,0.55)');
      grad.addColorStop(1, 'rgba(120,120,120,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private createMoon(): void {
    const moonGeo = new THREE.SphereGeometry(0.2, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({
      map: this.createMoonTexture(),
      roughness: 1.0,
      metalness: 0.0
    });
    this.moon = new THREE.Mesh(moonGeo, moonMat);
    this.moon.name = 'Moon';
    this.moon.position.set(this.moonOrbitRadius, 0, 0);

    this.earthGroup.add(this.moon);

    const haloGeo = new THREE.RingGeometry(0.22, 0.3, 64);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.moonHalo = new THREE.Mesh(haloGeo, haloMat);
    this.moonHalo.name = 'MoonHalo';
    this.moon.add(this.moonHalo);
  }

  private registerBodies(): void {
    this.bodies = [
      {
        name: '太阳',
        radius: 2,
        mesh: this.sun,
        angle: this.sunAngle,
        orbitRadius: 0,
        orbitSpeed: 0,
        rotationSpeed: this.sunRotationSpeed
      },
      {
        name: '地球',
        radius: 0.6,
        mesh: this.earth,
        angle: this.earthAngle,
        orbitRadius: this.defaultEarthOrbitRadius,
        orbitSpeed: this.earthOrbitSpeed,
        rotationSpeed: this.earthRotationSpeed
      },
      {
        name: '月球',
        radius: 0.2,
        mesh: this.moon,
        angle: this.moonAngle,
        orbitRadius: this.moonOrbitRadius,
        orbitSpeed: this.moonOrbitSpeed,
        rotationSpeed: this.moonRotationSpeed
      }
    ];
  }

  public update(delta: number, timeMultiplier: number): void {
    const dt = delta * timeMultiplier;

    this.sunAngle += this.sunRotationSpeed * dt * 60;
    this.sun.rotation.y = this.sunAngle;

    this.earthAngle += this.earthOrbitSpeed * dt * 60;
    this.earthOrbitGroup.rotation.y = this.earthAngle;

    this.earth.rotation.y += this.earthRotationSpeed * dt * 60;

    this.moonAngle += this.moonOrbitSpeed * dt * 60;
    this.moon.position.x = Math.cos(this.moonAngle) * this.moonOrbitRadius;
    this.moon.position.z = Math.sin(this.moonAngle) * this.moonOrbitRadius;
    this.moon.rotation.y += this.moonRotationSpeed * dt * 60;

    this.bodies[0].angle = this.sunAngle;
    this.bodies[1].angle = this.earthAngle;
    this.bodies[2].angle = this.moonAngle;
  }

  public getEarthWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.earth.getWorldPosition(pos);
    return pos;
  }

  public getMoonWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.moon.getWorldPosition(pos);
    return pos;
  }

  public getSunWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.sun.getWorldPosition(pos);
    return pos;
  }

  public getSunMoonEarthAngle(): number {
    const sunPos = this.getSunWorldPosition();
    const moonPos = this.getMoonWorldPosition();
    const earthPos = this.getEarthWorldPosition();

    const v1 = new THREE.Vector3().subVectors(sunPos, earthPos).normalize();
    const v2 = new THREE.Vector3().subVectors(moonPos, earthPos).normalize();

    return Math.acos(v1.dot(v2)) * (180 / Math.PI);
  }

  public setMoonOrbitRadius(radius: number): void {
    this.moonOrbitRadius = radius;
    this.bodies[2].orbitRadius = radius;

    this.earthGroup.remove(this.moonOrbitLine);
    this.earthGroup.remove(this.moonOrbitMarkers);
    this.moonOrbitLine.geometry.dispose();
    (this.moonOrbitLine.material as THREE.Material).dispose();
    this.moonOrbitMarkers.geometry.dispose();
    (this.moonOrbitMarkers.material as THREE.Material).dispose();

    this.moonOrbitLine = this.createOrbitLine(radius);
    this.moonOrbitMarkers = this.createOrbitMarkers(radius);
    this.earthGroup.add(this.moonOrbitLine);
    this.earthGroup.add(this.moonOrbitMarkers);
  }

  public getMoonOrbitRadius(): number {
    return this.moonOrbitRadius;
  }

  public forceEclipsePosition(): void {
    this.moonAngle = 0;
    this.moon.position.x = this.moonOrbitRadius;
    this.moon.position.z = 0;
  }

  public pickBody(screenPos: THREE.Vector2, camera: THREE.Camera): CelestialBody | null {
    this.raycaster.setFromCamera(screenPos, camera);
    const meshes = this.bodies.map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      return this.bodies.find(b => b.mesh === hitMesh) || null;
    }
    return null;
  }

  public getDistanceToNearestBody(body: CelestialBody): number {
    let minDist = Infinity;
    const myPos = new THREE.Vector3();
    body.mesh.getWorldPosition(myPos);
    for (const other of this.bodies) {
      if (other === body) continue;
      const otherPos = new THREE.Vector3();
      other.mesh.getWorldPosition(otherPos);
      const d = myPos.distanceTo(otherPos);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  public setSunGlowIntensity(intensity: number): void {
    (this.sunGlow.material as THREE.MeshBasicMaterial).opacity = 0.15 + intensity * 0.1;
    const scale = 1 + (intensity - 1) * 0.2;
    this.sunGlow.scale.setScalar(scale);
  }

  public getSunLight(): THREE.PointLight {
    return this.sunGroup.children.find(c => c instanceof THREE.PointLight) as THREE.PointLight;
  }
}
