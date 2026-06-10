import * as THREE from 'three';

export class Earth {
  public group: THREE.Group;
  private earthMesh: THREE.Mesh;
  private atmosphereMesh: THREE.Mesh;
  private cloudsMesh: THREE.Mesh;
  private rotationSpeed: number = 0.1;
  private targetRotationSpeed: number = 0.1;

  constructor(scene: THREE.Scene, initialRotationSpeed: number = 0.1) {
    this.group = new THREE.Group();
    this.rotationSpeed = initialRotationSpeed;
    this.targetRotationSpeed = initialRotationSpeed;

    this.earthMesh = this.createEarthMesh();
    this.atmosphereMesh = this.createAtmosphereMesh();
    this.cloudsMesh = this.createCloudsMesh();

    this.group.add(this.earthMesh);
    this.group.add(this.cloudsMesh);
    this.group.add(this.atmosphereMesh);

    scene.add(this.group);
  }

  private createEarthTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a3a5c');
    gradient.addColorStop(0.3, '#0d4f6c');
    gradient.addColorStop(0.5, '#1565a3');
    gradient.addColorStop(0.7, '#0d4f6c');
    gradient.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1e7a4e';
    this.drawContinent(ctx, canvas.width * 0.18, canvas.height * 0.28, 180, 140);
    this.drawContinent(ctx, canvas.width * 0.22, canvas.height * 0.55, 120, 180);
    this.drawContinent(ctx, canvas.width * 0.48, canvas.height * 0.25, 220, 130);
    this.drawContinent(ctx, canvas.width * 0.52, canvas.height * 0.55, 140, 220);
    this.drawContinent(ctx, canvas.width * 0.75, canvas.height * 0.3, 260, 160);
    this.drawContinent(ctx, canvas.width * 0.8, canvas.height * 0.6, 140, 120);
    this.drawContinent(ctx, canvas.width * 0.08, canvas.height * 0.82, 100, 60);
    this.drawContinent(ctx, canvas.width * 0.88, canvas.height * 0.8, 80, 50);

    ctx.fillStyle = '#2a8a5e';
    this.drawContinent(ctx, canvas.width * 0.2, canvas.height * 0.32, 60, 40);
    this.drawContinent(ctx, canvas.width * 0.55, canvas.height * 0.3, 70, 35);
    this.drawContinent(ctx, canvas.width * 0.78, canvas.height * 0.38, 90, 50);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 3 + 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  private drawContinent(ctx: CanvasRenderingContext2D, cx: number, cy: number, rw: number, rh: number): void {
    ctx.beginPath();
    const points = 12;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const noise = 0.7 + Math.sin(angle * 3) * 0.15 + Math.cos(angle * 5) * 0.1 + Math.random() * 0.1;
      const x = cx + Math.cos(angle) * rw * noise;
      const y = cy + Math.sin(angle) * rh * noise;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  private createBumpMap(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 30 + 10;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      const brightness = Math.random() > 0.5 ? 200 : 80;
      gradient.addColorStop(0, `rgb(${brightness},${brightness},${brightness})`);
      gradient.addColorStop(1, '#808080');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    return new THREE.CanvasTexture(canvas);
  }

  private createEarthMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      map: this.createEarthTexture(),
      bumpMap: this.createBumpMap(),
      bumpScale: 0.02,
      specular: new THREE.Color(0x333333),
      shininess: 15
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createAtmosphereMesh(): THREE.Mesh {
    const atmosphereShader = {
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
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.4, 0.6, 1.0, 1.0) * intensity;
        }
      `
    };

    const geometry = new THREE.SphereGeometry(1.08, 64, 64);
    const material = new THREE.ShaderMaterial({
      vertexShader: atmosphereShader.vertexShader,
      fragmentShader: atmosphereShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });
    return new THREE.Mesh(geometry, material);
  }

  private createCloudsTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 150; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 60 + 20;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  private createCloudsMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(1.01, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      map: this.createCloudsTexture(),
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    return new THREE.Mesh(geometry, material);
  }

  public setRotationSpeed(speed: number): void {
    this.targetRotationSpeed = speed;
  }

  public getRotationSpeed(): number {
    return this.rotationSpeed;
  }

  public update(delta: number): void {
    this.rotationSpeed += (this.targetRotationSpeed - this.rotationSpeed) * delta * 2;
    this.group.rotation.y += this.rotationSpeed * delta;
    this.cloudsMesh.rotation.y += this.rotationSpeed * delta * 0.6;
  }

  public getEarthMesh(): THREE.Mesh {
    return this.earthMesh;
  }

  public dispose(): void {
    this.earthMesh.geometry.dispose();
    if (this.earthMesh.material instanceof THREE.Material) {
      this.earthMesh.material.dispose();
    }
    this.atmosphereMesh.geometry.dispose();
    if (this.atmosphereMesh.material instanceof THREE.Material) {
      this.atmosphereMesh.material.dispose();
    }
    this.cloudsMesh.geometry.dispose();
    if (this.cloudsMesh.material instanceof THREE.Material) {
      this.cloudsMesh.material.dispose();
    }
  }
}
