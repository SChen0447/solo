import * as THREE from 'three';

export type FossilGroup = 'skull' | 'torso' | 'limbs';

export interface FossilConfig {
  id: number;
  group: FossilGroup;
  groupIndex: number;
  buriedPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  targetRotation: number;
  buryDepth: number;
  length: number;
}

export enum FossilState {
  Buried = 'buried',
  Digging = 'digging',
  Rising = 'rising',
  Exposed = 'exposed',
  Dragging = 'dragging',
  Snapping = 'snapping',
  Assembled = 'assembled'
}

export class Fossil {
  public id: number;
  public group: FossilGroup;
  public groupIndex: number;
  public state: FossilState = FossilState.Buried;

  public mesh: THREE.Group;
  public selectionRing: THREE.Mesh;
  public targetPosition: THREE.Vector3;
  public targetRotation: number;

  private buryDepth: number;
  private buriedY: number;
  private exposedY: number;

  private animProgress = 0;
  private animDuration = 0;
  private animStartPos: THREE.Vector3 = new THREE.Vector3();
  private animEndPos: THREE.Vector3 = new THREE.Vector3();
  private animStartRot = 0;
  private animEndRot = 0;
  private snapLight?: THREE.PointLight;

  private currentRotationY = 0;

  constructor(config: FossilConfig, scene: THREE.Scene) {
    this.id = config.id;
    this.group = config.group;
    this.groupIndex = config.groupIndex;
    this.targetPosition = config.targetPosition.clone();
    this.targetRotation = config.targetRotation;
    this.buryDepth = config.buryDepth;
    this.buriedY = config.buriedPosition.y;
    this.exposedY = 0.15;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(config.buriedPosition);
    this.mesh.visible = false;

    this.createBoneMesh(config.length);

    this.selectionRing = this.createSelectionRing();
    this.selectionRing.visible = false;
    this.mesh.add(this.selectionRing);

    scene.add(this.mesh);
  }

  private createBoneMesh(length: number): void {
    const useCylinder = Math.random() > 0.5;
    let geometry: THREE.BufferGeometry;

    if (useCylinder) {
      const radiusTop = length * (0.12 + Math.random() * 0.08);
      const radiusBottom = length * (0.15 + Math.random() * 0.1);
      geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 8, 1);
    } else {
      const w = length * (0.25 + Math.random() * 0.15);
      const h = length * (0.2 + Math.random() * 0.1);
      geometry = new THREE.BoxGeometry(w, h, length);
    }

