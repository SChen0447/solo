import * as THREE from 'three';

interface FragmentData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  rotationSpeed: THREE.Euler;
  life: number;
  maxLife: number;
  size: number;
}

export class CrystalFragments {
  private scene: THREE.Scene;
  private meshes: THREE.Mesh[] = [];
  private fragmentData: FragmentData[] = [];
  private geometryCache: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometryCache = this.createHexagonGeometry();
  }

  private createHexagonGeometry(): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const size = 1;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    return geometry;
  }

  public spawnBurst(origin: THREE.Vector3, count: number = 30): void {
    for (let i = 0; i < count; i++) {
      const size = 4 + Math.random() * 4;
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(this.geometryCache, material);
      mesh.scale.set(size * 0.01, size * 0.01, size * 0.01);
      mesh.position.copy(origin);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const speed = 2 + Math.random() * 3;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed + 1.5,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      const rotation = new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      const rotationSpeed = new THREE.Euler(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );

      mesh.rotation.copy(rotation);
      this.scene.add(mesh);
      this.meshes.push(mesh);

      this.fragmentData.push({
        position: mesh.position,
        velocity,
        rotation: mesh.rotation,
        rotationSpeed,
        life: 1.5,
        maxLife: 1.5,
        size
      });
    }
  }

  public update(deltaTime: number): void {
    for (let i = this.meshes.length - 1; i >= 0; i--) {
      const mesh = this.meshes[i];
      const data = this.fragmentData[i];

      data.velocity.y -= 5 * deltaTime;
      data.position.addScaledVector(data.velocity, deltaTime);
      data.rotation.x += data.rotationSpeed.x * deltaTime;
      data.rotation.y += data.rotationSpeed.y * deltaTime;
      data.rotation.z += data.rotationSpeed.z * deltaTime;

      data.life -= deltaTime;
      const alpha = Math.max(0, data.life / data.maxLife);
      (mesh.material as THREE.MeshBasicMaterial).opacity = alpha;

      if (data.life <= 0) {
        this.scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
        this.meshes.splice(i, 1);
        this.fragmentData.splice(i, 1);
      }
    }
  }

  public getActiveCount(): number {
    return this.meshes.length;
  }

  public dispose(): void {
    for (const mesh of this.meshes) {
      this.scene.remove(mesh);
      (mesh.material as THREE.Material).dispose();
    }
    this.meshes = [];
    this.fragmentData = [];
    this.geometryCache.dispose();
  }
}
