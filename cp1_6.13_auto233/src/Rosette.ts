import * as THREE from 'three';
import gsap from 'gsap';
import { Prism, COLOR_PALETTE } from './Prism';

interface RingConfig {
  radius: number;
  color: number;
  speed: number;
  direction: number;
}

export class Rosette {
  public group: THREE.Group;
  public prismMeshes: THREE.Mesh[] = [];
  private rings: THREE.Mesh[] = [];
  private ringGroups: THREE.Group[] = [];
  private prisms: Prism[] = [];
  private ringConfigs: RingConfig[] = [
    { radius: 1.5, color: 0xff6b6b, speed: 0.5, direction: 1 },
    { radius: 3.0, color: 0x48dbfb, speed: 0.3, direction: -1 },
    { radius: 5.0, color: 0xfeca57, speed: 0.15, direction: 1 },
  ];
  private speedMultiplier: number = 1;
  private speedBoostTween: gsap.core.Tween | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private camera: THREE.Camera;
  private hoveredPrism: Prism | null = null;
  private sharedBeamMaterial: THREE.MeshBasicMaterial;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.group = new THREE.Group();

    this.sharedBeamMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexColors: false,
    });

    this.createRings();
    this.createPrisms();
  }

  private createRings(): void {
    this.ringConfigs.forEach((config) => {
      const ringGroup = new THREE.Group();

      const tubeGeometry = new THREE.TorusGeometry(config.radius, 0.1, 24, 128);
      const material = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const tube = new THREE.Mesh(tubeGeometry, material);
      ringGroup.add(tube);

      const glowGeometry = new THREE.TorusGeometry(config.radius, 0.14, 24, 128);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      ringGroup.add(glow);

      this.ringGroups.push(ringGroup);
      this.rings.push(tube);
      this.group.add(ringGroup);
    });
  }

  private createPrisms(): void {
    const prismCountPerRing = 8;

    this.ringConfigs.forEach((config, ringIndex) => {
      for (let i = 0; i < prismCountPerRing; i++) {
        const angle = (i / prismCountPerRing) * Math.PI * 2;
        const x = Math.cos(angle) * config.radius;
        const z = Math.sin(angle) * config.radius;

        const colorIndex = (ringIndex * 3 + i + Math.floor(Math.random() * COLOR_PALETTE.length)) % COLOR_PALETTE.length;

        const prism = new Prism(
          new THREE.Vector3(x, 0, z),
          colorIndex,
          this.sharedBeamMaterial
        );

        this.ringGroups[ringIndex].add(prism.group);
        this.prisms.push(prism);
        this.prismMeshes.push(prism.mesh);
      }
    });
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.ringConfigs.forEach((config, index) => {
      this.ringGroups[index].rotation.y += config.speed * config.direction * this.speedMultiplier * deltaTime;
    });

    this.prisms.forEach((prism) => {
      prism.update(deltaTime, elapsedTime);
    });

    if (this.hoveredPrism) {
      const parent = this.hoveredPrism.group.parent;
      if (parent) {
        const worldPos = new THREE.Vector3();
        this.hoveredPrism.mesh.getWorldPosition(worldPos);
      }
    }
  }

  public handleMouseMove(event: MouseEvent, clientWidth: number, clientHeight: number): void {
    this.mouse.x = (event.clientX / clientWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.prismMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const prism = mesh.userData.prism as Prism;

      if (this.hoveredPrism !== prism) {
        if (this.hoveredPrism) {
          this.hoveredPrism.setHovered(false);
        }
        this.hoveredPrism = prism;
        prism.setHovered(true);
      }
    } else {
      if (this.hoveredPrism) {
        this.hoveredPrism.setHovered(false);
        this.hoveredPrism = null;
      }
    }
  }

  public triggerLightPulse(): void {
    this.prisms.forEach((prism, index) => {
      setTimeout(() => {
        prism.triggerLightPulse();
      }, index * 15);
    });

    if (this.speedBoostTween) {
      this.speedBoostTween.kill();
    }

    const speed = { mult: this.speedMultiplier };
    this.speedBoostTween = gsap.to(speed, {
      mult: 2,
      duration: 0.2,
      ease: 'power2.out',
      onUpdate: () => {
        this.speedMultiplier = speed.mult;
      },
      onComplete: () => {
        gsap.to(speed, {
          mult: 1,
          duration: 2.8,
          ease: 'power2.inOut',
          delay: 0,
          onUpdate: () => {
            this.speedMultiplier = speed.mult;
          },
        });
      },
    });

    this.rings.forEach((ring, idx) => {
      const mat = ring.material as THREE.MeshBasicMaterial;
      const originalOpacity = 0.5;
      const flash = { t: 0 };
      gsap.to(flash, {
        t: 1,
        duration: 0.3,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
        onUpdate: () => {
          mat.opacity = originalOpacity + flash.t * 0.4;
        },
      });
    });
  }

  public dispose(): void {
    if (this.speedBoostTween) {
      this.speedBoostTween.kill();
    }

    this.prisms.forEach((prism) => prism.dispose());
    Prism.disposeSharedResources();

    this.rings.forEach((ring) => {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    });

    this.ringGroups.forEach((group) => {
      group.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    });

    this.sharedBeamMaterial.dispose();
  }
}
