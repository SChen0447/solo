import * as THREE from 'three';

export class EarthRenderer {
  public group: THREE.Group;
  public earth: THREE.Mesh;
  public atmosphere: THREE.Mesh;
  public clouds: THREE.Mesh;
  public rotationSpeed: number = (2 * Math.PI) / 60;
  public autoRotate: boolean = true;

  private earthRadius: number;

  constructor(radius: number = 5) {
    this.earthRadius = radius;
    this.group = new THREE.Group();

    this.earth = this.createEarth();
    this.group.add(this.earth);

    this.clouds = this.createClouds();
    this.group.add(this.clouds);

    this.atmosphere = this.createAtmosphere();
    this.group.add(this.atmosphere);

    const grid = this.createGridLines();
    this.group.add(grid);
  }

  private createEarthTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a365d');
    gradient.addColorStop(0.3, '#2563eb');
    gradient.addColorStop(0.5, '#3b82f6');
    gradient.addColorStop(0.7, '#2563eb');
    gradient.addColorStop(1, '#1e3a8a');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#22c55e';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 30 + Math.random() * 150;

      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#16a34a';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 20 + Math.random() * 100;

      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#f1f5f9';
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 5 + Math.random() * 30;

      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.4, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  private createEarth(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.earthRadius, 64, 64);

    const texture = this.createEarthTexture();

    const material = new THREE.MeshPhongMaterial({
      map: texture,
      bumpScale: 0.05,
      specular: new THREE.Color(0x333333),
      shininess: 15,
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private createClouds(): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 20 + Math.random() * 80;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;

      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const geometry = new THREE.SphereGeometry(this.earthRadius * 1.01, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      map: texture,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private createAtmosphere(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.earthRadius * 1.15, 64, 64);

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private createGridLines(): THREE.LineSegments {
    const segments: THREE.Vector3[] = [];
    const r = this.earthRadius * 1.001;

    for (let lat = -80; lat <= 80; lat += 20) {
      const latRad = lat * (Math.PI / 180);
      for (let i = 0; i <= 360; i += 5) {
        const lngRad = (i * Math.PI) / 180;
        const x = r * Math.cos(latRad) * Math.cos(lngRad);
        const y = r * Math.sin(latRad);
        const z = r * Math.cos(latRad) * Math.sin(lngRad);
        segments.push(new THREE.Vector3(x, y, z));
      }
    }

    for (let lng = 0; lng < 360; lng += 30) {
      const lngRad = (lng * Math.PI) / 180;
      for (let i = -90; i <= 90; i += 5) {
        const latRad = (i * Math.PI) / 180;
        const x = r * Math.cos(latRad) * Math.cos(lngRad);
        const y = r * Math.sin(latRad);
        const z = r * Math.cos(latRad) * Math.sin(lngRad);
        segments.push(new THREE.Vector3(x, y, z));
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(segments);
    const material = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.15,
    });

    return new THREE.LineSegments(geometry, material);
  }

  public update(delta: number): void {
    if (this.autoRotate) {
      this.earth.rotation.y += this.rotationSpeed * delta;
      this.clouds.rotation.y += this.rotationSpeed * delta * 1.1;
    }
  }

  public setRotationSpeed(speedMultiplier: number): void {
    this.rotationSpeed = ((2 * Math.PI) / 60) * speedMultiplier;
  }

  public getRadius(): number {
    return this.earthRadius;
  }

  public dispose(): void {
    const disposeMesh = (mesh: THREE.Mesh) => {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    };

    disposeMesh(this.earth);
    disposeMesh(this.clouds);
    disposeMesh(this.atmosphere);
  }
}
