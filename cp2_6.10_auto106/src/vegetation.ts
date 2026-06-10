import * as THREE from 'three';
import { getTerrainHeightAt } from './terrain';

type AnimationType = 'spawn' | 'remove' | 'color';

interface AnimatedInstance {
  mesh: THREE.Group;
  startY: number;
  targetY: number;
  startScale: number;
  targetScale: number;
  startTime: number;
  duration: number;
  type: AnimationType;
  baseColor: THREE.Color;
  targetColor: THREE.Color;
}

class VegetationBase {
  group: THREE.Group;
  protected instances: THREE.Group[] = [];
  protected animations: AnimatedInstance[] = [];
  protected colorStart: THREE.Color;
  protected colorEnd: THREE.Color;
  protected hueShift: number = 0;
  protected saturation: number = 1;
  protected terrain: THREE.Mesh;

  constructor(terrain: THREE.Mesh, colorStartHex: string, colorEndHex: string) {
    this.group = new THREE.Group();
    this.terrain = terrain;
    this.colorStart = new THREE.Color(colorStartHex);
    this.colorEnd = new THREE.Color(colorEndHex);
  }

  protected applyColor(mesh: THREE.Group, color: THREE.Color) {
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
        if (!child.userData.isTrunk) {
          child.material.color.copy(color);
        }
      }
    });
  }

  protected getAdjustedColor(baseColor: THREE.Color): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    hsl.h = (hsl.h + this.hueShift / 360) % 1;
    hsl.s = Math.min(1, Math.max(0, hsl.s * this.saturation));
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  }

  scatter(count: number, createFn: () => THREE.Group) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const instance = createFn();
        const x = (Math.random() - 0.5) * 18;
        const z = (Math.random() - 0.5) * 18;
        const y = getTerrainHeightAt(this.terrain, x, z);

        instance.position.set(x, y - 2, z);
        instance.rotation.y = Math.random() * Math.PI * 2;

        const scale = 0.7 + Math.random() * 0.6;
        instance.scale.setScalar(0.01);

        this.group.add(instance);
        this.instances.push(instance);

        this.animations.push({
          mesh: instance,
          startY: y - 2,
          targetY: y,
          startScale: 0.01,
          targetScale: scale,
          startTime: performance.now(),
          duration: 300,
          type: 'spawn',
          baseColor: new THREE.Color(),
          targetColor: new THREE.Color(),
        });
      }, i * 80);
    }
  }

  clear() {
    const instancesCopy = [...this.instances];
    instancesCopy.forEach((instance, i) => {
      setTimeout(() => {
        const currentScale = instance.scale.x;
        this.animations.push({
          mesh: instance,
          startY: instance.position.y,
          targetY: instance.position.y - 1,
          startScale: currentScale,
          targetScale: 0.01,
          startTime: performance.now(),
          duration: 400,
          type: 'remove',
          baseColor: new THREE.Color(),
          targetColor: new THREE.Color(),
        });
      }, i * 10);
    });
  }

  updateColor(hueShift: number, saturation: number) {
    this.hueShift = hueShift;
    this.saturation = saturation / 100;

    this.instances.forEach((instance) => {
      let originalColor: THREE.Color | null = null;
      instance.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
          if (!child.userData.isTrunk) {
            if (child.userData.originalColor) {
              originalColor = child.userData.originalColor.clone();
            }
          }
        }
      });

      if (originalColor) {
        const targetColor = this.getAdjustedColor(originalColor);
        instance.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
            if (!child.userData.isTrunk) {
              this.animations.push({
                mesh: instance,
                startY: 0,
                targetY: 0,
                startScale: 1,
                targetScale: 1,
                startTime: performance.now(),
                duration: 300,
                type: 'color',
                baseColor: child.material.color.clone(),
                targetColor: targetColor.clone(),
              });
            }
          }
        });
      }
    });
  }

  update() {
    const now = performance.now();
    const toRemove: number[] = [];

    this.animations.forEach((anim, index) => {
      const elapsed = now - anim.startTime;
      const progress = Math.min(1, elapsed / anim.duration);

      if (anim.type === 'spawn') {
        const t = easeOutCubic(progress);
        anim.mesh.position.y = anim.startY + (anim.targetY - anim.startY) * t;
        const s = anim.startScale + (anim.targetScale - anim.startScale) * t;
        anim.mesh.scale.setScalar(s);
        if (progress >= 1) toRemove.push(index);
      } else if (anim.type === 'remove') {
        const t = easeInCubic(progress);
        anim.mesh.position.y = anim.startY + (anim.targetY - anim.startY) * t;
        const s = anim.startScale + (anim.targetScale - anim.startScale) * t;
        anim.mesh.scale.setScalar(s);
        if (progress >= 1) {
          this.group.remove(anim.mesh);
          this.instances = this.instances.filter((i) => i !== anim.mesh);
          anim.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              if (child.material instanceof THREE.Material) {
                child.material.dispose();
              }
            }
          });
          toRemove.push(index);
        }
      } else if (anim.type === 'color') {
        const t = linear(progress);
        anim.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
            if (!child.userData.isTrunk) {
              child.material.color.lerpColors(anim.baseColor, anim.targetColor, t);
            }
          }
        });
        if (progress >= 1) toRemove.push(index);
      }
    });

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.animations.splice(toRemove[i], 1);
    }
  }

  hasAnimations(): boolean {
    return this.animations.length > 0;
  }
}

