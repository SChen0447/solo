import * as THREE from 'three';

const EARTH_RADIUS = 5;
const EARTH_ROTATION_SPEED = 0.005;
const CLOUD_ROTATION_SPEED = 0.01;
const CLOUD_OPACITY = 0.3;

export class Earth {
  public group: THREE.Group;
  private earthMesh: THREE.Mesh;
  private cloudsMesh: THREE.Mesh;
  private atmosphereMesh: THREE.Mesh;
  private cloudsEnabled: boolean = true;

  constructor() {
    this.group = new THREE.Group();

    this.earthMesh = this.createEarthMesh();
    this.cloudsMesh = this.createCloudsMesh();
    this.atmosphereMesh = this.createAtmosphereMesh();

    this.group.add(this.earthMesh);
    this.group.add(this.cloudsMesh);
    this.group.add(this.atmosphereMesh);
  }

  private createEarthTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a3a5c');
    gradient.addColorStop(0.5, '#0d2840');
    gradient.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#2d5a3d';

    this.drawContinent(ctx, canvas.width, canvas.height, 0.15, 0.2, 0.18, 0.12);
    this.drawContinent(ctx, canvas.width, canvas.height, 0.2, 0.35, 0.12, 0.22);
    this.drawContinent(ctx, canvas.width, canvas.height, 0.45, 0.2, 0.2, 0.15);
    this.drawContinent(ctx, canvas.width, canvas.height, 0.48, 0.4, 0.1, 0.2);
    this.drawContinent(ctx, canvas.width, canvas.height, 0.55, 0.6, 0.1, 0.15);
    this.drawContinent(ctx, canvas.width, canvas.height, 0.7, 0.25, 0.25, 0.2);
    this.drawContinent(ctx, canvas.width, canvas.height, 0.78, 0.55, 0.08, 0.1);
    this.drawContinent(ctx, canvas.width, canvas.height, 0.05, 0.7, 0.12, 0.08);

    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 2 + 0.5;
      ctx.fillStyle = Math.random() > 0.5
        ? `rgba(${30 + Math.random() * 30}, ${70 + Math.random() * 40}, ${50 + Math.random() * 30}, 0.5)`
        : `rgba(${20 + Math.random() * 20}, ${40 + Math.random() * 30}, ${70 + Math.random() * 40}, 0.3)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(100, 150, 100, 0.1)';
    ctx.lineWidth = 1;
    for (let lat = 0; lat <= 180; lat += 30) {
      const y = (lat / 180) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  private drawContinent(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    cx: number,
    cy: number,
    rw: number,
    rh: number
  ): void {
    ctx.save();
    ctx.translate(cx * w, cy * h);
    ctx.beginPath();
    const points = 40;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const noise = 0.7 + Math.random() * 0.6;
      const x = Math.cos(angle) * rw * w * noise;
      const y = Math.sin(angle) * rh * h * noise;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(60, 100, 70, 0.4)';
    for (let i = 0; i < 20; i++) {
      const nx = (Math.random() - 0.5) * rw * w * 1.2;
      const ny = (Math.random() - 0.5) * rh * h * 1.2;
      const nr = Math.random() * 20 + 5;
      ctx.beginPath();
      ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private createCloudsTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 80; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const w = Math.random() * 200 + 50;
      const h = Math.random() * 80 + 20;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) / 2);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, h / 2, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  private createEarthMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      map: this.createEarthTexture(),
      specular: new THREE.Color(0x333333),
      shininess: 15
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private createCloudsMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.01, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      map: this.createCloudsTexture(),
      transparent: true,
      opacity: CLOUD_OPACITY,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private createAtmosphereMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.15, 64, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.8 },
        p: { value: 4.0 },
        glowColor: { value: new THREE.Color(0x88ccff) }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float c;
        uniform float p;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(c - dot(vNormal, vec3(0.0, 0.0, 1.0)), p);
          gl_FragColor = vec4(glowColor, 1.0) * intensity * 0.6;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  public update(delta: number): void {
    this.earthMesh.rotation.y += EARTH_ROTATION_SPEED * delta * 60;
    if (this.cloudsEnabled) {
      this.cloudsMesh.rotation.y -= CLOUD_ROTATION_SPEED * delta * 60;
    }
  }

  public setCloudsEnabled(enabled: boolean): void {
    this.cloudsEnabled = enabled;
    this.cloudsMesh.visible = enabled;
  }

  public getRadius(): number {
    return EARTH_RADIUS;
  }
}
