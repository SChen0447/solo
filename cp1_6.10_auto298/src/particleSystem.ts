import * as THREE from 'three';

export type SpinDirection = 'up' | 'down';

export type MeasurementCombination = 'up-up' | 'up-down' | 'down-up' | 'down-down';

export interface MeasurementResult {
  particleA: SpinDirection;
  particleB: SpinDirection;
  combination: MeasurementCombination;
  timestamp: number;
}

interface QuantumParticle {
  id: 'A' | 'B';
  group: THREE.Group;
  sphere: THREE.Mesh;
  arrowUp: THREE.Group;
  arrowDown: THREE.Group;
  spin: SpinDirection | null;
  isMeasured: boolean;
}

interface GlowParticle {
  mesh: THREE.Mesh;
  basePosition: THREE.Vector3;
  offset: THREE.Vector3;
  phase: number;
  speed: number;
}

export class ParticleSystem {
  private readonly scene: THREE.Scene;
  private readonly particleA: QuantumParticle;
  private readonly particleB: QuantumParticle;
  private readonly glowParticles: GlowParticle[] = [];
  private readonly collapseDuration = 0.8;
  private collapseStartTime = -1;
  private targetSpinA: SpinDirection | null = null;
  private targetSpinB: SpinDirection | null = null;
  private isCollapsing = false;
  private pulse = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const sphereGeometry = new THREE.SphereGeometry(1.5, 48, 48);

    this.particleA = this.createParticle('A', '#3a86ff', new THREE.Vector3(-1.8, 0, 0), sphereGeometry);
    this.particleB = this.createParticle('B', '#ff006e', new THREE.Vector3(1.8, 0, 0), sphereGeometry);

