import * as THREE from 'three';
import type { SculptureData, SculpturePartData } from './SculptureGenerator';

type EasingFunction = (t: number) => number;

interface ActiveAnimation {
  type: 'disassemble' | 'assemble' | 'haloIn' | 'haloOut' | 'partRotate';
  startTime: number;
  duration: number;
  target?: SculptureData;
  part?: SculpturePartData;
  startAngle?: number;
  endAngle?: number;
}

export class InteractionController {
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();
  private camera: THREE.PerspectiveCamera;
  private rendererDom: HTMLElement;
  private sculptures: SculptureData[] = [];
  private activeSculpture: SculptureData | null = null;
  private animations: ActiveAnimation[] = [];
  private onSculptureSelect: ((sculpture: SculptureData | null) => void) | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    _scene: THREE.Scene,
    rendererDom: HTMLElement
  ) {
    this.camera = camera;
    this.rendererDom = rendererDom;
    this.raycaster.params.Mesh = { threshold: 0.05 };
  }

  setSculptures(sculptures: SculptureData[]): void {
    this.sculptures = sculptures;
  }

  setOnSculptureSelect(callback: (sculpture: SculptureData | null) => void): void {
    this.onSculptureSelect = callback;
  }

  getActiveSculpture(): SculptureData | null {
    return this.activeSculpture;
  }

  private easeInOutCubic: EasingFunction = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  handlePointerClick(event: PointerEvent): void {
    const rect = this.rendererDom.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const allMeshes: THREE.Mesh[] = [];
    this.sculptures.forEach((sc) => {
      sc.parts.forEach((p) => allMeshes.push(p.mesh));
    });

    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    if (intersects.length === 0) {
      return;
    }

    const clickedMesh = intersects[0].object as THREE.Mesh;
    const clickedPart: SculpturePartData = clickedMesh.userData.partData;

    if (!clickedPart) {
      return;
    }

    const parentGroup = clickedMesh.parent as THREE.Group;
    const sculpture = this.sculptures.find(
      (s) => s.group === parentGroup || s.group === parentGroup.parent
    );

    if (!sculpture) {
      return;
    }

    if (this.activeSculpture !== sculpture) {
      this.selectSculpture(sculpture);
    } else if (sculpture.isDisassembled && !sculpture.isAnimating) {
      this.rotatePart(clickedPart);
    }
  }

  selectSculpture(sculpture: SculptureData): void {
    if (this.activeSculpture) {
      this.deselectSculpture(this.activeSculpture);
    }

    this.activeSculpture = sculpture;

    sculpture.halo.visible = true;
    (halo.material as THREE.MeshBasicMaterial).opacity = 0;

    this.animations.push({
      type: 'haloIn',
      startTime: performance.now(),
      duration: 300,
      target: sculpture,
    });

    if (this.onSculptureSelect) {
      this.onSculptureSelect(sculpture);
    }
  }

  private deselectSculpture(sculpture: SculptureData): void {
    const halo = sculpture.halo;
    this.animations.push({
      type: 'haloOut',
      startTime: performance.now(),
      duration: 300,
      target: sculpture,
    });
  }

  clearSelection(): void {
    if (this.activeSculpture) {
      this.deselectSculpture(this.activeSculpture);
      this.activeSculpture = null;
      this.activePart = null;
      if (this.onSculptureSelect) {
        this.onSculptureSelect(null);
      }
    }
  }

  disassembleActive(): void {
    if (!this.activeSculpture || this.activeSculpture.isAnimating || this.activeSculpture.isDisassembled) {
      return;
    }

    this.activeSculpture.isAnimating = true;
    this.animations.push({
      type: 'disassemble',
      startTime: performance.now(),
      duration: 1000,
      target: this.activeSculpture,
    });
  }

  assembleActive(): void {
    if (!this.activeSculpture || this.activeSculpture.isAnimating || !this.activeSculpture.isDisassembled) {
      return;
    }

    this.activeSculpture.isAnimating = true;
    this.activePart = null;
    this.animations.push({
      type: 'assemble',
      startTime: performance.now(),
      duration: 1200,
      target: this.activeSculpture,
    });
  }

  private rotatePart(part: SculpturePartData): void {
    this.activePart = part;
    const startAngle = part.mesh.rotation.y;
    const endAngle = startAngle + Math.PI / 4;

    this.animations.push({
      type: 'partRotate',
      startTime: performance.now(),
      duration: 250,
      part,
      startAngle,
      endAngle,
    });
  }

  update(time: number): void {
    if (this.animations.length === 0) {
      return;
    }

    const remaining: ActiveAnimation[] = [];

    for (const anim of this.animations) {
      const elapsed = time - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      const eased = this.easeInOutCubic(progress);

      switch (anim.type) {
        case 'disassemble':
          this.updateDisassemble(anim, eased);
          break;
        case 'assemble':
          this.updateAssemble(anim, eased);
          break;
        case 'haloIn':
          this.updateHaloIn(anim, eased);
          break;
        case 'haloOut':
          this.updateHaloOut(anim, eased);
          break;
        case 'partRotate':
          this.updatePartRotate(anim, eased);
          break;
      }

      if (progress < 1) {
        remaining.push(anim);
      } else {
        this.finalizeAnimation(anim);
      }
    }

    this.animations = remaining;
  }

  private updateDisassemble(anim: ActiveAnimation, eased: number): void {
    if (!anim.target) return;
    for (const part of anim.target.parts) {
      const target = new THREE.Vector3()
        .copy(part.originalPosition)
        .add(part.scatterDirection.clone().multiplyScalar(part.scatterDistance));
      part.mesh.position.lerpVectors(part.originalPosition, target, eased);
    }
  }

  private updateAssemble(anim: ActiveAnimation, eased: number): void {
    if (!anim.target) return;
    for (const part of anim.target.parts) {
      const start = part.mesh.position.clone();
      part.mesh.position.lerpVectors(start, part.originalPosition, eased);
      const rotStart = part.mesh.rotation.clone();
      part.mesh.rotation.x = rotStart.x + (part.originalRotation.x - rotStart.x) * eased;
      part.mesh.rotation.y = rotStart.y + (part.originalRotation.y - rotStart.y) * eased;
      part.mesh.rotation.z = rotStart.z + (part.originalRotation.z - rotStart.z) * eased;
    }
  }

  private updateHaloIn(anim: ActiveAnimation, eased: number): void {
    if (!anim.target) return;
    (anim.target.halo.material as THREE.MeshBasicMaterial).opacity = 0.7 * eased;
    const scale = 0.9 + 0.1 * eased;
    anim.target.halo.scale.set(scale, scale, scale);
  }

  private updateHaloOut(anim: ActiveAnimation, eased: number): void {
    if (!anim.target) return;
    (anim.target.halo.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - eased);
  }

  private updatePartRotate(anim: ActiveAnimation, eased: number): void {
    if (!anim.part || anim.startAngle === undefined || anim.endAngle === undefined) return;
    anim.part.mesh.rotation.y = anim.startAngle + (anim.endAngle - anim.startAngle) * eased;
  }

  private finalizeAnimation(anim: ActiveAnimation): void {
    switch (anim.type) {
      case 'disassemble':
        if (anim.target) {
          anim.target.isAnimating = false;
          anim.target.isDisassembled = true;
        }
        break;
      case 'assemble':
        if (anim.target) {
          anim.target.isAnimating = false;
          anim.target.isDisassembled = false;
        }
        break;
      case 'haloOut':
        if (anim.target) {
          anim.target.halo.visible = false;
        }
        break;
    }
  }

  isAnythingAnimating(): boolean {
    return this.animations.length > 0;
  }

  isActiveSculptureDisassembled(): boolean {
    return this.activeSculpture?.isDisassembled ?? false;
  }
}
