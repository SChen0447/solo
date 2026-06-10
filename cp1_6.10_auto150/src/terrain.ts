import * as THREE from 'three';

export interface MarkerData {
  id: number;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
}

export class TerrainManager {
  private scene: THREE.Scene;
  private ground!: THREE.Mesh;
  private grid!: THREE.GridHelper;
  private markers: Map<number, MarkerData> = new Map();
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private markerIdCounter = 0;
  private groundSize = 40;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.createGround();
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(this.groundSize, this.groundSize);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.name = 'ground';
    this.scene.add(this.ground);

    this.grid = new THREE.GridHelper(
      this.groundSize,
      this.groundSize,
      0x888888,
      0x888888
    );
    const gridMaterial = this.grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.3;
    this.scene.add(this.grid);
  }

  public getGround(): THREE.Mesh {
    return this.ground;
  }

  public intersectGround(event: MouseEvent, camera: THREE.Camera): THREE.Vector3 | null {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const intersects = this.raycaster.intersectObject(this.ground);

    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }
    return null;
  }

  public intersectMarker(event: MouseEvent, camera: THREE.Camera): MarkerData | null {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const markerMeshes = Array.from(this.markers.values()).map(m => m.mesh);
    const intersects = this.raycaster.intersectObjects(markerMeshes);

    if (intersects.length > 0) {
      for (const marker of this.markers.values()) {
        if (marker.mesh === intersects[0].object) {
          return marker;
        }
      }
    }
    return null;
  }

  public addMarker(position: THREE.Vector3): MarkerData {
    const geometry = new THREE.CircleGeometry(0.8, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const markerMesh = new THREE.Mesh(geometry, material);
    markerMesh.rotation.x = -Math.PI / 2;
    markerMesh.position.set(position.x, 0.01, position.z);

    this.scene.add(markerMesh);

    const id = ++this.markerIdCounter;
    const markerData: MarkerData = {
      id,
      mesh: markerMesh,
      position: position.clone()
    };
    this.markers.set(id, markerData);
    return markerData;
  }

  public removeMarker(id: number): void {
    const marker = this.markers.get(id);
    if (marker) {
      this.scene.remove(marker.mesh);
      (marker.mesh.geometry as THREE.BufferGeometry).dispose();
      (marker.mesh.material as THREE.Material).dispose();
      this.markers.delete(id);
    }
  }

  public getMarkers(): MarkerData[] {
    return Array.from(this.markers.values());
  }

  public clearMarkers(): void {
    for (const id of Array.from(this.markers.keys())) {
      this.removeMarker(id);
    }
  }
}
