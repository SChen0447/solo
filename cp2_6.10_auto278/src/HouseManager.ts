import * as THREE from 'three';

export interface RoomConfig {
  id: string;
  name: string;
  color: string;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}

export interface FurnitureConfig {
  id: string;
  name: string;
  roomId: string;
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
}

export interface HouseConfig {
  width: number;
  depth: number;
  height: number;
  wallThickness: number;
  rooms: RoomConfig[];
  furniture: FurnitureConfig[];
}

export const DEFAULT_HOUSE_CONFIG: HouseConfig = {
  width: 8,
  depth: 10,
  height: 3,
  wallThickness: 0.2,
  rooms: [
    {
      id: 'living',
      name: '客厅',
      color: '#fce4c8',
      bounds: { minX: -4, maxX: 0, minZ: -5, maxZ: 0 }
    },
    {
      id: 'bedroom',
      name: '卧室',
      color: '#e8d4f0',
      bounds: { minX: -4, maxX: 0, minZ: 0, maxZ: 5 }
    },
    {
      id: 'kitchen',
      name: '厨房',
      color: '#d4f0d8',
      bounds: { minX: 0, maxX: 4, minZ: -5, maxZ: 5 }
    }
  ],
  furniture: [
    {
      id: 'sofa',
      name: '沙发',
      roomId: 'living',
      position: { x: -2, y: 0.3, z: -3 },
      size: { x: 2.2, y: 0.6, z: 0.9 }
    },
    {
      id: 'coffee-table',
      name: '茶几',
      roomId: 'living',
      position: { x: -2, y: 0.25, z: -1.5 },
      size: { x: 1.2, y: 0.5, z: 0.6 }
    },
    {
      id: 'bed',
      name: '床',
      roomId: 'bedroom',
      position: { x: -2, y: 0.3, z: 2.5 },
      size: { x: 2, y: 0.6, z: 1.8 }
    },
    {
      id: 'wardrobe',
      name: '衣柜',
      roomId: 'bedroom',
      position: { x: -3.5, y: 1.2, z: 3 },
      size: { x: 0.6, y: 2.4, z: 1.6 }
    },
    {
      id: 'cabinet1',
      name: '橱柜1',
      roomId: 'kitchen',
      position: { x: 3.5, y: 0.8, z: -3 },
      size: { x: 0.6, y: 1.6, z: 2 }
    },
    {
      id: 'cabinet2',
      name: '橱柜2',
      roomId: 'kitchen',
      position: { x: 3, y: 0.45, z: 1 },
      size: { x: 2, y: 0.9, z: 0.6 }
    },
    {
      id: 'table',
      name: '餐桌',
      roomId: 'kitchen',
      position: { x: 1, y: 0.4, z: 2 },
      size: { x: 1.4, y: 0.8, z: 0.8 }
    }
  ]
};

export class HouseManager {
  private scene: THREE.Scene;
  private config: HouseConfig;
  private houseGroup: THREE.Group;
  private roomsGroup: THREE.Group;
  private wallsGroup: THREE.Group;
  private furnitureGroup: THREE.Group;
  private gridHelper: THREE.GridHelper | null = null;
  private labelsGroup: THREE.Group;
  private lightsNeedUpdate: boolean = false;

  constructor(scene: THREE.Scene, config: HouseConfig = DEFAULT_HOUSE_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.houseGroup = new THREE.Group();
    this.houseGroup.name = 'House';
    this.roomsGroup = new THREE.Group();
    this.roomsGroup.name = 'Rooms';
    this.wallsGroup = new THREE.Group();
    this.wallsGroup.name = 'Walls';
    this.furnitureGroup = new THREE.Group();
    this.furnitureGroup.name = 'Furniture';
    this.labelsGroup = new THREE.Group();
    this.labelsGroup.name = 'Labels';

    this.houseGroup.add(this.roomsGroup);
    this.houseGroup.add(this.wallsGroup);
    this.houseGroup.add(this.furnitureGroup);
    this.houseGroup.add(this.labelsGroup);

    this.scene.add(this.houseGroup);
    this.build();
  }

  private build(): void {
    this.buildFloor();
    this.buildWalls();
    this.buildFurniture();
    this.buildGridHelper();
    this.buildRoomLabels();
  }

