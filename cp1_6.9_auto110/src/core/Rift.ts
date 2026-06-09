import * as THREE from 'three';

export class Rift {
  public id: string;
  public plateAId: string;
  public plateBId: string;
  public mesh: THREE.Mesh;
  public debris: THREE.Mesh[];

  private geometry: THREE.PlaneGeometry;
  private startPoint: THREE.Vector3;
  private endPoint: THREE.Vector3;
  private width: number;

  constructor(
    id: string,
    plateAId: string,
    plateBId: string,
    start: THREE.Vector3,
    end: THREE.Vector3,
    width: number = 0.8
  ) {
    this.id = id;
    this.plateAId = plateAId;
    this.plateBId = plateBId;
    this.startPoint = start.clone();
    this.endPoint = end.clone();
    this.width = width;
    this.debris = [];

    this.geometry = new THREE.PlaneGeometry(1, width, 8, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3a1a0a,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(this.geometry, material);

    this.updatePosition(start, end);
    this.generateDebris();
  }

  public updatePosition(start: THREE.Vector3, end: THREE.Vector3): void {
    this.startPoint.copy(start);
    this.endPoint.copy(end);

    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(end, start);
    const length = dir.length();

    this.geometry.dispose();
    this.geometry = new THREE.PlaneGeometry(Math.max(length, 0.1), this.width, Math.max(8, Math.floor(length)), 1);
    this.mesh.geometry = this.geometry;

    this.mesh.position.copy(mid);
    this.mesh.position.y = -0.05;

    const angle = Math.atan2(dir.z, dir.x);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.rotation.z = -angle;

    for (let i = 0; i < this.debris.length; i++) {
      const t = (i + 0.5) / this.debris.length;
      const dp = new THREE.Vector3().lerpVectors(start, end, t);
      const perpX = -dir.z / length;
      const perpZ = dir.x / length;
      const offset = (Math.random() - 0.5) * this.width * 0.6;
      dp.x += perpX * offset;
      dp.z += perpZ * offset;
      dp.y = this.debris[i].position.y;
      this.debris[i].position.copy(dp);
    }
  }

  private generateDebris(): void {
    const debrisCount = 6;
    for (let i = 0; i < debrisCount; i++) {
      const size = 0.1 + Math.random() * 0.2;
      const geom = new THREE.BoxGeometry(size, 0.1 + Math.random() * 0.2, size);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1a0a0a,
        roughness: 1.0
      });
      const debris = new THREE.Mesh(geom, mat);
      debris.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      this.debris.push(debris);
    }
  }

  public getStartPoint(): THREE.Vector3 {
    return this.startPoint.clone();
  }

  public getEndPoint(): THREE.Vector3 {
    return this.endPoint.clone();
  }

  public dispose(): void {
    this.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    for (const d of this.debris) {
      d.geometry.dispose();
      (d.material as THREE.Material).dispose();
    }
  }
}
