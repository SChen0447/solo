import * as THREE from 'three';

export const DICE_COLORS: Record<number, number> = {
  1: 0xff4444,
  2: 0x4488ff,
  3: 0x44dd66,
  4: 0xffdd44,
  5: 0xaa55ff,
  6: 0xff9944
};

const BRICK_WIDTH = 1.2;
const BRICK_HEIGHT = 0.6;
const BRICK_DEPTH = 0.8;
const LAYERS = 5;
const BRICKS_PER_LAYER = 4;

export class DiceTower {
  public group: THREE.Group;
  private bricks: THREE.Mesh[] = [];
  private brickLights: THREE.PointLight[][] = [];
  private lever!: THREE.Group;
  private leverPulled = false;
  private platform!: THREE.Mesh;
  private pipe!: THREE.Mesh;
  private glowIntensity: number[] = [];
  private targetGlow: number[] = [];
  private currentPoint: number = 0;
  private lightUpProgress = 0;
  private isLightingUp = false;

  constructor() {
    this.group = new THREE.Group();

    this.createBricks();
    this.createPlatform();
    this.createPipe();
    this.createLever();
    this.setupLighting();

    for (let i = 0; i < LAYERS; i++) {
      this.glowIntensity[i] = 0;
      this.targetGlow[i] = 0;
    }
  }

  private createBricks() {
    const brickGeometry = new THREE.BoxGeometry(BRICK_WIDTH, BRICK_HEIGHT, BRICK_DEPTH);

    for (let layer = 0; layer < LAYERS; layer++) {
      const layerLights: THREE.PointLight[] = [];

      for (let i = 0; i < BRICKS_PER_LAYER; i++) {
        const brickMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xcce0ff,
          transparent: true,
          opacity: 0.35,
          roughness: 0.15,
          metalness: 0.05,
          transmission: 0.6,
          thickness: 0.5,
          clearcoat: 0.8,
          clearcoatRoughness: 0.2,
          envMapIntensity: 0.5,
          emissive: new THREE.Color(0x4488ff),
          emissiveIntensity: 0
        });

        const brick = new THREE.Mesh(brickGeometry, brickMaterial);

        const angle = (i / BRICKS_PER_LAYER) * Math.PI * 2;
        const radius = BRICK_WIDTH * 0.75;
        brick.position.x = Math.cos(angle) * radius;
        brick.position.z = Math.sin(angle) * radius * 0.6;
        brick.position.y = layer * BRICK_HEIGHT + BRICK_HEIGHT / 2;
        brick.rotation.y = angle + Math.PI / 2;

        brick.castShadow = true;
        brick.receiveShadow = true;

        this.bricks.push(brick);
        this.group.add(brick);

        const light = new THREE.PointLight(0x4488ff, 0, 3);
        light.position.copy(brick.position);
        this.group.add(light);
        layerLights.push(light);
      }

