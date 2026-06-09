import * as THREE from 'three';

export interface FurnitureItem {
  id: string;
  name: string;
  icon: string;
  defaultScale: number;
}

export interface PlacedFurniture {
  id: string;
  group: THREE.Group;
  outline: THREE.LineSegments;
  boundingBox: THREE.Mesh;
  baseScale: number;
  basePosition: THREE.Vector3;
}

export const FURNITURE_LIST: FurnitureItem[] = [
  { id: 'sofa', name: '沙发', icon: '🛋️', defaultScale: 0.8 },
  { id: 'table', name: '茶几', icon: '🪑', defaultScale: 0.8 },
  { id: 'bookshelf', name: '书柜', icon: '📚', defaultScale: 0.8 },
  { id: 'lamp', name: '台灯', icon: '💡', defaultScale: 0.8 },
  { id: 'chair', name: '单人椅', icon: '💺', defaultScale: 0.8 }
];

export const MAX_FURNITURE = 3;

export class FurnitureManager {
  private scene: THREE.Scene;
  private placedFurniture: Map<string, PlacedFurniture> = new Map();
  private selectedId: string | null = null;
  private counter: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private createSofaModel(): THREE.Group {
    const group = new THREE.Group();
    const fabricMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b5a3c,
      roughness: 0.8,
      metalness: 0.1
    });
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.9
    });

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.4, 0.9),
      fabricMaterial
    );
    base.position.y = 0.2;
    base.castShadow = true;
    group.add(base);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.7, 0.2),
      fabricMaterial
    );
    back.position.set(0, 0.75, -0.35);
    back.castShadow = true;
    group.add(back);

    const armLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.5, 0.9),
      fabricMaterial
    );
    armLeft.position.set(-0.9, 0.45, 0);
    armLeft.castShadow = true;
    group.add(armLeft);

    const armRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.5, 0.9),
      fabricMaterial
    );
    armRight.position.set(0.9, 0.45, 0);
    armRight.castShadow = true;
    group.add(armRight);

    for (let i = -1; i <= 1; i += 2) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.15, 8),
        darkMaterial
      );
      leg.position.set(i * 0.85, 0.075, 0.3);
      leg.castShadow = true;
      group.add(leg);
    }

    return group;
  }

  private createTableModel(): THREE.Group {
    const group = new THREE.Group();
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0xd2691e,
      roughness: 0.7,
      metalness: 0.1
    });

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.08, 0.6),
      woodMaterial
    );
    top.position.y = 0.4;
    top.castShadow = true;
    group.add(top);

    const legPositions = [
      [-0.5, 0.2, -0.25],
      [0.5, 0.2, -0.25],
      [-0.5, 0.2, 0.25],
      [0.5, 0.2, 0.25]
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.4, 0.08),
        woodMaterial
      );
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });

    return group;
  }

  private createBookshelfModel(): THREE.Group {
    const group = new THREE.Group();
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.8
    });

    const frameBack = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.8, 0.05),
      woodMaterial
    );
    frameBack.position.set(0, 0.9, 0);
    frameBack.castShadow = true;
    group.add(frameBack);

    const sideLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 1.8, 0.3),
      woodMaterial
    );
    sideLeft.position.set(-0.575, 0.9, 0.15);
    sideLeft.castShadow = true;
    group.add(sideLeft);

    const sideRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 1.8, 0.3),
      woodMaterial
    );
    sideRight.position.set(0.575, 0.9, 0.15);
    sideRight.castShadow = true;
    group.add(sideRight);

    for (let i = 0; i <= 4; i++) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.04, 0.3),
        woodMaterial
      );
      shelf.position.set(0, i * 0.45, 0.15);
      shelf.castShadow = true;
      group.add(shelf);
    }

    const bookColors = [0xc0392b, 0x2980b9, 0x27ae60, 0x8e44ad, 0xf39c12];
    for (let shelf = 0; shelf < 4; shelf++) {
      for (let i = 0; i < 5; i++) {
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.3, 0.2),
          new THREE.MeshStandardMaterial({
            color: bookColors[(shelf + i) % bookColors.length],
            roughness: 0.9
          })
        );
        book.position.set(-0.4 + i * 0.2, shelf * 0.45 + 0.2, 0.15);
        group.add(book);
      }
    }

    return group;
  }

  private createLampModel(): THREE.Group {
    const group = new THREE.Group();
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0xb0b0b0,
      roughness: 0.3,
      metalness: 0.8
    });
    const shadeMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff8dc,
      roughness: 0.9,
      transparent: true,
      opacity: 0.85
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.18, 0.05, 24),
      metalMaterial
    );
    base.position.y = 0.025;
    base.castShadow = true;
    group.add(base);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.5, 12),
      metalMaterial
    );
    pole.position.y = 0.3;
    pole.castShadow = true;
    group.add(pole);

    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.2, 0.25, 24, 1, true),
      shadeMaterial
    );
    shade.position.y = 0.65;
    shade.castShadow = true;
    group.add(shade);

    const shadeTop = new THREE.Mesh(
      new THREE.CircleGeometry(0.1, 24),
      shadeMaterial
    );
    shadeTop.position.y = 0.775;
    shadeTop.rotation.x = -Math.PI / 2;
    group.add(shadeTop);

    return group;
  }

  private createChairModel(): THREE.Group {
    const group = new THREE.Group();
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.8
    });
    const cushionMaterial = new THREE.MeshStandardMaterial({
      color: 0x708090,
      roughness: 0.85
    });

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.08, 0.55),
      cushionMaterial
    );
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.06),
      woodMaterial
    );
    back.position.set(0, 0.75, -0.245);
    back.castShadow = true;
    group.add(back);

    const legPositions = [
      [-0.25, 0.225, -0.2],
      [0.25, 0.225, -0.2],
      [-0.25, 0.225, 0.2],
      [0.25, 0.225, 0.2]
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.45, 0.06),
        woodMaterial
      );
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });

    return group;
  }

  private createOutline(group: THREE.Group): THREE.LineSegments {
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const geometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(size.x, size.y, size.z)
    );
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });
    const outline = new THREE.LineSegments(geometry, material);
    outline.position.copy(center);
    outline.visible = false;

    return outline;
  }

  private createBoundingBox(group: THREE.Group): THREE.Mesh {
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(center);
    mesh.visible = false;

    return mesh;
  }

  addFurniture(furnitureId: string, worldPosition: THREE.Vector3): PlacedFurniture | null {
    if (this.placedFurniture.size >= MAX_FURNITURE) {
      return null;
    }

    const furnitureType = FURNITURE_LIST.find(f => f.id === furnitureId);
    if (!furnitureType) return null;

    let modelGroup: THREE.Group;
    switch (furnitureId) {
      case 'sofa':
        modelGroup = this.createSofaModel();
        break;
      case 'table':
        modelGroup = this.createTableModel();
        break;
      case 'bookshelf':
        modelGroup = this.createBookshelfModel();
        break;
      case 'lamp':
        modelGroup = this.createLampModel();
        break;
      case 'chair':
        modelGroup = this.createChairModel();
        break;
      default:
        return null;
    }

    this.counter++;
    const uniqueId = `${furnitureId}_${this.counter}`;
    const scale = furnitureType.defaultScale;

    modelGroup.scale.set(scale, scale, scale);
    modelGroup.position.set(worldPosition.x, worldPosition.y, worldPosition.z);
    modelGroup.userData.furnitureId = uniqueId;

    modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.userData.parentFurnitureId = uniqueId;
      }
    });

    const outline = this.createOutline(modelGroup);
    const boundingBox = this.createBoundingBox(modelGroup);

    modelGroup.add(outline);
    modelGroup.add(boundingBox);

    const placed: PlacedFurniture = {
      id: uniqueId,
      group: modelGroup,
      outline,
      boundingBox,
      baseScale: scale,
      basePosition: worldPosition.clone()
    };

    this.scene.add(modelGroup);
    this.placedFurniture.set(uniqueId, placed);

    this.fadeInFurniture(placed);

    return placed;
  }

  private fadeInFurniture(placed: PlacedFurniture): void {
    placed.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(mat => {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial) {
            const oldOpacity = mat.opacity;
            const oldTransparent = mat.transparent;
            mat.transparent = true;
            mat.opacity = 0;

            const startTime = performance.now();
            const duration = 500;
            const animate = () => {
              const elapsed = performance.now() - startTime;
              const progress = Math.min(elapsed / duration, 1);
              mat.opacity = oldOpacity > 0 ? progress * oldOpacity : progress;
              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
                mat.transparent = oldTransparent;
                mat.opacity = oldOpacity;
              }
            };
            animate();
          }
        });
      }
    });
  }

  removeFurniture(id: string, withAnimation: boolean = true): void {
    const placed = this.placedFurniture.get(id);
    if (!placed) return;

    if (withAnimation) {
      const startTime = performance.now();
      const duration = 300;
      const initialScale = placed.group.scale.x;
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const newScale = initialScale * (1 - progress);
        placed.group.scale.set(newScale, newScale, newScale);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.scene.remove(placed.group);
          this.placedFurniture.delete(id);
        }
      };
      animate();
    } else {
      this.scene.remove(placed.group);
      this.placedFurniture.delete(id);
    }

    if (this.selectedId === id) {
      this.selectedId = null;
    }
  }

  selectFurniture(id: string | null): void {
    if (this.selectedId && this.selectedId !== id) {
      const prev = this.placedFurniture.get(this.selectedId);
      if (prev) {
        prev.outline.visible = false;
        prev.boundingBox.visible = false;
      }
    }

    this.selectedId = id;

    if (id) {
      const placed = this.placedFurniture.get(id);
      if (placed) {
        placed.outline.visible = true;
        placed.boundingBox.visible = true;
      }
    }
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  getSelectedFurniture(): PlacedFurniture | null {
    return this.selectedId ? this.placedFurniture.get(this.selectedId) ?? null : null;
  }

  getFurnitureById(id: string): PlacedFurniture | null {
    return this.placedFurniture.get(id) ?? null;
  }

  getAllFurniture(): PlacedFurniture[] {
    return Array.from(this.placedFurniture.values());
  }

  getCount(): number {
    return this.placedFurniture.size;
  }

  resetAll(): void {
    this.placedFurniture.forEach(placed => {
      this.scene.remove(placed.group);
    });
    this.placedFurniture.clear();
    this.selectedId = null;
  }
}
