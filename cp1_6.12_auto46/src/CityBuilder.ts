import * as THREE from 'three';

export type TemplateName = 'greek' | 'medieval' | 'eastasia';
export type BuildingType = 'main_temple' | 'dwelling' | 'market' | 'wall' | 'tower';

export interface BuildingInfo {
  id: string;
  type: BuildingType;
  template: TemplateName;
  position: THREE.Vector3;
  rotation: number;
  scale: number;
  buildEra: number;
  destroyEra: number | null;
  name: string;
  purpose: string;
  styleDescription: string;
  group: THREE.Group;
  lod: THREE.LOD;
  appearProgress: number;
}

export interface CityData {
  buildings: BuildingInfo[];
  gridSize: number;
  groundTextureType: number;
  treeCount: number;
  template: TemplateName;
  era: number;
}

interface BuildingTemplate {
  type: BuildingType;
  name: string;
  purpose: string;
  styleDescription: Record<TemplateName, string>;
  minScale: number;
  maxScale: number;
}

const BUILDING_TEMPLATES: Record<BuildingType, BuildingTemplate> = {
  main_temple: {
    type: 'main_temple',
    name: '主殿',
    purpose: '宗教祭祀与公共集会',
    styleDescription: {
      greek: '古希腊主殿采用多立克柱式，白色大理石构建，阶梯式屋顶，对称布局庄严肃穆',
      medieval: '主殿改为石砌大教堂，高耸尖塔，飞扶壁支撑结构',
      eastasia: '木质结构主殿，飞檐斗拱，重檐歇山顶'
    },
    minScale: 1.2,
    maxScale: 1.8
  },
  dwelling: {
    type: 'dwelling',
    name: '民居',
    purpose: '市民居住',
    styleDescription: {
      greek: '希腊式民居，中庭布局，大理石墙体，坡屋顶',
      medieval: '石砌矮墙民居，木构架，茅草或石板屋顶',
      eastasia: '合院式民居，抬梁式木构架，小青瓦屋顶'
    },
    minScale: 0.7,
    maxScale: 1.1
  },
  market: {
    type: 'market',
    name: '市集',
    purpose: '商品交易与商业活动',
    styleDescription: {
      greek: '柱廊环绕的开放式市集，大理石铺地',
      medieval: '半开放式石砌市集大厅，木桁架屋顶',
      eastasia: '木构市集建筑，前店后坊布局，临街开敞'
    },
    minScale: 0.9,
    maxScale: 1.3
  },
  wall: {
    type: 'wall',
    name: '城墙',
    purpose: '城市防御',
    styleDescription: {
      greek: ' Cyclopean石砌城墙，方形塔楼',
      medieval: '厚重石砌城墙，雉堞女墙，棱堡结构',
      eastasia: '夯土包砖城墙，马面结构，敌楼'
    },
    minScale: 1.0,
    maxScale: 1.5
  },
  tower: {
    type: 'tower',
    name: '塔楼',
    purpose: '瞭望与防御',
    styleDescription: {
      greek: '圆形石塔，多层拱券结构',
      medieval: '哥特式尖顶塔楼，石砌结构',
      eastasia: '多层楼阁式塔，飞檐翘角，砖木结构'
    },
    minScale: 0.8,
    maxScale: 1.4
  }
};

const TEMPLATE_COLORS: Record<TemplateName, { primary: number; secondary: number; accent: number; roof: number }> = {
  greek: { primary: 0xf5f5f5, secondary: 0xd4cfc6, accent: 0xc9b896, roof: 0x8b4513 },
  medieval: { primary: 0x8b7355, secondary: 0x6b5344, accent: 0x4a3728, roof: 0x2f4f4f },
  eastasia: { primary: 0x8b4513, secondary: 0xcd853f, accent: 0xdeb887, roof: 0x1a1a1a }
};

const GRID_SIZE = 100;
const CELL_SIZE = 10;

export class CityBuilder {
  private seed: number = 12345;

  private seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private resetSeed(): void {
    this.seed = 12345;
  }

