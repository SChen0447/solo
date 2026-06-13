import * as THREE from 'three';

export interface PlanetData {
  name: string;
  nameEn: string;
  color: number;
  size: number;
  orbitRadius: number;
  orbitSpeed: number;
  rotationSpeed: number;
  axialTilt: number;
  orbitInclination: number;
  orbitalPeriod: string;
  rotationPeriod: string;
  distanceFromSun: string;
  mass: string;
  temperatureRange: string;
  moons: number;
  description: string;
  textureType: 'earth' | 'jupiter' | 'mars' | 'venus' | 'mercury';
}

export class Planet {
  public mesh: THREE.Mesh;
  public orbit: THREE.Line;
  public glow: THREE.Mesh;
  public group: THREE.Group;
  public data: PlanetData;
  public angle: number = 0;
  public isHovered: boolean = false;
  public isSelected: boolean = false;

  private rotationSpeed: number;
  private orbitSpeed: number;
  private glowMaterial: THREE.MeshBasicMaterial;

  constructor(data: PlanetData) {
    this.data = data;
    this.rotationSpeed = data.rotationSpeed;
    this.orbitSpeed = data.orbitSpeed;
    this.angle = Math.random() * Math.PI * 2;
    this.group = new THREE.Group();

    this.mesh = this.createPlanetMesh();
    this.orbit = this.createOrbit();
    this.glow = this.createGlow();

    this.group.add(this.mesh);
    this.group.rotation.z = data.orbitInclination;

    this.mesh.position.x = data.orbitRadius;
    this.glow.position.x = data.orbitRadius;

    this.glowMaterial = this.glow.material as THREE.MeshBasicMaterial;
    this.glowMaterial.opacity = 0;
  }

  private createPlanetMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.data.size, 32, 32);
    const texture = this.createPlanetTexture();
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.z = this.data.axialTilt * (Math.PI / 180);
    return mesh;
  }

  private createPlanetTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const baseColor = new THREE.Color(this.data.color);

    switch (this.data.textureType) {
      case 'earth':
        this.drawEarthTexture(ctx, canvas.width, canvas.height, baseColor);
        break;
      case 'jupiter':
        this.drawJupiterTexture(ctx, canvas.width, canvas.height, baseColor);
        break;
      case 'mars':
        this.drawMarsTexture(ctx, canvas.width, canvas.height, baseColor);
        break;
      case 'venus':
        this.drawVenusTexture(ctx, canvas.width, canvas.height, baseColor);
        break;
      case 'mercury':
        this.drawMercuryTexture(ctx, canvas.width, canvas.height, baseColor);
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  private drawEarthTexture(ctx: CanvasRenderingContext2D, w: number, h: number, _base: THREE.Color): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a4a7a');
    gradient.addColorStop(0.3, '#2563eb');
    gradient.addColorStop(0.5, '#1d4ed8');
    gradient.addColorStop(0.7, '#2563eb');
    gradient.addColorStop(1, '#1a4a7a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#22c55e';
    for (let i = 0; i < 12; i++) {
      const x = (i / 12) * w + (Math.sin(i * 3) * 30);
      const y = h * 0.3 + Math.sin(i * 1.5) * h * 0.15;
      const size = 20 + Math.random() * 40;
      this.drawContinent(ctx, x, y, size);
    }

    ctx.fillStyle = '#16a34a';
    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * w + 20;
      const y = h * 0.65 + Math.sin(i * 2) * h * 0.1;
      const size = 15 + Math.random() * 30;
      this.drawContinent(ctx, x, y, size);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 5 + Math.random() * 15;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawContinent(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    const points = 8;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = size * (0.6 + Math.random() * 0.4);
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r * 0.6;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawJupiterTexture(ctx: CanvasRenderingContext2D, w: number, h: number, base: THREE.Color): void {
    ctx.fillStyle = `rgb(${Math.floor(base.r * 255)}, ${Math.floor(base.g * 255)}, ${Math.floor(base.b * 255)})`;
    ctx.fillRect(0, 0, w, h);

    const bands = [
      { y: 0.05, color: '#c9a66b', height: 0.12 },
      { y: 0.18, color: '#8b6914', height: 0.06 },
      { y: 0.28, color: '#d4a855', height: 0.15 },
      { y: 0.45, color: '#b8860b', height: 0.08 },
      { y: 0.55, color: '#d4a855', height: 0.12 },
      { y: 0.70, color: '#cd853f', height: 0.1 },
      { y: 0.82, color: '#c9a66b', height: 0.1 },
      { y: 0.93, color: '#8b6914', height: 0.07 }
    ];

    bands.forEach(band => {
      ctx.fillStyle = band.color;
      ctx.fillRect(0, h * band.y, w, h * band.height);
    });

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(w * 0.7, h * 0.4, w * 0.08, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 2 + Math.random() * 6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMarsTexture(ctx: CanvasRenderingContext2D, w: number, h: number, _base: THREE.Color): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#c2410c');
    gradient.addColorStop(0.5, '#dc2626');
    gradient.addColorStop(1, '#b91c1c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 8 + Math.random() * 20;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(w * 0.3, h * 0.35, w * 0.06, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, 0, w, h * 0.08);
  }

  private drawVenusTexture(ctx: CanvasRenderingContext2D, w: number, h: number, _base: THREE.Color): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#fbbf24');
    gradient.addColorStop(0.5, '#f59e0b');
    gradient.addColorStop(1, '#d97706');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const rx = 20 + Math.random() * 40;
      const ry = 5 + Math.random() * 10;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMercuryTexture(ctx: CanvasRenderingContext2D, w: number, h: number, _base: THREE.Color): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#78716c');
    gradient.addColorStop(0.5, '#a8a29e');
    gradient.addColorStop(1, '#57534e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 3 + Math.random() * 12;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 2 + Math.random() * 5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private createOrbit(): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(theta) * this.data.orbitRadius,
        0,
        Math.sin(theta) * this.data.orbitRadius
      ));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x4a5568,
      transparent: true,
      opacity: 0.25,
      linewidth: 1
    });
    return new THREE.Line(geometry, material);
  }

  private createGlow(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.data.size * 1.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: this.data.color,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide
    });
    return new THREE.Mesh(geometry, material);
  }

  public update(delta: number): void {
    this.angle += this.orbitSpeed * delta;
    this.mesh.position.x = Math.cos(this.angle) * this.data.orbitRadius;
    this.mesh.position.z = Math.sin(this.angle) * this.data.orbitRadius;
    this.glow.position.x = this.mesh.position.x;
    this.glow.position.z = this.mesh.position.z;

    this.mesh.rotation.y += this.rotationSpeed * delta;

    const targetOpacity = (this.isHovered || this.isSelected) ? 0.5 : 0;
    this.glowMaterial.opacity += (targetOpacity - this.glowMaterial.opacity) * 0.15;
  }

  public getWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.mesh.getWorldPosition(pos);
    return pos;
  }

  public getScreenPosition(camera: THREE.Camera, width: number, height: number): { x: number; y: number } {
    const pos = this.getWorldPosition();
    pos.project(camera);
    return {
      x: (pos.x + 1) / 2 * width,
      y: (-pos.y + 1) / 2 * height
    };
  }

  public dispose(): void {
    (this.mesh.geometry as THREE.BufferGeometry).dispose();
    (this.mesh.material as THREE.Material).dispose();
    (this.orbit.geometry as THREE.BufferGeometry).dispose();
    (this.orbit.material as THREE.Material).dispose();
    (this.glow.geometry as THREE.BufferGeometry).dispose();
    (this.glow.material as THREE.Material).dispose();
  }
}
