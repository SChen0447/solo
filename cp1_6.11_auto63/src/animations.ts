import * as THREE from 'three';
import gsap from 'gsap';
import type { BuildingObject } from './cityGenerator';

export class AnimationManager {
  private camera: THREE.PerspectiveCamera;
  private controls: { target: THREE.Vector3; update: () => void };
  private tweens: gsap.core.Tween[] = [];

  constructor(camera: THREE.PerspectiveCamera, controls: { target: THREE.Vector3; update: () => void }) {
    this.camera = camera;
    this.controls = controls;
  }

  public playCameraIntro(): void {
    this.camera.position.set(0, 400, 500);
    this.controls.target.set(0, 50, 0);
    this.controls.update();

    gsap.to(this.camera.position, {
      x: 0,
      y: 180,
      z: 350,
      duration: 2.5,
      ease: 'power2.out',
    });

    gsap.to(this.controls.target, {
      x: 0,
      y: 80,
      z: 0,
      duration: 2.5,
      ease: 'power2.out',
      onUpdate: () => {
        this.controls.update();
      },
    });
  }

  public playBuildingGrowth(buildings: BuildingObject[]): void {
    this.killAllTweens();

    buildings.forEach((building, index) => {
      const targetHeight = building.data.height;
      building.data.height = 0.01;

      const mesh = building.mesh;
      mesh.scale.y = 0.01;
      mesh.position.y = 0.005;

      for (const detail of building.details) {
        detail.visible = false;
      }

      const tween = gsap.to(mesh.scale, {
        y: 1,
        duration: 0.8,
        delay: index * 0.02,
        ease: 'back.out(1.7)',
        onStart: () => {
          building.data.height = targetHeight;
        },
        onUpdate: () => {
          mesh.position.y = (mesh.scale.y * targetHeight) / 2;
          building.edges.position.y = (mesh.scale.y * targetHeight) / 2;
          building.edges.scale.y = mesh.scale.y;
        },
        onComplete: () => {
          for (const detail of building.details) {
            detail.visible = true;
          }
          building.data.height = targetHeight;
        },
      });

      this.tweens.push(tween);
    });
  }

  public animateBuildingHeightChange(
    building: BuildingObject,
    targetHeight: number,
    duration: number = 0.5
  ): gsap.core.Tween {
    const startHeight = building.data.height;
    const mesh = building.mesh;
    const startPosY = mesh.position.y;
    const targetPosY = targetHeight / 2;

    const tween = gsap.to({}, {
      duration,
      ease: 'power2.inOut',
      onUpdate: function () {
        const progress = this.progress();
        const currentHeight = startHeight + (targetHeight - startHeight) * progress;
        const currentPosY = startPosY + (targetPosY - startPosY) * progress;

        mesh.scale.y = currentHeight / startHeight;
        mesh.position.y = currentPosY;
        building.edges.scale.y = currentHeight / startHeight;
        building.edges.position.y = currentPosY;

        for (let i = 0; i < building.details.length; i++) {
          const detail = building.details[i];
          const detailData = building.data.details[i];
          detail.position.y = currentHeight + detailData.height / 2;
        }
      },
      onComplete: () => {
        building.data.height = targetHeight;
      },
    });

    this.tweens.push(tween);
    return tween;
  }

  public animateBuildingColorChange(
    building: BuildingObject,
    targetBottom: string,
    targetTop: string,
    duration: number = 0.5
  ): gsap.core.Tween {
    const startBottom = new THREE.Color(building.data.colorBottom);
    const startTop = new THREE.Color(building.data.colorTop);
    const endBottom = new THREE.Color(targetBottom);
    const endTop = new THREE.Color(targetTop);

    const tween = gsap.to({}, {
      duration,
      ease: 'power2.inOut',
      onUpdate: function () {
        const progress = this.progress();
        const curBottom = startBottom.clone().lerp(endBottom, progress);
        const curTop = startTop.clone().lerp(endTop, progress);

        const colors = new Float32Array(building.mesh.geometry.attributes.position.count * 3);
        const positions = building.mesh.geometry.attributes.position;
        const height = building.data.height;

        for (let i = 0; i < positions.count; i++) {
          const y = positions.getY(i);
          const t = (y + height / 2) / height;
          const color = curBottom.clone().lerp(curTop, t);
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        }
        building.mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      },
      onComplete: () => {
        building.data.colorBottom = targetBottom;
        building.data.colorTop = targetTop;
      },
    });

    this.tweens.push(tween);
    return tween;
  }

  public animateCameraFocus(position: THREE.Vector3, duration: number = 1.2): void {
    gsap.to(this.controls.target, {
      x: position.x,
      y: position.y + 50,
      z: position.z,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => this.controls.update(),
    });

    const offset = new THREE.Vector3(80, 60, 120);
    gsap.to(this.camera.position, {
      x: position.x + offset.x,
      y: position.y + offset.y,
      z: position.z + offset.z,
      duration,
      ease: 'power2.inOut',
    });
  }

  public animateBuildingSelect(building: BuildingObject): void {
    gsap.to(building.group.position, {
      y: 0.5,
      duration: 0.3,
      ease: 'back.out(2)',
    });

    const edgeMat = building.edges.material as THREE.LineBasicMaterial;
    gsap.to(edgeMat, {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    });
  }

  public animateBuildingDeselect(building: BuildingObject): void {
    gsap.to(building.group.position, {
      y: 0,
      duration: 0.3,
      ease: 'power2.in',
    });

    const edgeMat = building.edges.material as THREE.LineBasicMaterial;
    gsap.to(edgeMat, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    });
  }

  public killAllTweens(): void {
    for (const tween of this.tweens) {
      if (tween && tween.isActive()) {
        tween.kill();
      }
    }
    this.tweens = [];
  }

  public dispose(): void {
    this.killAllTweens();
    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.controls.target);
  }
}