  buildCity(template: TemplateName, era: number): CityData {
    this.resetSeed();
    const buildings: BuildingInfo[] = [];
    const occupiedCells = new Set<string>();
    const gridCells = Math.floor(GRID_SIZE / CELL_SIZE);

    const buildingCounts: Record<BuildingType, number> = {
      main_temple: 1,
      dwelling: 20,
      market: 4,
      wall: 8,
      tower: 3
    };

    const buildingList: BuildingType[] = [];
    for (const [type, count] of Object.entries(buildingCounts) {
      for (let i = 0; i < count; i++) {
        buildingList.push(type as BuildingType);
      }
    }

    for (let i = buildingList.length - 1; i > 0; i--) {
      const j = Math.floor(this.seededRandom() * (i + 1));
      [buildingList[i], buildingList[j]] = [buildingList[j], buildingList[i]];
    }

    let buildingList.forEach((type, index) => {
      const pos = this.findPosition(type, occupiedCells, gridCells);
      if (!pos) return;
      const tmpl = BUILDING_TEMPLATES[type];
      const scale = tmpl.minScale + this.seededRandom() * (tmpl.maxScale - tmpl.minScale);
      const rotation = this.seededRandom() * Math.PI * 2;

      const worldPos = new THREE.Vector3(
        (pos.x - gridCells / 2) * CELL_SIZE + CELL_SIZE / 2,
        0,
        (pos.z - gridCells / 2) * CELL_SIZE + CELL_SIZE / 2
      );

      const buildEra = this.calculateBuildEra(type, index, buildingList.length);
      const destroyEra = this.calculateDestroyEra(type, buildEra);

      const group = this.createBuildingMesh(type, template, scale);
      const lod = this.createLOD(group, type, template, scale);

      buildings.push({
        id: `${template}_${type}_${index}`,
        type,
        template,
        position: worldPos,
        rotation,
        scale,
        buildEra,
        destroyEra,
        name: tmpl.name,
        purpose: tmpl.purpose,
        styleDescription: tmpl.styleDescription[template],
        group,
        lod,
        appearProgress: 0
      });

      occupiedCells.add(`${pos.x},${pos.z}`);
    });

    return {
      buildings,
      gridSize: GRID_SIZE,
      groundTextureType: this.getGroundTextureType(era),
      treeCount: this.getTreeCount(era),
      template,
      era
    };
  }

  private findPosition(
    type: BuildingType,
    occupied: Set<string>,
    gridCells: number
  ): { x: number; z: number } | null {
    const isWall = type === 'wall';
    const isTemple = type === 'main_temple';
    const maxAttempts = 100;

    for (let i = 0; i < maxAttempts; i++) {
      let x: number, z: number;
      if (isWall) {
        const side = Math.floor(this.seededRandom() * 4);
        const pos = Math.floor(this.seededRandom() * (gridCells - 2) + 1;
        switch (side) {
          case 0: x = 0; z = pos; break;
          case 1: x = gridCells - 1; z = pos; break;
          case 2: x = pos; z = 0; break;
          default: x = pos; z = gridCells - 1;
        }
      } else if (isTemple) {
        x = Math.floor(gridCells / 2);
        z = Math.floor(gridCells / 2);
        if (!occupied.has(`${x},${z}`)) return { x, z };
        x = Math.floor(gridCells / 2) + (this.seededRandom() > 0.5 ? 1 : -1);
        z = Math.floor(gridCells / 2);
      } else {
        x = Math.floor(this.seededRandom() * (gridCells - 2)) + 1;
        z = Math.floor(this.seededRandom() * (gridCells - 2)) + 1;
      }

      const key = `${x},${z}`;
      if (!occupied.has(key)) {
        let valid = true;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dz === 0) continue;
            const neighbor = `${x + dx},${z + dz}`;
            if (occupied.has(neighbor) && this.seededRandom() < 0.3) {
              valid = false;
              break;
            }
          }
          if (!valid) break;
        }
        if (valid) return { x, z };
      }
    }
    return null;
  }

  private calculateBuildEra(type: BuildingType, index: number, total: number): number {
    const baseEra = -500 + (index / total) * 2000;
    const typeOffset: Record<BuildingType, number> = {
      main_temple: -300,
      wall: -400,
      tower: -200,
      market: -100,
      dwelling: 0
    };
    return Math.max(-500, Math.min(1400, Math.round(baseEra / 50) * 50 + typeOffset[type]));
  }

  private calculateDestroyEra(type: BuildingType, buildEra: number): number | null {
    if (type === 'wall' || type === 'main_temple') return null;
    const destroyOffset = 400 + this.seededRandom() * 600;
    const destroyEra = Math.round((buildEra + destroyOffset) / 50) * 50;
    return destroyEra > 1500 ? null : destroyEra;
  }

  private getGroundTextureType(era: number): number {
    const t = (era + 500) / 2000;
    return Math.min(1, Math.max(0, t));
  }

  private getTreeCount(era: number): number {
    const t = (era + 500) / 2000;
    return Math.round(60 * (1 - t) + 10);
  }

  createBuildingMesh(type: BuildingType, template: TemplateName, scale: number): THREE.Group {
    const group = new THREE.Group();
    const colors = TEMPLATE_COLORS[template];

    switch (type) {
      case 'main_temple':
        this.buildTemple(group, colors, scale, template);
        break;
      case 'dwelling':
        this.buildDwelling(group, colors, scale, template);
        break;
      case 'market':
        this.buildMarket(group, colors, scale, template);
        break;
      case 'wall':
        this.buildWall(group, colors, scale, template);
        break;
      case 'tower':
        this.buildTower(group, colors, scale, template);
        break;
    }

    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    return group;
  }

  private buildTemple(
    group: THREE.Group,
    colors: { primary: number; secondary: number; accent: number; roof: number },
    scale: number,
    template: TemplateName
  ): void {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(8 * scale, 0.5, 6 * scale),
      new THREE.MeshStandardMaterial({ color: colors.secondary, roughness: 0.8 })
    );
    base.position.y = 0.25;
    group.add(base);

    const step1 = new THREE.Mesh(
      new THREE.BoxGeometry(7 * scale, 0.5, 5 * scale),
      new THREE.MeshStandardMaterial({ color: colors.secondary, roughness: 0.8 })
    );
    step1.position.y = 0.75;
    group.add(step1);

    if (template === 'greek') {
      const columnCount = 6;
      const columnSpacing = 6 * scale / (columnCount - 1);
      for (let i = 0; i < columnCount; i++) {
        for (let j = 0; j < 2; j++) {
          const column = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25 * scale, 0.3 * scale, 4 * scale, 16),
            new THREE.MeshStandardMaterial({ color: colors.primary, roughness: 0.7 })
          );
          column.position.set(
            -3 * scale + i * columnSpacing,
            3.25,
            j === 0 ? -2 * scale : 2 * scale
          );
          group.add(column);
        }
      }
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-4 * scale, 0);
      roofShape.lineTo(4 * scale, 0);
      roofShape.lineTo(0, 2 * scale);
      roofShape.lineTo(-4 * scale, 0);
      const roof = new THREE.Mesh(
        new THREE.ExtrudeGeometry(roofShape, { depth: 6 * scale, bevelEnabled: false }),
        new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.9 })
      );
      roof.rotation.x = -Math.PI / 2;
      roof.position.set(0, 5.5, -3 * scale);
      group.add(roof);
    } else if (template === 'medieval') {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(6 * scale, 5 * scale, 4 * scale),
        new THREE.MeshStandardMaterial({ color: colors.primary, roughness: 0.85 })
      );
      body.position.y = 3.5;
      group.add(body);

      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(3 * scale, 4 * scale, 4),
        new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.9 })
      );
      spire.position.y = 8;
      spire.rotation.y = Math.PI / 4;
      group.add(spire);

      const cross = new THREE.Mesh(
        new THREE.BoxGeometry(0.3 * scale, 1 * scale, 0.3 * scale),
        new THREE.MeshStandardMaterial({ color: colors.accent })
      );
      cross.position.y = 10.5;
      group.add(cross);
    } else {
      const pillars: THREE.Mesh[] = [];
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(0.6 * scale, 5 * scale, 0.6 * scale),
            new THREE.MeshStandardMaterial({ color: colors.secondary, roughness: 0.8 })
          );
          pillar.position.set(
            i === 0 ? -2.5 * scale : 2.5 * scale,
            3.5,
            j === 0 ? -1.8 * scale : 1.8 * scale
          );
          pillars.push(pillar);
          group.add(pillar);
        }
      }
      const roof1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0, 5 * scale, 1.5 * scale, 4, 1, true),
        new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.85 })
      );
      roof1.position.y = 6.25;
      roof1.rotation.y = Math.PI / 4;
      group.add(roof1);
      const roof2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0, 4 * scale, 1.2 * scale, 4, 1, true),
        new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.85 })
      );
      roof2.position.y = 7.5;
      roof2.rotation.y = Math.PI / 4;
      group.add(roof2);
    }
  }

  private buildDwelling(
    group: THREE.Group,
    colors: { primary: number; secondary: number; accent: number; roof: number },
    scale: number,
    template: TemplateName
  ): void {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(4 * scale, 3 * scale, 3 * scale),
      new THREE.MeshStandardMaterial({ color: colors.primary, roughness: 0.85 })
    );
    body.position.y = 2;
    group.add(body);

    if (template === 'greek') {
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(3 * scale, 1.5 * scale, 4),
        new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.9 })
      );
      roof.position.y = 4.25;
      roof.rotation.y = Math.PI / 4;
      group.add(roof);
      const court = new THREE.Mesh(
        new THREE.BoxGeometry(0.8 * scale, 0.1, 0.8 * scale),
        new THREE.MeshStandardMaterial({ color: colors.accent })
      );
      court.position.y = 0.05;
      group.add(court);
    } else if (template === 'medieval') {
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(4.5 * scale, 2 * scale, 3.5 * scale),
        new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.95 })
      );
      roof.position.y = 4.5;
      group.add(roof);
      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(0.4 * scale, 1 * scale, 0.4 * scale),
        new THREE.MeshStandardMaterial({ color: colors.secondary })
      );
      chimney.position.set(1 * scale, 5, 0);
      group.add(chimney);
    } else {
      const roofBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0, 3.5 * scale, 1.2 * scale, 4, 1, true),
        new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.9 })
      );
      roofBase.position.y = 4.2;
      roofBase.rotation.y = Math.PI / 4;
      group.add(roofBase);
      const eave1 = new THREE.Mesh(
        new THREE.BoxGeometry(5 * scale, 0.3, 4 * scale),
        new THREE.MeshStandardMaterial({ color: colors.roof })
      );
      eave1.position.y = 3.7;
      group.add(eave1);
    }

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.8 * scale, 1.5 * scale, 0.1),
      new THREE.MeshStandardMaterial({ color: colors.accent })
    );
    door.position.set(0, 1, 1.5 * scale + 0.05);
    group.add(door);

    const windowMat = new THREE.MeshStandardMaterial({ color: 0x87ceeb, roughness: 0.3, metalness: 0.1 });
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.6 * scale, 0.6 * scale, 0.1), windowMat);
    w1.position.set(-1 * scale, 2, 1.5 * scale + 0.05);
    group.add(w1);
    const w2 = w1.clone();
    w2.position.x = 1 * scale;
    group.add(w2);
  }

  private buildMarket(
    group: THREE.Group,
    colors: { primary: number; secondary: number; accent: number; roof: number },
    scale: number,
    template: TemplateName
  ): void {
    if (template === 'greek') {
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(10 * scale, 0.3, 6 * scale),
        new THREE.MeshStandardMaterial({ color: colors.secondary, roughness: 0.9 })
      );
      base.position.y = 0.15;
      group.add(base);
      const colCount = 5;
      const spacing = 8 * scale / (colCount - 1);
      for (let i = 0; i < colCount; i++) {
        for (let j = 0; j < 2; j++) {
          const col = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2 * scale, 0.2 * scale, 3 * scale, 12),
            new THREE.MeshStandardMaterial({ color: colors.primary, roughness: 0.7 })
          );
          col.position.set(-4 * scale + i * spacing, 1.8, j === 0 ? -2.5 * scale : 2.5 * scale);
          group.add(col);
        }
      }
      const roofBeam = new THREE.Mesh(
        new THREE.BoxGeometry(10 * scale, 0.4, 6 * scale),
        new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.85 })
      );
      roofBeam.position.y = 3.5;
      group.add(roofBeam);
    } else if (template === 'medieval') {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(8 * scale, 4 * scale, 5 * scale),
        new THREE.MeshStandardMaterial({ color: colors.primary, roughness: 0.85 })
      );
      body.position.y = 2.3;
      group.add(body);
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(8.5 * scale, 2.5 * scale, 5.5 * scale),
        new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.95 })
      );
      roof.position.y = 5.3;
      group.add(roof);
      const stall = new THREE.Mesh(
        new THREE.BoxGeometry(1.5 * scale, 1 * scale, 0.1),
        new THREE.MeshStandardMaterial({ color: colors.accent })
      );
      stall.position.set(-2 * scale, 0.6, 2.6 * scale);
      group.add(stall);
    } else {
      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(9 * scale, 0.3, 6 * scale),
        new THREE.MeshStandardMaterial({ color: colors.secondary, roughness: 0.9 })
      );
      platform.position.y = 0.15;
      group.add(platform);
      const pillars: THREE.Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
          const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(0.4 * scale, 3.5 * scale, 0.4 * scale),
            new THREE.MeshStandardMaterial({ color: colors.primary, roughness: 0.8 })
          );
          pillar.position.set(-3 * scale + i * 3 * scale, 2.1, j === 0 ? -2.5 * scale : 2.5 * scale);
          pillars.push(pillar);
          group.add(pillar);
        }
      }
      const roof = new THREE.Mesh(
        new THREE.CylinderGeometry(0, 6 * scale, 2 * scale, 4, 1, true),
        new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.9 })
      );
      roof.position.y = 4.5;
      roof.rotation.y = Math.PI / 4;
      group.add(roof);
    }
  }

  private buildWall(
    group: THREE.Group,
    colors: { primary: number; secondary: number; accent: number; roof: number },
    scale: number,
    template: TemplateName
  ): void {
    const length = template === 'wall' ? 12 * scale : 8 * scale;
    const width = 2 * scale;
    const height = 3 * scale;

    const main = new THREE.Mesh(
      new THREE.BoxGeometry(length, height, width),
      new THREE.MeshStandardMaterial({ color: colors.secondary, roughness: 0.9 })
    );
    main.position.y = height / 2;
    group.add(main);

    if (template !== 'greek') {
      const crenellationCount = Math.floor(length / (0.8 * scale));
      const crenSpacing = length / crenellationCount;
      for (let i = 0; i < crenellationCount; i++) {
        const cren = new THREE.Mesh(
          new THREE.BoxGeometry(0.5 * scale, 0.8 * scale, width),
          new THREE.MeshStandardMaterial({ color: colors.secondary, roughness: 0.9 })
        );
        cren.position.set(-length / 2 + crenSpacing / 2 + i * crenSpacing, height + 0.4 * scale, 0);
        group.add(cren);
      }
    }

    if (template === 'eastasia') {
      const towerTop = new THREE.Mesh(
        new THREE.BoxGeometry(2 * scale, 2 * scale, 2 * scale),
        new THREE.MeshStandardMaterial({ color: colors.primary, roughness: 0.85 })
      );
      towerTop.position.set(0, height + 1 * scale, 0);
      group.add(towerTop);
      const roof = new THREE.Mesh(
        new THREE.CylinderGeometry(0, 1.8 * scale, 1 * scale, 4, 1, true),
        new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.9 })
      );
      roof.position.y = height + 2.5 * scale;
      roof.rotation.y = Math.PI / 4;
      group.add(roof);
    }
  }

  private buildTower(
    group: THREE.Group,
    colors: { primary: number; secondary: number; accent: number; roof: number },
    scale: number,
    template: TemplateName
  ): void {
    if (template === 'greek') {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(2 * scale, 2.2 * scale, 1 * scale, 16),
        new THREE.MeshStandardMaterial({ color: colors.secondary, roughness: 0.85 })
      );
      base.position.y = 0.5;
      group.add(base);
      for (let level = 0; level < 3; level++) {
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(1.8 * scale - level * 0.2 * scale, 2 * scale - level * 0.2 * scale, 2.5 * scale, 16),
          new THREE.MeshStandardMaterial({ color: colors.primary, roughness: 0.8 })
        );
        body.position.y = 1.75 + level * 2.75;
        group.add(body);
      }
      const top = new THREE.Mesh(
        new THREE.ConeGeometry(1.5 * scale, 1.5 * scale, 16),
        new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.9 })
      );
      top.position.y = 9.5;
      group.add(top);
    } else if (template === 'medieval') {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5 * scale, 1.8 * scale, 7 * scale, 8),
        new THREE.MeshStandardMaterial({ color: colors.primary, roughness: 0.85 })
      );
      body.position.y = 4;
      group.add(body);
      const crenCount = 8;
      for (let i = 0; i < crenCount; i++) {
        const angle = (i / crenCount) * Math.PI * 2;
        const cren = new THREE.Mesh(
          new THREE.BoxGeometry(0.5 * scale, 0.8 * scale, 0.5 * scale),
          new THREE.MeshStandardMaterial({ color: colors.secondary, roughness: 0.9 })
        );
        cren.position.set(
          Math.cos(angle) * 1.5 * scale,
          7.8 * scale,
          Math.sin(angle) * 1.5 * scale
        );
        group.add(cren);
      }
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(1.6 * scale, 4 * scale, 8),
        new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.95 })
      );
      spire.position.y = 12;
      group.add(spire);
    } else {
      for (let level = 0; level < 4; level++) {
        const levelScale = 1 - level * 0.15;
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(3 * scale * levelScale, 2.5 * scale, 3 * scale * levelScale),
          new THREE.MeshStandardMaterial({ color: colors.primary, roughness: 0.85 })
        );
        body.position.y = 1.25 + level * 3;
        group.add(body);
        const eave = new THREE.Mesh(
          new THREE.CylinderGeometry(0, 2.8 * scale * levelScale, 1.2 * scale, 4, 1, true),
          new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.9 })
        );
        eave.position.y = 3.2 + level * 3;
        eave.rotation.y = Math.PI / 4;
        group.add(eave);
      }
      const finial = new THREE.Mesh(
        new THREE.SphereGeometry(0.4 * scale, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.3 })
      );
      finial.position.y = 13.5;
      group.add(finial);
    }
  }

  createLOD(
    detailedGroup: THREE.Group,
    _type: BuildingType,
    template: TemplateName,
    scale: number
  ): THREE.LOD {
    const lod = new THREE.LOD();
    lod.addLevel(detailedGroup, 0);

    const colors = TEMPLATE_COLORS[template];
    const simpleBox = new THREE.Mesh(
      new THREE.BoxGeometry(5 * scale, 5 * scale, 4 * scale),
      new THREE.MeshStandardMaterial({ color: colors.primary, roughness: 0.9 })
    );
    simpleBox.position.y = 2.5;
    const simpleGroup = new THREE.Group();
    simpleGroup.add(simpleBox);
    lod.addLevel(simpleGroup, 50);

    return lod;
  }

  createTree(): THREE.Group {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 1, 8),
      new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 })
    );
    trunk.position.y = 0.5;
    group.add(trunk);
    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.85 })
    );
    foliage.position.y = 1.8;
    group.add(foliage);
    return group;
  }
}
