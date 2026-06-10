import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export interface RoomData {
  id: string;
  name: string;
  floor: number;
  position: { x: number; y: number; z: number };
  size: { width: number; depth: number; height: number };
  area: number;
}

export interface FloorData {
  level: number;
  rooms: RoomData[];
  corridor: { x: number; z: number; width: number; depth: number };
  windows: Array<{ position: { x: number; y: number; z: number }; size: { width: number; height: number } }>;
}

export interface Annotation {
  id: string;
  position: THREE.Vector3;
  text: string;
  marker: THREE.Mesh;
  label: CSS2DObject;
}

export interface Measurement {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  line: THREE.Line;
  startMarker: THREE.Mesh;
  endMarker: THREE.Mesh;
  label: CSS2DObject;
}

const ROOM_NAMES = ['卧室', '客厅', '厨房', '卫生间', '书房', '餐厅', '阳台', '储物间'];

export class SceneManager {
  private scene: THREE.Scene;

  private buildingGroup: THREE.Group = new THREE.Group();
  private annotationGroup: THREE.Group = new THREE.Group();
  private measurementGroup: THREE.Group = new THREE.Group();

  private wallMaterial: THREE.MeshPhysicalMaterial;
  private wallHighlightMaterial: THREE.MeshPhysicalMaterial;
  private floorMaterial: THREE.MeshStandardMaterial;
  private windowMaterial: THREE.MeshPhysicalMaterial;
  private annotationMarkerMaterial: THREE.MeshStandardMaterial;
  private measurementMarkerMaterial: THREE.MeshStandardMaterial;

  private roomMeshes: Map<string, THREE.Mesh[]> = new Map();
  private roomFloorMeshes: Map<string, THREE.Mesh> = new Map();
  private originalWallMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();
  private roomsData: Map<string, RoomData> = new Map();

  private highlightedRoomId: string | null = null;
  private roomLabel: CSS2DObject | null = null;

  private annotations: Annotation[] = [];
  private measurements: Measurement[] = [];

