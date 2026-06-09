import * as THREE from 'three';

const EARTH_RADIUS = 5;
const ATMOSPHERE_RADIUS = 5.1;
const ROTATION_SPEED = 0.001;

export class Earth {
  public group: THREE.Group;
  private earthMesh: THREE.Mesh;
  private atmosphereMesh: THREE.Mesh;

  constructor() {
    this.group = new THREE.Group();

    this.earthMesh = this.createEarthMesh();
    this.atmosphereMesh = this.createAtmosphereMesh();

    this.group.add(this.earthMesh);
    this.group.add(this.atmosphereMesh);
  }

  private createEarthMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const texture = this.createEarthTexture();

    const material = new THREE.MeshPhongMaterial({
      map: texture,
      specular: new THREE.Color(0x333333),
      shininess: 15
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private createEarthTexture(): THREE.Texture {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;

    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a4f7a');
    gradient.addColorStop(0.5, '#2980b9');
    gradient.addColorStop(1, '#1a4f7a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#2ecc71';
    this.drawContinent(ctx, 100, 80, 180, 140);
    this.drawContinent(ctx, 420, 60, 200, 100);
    this.drawContinent(ctx, 680, 90, 160, 120);
    this.drawContinent(ctx, 150, 280, 160, 180);
    this.drawContinent(ctx, 450, 240, 280, 200);
    this.drawContinent(ctx, 780, 260, 160, 100);

    ctx.fillStyle = '#27ae60';
    this.drawContinent(ctx, 110, 90, 80, 70);
    this.drawContinent(ctx, 470, 80, 100, 60);
    this.drawContinent(ctx, 710, 100, 80, 70);
    this.drawContinent(ctx, 170, 310, 100, 100);
    this.drawContinent(ctx, 510, 280, 150, 120);

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  private drawContinent(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    ctx.beginPath();
    const points = 12;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radiusX = w / 2 + Math.random() * w * 0.15 - w * 0.075;
      const radiusY = h / 2 + Math.random() * h * 0.15 - h * 0.075;
      const px = x + w / 2 + Math.cos(angle) * radiusX;
      const py = y + h / 2 + Math.sin(angle) * radiusY;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  private createAtmosphereMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(ATMOSPHERE_RADIUS, 64, 64);

    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color('#87CEEB'),
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  public update(): void {
    this.group.rotation.y += ROTATION_SPEED;
  }

  public getRadius(): number {
    return EARTH_RADIUS;
  }

  public dispose(): void {
    this.earthMesh.geometry.dispose();
    const earthMaterial = this.earthMesh.material as THREE.MeshPhongMaterial;
    if (earthMaterial.map) earthMaterial.map.dispose();
    earthMaterial.dispose();

    this.atmosphereMesh.geometry.dispose();
    const atmosMaterial = this.atmosphereMesh.material as THREE.MeshPhongMaterial;
    atmosMaterial.dispose();
  }
}