      this.brickLights.push(layerLights);
    }
  }

  private createPlatform() {
    const platformGeometry = new THREE.CylinderGeometry(2.2, 2.5, 0.4, 32);
    const platformMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x2a2a4a,
      metalness: 0.3,
      roughness: 0.5,
      clearcoat: 0.6
    });

    this.platform = new THREE.Mesh(platformGeometry, platformMaterial);
    this.platform.position.y = -0.2;
    this.platform.receiveShadow = true;
    this.group.add(this.platform);

    const edgeGeometry = new THREE.TorusGeometry(2.2, 0.05, 8, 64);
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.6
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 0.01;
    this.group.add(edge);
  }

  private createPipe() {
    const pipeGeometry = new THREE.CylinderGeometry(0.4, 0.45, 1.5, 16, 1, true);
    const pipeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x88aacc,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.2,
      side: THREE.DoubleSide
    });

    this.pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
    this.pipe.position.y = LAYERS * BRICK_HEIGHT + 0.75;
    this.group.add(this.pipe);

    const topRingGeometry = new THREE.TorusGeometry(0.4, 0.06, 8, 32);
    const topRingMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.2
    });
    const topRing = new THREE.Mesh(topRingGeometry, topRingMaterial);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = LAYERS * BRICK_HEIGHT + 1.5;
    this.group.add(topRing);
  }

  private createLever() {
    this.lever = new THREE.Group();

    const baseGeometry = new THREE.BoxGeometry(0.6, 0.3, 0.4);
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x666677,
      metalness: 0.8,
      roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.15;
    this.lever.add(base);

    const handleGeometry = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 16);
    const handleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xaaaaaa,
      metalness: 0.95,
      roughness: 0.15
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0.5, 0.4, 0);
    this.lever.add(handle);

    const knobGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const knobMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.2
    });
    const knob = new THREE.Mesh(knobGeometry, knobMaterial);
    knob.position.set(1.1, 0.4, 0);
    this.lever.add(knob);

    this.lever.position.set(-1.5, 0.2, 0);
    this.group.add(this.lever);
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.group.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    this.group.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x6688ff, 0.3);
    rimLight.position.set(-5, 3, -5);
    this.group.add(rimLight);
  }

  public pullLever(): Promise<void> {
    return new Promise((resolve) => {
      if (this.leverPulled) {
        resolve();
        return;
      }
      this.leverPulled = true;

      const startRot = this.lever.rotation.z;
      const endRot = -0.5;
      const startPos = this.lever.position.x;
      const endPos = -1.8;
      const duration = 300;
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        this.lever.rotation.z = startRot + (endRot - startRot) * eased;
        this.lever.position.x = startPos + (endPos - startPos) * eased;

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          setTimeout(() => {
            this.resetLever();
            resolve();
          }, 200);
        }
      };

      requestAnimationFrame(animate);
    });
  }

  private resetLever() {
    const startRot = this.lever.rotation.z;
    const endRot = 0;
    const startPos = this.lever.position.x;
    const endPos = -1.5;
    const duration = 400;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      this.lever.rotation.z = startRot + (endRot - startRot) * eased;
      this.lever.position.x = startPos + (endPos - startPos) * eased;

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.leverPulled = false;
      }
    };

    requestAnimationFrame(animate);
  }

  public lightUpTower(point: number): Promise<void> {
    return new Promise((resolve) => {
      this.currentPoint = point;
      this.isLightingUp = true;
      this.lightUpProgress = 0;

      const color = new THREE.Color(DICE_COLORS[point] || 0xffffff);
      const duration = 1500;
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);

        this.lightUpProgress = t;

        for (let layer = 0; layer < LAYERS; layer++) {
          const layerStart = layer / LAYERS;
          const layerProgress = Math.max(0, Math.min(1, (t - layerStart) * LAYERS * 1.2));
          const pulseIntensity = layerProgress * (0.5 + 0.5 * Math.sin(t * 4 + layer * 0.5));
          this.targetGlow[layer] = pulseIntensity;

          this.brickLights[layer].forEach((light) => {
            light.color.copy(color);
            light.intensity = pulseIntensity * 1.5;
          });
        }

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  public update(delta: number) {
    for (let layer = 0; layer < LAYERS; layer++) {
      this.glowIntensity[layer] += (this.targetGlow[layer] - this.glowIntensity[layer]) * delta * 5;

      const startIdx = layer * BRICKS_PER_LAYER;
      for (let i = 0; i < BRICKS_PER_LAYER; i++) {
        const brick = this.bricks[startIdx + i];
        const material = brick.material as THREE.MeshPhysicalMaterial;
        if (this.currentPoint > 0) {
          const color = new THREE.Color(DICE_COLORS[this.currentPoint]);
          material.emissive.copy(color);
          material.emissiveIntensity = this.glowIntensity[layer] * 0.8;
        }
      }
    }
  }

  public getDiceSpawnPosition(): THREE.Vector3 {
    return new THREE.Vector3(0, LAYERS * BRICK_HEIGHT + 1.2, 0);
  }

  public getLeverPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.lever.position.x + 1.1,
      this.lever.position.y + 0.4,
      this.lever.position.z
    );
  }

  public resetLights() {
    this.isLightingUp = false;
    this.currentPoint = 0;
    for (let i = 0; i < LAYERS; i++) {
      this.glowIntensity[i] = 0;
      this.targetGlow[i] = 0;
      this.brickLights[i].forEach((light) => {
        light.intensity = 0;
      });
    }
    this.bricks.forEach((brick) => {
      const material = brick.material as THREE.MeshPhysicalMaterial;
      material.emissiveIntensity = 0;
    });
  }
}