    const positions = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      positions.setX(i, x + (Math.random() - 0.5) * 0.08);
      positions.setY(i, y + (Math.random() - 0.5) * 0.08);
      positions.setZ(i, z + (Math.random() - 0.5) * 0.08);
    }
    geometry.computeVertexNormals();

    const color1 = new THREE.Color('#F5DEB3');
    const color2 = new THREE.Color('#EEDC82');
    const material = new THREE.MeshStandardMaterial({
      color: color1.clone().lerp(color2, Math.random()),
      roughness: 0.7,
      metalness: 0.1,
      flatShading: true
    });

    const bone = new THREE.Mesh(geometry, material);
    bone.castShadow = true;
    bone.receiveShadow = true;
    bone.rotation.x = (Math.random() - 0.5) * 0.3;
    bone.rotation.z = (Math.random() - 0.5) * 0.3;

    this.mesh.add(bone);

    if (Math.random() > 0.5) {
      const extraGeo = new THREE.SphereGeometry(length * 0.15, 6, 4);
      const extraMat = material.clone();
      const extra = new THREE.Mesh(extraGeo, extraMat);
      extra.position.set(
        (Math.random() - 0.5) * length * 0.3,
        (Math.random() - 0.5) * length * 0.2,
        length * (Math.random() - 0.3)
      );
      extra.castShadow = true;
      this.mesh.add(extra);
    }
  }

  private createSelectionRing(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(0.4, 0.5, 32);
    const material = new THREE.MeshBasicMaterial({
      color: '#FFD700',
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -this.exposedY + 0.01;
    return ring;
  }

  public startDigging(scene: THREE.Scene, onComplete: () => void): void {
    if (this.state !== FossilState.Buried) return;

    this.state = FossilState.Digging;
    this.animProgress = 0;
    this.animDuration = 0.6;
    this.animStartPos.copy(this.mesh.position);
    this.animEndPos.copy(this.mesh.position);
    this.animEndPos.y = this.buriedY + 0.1;

    setTimeout(() => {
      this.mesh.visible = true;
      this.state = FossilState.Rising;
      this.animProgress = 0;
      this.animDuration = 0.4;
      this.animStartPos.copy(this.mesh.position);
      this.animEndPos.set(this.mesh.position.x, this.exposedY, this.mesh.position.z);

      const riseInterval = setInterval(() => {
        if (this.state === FossilState.Rising) {
          this.animProgress += 1 / 60;
          const t = Math.min(this.animProgress / this.animDuration, 1);
          const easeT = 1 - Math.pow(1 - t, 3);
          this.mesh.position.lerpVectors(this.animStartPos, this.animEndPos, easeT);

          if (t >= 1) {
            clearInterval(riseInterval);
            this.state = FossilState.Exposed;
            this.mesh.position.y = this.exposedY;
            onComplete();
          }
        } else {
          clearInterval(riseInterval);
        }
      }, 1000 / 60);
    }, 600);
  }

  public startDragging(): void {
    if (this.state !== FossilState.Exposed && this.state !== FossilState.Dragging) return;
    this.state = FossilState.Dragging;
    this.selectionRing.visible = true;
  }

  public updateDragPosition(worldPos: THREE.Vector3): void {
    if (this.state !== FossilState.Dragging) return;
    this.mesh.position.x = worldPos.x;
    this.mesh.position.z = worldPos.z;
    this.mesh.position.y = this.exposedY + 0.3;
  }

  public rotateByWheel(delta: number): void {
    if (this.state === FossilState.Assembled) return;
    const rotationStep = THREE.MathUtils.degToRad(15);
    const direction = delta > 0 ? 1 : -1;
    this.currentRotationY += direction * rotationStep;
    this.currentRotationY = ((this.currentRotationY % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    this.mesh.rotation.y = this.currentRotationY;
  }

  public stopDragging(scene: THREE.Scene, onSnap: () => void, onDrop: () => void): void {
    if (this.state !== FossilState.Dragging) return;
    this.selectionRing.visible = false;

    const dx = this.mesh.position.x - this.targetPosition.x;
    const dz = this.mesh.position.z - this.targetPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    let rotDiff = Math.abs(this.currentRotationY - this.targetRotation);
    rotDiff = Math.min(rotDiff, Math.PI * 2 - rotDiff);

    if (distance < 0.3 && rotDiff < THREE.MathUtils.degToRad(10)) {
      this.snapToTarget(scene, onSnap);
    } else {
      this.state = FossilState.Exposed;
      this.mesh.position.y = this.exposedY;
      onDrop();
    }
  }

  private snapToTarget(scene: THREE.Scene, onComplete: () => void): void {
    this.state = FossilState.Snapping;

    this.snapLight = new THREE.PointLight(0xffffff, 3, 3);
    this.snapLight.position.copy(this.targetPosition);
    this.snapLight.position.y += 0.5;
    scene.add(this.snapLight);

    setTimeout(() => {
      if (this.snapLight) {
        scene.remove(this.snapLight);
        this.snapLight = undefined;
      }
    }, 150);

    this.animProgress = 0;
    this.animDuration = 0.2;
    this.animStartPos.copy(this.mesh.position);
    this.animEndPos.copy(this.targetPosition);
    this.animEndPos.y = this.exposedY;
    this.animStartRot = this.currentRotationY;
    this.animEndRot = this.targetRotation;

    const snapInterval = setInterval(() => {
      if (this.state === FossilState.Snapping) {
        this.animProgress += 1 / 60;
        const t = Math.min(this.animProgress / this.animDuration, 1);
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        this.mesh.position.lerpVectors(this.animStartPos, this.animEndPos, easeT);

        let rotDiff = this.animEndRot - this.animStartRot;
        if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        this.currentRotationY = this.animStartRot + rotDiff * easeT;
        this.mesh.rotation.y = this.currentRotationY;

        if (t >= 1) {
          clearInterval(snapInterval);
          this.state = FossilState.Assembled;
          this.mesh.position.copy(this.targetPosition);
          this.mesh.position.y = this.exposedY;
          this.currentRotationY = this.targetRotation;
          this.mesh.rotation.y = this.currentRotationY;
          this.selectionRing.visible = false;
          onComplete();
        }
      } else {
        clearInterval(snapInterval);
      }
    }, 1000 / 60);
  }

  public setFinalAssembledLook(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.color.set('#EEDD82');
        child.material.emissive = new THREE.Color('#EEDD82');
        child.material.emissiveIntensity = 0.05;
        child.material.needsUpdate = true;
      }
    });
  }

  public containsObject(obj: THREE.Object3D): boolean {
    return this.mesh.children.some((child) => child === obj) || obj === this.mesh;
  }

  public isClickable(): boolean {
    return this.state === FossilState.Exposed || this.state === FossilState.Dragging;
  }

  public isAssembled(): boolean {
    return this.state === FossilState.Assembled;
  }

  public isExposedOrMore(): boolean {
    return this.state !== FossilState.Buried && this.state !== FossilState.Digging;
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    if (this.snapLight) {
      scene.remove(this.snapLight);
    }
  }
}
