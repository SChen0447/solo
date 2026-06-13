import * as THREE from 'three';
import { gsap } from 'gsap';
import { CONFIG } from './config';
import { audioManager } from './audio';

export class Platform {
  private group: THREE.Group;
  private platformMesh: THREE.Mesh;
  private starMesh: THREE.Mesh;
  private beamMesh: THREE.Mesh | null = null;
  private position: THREE.Vector3;
  private hoverTimer: number | null = null;
  private isBeamActive = false;
  private starPulse: { scale: number } = { scale: 1 };

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.group = new THREE.Group();

    this.platformMesh = this.createOctagon();
    this.starMesh = this.createStar();

    this.group.add(this.platformMesh);
    this.group.add(this.starMesh);
    this.group.position.copy(position);

    this.animateStarPulse();
  }

  private createOctagon(): THREE.Mesh {
    const shape = new THREE.Shape();
    const sides = 8;
    const radius = CONFIG.platform.octagonSide;
    const angleOffset = -Math.PI / 8;

    for (let i = 0; i < sides; i++) {
      const angle = angleOffset + (i * 2 * Math.PI) / sides;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();

    const extrudeSettings = {
      depth: 5,
      bevelEnabled: true,
      bevelThickness: 2,
      bevelSize: 2,
      bevelSegments: 1
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.center();

    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(CONFIG.platform.bgColor),
      transparent: true,
      opacity: 0.8
    });

    const mesh = new THREE.Mesh(geometry, material);

    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(CONFIG.platform.borderColor),
      transparent: true,
      opacity: 0.9
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    mesh.add(edges);

    return mesh;
  }

  private createStar(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(CONFIG.platform.starDiameter / 2, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(CONFIG.platform.starColor),
      transparent: true,
      opacity: 1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 8;
    return mesh;
  }

  private createBeam(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(
      CONFIG.platform.beamDiameter / 2,
      CONFIG.platform.beamDiameter / 2,
      CONFIG.platform.beamHeight,
      16,
      1,
      true
    );
    geometry.translate(0, CONFIG.platform.beamHeight / 2, 0);

    const colors = CONFIG.colors.warmPresets;
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(randomColor),
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 15;
    return mesh;
  }

  private animateStarPulse(): void {
    gsap.to(this.starPulse, {
      scale: 1.3,
      duration: CONFIG.platform.starPulsePeriod / 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      onUpdate: () => {
        this.starMesh.scale.setScalar(this.starPulse.scale);
        const material = this.starMesh.material as THREE.MeshBasicMaterial;
        material.opacity = 0.7 + 0.3 * this.starPulse.scale / 1.3;
      }
    });
  }

  private triggerBeam(): void {
    if (this.isBeamActive) return;
    this.isBeamActive = true;

    this.beamMesh = this.createBeam();
    this.group.add(this.beamMesh);

    const material = this.beamMesh.material as THREE.MeshBasicMaterial;

    gsap.timeline()
      .to(material, {
        opacity: CONFIG.platform.beamOpacity,
        duration: 0.3,
        ease: 'power2.out'
      })
      .to(this.beamMesh!.scale, {
        y: 1.5,
        duration: 0.5,
        ease: 'power2.out'
      }, 0)
      .to(material, {
        opacity: 0,
        duration: 1,
        ease: 'power2.in',
        delay: CONFIG.platform.beamDuration / 1000 - 1
      })
      .call(() => {
        if (this.beamMesh) {
          this.group.remove(this.beamMesh);
          this.beamMesh.geometry.dispose();
          (this.beamMesh.material as THREE.Material).dispose();
          this.beamMesh = null;
        }
        this.isBeamActive = false;
      });

    audioManager.playPlatformBeam();
  }

  onMouseEnter(): void {
    this.hoverTimer = window.setTimeout(() => {
      this.triggerBeam();
    }, CONFIG.platform.hoverDelay);
  }

  onMouseLeave(): void {
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
  }

  getMesh(): THREE.Group {
    return this.group;
  }

  getPosition(): THREE.Vector3 {
    return this.position;
  }

  containsPoint(point: THREE.Vector3): boolean {
    const dx = point.x - this.position.x;
    const dz = point.z - this.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return distance < CONFIG.platform.octagonSide * 1.2;
  }

  dispose(): void {
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer);
    }
    gsap.killTweensOf(this.starPulse);
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