  private static readonly MAX_ANNOTATIONS = 20;
  private static readonly FLOOR_HEIGHT = 3.5;
  private static readonly ROOM_HEIGHT = 3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.wallMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xa0c4ff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.1
    });

    this.wallHighlightMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      roughness: 0.4,
      metalness: 0.1,
      emissive: 0xffd166,
      emissiveIntensity: 0.15
    });

    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0d5dd,
      roughness: 0.8,
      metalness: 0.1
    });

    this.windowMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.6
    });

    this.annotationMarkerMaterial = new THREE.MeshStandardMaterial({
      color: 0x118ab2,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0x118ab2,
      emissiveIntensity: 0.2
    });

    this.measurementMarkerMaterial = new THREE.MeshStandardMaterial({
      color: 0xef476f,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0xef476f,
      emissiveIntensity: 0.3
    });

    this.scene.add(this.buildingGroup);
    this.scene.add(this.annotationGroup);
    this.scene.add(this.measurementGroup);
  }

  generateBuilding(): FloorData[] {
    this.clearBuilding();
    const floors: FloorData[] = [];
    const floorCount = 3;

    for (let level = 0; level < floorCount; level++) {
      const floorData = this.generateFloor(level);
      floors.push(floorData);
    }

    this.buildFloors(floors);
    return floors;
  }

  private generateFloor(level: number): FloorData {
    const roomCount = 4 + Math.floor(Math.random() * 3);
    const rooms: RoomData[] = [];

    const floorWidth = 28;
    const floorDepth = 18;
    const corridorWidth = 2.5;
    const yBase = level * SceneManager.FLOOR_HEIGHT;

    const corridor = {
      x: 0,
      z: 0,
      width: floorWidth,
      depth: corridorWidth
    };

    const topRoomsCount = Math.ceil(roomCount / 2);
    const bottomRoomsCount = roomCount - topRoomsCount;

    this.distributeRooms(rooms, topRoomsCount, level, floorWidth, corridorWidth, floorDepth, yBase, true);
    this.distributeRooms(rooms, bottomRoomsCount, level, floorWidth, corridorWidth, floorDepth, yBase, false);

    const windows: Array<{ position: { x: number; y: number; z: number }; size: { width: number; height: number } }> = [];
    const halfWidth = floorWidth / 2 - 2;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1;
      windows.push({
        position: {
          x: side * (halfWidth * (0.3 + Math.random() * 0.4)),
          y: yBase + 1.5,
          z: side * (floorDepth / 2 + 0.05)
        },
        size: { width: 1.5, height: 1.8 }
      });
    }

    return { level, rooms, corridor, windows };
  }

  private distributeRooms(
    rooms: RoomData[],
    count: number,
    level: number,
    floorWidth: number,
    corridorWidth: number,
    floorDepth: number,
    yBase: number,
    isTop: boolean
  ): void {
    if (count === 0) return;

    const availableDepth = (floorDepth - corridorWidth) / 2;
    const zCenter = isTop ? (corridorWidth / 2 + availableDepth / 2) : -(corridorWidth / 2 + availableDepth / 2);

    const roomDepths: number[] = [];
    let totalWidth = 0;

    for (let i = 0; i < count; i++) {
      const width = 4 + Math.random() * 4;
      roomDepths.push(width);
      totalWidth += width;
    }

    const scale = (floorWidth - 2 - (count - 1) * 0.5) / totalWidth;
    for (let i = 0; i < count; i++) {
      roomDepths[i] *= scale;
    }

    let currentX = -floorWidth / 2 + 1;

    for (let i = 0; i < count; i++) {
      const width = roomDepths[i];
      const depth = availableDepth - 0.5;

      const roomId = `room_${level}_${rooms.length}`;
      const nameIndex = (level * 6 + rooms.length) % ROOM_NAMES.length;
      const roomNumber = Math.floor(rooms.length / ROOM_NAMES.length) + 1;

      rooms.push({
        id: roomId,
        name: `${ROOM_NAMES[nameIndex]}${roomNumber > 1 ? roomNumber : ''}`,
        floor: level,
        position: {
          x: currentX + width / 2,
          y: yBase,
          z: zCenter
        },
        size: {
          width,
          depth,
          height: SceneManager.ROOM_HEIGHT
        },
        area: parseFloat((width * depth).toFixed(1))
      });

      currentX += width + 0.5;
    }
  }

  private buildFloors(floors: FloorData[]): void {
    for (const floor of floors) {
      this.buildFloor(floor);
    }
  }

  private buildFloor(floor: FloorData): void {
    const yBase = floor.level * SceneManager.FLOOR_HEIGHT;

    const floorGeo = new THREE.BoxGeometry(30, 0.2, 20);
    const floorMesh = new THREE.Mesh(floorGeo, this.floorMaterial);
    floorMesh.position.set(0, yBase - 0.1, 0);
    floorMesh.userData.type = 'floor';
    this.buildingGroup.add(floorMesh);

    for (const room of floor.rooms) {
      this.buildRoom(room);
    }

    this.buildCorridor(floor.corridor, yBase);

    for (const win of floor.windows) {
      this.buildWindow(win);
    }
  }

  private buildRoom(room: RoomData): void {
    const { x, y, z } = room.position;
    const { width, depth, height } = room.size;

    const roomWalls: THREE.Mesh[] = [];

    const wallThickness = 0.15;

    const northWallGeo = new THREE.BoxGeometry(width, height, wallThickness);
    const northWall = new THREE.Mesh(northWallGeo, this.wallMaterial);
    northWall.position.set(x, y + height / 2, z + depth / 2);
    northWall.userData = { type: 'wall', roomId: room.id };
    this.buildingGroup.add(northWall);
    roomWalls.push(northWall);
    this.originalWallMaterials.set(northWall, this.wallMaterial);

    const southWallGeo = new THREE.BoxGeometry(width, height, wallThickness);
    const southWall = new THREE.Mesh(southWallGeo, this.wallMaterial);
    southWall.position.set(x, y + height / 2, z - depth / 2);
    southWall.userData = { type: 'wall', roomId: room.id };
    this.buildingGroup.add(southWall);
    roomWalls.push(southWall);
    this.originalWallMaterials.set(southWall, this.wallMaterial);

    const eastWallGeo = new THREE.BoxGeometry(wallThickness, height, depth);
    const eastWall = new THREE.Mesh(eastWallGeo, this.wallMaterial);
    eastWall.position.set(x + width / 2, y + height / 2, z);
    eastWall.userData = { type: 'wall', roomId: room.id };
    this.buildingGroup.add(eastWall);
    roomWalls.push(eastWall);
    this.originalWallMaterials.set(eastWall, this.wallMaterial);

    const westWallGeo = new THREE.BoxGeometry(wallThickness, height, depth);
    const westWall = new THREE.Mesh(westWallGeo, this.wallMaterial);
    westWall.position.set(x - width / 2, y + height / 2, z);
    westWall.userData = { type: 'wall', roomId: room.id };
    this.buildingGroup.add(westWall);
    roomWalls.push(westWall);
    this.originalWallMaterials.set(westWall, this.wallMaterial);

    const roomFloorGeo = new THREE.BoxGeometry(width - 0.3, 0.05, depth - 0.3);
    const roomFloor = new THREE.Mesh(roomFloorGeo, this.floorMaterial);
    roomFloor.position.set(x, y + 0.05, z);
    roomFloor.userData = { type: 'room_floor', roomId: room.id };
    this.buildingGroup.add(roomFloor);
    this.roomFloorMeshes.set(room.id, roomFloor);

    this.roomMeshes.set(room.id, roomWalls);
    this.roomsData.set(room.id, room);
  }

  private buildCorridor(corridor: { x: number; z: number; width: number; depth: number }, yBase: number): void {
    const corridorFloorGeo = new THREE.BoxGeometry(corridor.width, 0.05, corridor.depth);
    const corridorFloor = new THREE.Mesh(corridorFloorGeo, this.floorMaterial);
    corridorFloor.position.set(corridor.x, yBase + 0.03, corridor.z);
    corridorFloor.userData = { type: 'corridor_floor' };
    this.buildingGroup.add(corridorFloor);
  }

  private buildWindow(win: { position: { x: number; y: number; z: number }; size: { width: number; height: number } }): void {
    const windowGeo = new THREE.PlaneGeometry(win.size.width, win.size.height);
    const windowMesh = new THREE.Mesh(windowGeo, this.windowMaterial);
    windowMesh.position.set(win.position.x, win.position.y, win.position.z);
    if (Math.abs(win.position.z) > Math.abs(win.position.x)) {
      windowMesh.rotation.y = win.position.z > 0 ? 0 : Math.PI;
    } else {
      windowMesh.rotation.y = win.position.x > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
    windowMesh.userData = { type: 'window' };
    this.buildingGroup.add(windowMesh);
  }

  private clearBuilding(): void {
    while (this.buildingGroup.children.length > 0) {
      const child = this.buildingGroup.children[0];
      this.buildingGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }
    this.roomMeshes.clear();
    this.roomFloorMeshes.clear();
    this.originalWallMaterials.clear();
    this.roomsData.clear();
    this.highlightedRoomId = null;
    this.removeRoomLabel();
  }

  highlightRoom(roomId: string | null): void {
    if (this.highlightedRoomId === roomId) return;

    if (this.highlightedRoomId) {
      const oldWalls = this.roomMeshes.get(this.highlightedRoomId);
      if (oldWalls) {
        for (const wall of oldWalls) {
          const origMat = this.originalWallMaterials.get(wall);
          if (origMat) {
            wall.material = origMat;
          }
        }
      }
    }

    this.highlightedRoomId = roomId;
    this.removeRoomLabel();

    if (roomId) {
      const walls = this.roomMeshes.get(roomId);
      if (walls) {
        for (const wall of walls) {
          wall.material = this.wallHighlightMaterial;
        }
      }

      const roomData = this.roomsData.get(roomId);
      if (roomData) {
        this.addRoomLabel(roomData);
      }
    }
  }

  private addRoomLabel(room: RoomData): void {
    const div = document.createElement('div');
    div.className = 'room-label';
    div.textContent = `${room.name}-${room.area}m²`;

    const label = new CSS2DObject(div);
    label.position.set(
      room.position.x,
      room.position.y + room.size.height + 0.8,
      room.position.z
    );
    this.buildingGroup.add(label);
    this.roomLabel = label;
  }

  private removeRoomLabel(): void {
    if (this.roomLabel) {
      this.buildingGroup.remove(this.roomLabel);
      if (this.roomLabel.element instanceof HTMLElement && this.roomLabel.element.parentNode) {
        this.roomLabel.element.parentNode.removeChild(this.roomLabel.element);
      }
      this.roomLabel = null;
    }
  }

  getRoomById(roomId: string): RoomData | undefined {
    return this.roomsData.get(roomId);
  }

  addAnnotation(position: THREE.Vector3, text: string): Annotation | null {
    if (this.annotations.length >= SceneManager.MAX_ANNOTATIONS) {
      return null;
    }

    const markerGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const marker = new THREE.Mesh(markerGeo, this.annotationMarkerMaterial);
    marker.position.copy(position);
    marker.userData = { type: 'annotation_marker' };
    this.annotationGroup.add(marker);

    const div = document.createElement('div');
    div.className = 'annotation-label';
    div.textContent = text;

    const label = new CSS2DObject(div);
    label.position.set(position.x, position.y + 1.0, position.z);
    this.annotationGroup.add(label);

    const annotation: Annotation = {
      id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      position: position.clone(),
      text,
      marker,
      label
    };

    this.annotations.push(annotation);
    return annotation;
  }

  clearAnnotations(): void {
    for (const ann of this.annotations) {
      this.annotationGroup.remove(ann.marker);
      this.annotationGroup.remove(ann.label);
      ann.marker.geometry.dispose();
      if (ann.label.element instanceof HTMLElement && ann.label.element.parentNode) {
        ann.label.element.parentNode.removeChild(ann.label.element);
      }
    }
    this.annotations = [];
  }

  getAnnotationCount(): number {
    return this.annotations.length;
  }

  addMeasurement(start: THREE.Vector3, end: THREE.Vector3): Measurement {
    const startMarkerGeo = new THREE.SphereGeometry(0.15, 12, 12);
    const startMarker = new THREE.Mesh(startMarkerGeo, this.measurementMarkerMaterial);
    startMarker.position.copy(start);
    this.measurementGroup.add(startMarker);

    const endMarkerGeo = new THREE.SphereGeometry(0.15, 12, 12);
    const endMarker = new THREE.Mesh(endMarkerGeo, this.measurementMarkerMaterial);
    endMarker.position.copy(end);
    this.measurementGroup.add(endMarker);

    const points = [start.clone(), end.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0xef476f,
      linewidth: 2,
      dashSize: 1,
      gapSize: 1
    });
    const line = new THREE.Line(geometry, lineMaterial);
    line.computeLineDistances();
    this.measurementGroup.add(line);

    const distance = start.distanceTo(end);
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    const div = document.createElement('div');
    div.className = 'measurement-label';
    div.textContent = `${distance.toFixed(1)}m`;

    const label = new CSS2DObject(div);
    label.position.copy(midPoint);
    label.position.y += 0.5;
    this.measurementGroup.add(label);

    const measurement: Measurement = {
      id: `meas_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      start: start.clone(),
      end: end.clone(),
      line,
      startMarker,
      endMarker,
      label
    };

    this.measurements.push(measurement);
    return measurement;
  }

  clearMeasurements(): void {
    for (const meas of this.measurements) {
      this.measurementGroup.remove(meas.line);
      this.measurementGroup.remove(meas.startMarker);
      this.measurementGroup.remove(meas.endMarker);
      this.measurementGroup.remove(meas.label);
      meas.line.geometry.dispose();
      (meas.line.material as THREE.Material).dispose();
      meas.startMarker.geometry.dispose();
      meas.endMarker.geometry.dispose();
      if (meas.label.element instanceof HTMLElement && meas.label.element.parentNode) {
        meas.label.element.parentNode.removeChild(meas.label.element);
      }
    }
    this.measurements = [];
  }

  getIntersectables(): THREE.Object3D[] {
    const result: THREE.Object3D[] = [];
    this.buildingGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        result.push(obj);
      }
    });
    return result;
  }

  clearAll(): void {
    this.clearAnnotations();
    this.clearMeasurements();
    this.highlightRoom(null);
  }

  getAnnotationGroup(): THREE.Group {
    return this.annotationGroup;
  }

  getMeasurementGroup(): THREE.Group {
    return this.measurementGroup;
  }

  getBuildingGroup(): THREE.Group {
    return this.buildingGroup;
  }

  getSceneCenter(): THREE.Vector3 {
    return new THREE.Vector3(0, SceneManager.FLOOR_HEIGHT * 1.2, 0);
  }

  static getFloorHeight(): number {
    return SceneManager.FLOOR_HEIGHT;
  }
}