  private buildFloor(): void {
    const { width, depth, rooms } = this.config;

    const baseFloorGeo = new THREE.PlaneGeometry(width, depth);
    const baseFloorMat = new THREE.MeshStandardMaterial({
      color: 0xfaf6f1,
      roughness: 0.9,
      metalness: 0.0
    });
    const baseFloor = new THREE.Mesh(baseFloorGeo, baseFloorMat);
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.receiveShadow = true;
    baseFloor.name = 'BaseFloor';
    this.roomsGroup.add(baseFloor);

    rooms.forEach((room) => {
      const roomWidth = room.bounds.maxX - room.bounds.minX;
      const roomDepth = room.bounds.maxZ - room.bounds.minZ;
      const centerX = (room.bounds.minX + room.bounds.maxX) / 2;
      const centerZ = (room.bounds.minZ + room.bounds.maxZ) / 2;

      const roomGeo = new THREE.PlaneGeometry(roomWidth, roomDepth);
      const roomMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(room.color),
        roughness: 0.95,
        metalness: 0.0,
        transparent: true,
        opacity: 0.85
      });
      const roomMesh = new THREE.Mesh(roomGeo, roomMat);
      roomMesh.rotation.x = -Math.PI / 2;
      roomMesh.position.set(centerX, 0.005, centerZ);
      roomMesh.receiveShadow = true;
      roomMesh.name = `Floor_${room.id}`;
      this.roomsGroup.add(roomMesh);
    });
  }

  private buildWalls(): void {
    const { width, depth, height, wallThickness } = this.config;
    const halfW = width / 2;
    const halfD = depth / 2;

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.0,
      transparent: true,
      opacity: 0.5
    });

    const walls = [
      { pos: [0, height / 2, -halfD], size: [width, height, wallThickness] },
      { pos: [0, height / 2, halfD], size: [width, height, wallThickness] },
      { pos: [-halfW, height / 2, 0], size: [wallThickness, height, depth] },
      { pos: [halfW, height / 2, 0], size: [wallThickness, height, depth] },
      { pos: [0, height / 2, 0], size: [wallThickness, height, depth] },
      { pos: [-2, height / 2, 0], size: [4, height, wallThickness] }
    ];

    walls.forEach((w, i) => {
      const geo = new THREE.BoxGeometry(w.size[0], w.size[1], w.size[2]);
      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.set(w.pos[0], w.pos[1], w.pos[2]);
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.name = `Wall_${i}`;
      this.wallsGroup.add(wall);
    });
  }

  private buildFurniture(): void {
    const furnitureMat = new THREE.MeshStandardMaterial({
      color: 0xb08968,
      roughness: 0.7,
      metalness: 0.05
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.65,
      metalness: 0.1
    });

    this.config.furniture.forEach((f, idx) => {
      const geo = new THREE.BoxGeometry(f.size.x, f.size.y, f.size.z);
      const mat = idx % 2 === 0 ? furnitureMat.clone() : accentMat.clone();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(f.position.x, f.position.y, f.position.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = `Furniture_${f.id}`;
      this.furnitureGroup.add(mesh);
    });
  }

  private buildGridHelper(): void {
    this.gridHelper = new THREE.GridHelper(
      Math.max(this.config.width, this.config.depth) + 2,
      20,
      0xcccccc,
      0xe0e0e0
    );
    this.gridHelper.position.y = 0.01;
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.5;
    this.houseGroup.add(this.gridHelper);
  }

  private buildRoomLabels(): void {
    this.config.rooms.forEach((room) => {
      const centerX = (room.bounds.minX + room.bounds.maxX) / 2;
      const centerZ = (room.bounds.minZ + room.bounds.maxZ) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(44, 62, 80, 0.7)';
      ctx.fillText(room.name, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;

      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(centerX, 0.1, centerZ);
      sprite.scale.set(3, 0.75, 1);
      sprite.name = `Label_${room.id}`;
      this.labelsGroup.add(sprite);
    });
  }

  public getFloorPoints(gridSize: number = 20): { x: number; z: number }[] {
    const points: { x: number; z: number }[] = [];
    const halfW = this.config.width / 2;
    const halfD = this.config.depth / 2;
    const stepX = this.config.width / (gridSize - 1);
    const stepZ = this.config.depth / (gridSize - 1);

    for (let iz = 0; iz < gridSize; iz++) {
      for (let ix = 0; ix < gridSize; ix++) {
        points.push({
          x: -halfW + ix * stepX,
          z: -halfD + iz * stepZ
        });
      }
    }

    return points;
  }

  public getConfig(): HouseConfig {
    return this.config;
  }

  public getRooms(): RoomConfig[] {
    return this.config.rooms;
  }

  public getGroup(): THREE.Group {
    return this.houseGroup;
  }

  public markLightsDirty(): void {
    this.lightsNeedUpdate = true;
  }

  public isLightsDirty(): boolean {
    return this.lightsNeedUpdate;
  }

  public clearLightsDirty(): void {
    this.lightsNeedUpdate = false;
  }

  public dispose(): void {
    this.houseGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.scene.remove(this.houseGroup);
  }
}
