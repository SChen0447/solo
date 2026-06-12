import * as THREE from 'three';

export class Ground {
  public group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.createGround();
    this.createGrid();
  }

  private createGround(): void {
    const geometry = new THREE.RingGeometry(0, 10, 64);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B7355,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.001;
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  private createGrid(): void {
    const gridSize = 20;
    const gridDivisions = 20;

    const gridHelper = new THREE.GridHelper(
      gridSize,
      gridDivisions,
      new THREE.Color('#CCCCCC'),
      new THREE.Color('#CCCCCC')
    );
    gridHelper.position.y = 0.002;

    gridHelper.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.Material;
        mat.transparent = true;
        mat.opacity = 0.3;
      }
    });

    this.group.add(gridHelper);
  }

  public addToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }
}
