import * as THREE from 'three';

export type ModelType = 'sofa' | 'table' | 'bed' | 'desk' | 'chair' | 'lamp';

export interface FurnitureModel {
  group: THREE.Group;
  type: ModelType;
  name: string;
  material: THREE.MeshStandardMaterial;
  dragAxes: THREE.Group;
  dropAnimation: { active: boolean; startY: number; elapsed: number } | null;
}

const MODEL_NAMES: Record<ModelType, string> = {
  sofa: '沙发',
  table: '茶几',
  bed: '床',
  desk: '书桌',
  chair: '椅子',
  lamp: '灯具'
};

export class ModelManager {
  public models: FurnitureModel[] = [];
  public readonly MAX_MODELS = 12;
  private axisLength = 1.2;

  public canAddModel(): boolean {
    return this.models.length < this.MAX_MODELS;
  }

  public createModel(type: ModelType, position: THREE.Vector3): FurnitureModel | null {
    if (!this.canAddModel()) return null;

    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      color: this.getDefaultColor(type),
      metalness: 0,
      roughness: 0.5
    });

    this.buildModelGeometry(type, group, material);
    group.position.copy(position);
    group.userData.modelType = type;

    const dragAxes = this.createDragAxes();
    dragAxes.visible = false;
    group.add(dragAxes);

    const model: FurnitureModel = {
      group,
      type,
      name: MODEL_NAMES[type],
      material,
      dragAxes,
      dropAnimation: { active: true, startY: position.y + 5, elapsed: 0 }
    };

    group.userData.furnitureModel = model;
    this.models.push(model);
    return model;
  }

  private getDefaultColor(type: ModelType): number {
    const colors: Record<ModelType, number> = {
      sofa: 0x8b5a2b,
      table: 0x6b6b6b,
      bed: 0xd4a574,
      desk: 0x5c4033,
      chair: 0x4a4a4a,
      lamp: 0xf5deb3
    };
    return colors[type];
  }

  private buildModelGeometry(type: ModelType, group: THREE.Group, material: THREE.MeshStandardMaterial): void {
    switch (type) {
      case 'sofa':
        this.createSofa(group, material);
        break;
      case 'table':
        this.createTable(group, material);
        break;
      case 'bed':
        this.createBed(group, material);
        break;
      case 'desk':
        this.createDesk(group, material);
        break;
      case 'chair':
        this.createChair(group, material);
        break;
      case 'lamp':
        this.createLamp(group, material);
        break;
    }
  }

  private createSofa(group: THREE.Group, material: THREE.MeshStandardMaterial): void {
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.35, 0.9),
      material
    );
    seat.position.y = 0.35;
    seat.castShadow = true;
    seat.receiveShadow = true;
    group.add(seat);

    const backrest = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.7, 0.2),
      material
    );
    backrest.position.set(0, 0.85, -0.35);
    backrest.castShadow = true;
    group.add(backrest);

    const armrestMat = material.clone();
    const leftArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.5, 0.9),
      armrestMat
    );
    leftArm.position.set(-1.025, 0.45, 0);
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.5, 0.9),
      armrestMat
    );
    rightArm.position.set(1.025, 0.45, 0);
    rightArm.castShadow = true;
    group.add(rightArm);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.3, roughness: 0.7 });
    const legPositions = [
      [-0.9, 0.1, -0.35], [0.9, 0.1, -0.35],
      [-0.9, 0.1, 0.35], [0.9, 0.1, 0.35]
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), legMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      group.add(leg);
    });
  }

  private createTable(group: THREE.Group, material: THREE.MeshStandardMaterial): void {
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.06, 0.6),
      material
    );
    top.position.y = 0.5;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.5, roughness: 0.5 });
    const legPositions = [
      [-0.5, 0.25, -0.22], [0.5, 0.25, -0.22],
      [-0.5, 0.25, 0.22], [0.5, 0.25, 0.22]
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), legMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      group.add(leg);
    });
  }

  private createBed(group: THREE.Group, material: THREE.MeshStandardMaterial): void {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.3, 2.2),
      material
    );
    frame.position.y = 0.15;
    frame.castShadow = true;
    frame.receiveShadow = true;
    group.add(frame);

    const mattressMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.9 });
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.2, 2.1),
      mattressMat
    );
    mattress.position.y = 0.4;
    mattress.castShadow = true;
    group.add(mattress);

    const headboard = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.8, 0.12),
      material
    );
    headboard.position.set(0, 0.7, -1.04);
    headboard.castShadow = true;
    group.add(headboard);

    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
    const pillow1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.12, 0.4),
      pillowMat
    );
    pillow1.position.set(-0.45, 0.56, -0.75);
    pillow1.castShadow = true;
    group.add(pillow1);

    const pillow2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.12, 0.4),
      pillowMat
    );
    pillow2.position.set(0.45, 0.56, -0.75);
    pillow2.castShadow = true;
    group.add(pillow2);
  }

  private createDesk(group: THREE.Group, material: THREE.MeshStandardMaterial): void {
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.06, 0.8),
      material
    );
    top.position.y = 0.75;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const legPositions = [
      [-0.7, 0.375, -0.32], [0.7, 0.375, -0.32],
      [-0.7, 0.375, 0.32], [0.7, 0.375, 0.32]
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), material);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      group.add(leg);
    });
  }

  private createChair(group: THREE.Group, material: THREE.MeshStandardMaterial): void {
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.06, 0.5),
      material
    );
    seat.position.y = 0.5;
    seat.castShadow = true;
    seat.receiveShadow = true;
    group.add(seat);

    const backrest = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.06),
      material
    );
    backrest.position.set(0, 0.8, -0.22);
    backrest.castShadow = true;
    group.add(backrest);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4 });
    const legPositions = [
      [-0.22, 0.25, -0.19], [0.22, 0.25, -0.19],
      [-0.22, 0.25, 0.19], [0.22, 0.25, 0.19]
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8),
        legMat
      );
      leg.position.set(x, y, z);
      leg.castShadow = true;
      group.add(leg);
    });
  }

  private createLamp(group: THREE.Group, material: THREE.MeshStandardMaterial): void {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 0.05, 16),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.3 })
    );
    base.position.y = 0.025;
    base.castShadow = true;
    group.add(base);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 })
    );
    pole.position.y = 0.65;
    pole.castShadow = true;
    group.add(pole);

    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.3, 0.35, 16, 1, true),
      material
    );
    shade.position.y = 1.4;
    shade.castShadow = true;
    group.add(shade);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: 0xffff88,
      emissiveIntensity: 0.5,
      roughness: 0.2
    });
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      bulbMat
    );
    bulb.position.y = 1.25;
    group.add(bulb);

    const pointLight = new THREE.PointLight(0xffffcc, 0.6, 6);
    pointLight.position.y = 1.25;
    group.add(pointLight);
  }

  private createDragAxes(): THREE.Group {
    const axesGroup = new THREE.Group();

    const xMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.6, depthTest: false });
    const yMat = new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.6, depthTest: false });
    const zMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.6, depthTest: false });

    const xArrow = this.createArrow(xMat, new THREE.Vector3(1, 0, 0));
    xArrow.userData.axis = 'x';
    axesGroup.add(xArrow);

    const yArrow = this.createArrow(yMat, new THREE.Vector3(0, 1, 0));
    yArrow.userData.axis = 'y';
    axesGroup.add(yArrow);

    const zArrow = this.createArrow(zMat, new THREE.Vector3(0, 0, 1));
    zArrow.userData.axis = 'z';
    axesGroup.add(zArrow);

    axesGroup.userData.isDragAxes = true;
    return axesGroup;
  }

  private createArrow(material: THREE.Material, direction: THREE.Vector3): THREE.Group {
    const group = new THREE.Group();

    const shaftLen = this.axisLength - 0.25;
    const shaftGeo = new THREE.CylinderGeometry(0.015, 0.015, shaftLen, 8);
    const shaft = new THREE.Mesh(shaftGeo, material);
    shaft.position.copy(direction.clone().multiplyScalar(shaftLen / 2));
    shaft.lookAt(direction.clone().multiplyScalar(this.axisLength));
    shaft.rotateX(Math.PI / 2);
    shaft.userData.isAxisElement = true;
    group.add(shaft);

    const coneGeo = new THREE.ConeGeometry(0.06, 0.25, 8);
    const cone = new THREE.Mesh(coneGeo, material);
    cone.position.copy(direction.clone().multiplyScalar(this.axisLength - 0.125));
    cone.lookAt(direction.clone().multiplyScalar(this.axisLength * 2));
    cone.rotateX(Math.PI / 2);
    cone.userData.isAxisElement = true;
    group.add(cone);

    group.userData.axisDirection = direction;
    return group;
  }

  public setModelSelected(model: FurnitureModel | null, selected: boolean): void {
    if (model) {
      model.dragAxes.visible = selected;
    }
  }

  public updateModelMaterial(model: FurnitureModel, color?: number, metalness?: number, roughness?: number): void {
    if (color !== undefined) {
      model.material.color.setHex(color);
    }
    if (metalness !== undefined) {
      model.material.metalness = metalness;
    }
    if (roughness !== undefined) {
      model.material.roughness = roughness;
    }
  }

  public removeModel(model: FurnitureModel): void {
    const index = this.models.indexOf(model);
    if (index !== -1) {
      this.models.splice(index, 1);
    }
  }

  public updateAnimations(dt: number): void {
    this.models.forEach((model) => {
      if (model.dropAnimation && model.dropAnimation.active) {
        model.dropAnimation.elapsed += dt;
        const duration = 0.5;
        const t = Math.min(model.dropAnimation.elapsed / duration, 1);

        const dropDistance = model.dropAnimation.startY - model.group.position.y;
        const baseProgress = t * t * (3 - 2 * t);

        let bounce = 0;
        if (t > 0.6) {
          const bounceT = (t - 0.6) / 0.4;
          bounce = Math.sin(bounceT * Math.PI) * 0.3 * (1 - bounceT);
        }

        const currentY = model.dropAnimation.startY - dropDistance * baseProgress + bounce;
        model.group.position.y = Math.max(currentY, model.group.userData.targetY ?? 0);

        if (t >= 1) {
          model.dropAnimation.active = false;
          model.group.position.y = model.group.userData.targetY ?? model.group.position.y;
        }
      }
    });
  }

  public setModelTargetY(model: FurnitureModel, y: number): void {
    model.group.userData.targetY = y;
  }
}