export class TreeVegetation extends VegetationBase {
  constructor(terrain: THREE.Mesh) {
    super(terrain, '#4CAF50', '#2E7D32');
  }

  scatter(count: number) {
    super.scatter(count, () => this.createTree());
  }

  private createTree(): THREE.Group {
    const tree = new THREE.Group();

    const trunkGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.6, 6);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 0.3;
    trunk.userData.isTrunk = true;
    tree.add(trunk);

    const coneCount = 3;
    for (let i = 0; i < coneCount; i++) {
      const radius = 0.45 - i * 0.1;
      const height = 0.5 - i * 0.08;
      const coneGeometry = new THREE.ConeGeometry(radius, height, 6);
      const baseColor = this.colorStart.clone().lerp(this.colorEnd, Math.random());
      const adjustedColor = this.getAdjustedColor(baseColor);
      const coneMaterial = new THREE.MeshLambertMaterial({ color: adjustedColor });
      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      cone.position.y = 0.6 + i * 0.3;
      (cone.userData as any).originalColor = baseColor;
      tree.add(cone);
    }

    return tree;
  }
}

export class BushVegetation extends VegetationBase {
  constructor(terrain: THREE.Mesh) {
    super(terrain, '#8BC34A', '#558B2F');
  }

  scatter(count: number) {
    super.scatter(count, () => this.createBush());
  }

  private createBush(): THREE.Group {
    const bush = new THREE.Group();

    for (let i = 0; i < 2; i++) {
      const hemisphereGeometry = new THREE.SphereGeometry(0.25 + Math.random() * 0.15, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      const baseColor = this.colorStart.clone().lerp(this.colorEnd, Math.random());
      const adjustedColor = this.getAdjustedColor(baseColor);
      const hemisphereMaterial = new THREE.MeshLambertMaterial({ color: adjustedColor });
      const hemisphere = new THREE.Mesh(hemisphereGeometry, hemisphereMaterial);
      hemisphere.position.set(
        (Math.random() - 0.5) * 0.2,
        0.15,
        (Math.random() - 0.5) * 0.2
      );
      hemisphere.rotation.x = Math.PI;
      (hemisphere.userData as any).originalColor = baseColor;
      bush.add(hemisphere);
    }

    return bush;
  }
}

export class RockVegetation extends VegetationBase {
  constructor(terrain: THREE.Mesh) {
    super(terrain, '#9E9E9E', '#616161');
  }

  scatter(count: number) {
    super.scatter(count, () => this.createRock());
  }

  private createRock(): THREE.Group {
    const rock = new THREE.Group();

    const dodecaGeometry = new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.25, 0);
    const baseColor = this.colorStart.clone().lerp(this.colorEnd, Math.random());
    const adjustedColor = this.getAdjustedColor(baseColor);
    const dodecaMaterial = new THREE.MeshLambertMaterial({ color: adjustedColor, flatShading: true });
    const dodeca = new THREE.Mesh(dodecaGeometry, dodecaMaterial);
    dodeca.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    dodeca.position.y = 0.15;
    (dodeca.userData as any).originalColor = baseColor;
    rock.add(dodeca);

    return rock;
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

function linear(t: number): number {
  return t;
}
