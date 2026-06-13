import * as THREE from 'three';

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: THREE.Points;
  private particleData: Array<{
    velocity: THREE.Vector3;
    originalPosition: THREE.Vector3;
    parallaxAmount: number;
  }> = [];
  private caveRadius: number;

  constructor(scene: THREE.Scene, caveRadius: number = 6) {
    this.scene = scene;
    this.caveRadius = caveRadius;
    this.particles = this.createParticles(150);
    this.scene.add(this.particles);
  }

  private createParticles(count: number): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.caveRadius * (0.3 + Math.random() * 0.65);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi) * 0.8;
      const z = r * Math.sin(phi) * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      sizes[i] = 0.02 + Math.random() * 0.03;

      const color = new THREE.Color(0x88ccff);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.03,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.03
      );

      this.particleData.push({
        velocity,
        originalPosition: new THREE.Vector3(x, y, z),
        parallaxAmount: 0.3 + Math.random() * 0.7
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(136, 204, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(136, 204, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(136, 204, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.05,
      map: texture,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
  }

  update(time: number, delta: number, cameraRotation: { x: number; y: number }): void {
    const positions = this.particles.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.particleData.length; i++) {
      const data = this.particleData[i];
      const idx = i * 3;

      let x = positions[idx] + data.velocity.x * delta;
      let y = positions[idx + 1] + data.velocity.y * delta;
      let z = positions[idx + 2] + data.velocity.z * delta;

      const dist = Math.sqrt(x * x + y * y + z * z);
      if (dist > this.caveRadius * 0.85) {
        data.velocity.negate();
        data.velocity.x += (Math.random() - 0.5) * 0.01;
        data.velocity.y += (Math.random() - 0.5) * 0.01;
        data.velocity.z += (Math.random() - 0.5) * 0.01;
      }

      y += Math.sin(time * 0.5 + i * 0.1) * 0.001;

      const parallaxX = Math.sin(cameraRotation.y) * data.parallaxAmount * 0.15;
      const parallaxY = Math.sin(cameraRotation.x) * data.parallaxAmount * 0.1;

      positions[idx] = x + parallaxX;
      positions[idx + 1] = y + parallaxY;
      positions[idx + 2] = z;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  getParticles(): THREE.Points {
    return this.particles;
  }
}