    this.createGlowParticles();
  }

  private createParticle(
    id: 'A' | 'B',
    color: string,
    position: THREE.Vector3,
    geometry: THREE.SphereGeometry
  ): QuantumParticle {
    const group = new THREE.Group();
    group.position.copy(position);
    this.scene.add(group);

    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.75,
      shininess: 120,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.15
    });
    const sphere = new THREE.Mesh(geometry, sphereMaterial);
    group.add(sphere);

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(1.75, 32, 32),
      glowMaterial
    );
    group.add(glow);

    const arrowUp = this.createArrow(color, 'up');
    const arrowDown = this.createArrow(color, 'down');
    group.add(arrowUp);
    group.add(arrowDown);

    this.setArrowOpacity(arrowUp, 0.5);
    this.setArrowOpacity(arrowDown, 0.5);

    return {
      id,
      group,
      sphere,
      arrowUp,
      arrowDown,
      spin: null,
      isMeasured: false
    };
  }

  private createArrow(color: string, direction: 'up' | 'down'): THREE.Group {
    const arrowGroup = new THREE.Group();
    const c = new THREE.Color(color);

    const shaftGeometry = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 12);
    const shaftMaterial = new THREE.MeshPhongMaterial({
      color: c,
      emissive: c,
      emissiveIntensity: 0.5,
      transparent: true
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.position.y = direction === 'up' ? 1.6 : -1.6;
    arrowGroup.add(shaft);

    const coneGeometry = new THREE.ConeGeometry(0.2, 0.5, 16);
    const coneMaterial = new THREE.MeshPhongMaterial({
      color: c,
      emissive: c,
      emissiveIntensity: 0.7,
      transparent: true
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    if (direction === 'up') {
      cone.position.y = 2.75;
    } else {
      cone.position.y = -2.75;
      cone.rotation.z = Math.PI;
    }
    arrowGroup.add(cone);

    return arrowGroup;
  }

  private setArrowOpacity(arrow: THREE.Group, opacity: number): void {
    arrow.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
        child.material.opacity = opacity;
        child.material.transparent = opacity < 1;
        child.material.needsUpdate = true;
      }
    });
  }

  private createGlowParticles(): void {
    const geometry = new THREE.SphereGeometry(0.06, 8, 8);
    const colors = ['#4cc9f0', '#b5179e', '#f72585', '#3a86ff', '#ff006e'];

    for (let i = 0; i < 30; i++) {
      const color = colors[i % colors.length];
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.5
      });
      const mesh = new THREE.Mesh(geometry, material);

      const radius = 3.2 + Math.random() * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const basePos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi) * 0.5
      );
      mesh.position.copy(basePos);

      this.scene.add(mesh);
      this.glowParticles.push({
        mesh,
        basePosition: basePos,
        offset: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5
      });
    }
  }

  private reshuffleGlowParticles(): void {
    for (const gp of this.glowParticles) {
      const radius = 3.2 + Math.random() * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      gp.basePosition.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi) * 0.5
      );
      gp.offset.set(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      gp.phase = Math.random() * Math.PI * 2;
      gp.speed = 0.3 + Math.random() * 0.5;

      if (gp.mesh.material instanceof THREE.MeshBasicMaterial) {
        gp.mesh.material.opacity = 1.0;
      }
    }
    this.pulse = 0;
  }

  triggerCollapse(): MeasurementResult | null {
    if (this.isCollapsing) return null;

    this.isCollapsing = true;
    this.collapseStartTime = performance.now();

    const spinA: SpinDirection = Math.random() < 0.5 ? 'up' : 'down';
    const spinB: SpinDirection = spinA === 'up' ? 'down' : 'up';

    this.targetSpinA = spinA;
    this.targetSpinB = spinB;

    this.reshuffleGlowParticles();

    const combination = `${spinA}-${spinB}` as MeasurementCombination;
    return {
      particleA: spinA,
      particleB: spinB,
      combination,
      timestamp: Date.now()
    };
  }

  resetToSuperposition(): void {
    this.isCollapsing = false;
    this.particleA.spin = null;
    this.particleB.spin = null;
    this.particleA.isMeasured = false;
    this.particleB.isMeasured = false;
    this.targetSpinA = null;
    this.targetSpinB = null;

    this.particleA.arrowUp.rotation.set(0, 0, 0);
    this.particleA.arrowDown.rotation.set(0, 0, 0);
    this.particleB.arrowUp.rotation.set(0, 0, 0);
    this.particleB.arrowDown.rotation.set(0, 0, 0);

    this.setArrowOpacity(this.particleA.arrowUp, 0.5);
    this.setArrowOpacity(this.particleA.arrowDown, 0.5);
    this.setArrowOpacity(this.particleB.arrowUp, 0.5);
    this.setArrowOpacity(this.particleB.arrowDown, 0.5);

    this.particleA.sphere.scale.set(1, 1, 1);
    this.particleB.sphere.scale.set(1, 1, 1);

    if (this.particleA.sphere.material instanceof THREE.MeshPhongMaterial) {
      this.particleA.sphere.material.emissiveIntensity = 0.15;
    }
    if (this.particleB.sphere.material instanceof THREE.MeshPhongMaterial) {
      this.particleB.sphere.material.emissiveIntensity = 0.15;
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInCubic(t: number): number {
    return t * t * t;
  }

  update(elapsedSeconds: number): void {
    this.pulse += 1;

    for (const gp of this.glowParticles) {
      const t = elapsedSeconds * gp.speed + gp.phase;
      gp.mesh.position.x = gp.basePosition.x + Math.sin(t) * gp.offset.x;
      gp.mesh.position.y = gp.basePosition.y + Math.cos(t * 1.3) * gp.offset.y;
      gp.mesh.position.z = gp.basePosition.z + Math.sin(t * 0.7) * gp.offset.z;

      if (gp.mesh.material instanceof THREE.MeshBasicMaterial) {
        if (this.pulse > 0 && this.pulse < 60) {
          gp.mesh.material.opacity = 0.5 + 0.5 * Math.sin(this.pulse * 0.3);
        } else {
          gp.mesh.material.opacity = 0.4 + 0.15 * Math.sin(t * 2);
        }
      }
    }

    if (this.pulse > 0) {
      this.pulse--;
      if (this.pulse === 0) {
        for (const gp of this.glowParticles) {
          if (gp.mesh.material instanceof THREE.MeshBasicMaterial) {
            gp.mesh.material.opacity = 0.5;
          }
        }
      }
    }

    const floatOffset = Math.sin(elapsedSeconds * 1.2) * 0.08;
    this.particleA.group.position.y = floatOffset;
    this.particleB.group.position.y = -floatOffset;
    this.particleA.group.rotation.y = elapsedSeconds * 0.15;
    this.particleB.group.rotation.y = -elapsedSeconds * 0.15;

    if (!this.isCollapsing) {
      if (!this.particleA.isMeasured) {
        const wobble = Math.sin(elapsedSeconds * 2) * 0.1;
        this.particleA.arrowUp.rotation.z = wobble;
        this.particleA.arrowDown.rotation.z = -wobble;
        this.particleB.arrowUp.rotation.z = -wobble;
        this.particleB.arrowDown.rotation.z = wobble;
      }
      return;
    }

    const elapsed = (performance.now() - this.collapseStartTime) / 1000;
    const progress = Math.min(elapsed / this.collapseDuration, 1);

    this.applyCollapseAnimation(this.particleA, this.targetSpinA, progress);
    this.applyCollapseAnimation(this.particleB, this.targetSpinB, progress);

    if (progress >= 1) {
      this.isCollapsing = false;
      this.particleA.spin = this.targetSpinA;
      this.particleB.spin = this.targetSpinB;
      this.particleA.isMeasured = true;
      this.particleB.isMeasured = true;
      this.targetSpinA = null;
      this.targetSpinB = null;
    }
  }

  private applyCollapseAnimation(
    particle: QuantumParticle,
    targetSpin: SpinDirection | null,
    progress: number
  ): void {
    if (!targetSpin) return;

    let rotationSpeed: number;
    let fadeProgress: number;
    let scaleProgress: number;

    if (progress < 0.5) {
      const t = progress / 0.5;
      rotationSpeed = this.easeInCubic(t) * 25;
      fadeProgress = 0;
      scaleProgress = 0;
    } else if (progress < 0.75) {
      const t = (progress - 0.5) / 0.25;
      rotationSpeed = 25 * (1 - this.easeOutCubic(t));
      fadeProgress = this.easeOutCubic(t);
      scaleProgress = 0;
    } else {
      rotationSpeed = 0;
      fadeProgress = 1;
      scaleProgress = this.easeOutCubic((progress - 0.75) / 0.25);
    }

    const rotation = rotationSpeed * 0.016;
    particle.arrowUp.rotation.y += rotation;
    particle.arrowDown.rotation.y += rotation;

    const targetVisible = targetSpin === 'up' ? particle.arrowUp : particle.arrowDown;
    const targetHidden = targetSpin === 'up' ? particle.arrowDown : particle.arrowUp;

    this.setArrowOpacity(targetVisible, 0.5 + 0.5 * fadeProgress);
    this.setArrowOpacity(targetHidden, 0.5 * (1 - fadeProgress));

    if (fadeProgress >= 1) {
      targetVisible.rotation.y = 0;
      targetHidden.rotation.y = 0;
    }

    const pulseScale = 1 + Math.sin(scaleProgress * Math.PI) * 0.12;
    particle.sphere.scale.set(pulseScale, pulseScale, pulseScale);

    if (particle.sphere.material instanceof THREE.MeshPhongMaterial) {
      particle.sphere.material.emissiveIntensity = 0.15 + Math.sin(scaleProgress * Math.PI) * 0.5;
    }
  }

  isAnimating(): boolean {
    return this.isCollapsing;
  }

  dispose(): void {
    this.scene.remove(this.particleA.group);
    this.scene.remove(this.particleB.group);

    for (const gp of this.glowParticles) {
      this.scene.remove(gp.mesh);
      if (gp.mesh.geometry) gp.mesh.geometry.dispose();
      if (gp.mesh.material instanceof THREE.Material) gp.mesh.material.dispose();
    }
  }
}
