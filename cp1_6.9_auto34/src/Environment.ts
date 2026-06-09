import * as THREE from 'three';

export class Environment {
  public group: THREE.Group;
  private stars: THREE.Points;
  private nebula: THREE.Mesh;
  private ambientParticles: THREE.Points;
  private particleData: { velocity: THREE.Vector3; originalPosition: THREE.Vector3 }[];
  private starCount: number = 2000;
  private ambientParticleCount: number = 200;
  private currentTint: THREE.Color;
  private targetTint: THREE.Color;
  private burstIntensity: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.currentTint = new THREE.Color(0x6b4eff);
    this.targetTint = new THREE.Color(0x6b4eff);
    this.particleData = [];

    this.stars = this.createStars();
    this.nebula = this.createNebula();
    this.ambientParticles = this.createAmbientParticles();

    this.group.add(this.stars);
    this.group.add(this.nebula);
    this.group.add(this.ambientParticles);
  }

  private createStars(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.starCount * 3);
    const colors = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      const radius = 400 + Math.random() * 600;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const colorChoice = Math.random();
      if (colorChoice < 0.6) {
        colors[i3] = 1; colors[i3 + 1] = 1; colors[i3 + 2] = 1;
      } else if (colorChoice < 0.8) {
        colors[i3] = 0.7; colors[i3 + 1] = 0.7; colors[i3 + 2] = 1;
      } else {
        colors[i3] = 1; colors[i3 + 1] = 0.8; colors[i3 + 2] = 0.7;
      }

      sizes[i] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    return points;
  }

  private createNebula(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(500, 64, 64);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 512);
    gradient.addColorStop(0, 'rgba(30, 10, 60, 0.4)');
    gradient.addColorStop(0.3, 'rgba(80, 40, 120, 0.25)');
    gradient.addColorStop(0.5, 'rgba(40, 20, 80, 0.15)');
    gradient.addColorStop(0.7, 'rgba(20, 5, 50, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 8; i++) {
      const cx = Math.random() * 1024;
      const cy = Math.random() * 1024;
      const r = 150 + Math.random() * 200;
      const hue = 240 + Math.random() * 80;
      const nebGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      nebGrad.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.15)`);
      nebGrad.addColorStop(0.5, `hsla(${hue + 30}, 70%, 50%, 0.08)`);
      nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = nebGrad;
      ctx.fillRect(0, 0, 1024, 1024);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 6;
    return mesh;
  }

  private createAmbientParticles(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.ambientParticleCount * 3);
    const colors = new Float32Array(this.ambientParticleCount * 3);
    const sizes = new Float32Array(this.ambientParticleCount);

    for (let i = 0; i < this.ambientParticleCount; i++) {
      const i3 = i * 3;
      const radius = 200 + Math.random() * 150;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi) - 100;

      colors[i3] = 0.5;
      colors[i3 + 1] = 0.4;
      colors[i3 + 2] = 1;

      sizes[i] = Math.random() * 2 + 1;

      this.particleData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        ),
        originalPosition: new THREE.Vector3(
          positions[i3],
          positions[i3 + 1],
          positions[i3 + 2]
        )
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    return points;
  }

  public updateElementTint(elementTypes: string[]): void {
    if (elementTypes.length === 0) {
      this.targetTint.setHex(0x6b4eff);
      return;
    }

    const colorMap: Record<string, number> = {
      fire: 0xff4500,
      water: 0x1e90ff,
      wind: 0x32cd32,
      earth: 0x8b4513
    };

    let r = 0, g = 0, b = 0;
    elementTypes.forEach(type => {
      const c = new THREE.Color(colorMap[type] || 0xffffff);
      r += c.r;
      g += c.g;
      b += c.b;
    });
    r /= elementTypes.length;
    g /= elementTypes.length;
    b /= elementTypes.length;

    this.targetTint.setRGB(r, g, b);
  }

  public triggerBurst(): void {
    this.burstIntensity = 1;
  }

  public update(delta: number): void {
    this.currentTint.lerp(this.targetTint, delta * 0.5);

    const colorAttr = this.ambientParticles.geometry.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < this.ambientParticleCount; i++) {
      const i3 = i * 3;
      colorAttr.array[i3] = this.currentTint.r;
      colorAttr.array[i3 + 1] = this.currentTint.g;
      colorAttr.array[i3 + 2] = this.currentTint.b;
    }
    colorAttr.needsUpdate = true;

    const positions = this.ambientParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.ambientParticleCount; i++) {
      const i3 = i * 3;
      const data = this.particleData[i];
      const pos = new THREE.Vector3(positions.array[i3], positions.array[i3 + 1], positions.array[i3 + 2]);

      const toCenter = pos.clone().negate().normalize();
      pos.add(data.velocity.clone().multiplyScalar(delta * 10));

      if (this.burstIntensity > 0) {
        pos.add(toCenter.clone().negate().multiplyScalar(this.burstIntensity * delta * 200));
      }

      const distance = pos.length();
      if (distance < 150) {
        pos.add(toCenter.clone().negate().multiplyScalar(delta * 20));
      } else if (distance > 400) {
        pos.add(toCenter.clone().multiplyScalar(delta * 20));
      }

      positions.array[i3] = pos.x;
      positions.array[i3 + 1] = pos.y;
      positions.array[i3 + 2] = pos.z;
    }
    positions.needsUpdate = true;

    this.burstIntensity = Math.max(0, this.burstIntensity - delta * 0.5);

    this.nebula.rotation.y += delta / 30;
    this.stars.rotation.y += delta * 0.005;
  }

  public dispose(): void {
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.nebula.geometry.dispose();
    (this.nebula.material as THREE.MeshBasicMaterial).map?.dispose();
    (this.nebula.material as THREE.Material).dispose();
    this.ambientParticles.geometry.dispose();
    (this.ambientParticles.material as THREE.Material).dispose();
  }
}
