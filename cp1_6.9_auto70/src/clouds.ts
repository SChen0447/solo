import * as THREE from 'three';

interface Cloud {
  mesh: THREE.Mesh;
  baseRadius: number;
  speedX: number;
  speedZ: number;
  pulsePhase: number;
  pulseSpeed: number;
  pulseAmount: number;
}

export class CloudManager {
  public group: THREE.Group;
  public clouds: Cloud[] = [];
  public bounds: number = 50;

  constructor() {
    this.group = new THREE.Group();
  }

  private createCloudMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });
  }

  public createClouds(count: number): void {
    for (let i = 0; i < count; i++) {
      const radius = 1 + Math.random() * 2;
      const geo = new THREE.SphereGeometry(radius, 8, 6);
      const mat = this.createCloudMaterial();
      const mesh = new THREE.Mesh(geo, mat);

      mesh.scale.y = 0.3 + Math.random() * 0.3;
      mesh.scale.x = 1 + Math.random() * 0.5;
      mesh.scale.z = 1 + Math.random() * 0.5;

      mesh.position.set(
        (Math.random() - 0.5) * this.bounds * 2,
        -5 + Math.random() * 15,
        (Math.random() - 0.5) * this.bounds * 2
      );

      this.group.add(mesh);

      this.clouds.push({
        mesh,
        baseRadius: radius,
        speedX: (Math.random() > 0.5 ? 1 : -1) * (0.002 + Math.random() * 0.003),
        speedZ: (Math.random() > 0.5 ? 1 : -1) * (0.002 + Math.random() * 0.003),
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.5 + Math.random() * 1.5,
        pulseAmount: 0.05 + Math.random() * 0.05
      });
    }
  }

  public update(time: number, delta: number): void {
    for (const cloud of this.clouds) {
      cloud.mesh.position.x += cloud.speedX * delta * 60;
      cloud.mesh.position.z += cloud.speedZ * delta * 60;

      if (cloud.mesh.position.x > this.bounds) cloud.mesh.position.x = -this.bounds;
      if (cloud.mesh.position.x < -this.bounds) cloud.mesh.position.x = this.bounds;
      if (cloud.mesh.position.z > this.bounds) cloud.mesh.position.z = -this.bounds;
      if (cloud.mesh.position.z < -this.bounds) cloud.mesh.position.z = this.bounds;

      const pulse = 1 + cloud.pulseAmount * Math.sin(time * cloud.pulseSpeed + cloud.pulsePhase);
      cloud.mesh.scale.x = (1 + Math.random() * 0.01) * pulse;
      cloud.mesh.scale.y = (0.3 + Math.random() * 0.01) * pulse;
      cloud.mesh.scale.z = (1 + Math.random() * 0.01) * pulse;

      const mat = cloud.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.25 + 0.1 * Math.sin(time * cloud.pulseSpeed * 0.5 + cloud.pulsePhase);
    }
  }
}
