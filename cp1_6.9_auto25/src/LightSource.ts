import * as THREE from 'three';

export interface Fragment {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  baseSpeed: number;
  acceleratedTime: number;
  isAccelerated: boolean;
}

export class LightSource {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private beamGroup: THREE.Group;
  private beamMesh: THREE.Mesh;
  private beamSpot: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  public litCrystals = new Set<THREE.Mesh>();
  public litFragments = new Set<THREE.Mesh>();
  private fragments: Fragment[] = [];

  public azimuthAngle = 0;
  public elevationAngle = Math.PI / 6;
  public lightHue = 50;
  public energy = 0.5;
  public beamDirection = new THREE.Vector3();

  private readonly BEAM_LENGTH = 10;
  private readonly BEAM_WIDTH = 0.1;
  private readonly DISTANCE_FROM_CAMERA = 5;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) {
    this.scene = scene;
    this.camera = camera;

    this.beamGroup = new THREE.Group();
    this.scene.add(this.beamGroup);

    this.beamMesh = this.createBeam();
    this.beamSpot = this.createBeamSpot();
    this.beamGroup.add(this.beamMesh);
    this.beamGroup.add(this.beamSpot);

    this.createFragments();
    this.bindKeyboardEvents();
    this.updateBeamColor();
  }

  private createBeam(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(
      this.BEAM_WIDTH / 2,
      this.BEAM_WIDTH / 2,
      this.BEAM_LENGTH,
      16,
      1,
      true
    );

    const material = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = -this.BEAM_LENGTH / 2;
    return mesh;
  }

  private createBeamSpot(): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(0.15, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.z = -this.BEAM_LENGTH;
    return mesh;
  }

  private createFragments(): void {
    const fragmentCount = 5;

    for (let i = 0; i < fragmentCount; i++) {
      const size = 0.3 + Math.random() * 0.2;
      const geometry = new THREE.TetrahedronGeometry(size);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1 + Math.random() * 0.2,
        side: THREE.DoubleSide,
        wireframe: false
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 15,
        Math.random() * 5 + 1,
        (Math.random() - 0.5) * 15
      );

      const baseSpeed = 0.1;
      const fragment: Fragment = {
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * baseSpeed,
          (Math.random() - 0.5) * baseSpeed * 0.5,
          (Math.random() - 0.5) * baseSpeed
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * (0.2 + Math.random() * 0.6),
          (Math.random() - 0.5) * (0.2 + Math.random() * 0.6),
          (Math.random() - 0.5) * (0.2 + Math.random() * 0.6)
        ),
        baseSpeed,
        acceleratedTime: 0,
        isAccelerated: false
      };

      this.fragments.push(fragment);
      this.scene.add(mesh);
    }
  }

  getFragments(): Fragment[] {
    return this.fragments;
  }

  getFragmentMeshes(): THREE.Mesh[] {
    return this.fragments.map(f => f.mesh);
  }

  private bindKeyboardEvents(): void {
    window.addEventListener('keydown', (e) => {
      const rotateSpeed = 0.03;
      switch (e.key.toLowerCase()) {
        case 'a':
          this.azimuthAngle -= rotateSpeed;
          break;
        case 'd':
          this.azimuthAngle += rotateSpeed;
          break;
        case 'w':
          this.elevationAngle = Math.min(Math.PI / 2.5, this.elevationAngle + rotateSpeed);
          break;
        case 's':
          this.elevationAngle = Math.max(-Math.PI / 4, this.elevationAngle - rotateSpeed);
          break;
      }
    });
  }

  setHue(hue: number): void {
    this.lightHue = hue;
    this.updateBeamColor();
  }

  setEnergy(energy: number): void {
    this.energy = energy;
    const opacity = 0.2 + (0.8 - 0.2) * energy;
    (this.beamMesh.material as THREE.MeshBasicMaterial).opacity = opacity;
    (this.beamSpot.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.5 * energy;
  }

  private updateBeamColor(): void {
    const color = new THREE.Color().setHSL(this.lightHue / 360, 1.0, 0.65);
    (this.beamMesh.material as THREE.MeshBasicMaterial).color.copy(color);
    (this.beamSpot.material as THREE.MeshBasicMaterial).color.copy(color);
  }

  getDirection(): THREE.Vector3 {
    return this.beamDirection.clone();
  }

  checkIntersections(
    crystalMeshes: THREE.Mesh[],
    fragmentMeshes: THREE.Mesh[]
  ): void {
    this.litCrystals.clear();
    this.litFragments.clear();

    const beamOrigin = new THREE.Vector3();
    this.beamGroup.getWorldPosition(beamOrigin);

    this.raycaster.set(beamOrigin, this.beamDirection);
    this.raycaster.far = this.BEAM_LENGTH + 1;

    const crystalIntersects = this.raycaster.intersectObjects(crystalMeshes);
    for (const intersect of crystalIntersects) {
      this.litCrystals.add(intersect.object as THREE.Mesh);
    }

    const fragmentIntersects = this.raycaster.intersectObjects(fragmentMeshes);
    for (const intersect of fragmentIntersects) {
      this.litFragments.add(intersect.object as THREE.Mesh);
    }
  }

  private updateBeamPosition(): void {
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    const right = new THREE.Vector3();
    right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();

    const up = new THREE.Vector3();
    up.crossVectors(right, cameraDirection).normalize();

    const horizontalRotation = new THREE.Quaternion().setFromAxisAngle(up, this.azimuthAngle);
    const verticalRotation = new THREE.Quaternion().setFromAxisAngle(right, this.elevationAngle);

    const beamDir = cameraDirection.clone();
    beamDir.applyQuaternion(horizontalRotation);
    beamDir.applyQuaternion(verticalRotation);
    beamDir.normalize();
    this.beamDirection.copy(beamDir);

    const startPos = this.camera.position.clone().add(
      cameraDirection.clone().multiplyScalar(this.DISTANCE_FROM_CAMERA)
    );

    this.beamGroup.position.copy(startPos);
    this.beamGroup.lookAt(startPos.clone().add(beamDir));
  }

  update(delta: number, crystalMeshes: THREE.Mesh[]): void {
    this.updateBeamPosition();
    this.checkIntersections(crystalMeshes, this.getFragmentMeshes());
    this.updateFragments(delta);
  }

  private updateFragments(delta: number): void {
    for (const fragment of this.fragments) {
      const isHit = this.litFragments.has(fragment.mesh);

      if (isHit) {
        fragment.acceleratedTime = 1.0;
        fragment.isAccelerated = true;
        fragment.velocity.copy(this.beamDirection.clone().multiplyScalar(0.5));
      } else if (fragment.acceleratedTime > 0) {
        fragment.acceleratedTime -= delta;
        if (fragment.acceleratedTime <= 0) {
          fragment.isAccelerated = false;
          fragment.velocity.set(
            (Math.random() - 0.5) * fragment.baseSpeed,
            (Math.random() - 0.5) * fragment.baseSpeed * 0.5,
            (Math.random() - 0.5) * fragment.baseSpeed
          );
        }
      }

      fragment.mesh.position.add(fragment.velocity.clone().multiplyScalar(delta * 60));
      fragment.mesh.rotation.x += fragment.rotationSpeed.x * delta;
      fragment.mesh.rotation.y += fragment.rotationSpeed.y * delta;
      fragment.mesh.rotation.z += fragment.rotationSpeed.z * delta;

      const bounds = 10;
      if (Math.abs(fragment.mesh.position.x) > bounds) {
        fragment.velocity.x *= -1;
        fragment.mesh.position.x = Math.sign(fragment.mesh.position.x) * bounds;
      }
      if (Math.abs(fragment.mesh.position.y) > bounds) {
        fragment.velocity.y *= -1;
        fragment.mesh.position.y = Math.sign(fragment.mesh.position.y) * bounds;
      }
      if (Math.abs(fragment.mesh.position.z) > bounds) {
        fragment.velocity.z *= -1;
        fragment.mesh.position.z = Math.sign(fragment.mesh.position.z) * bounds;
      }
    }
  }

  dispose(): void {
    this.scene.remove(this.beamGroup);
    (this.beamMesh.material as THREE.Material).dispose();
    this.beamMesh.geometry.dispose();
    (this.beamSpot.material as THREE.Material).dispose();
    this.beamSpot.geometry.dispose();

    for (const fragment of this.fragments) {
      (fragment.mesh.material as THREE.Material).dispose();
      fragment.mesh.geometry.dispose();
      this.scene.remove(fragment.mesh);
    }
    this.fragments = [];
  }
}
