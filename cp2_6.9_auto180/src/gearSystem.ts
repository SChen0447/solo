import * as THREE from 'three';

export type RuneType = 'sun' | 'moon' | 'star' | 'lightning';

export const RUNE_COLORS: Record<RuneType, string> = {
  sun: '#FFD700',
  moon: '#C0C0C0',
  star: '#00BFFF',
  lightning: '#FF4500'
};

export const GEAR_COLORS = ['#B87333', '#CD7F32', '#C5A642', '#434B4D'];

export interface GearData {
  id: number;
  mesh: THREE.Group;
  teeth: number;
  radius: number;
  thickness: number;
  color: string;
  rotationSpeed: number;
  rune: RuneType | null;
  runeMesh: THREE.Mesh | null;
  connected: boolean;
  connectedOrder: number;
  originalPosition: THREE.Vector3;
  baseMaterial: THREE.MeshStandardMaterial;
}

export class GearSystem {
  private scene: THREE.Scene;
  private gears: GearData[] = [];
  private gearIdCounter = 0;
  private driveRodPosition: THREE.Vector3;
  private driveRodRadius = 5;
  private snapDistance = 10;
  private collisionBoxes: { minX: number; maxX: number; minZ: number; maxZ: number; gear: GearData }[] = [];
  private connectedGears: GearData[] = [];
  private layerHeight = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.driveRodPosition = new THREE.Vector3(0, 0, 0);
  }

  setLayerHeight(height: number): void {
    this.layerHeight = height;
    this.driveRodPosition.y = height + 10;
  }

  getDriveRodPosition(): THREE.Vector3 {
    return this.driveRodPosition.clone();
  }

  createGear(
    position: THREE.Vector3,
    teeth?: number,
    radius?: number,
    color?: string,
    rune?: RuneType
  ): GearData {
    const gearTeeth = teeth ?? Math.floor(Math.random() * 9) + 8;
    const gearRadius = radius ?? Math.random() * 20 + 15;
    const thickness = 8;
    const gearColor = color ?? GEAR_COLORS[Math.floor(Math.random() * GEAR_COLORS.length)];

    const gearGroup = new THREE.Group();

    const outerGeometry = new THREE.CylinderGeometry(gearRadius, gearRadius, thickness, gearTeeth * 2);
    const outerMaterial = new THREE.MeshStandardMaterial({
      color: gearColor,
      metalness: 0.8,
      roughness: 0.3,
      emissive: new THREE.Color(gearColor).multiplyScalar(0.1)
    });
    const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);
    outerMesh.castShadow = true;
    outerMesh.receiveShadow = true;
    gearGroup.add(outerMesh);

    const toothAngle = (Math.PI * 2) / gearTeeth;
    const toothLength = gearRadius * 0.15;
    const toothWidth = gearRadius * 0.1;

    for (let i = 0; i < gearTeeth; i++) {
      const angle = i * toothAngle;
      const toothGeometry = new THREE.BoxGeometry(toothWidth, thickness, toothLength);
      const toothMaterial = new THREE.MeshStandardMaterial({
        color: gearColor,
        metalness: 0.8,
        roughness: 0.3
      });
      const tooth = new THREE.Mesh(toothGeometry, toothMaterial);
      tooth.position.x = Math.cos(angle) * (gearRadius + toothLength / 2);
      tooth.position.z = Math.sin(angle) * (gearRadius + toothLength / 2);
      tooth.rotation.y = -angle;
      tooth.castShadow = true;
      gearGroup.add(tooth);
    }

    const holeGeometry = new THREE.CylinderGeometry(3, 3, thickness + 1, 16);
    const holeMaterial = new THREE.MeshStandardMaterial({
      color: '#1a1a1a',
      metalness: 0.5,
      roughness: 0.5
    });
    const holeMesh = new THREE.Mesh(holeGeometry, holeMaterial);
    gearGroup.add(holeMesh);

    const glowLight = new THREE.PointLight(new THREE.Color(gearColor), 0.3, gearRadius * 3);
    glowLight.position.set(0, 0, 0);
    gearGroup.add(glowLight);

    let runeMesh: THREE.Mesh | null = null;
    if (rune) {
      runeMesh = this.createRuneMesh(rune);
      runeMesh.position.y = gearRadius + 5;
      gearGroup.add(runeMesh);
    }

    const rotationSpeed = rune === 'sun' || rune === 'star' ? 1 : -1;

    gearGroup.position.copy(position);
    this.scene.add(gearGroup);

    const gearData: GearData = {
      id: this.gearIdCounter++,
      mesh: gearGroup,
      teeth: gearTeeth,
      radius: gearRadius,
      thickness,
      color: gearColor,
      rotationSpeed,
      rune: rune ?? null,
      runeMesh,
      connected: false,
      connectedOrder: 0,
      originalPosition: position.clone(),
      baseMaterial: outerMaterial
    };

    this.gears.push(gearData);
    this.updateCollisionBox(gearData);

    return gearData;
  }

  private createRuneMesh(rune: RuneType): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 128);

    ctx.strokeStyle = RUNE_COLORS[rune];
    ctx.fillStyle = RUNE_COLORS[rune];
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.translate(64, 64);

    switch (rune) {
      case 'sun':
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
          ctx.lineTo(Math.cos(angle) * 38, Math.sin(angle) * 38);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'moon':
        ctx.beginPath();
        ctx.arc(5, 0, 30, Math.PI * 0.4, Math.PI * 1.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-5, 0, 25, Math.PI * 0.4, Math.PI * 1.6, true);
        ctx.stroke();
        break;
      case 'star':
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const nextAngle = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * 35, Math.sin(angle) * 35);
          ctx.lineTo(Math.cos(nextAngle) * 35, Math.sin(nextAngle) * 35);
          ctx.stroke();
        }
        break;
      case 'lightning':
        ctx.beginPath();
        ctx.moveTo(-5, -35);
        ctx.lineTo(10, -5);
        ctx.lineTo(-5, 0);
        ctx.lineTo(15, 35);
        ctx.stroke();
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const geometry = new THREE.PlaneGeometry(8, 8);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.lookAt(new THREE.Vector3(0, 100, 0));

    return mesh;
  }

  generateLayerGears(count: number, runeCount: number, platformRadius: number, layerHeight: number): GearData[] {
    this.clearGears();
    this.setLayerHeight(layerHeight);
    this.connectedGears = [];

    const runeTypes: RuneType[] = ['sun', 'moon', 'star', 'lightning'];
    const gears: GearData[] = [];
    const y = layerHeight + 10;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const distance = 18 + Math.random() * (platformRadius - 28);
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      let rune: RuneType | undefined;
      if (i < runeCount) {
        rune = runeTypes[i % runeTypes.length];
      }

      const gear = this.createGear(new THREE.Vector3(x, y, z), undefined, undefined, undefined, rune);
      gears.push(gear);
    }

    return gears;
  }

  clearGears(): void {
    for (const gear of this.gears) {
      this.scene.remove(gear.mesh);
      gear.mesh.traverse((child) => {
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
    this.gears = [];
    this.collisionBoxes = [];
    this.connectedGears = [];
  }

  getAllGears(): GearData[] {
    return this.gears;
  }

  getConnectedGears(): GearData[] {
    return this.connectedGears;
  }

  private updateCollisionBox(gear: GearData): void {
    const pos = gear.mesh.position;
    const r = gear.radius + 3;
    const box = {
      minX: pos.x - r,
      maxX: pos.x + r,
      minZ: pos.z - r,
      maxZ: pos.z + r,
      gear
    };

    const existingIndex = this.collisionBoxes.findIndex((b) => b.gear.id === gear.id);
    if (existingIndex >= 0) {
      this.collisionBoxes[existingIndex] = box;
    } else {
      this.collisionBoxes.push(box);
    }
  }

  checkCollision(gear: GearData, newPosition: THREE.Vector3): GearData | null {
    const r = gear.radius + 3;
    const newBox = {
      minX: newPosition.x - r,
      maxX: newPosition.x + r,
      minZ: newPosition.z - r,
      maxZ: newPosition.z + r
    };

    for (const box of this.collisionBoxes) {
      if (box.gear.id === gear.id) continue;
      if (
        newBox.minX < box.maxX &&
        newBox.maxX > box.minX &&
        newBox.minZ < box.maxZ &&
        newBox.maxZ > box.minZ
      ) {
        const dx = newPosition.x - box.gear.mesh.position.x;
        const dz = newPosition.z - box.gear.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = gear.radius + box.gear.radius + 2;
        if (dist < minDist) {
          return box.gear;
        }
      }
    }
    return null;
  }

  moveGear(gear: GearData, position: THREE.Vector3): boolean {
    const collision = this.checkCollision(gear, position);
    if (collision) return false;

    gear.mesh.position.copy(position);
    this.updateCollisionBox(gear);
    return true;
  }

  trySnapToDriveRod(gear: GearData): boolean {
    const pos = gear.mesh.position;
    const dx = pos.x - this.driveRodPosition.x;
    const dz = pos.z - this.driveRodPosition.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= this.snapDistance + gear.radius * 0.3 && !gear.connected) {
      const snapPos = this.driveRodPosition.clone();
      snapPos.y = this.layerHeight + 10;

      if (this.connectedGears.length > 0) {
        const lastGear = this.connectedGears[this.connectedGears.length - 1];
        const angle = Math.random() * Math.PI * 2;
        const totalRadius = lastGear.radius + gear.radius * 0.5;
        snapPos.x = lastGear.mesh.position.x + Math.cos(angle) * totalRadius;
        snapPos.z = lastGear.mesh.position.z + Math.sin(angle) * totalRadius;
      }

      const collision = this.checkCollision(gear, snapPos);
      if (collision) return false;

      gear.mesh.position.copy(snapPos);
      gear.connected = true;
      gear.connectedOrder = this.connectedGears.length + 1;
      this.connectedGears.push(gear);
      this.updateCollisionBox(gear);
      return true;
    }
    return false;
  }

  disconnectGear(gear: GearData): void {
    if (!gear.connected) return;

    gear.connected = false;
    const idx = this.connectedGears.findIndex((g) => g.id === gear.id);
    if (idx >= 0) {
      this.connectedGears.splice(idx, 1);
      for (let i = 0; i < this.connectedGears.length; i++) {
        this.connectedGears[i].connectedOrder = i + 1;
      }
    }

    gear.mesh.position.copy(gear.originalPosition);
    this.updateCollisionBox(gear);
  }

  rotateGear(gear: GearData, degrees: number): void {
    const radians = THREE.MathUtils.degToRad(degrees);
    gear.mesh.rotation.y += radians;
    this.rotateConnectedGears(gear, radians);
  }

  private rotateConnectedGears(sourceGear: GearData, radians: number): void {
    for (const gear of this.connectedGears) {
      if (gear.id === sourceGear.id) continue;

      const dx = gear.mesh.position.x - sourceGear.mesh.position.x;
      const dz = gear.mesh.position.z - sourceGear.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const connectDist = sourceGear.radius + gear.radius * 0.5;

      if (dist <= connectDist + 5) {
        const ratio = sourceGear.teeth / gear.teeth;
        gear.mesh.rotation.y -= radians * ratio;
      }
    }
  }

  update(deltaTime: number): void {
    for (const gear of this.connectedGears) {
      const speed = gear.rotationSpeed * 1 * deltaTime * 60;
      gear.mesh.rotation.y += THREE.MathUtils.degToRad(speed);
    }

    for (const gear of this.gears) {
      if (gear.runeMesh) {
        gear.runeMesh.rotation.y += deltaTime * 2;
        gear.runeMesh.position.y = gear.radius + 5 + Math.sin(Date.now() * 0.002) * 0.5;
      }
    }
  }

  highlightGear(gear: GearData, highlight: boolean): void {
    gear.baseMaterial.emissive.set(highlight ? 0xffff00 : new THREE.Color(gear.color).multiplyScalar(0.1));
    gear.baseMaterial.emissiveIntensity = highlight ? 0.6 : 1;
  }

  shakeGear(gear: GearData): void {
    const originalColor = gear.baseMaterial.color.getHex();
    gear.baseMaterial.color.set(0xff0000);
    gear.baseMaterial.emissive.set(0xff0000);
    gear.baseMaterial.emissiveIntensity = 0.5;

    const originalPos = gear.mesh.position.clone();
    let elapsed = 0;
    const duration = 0.2;
    const shakeInterval = setInterval(() => {
      elapsed += 0.02;
      if (elapsed >= duration) {
        clearInterval(shakeInterval);
        gear.baseMaterial.color.setHex(originalColor);
        gear.baseMaterial.emissive.set(new THREE.Color(gear.color).multiplyScalar(0.1));
        gear.baseMaterial.emissiveIntensity = 1;
        gear.mesh.position.copy(originalPos);
        return;
      }
      gear.mesh.position.x = originalPos.x + (Math.random() - 0.5) * 1.5;
      gear.mesh.position.z = originalPos.z + (Math.random() - 0.5) * 1.5;
    }, 20);
  }

  calculateTransmissionRatio(): number {
    if (this.connectedGears.length < 2) return 0;

    let product = 1;
    for (let i = 0; i < this.connectedGears.length - 1; i++) {
      product *= this.connectedGears[i + 1].teeth / this.connectedGears[i].teeth;
    }
    return product;
  }
}
