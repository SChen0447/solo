export type TileType = 'wall' | 'floor';

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface BSPNode {
  x: number;
  y: number;
  width: number;
  height: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: Room;
}

export class DungeonGenerator {
  public readonly width: number;
  public readonly height: number;
  public tiles: TileType[][];
  public rooms: Room[];

  private static readonly MIN_ROOM_WIDTH = 4;
  private static readonly MIN_ROOM_HEIGHT = 4;
  private static readonly ROOM_PADDING = 1;

  constructor(width: number = 24, height: number = 18) {
    this.width = width;
    this.height = height;
    this.tiles = this.createWallGrid();
    this.rooms = [];
  }

  private createWallGrid(): TileType[][] {
    const grid: TileType[][] = [];
    for (let y = 0; y < this.height; y++) {
      grid[y] = [];
      for (let x = 0; x < this.width; x++) {
        grid[y][x] = 'wall';
      }
    }
    return grid;
  }

  public generate(targetRooms: number = 6): Room[] {
    this.tiles = this.createWallGrid();
    this.rooms = [];

    const root: BSPNode = {
      x: 1,
      y: 1,
      width: this.width - 2,
      height: this.height - 2,
    };

    this.splitNode(root, targetRooms);
    this.createRooms(root);
    this.connectRooms();

    return this.rooms;
  }

  private splitNode(node: BSPNode, targetRooms: number, depth: number = 0): void {
    const roomCount = Math.pow(2, depth);
    if (roomCount >= targetRooms) {
      return;
    }

    const canSplitH = node.width >= DungeonGenerator.MIN_ROOM_WIDTH * 2 + DungeonGenerator.ROOM_PADDING * 2;
    const canSplitV = node.height >= DungeonGenerator.MIN_ROOM_HEIGHT * 2 + DungeonGenerator.ROOM_PADDING * 2;

    if (!canSplitH && !canSplitV) {
      return;
    }

    let splitHorizontal: boolean;
    if (canSplitH && canSplitV) {
      splitHorizontal = node.width > node.height ? false : true;
      if (Math.random() < 0.3) splitHorizontal = !splitHorizontal;
    } else {
      splitHorizontal = canSplitV;
    }

    if (splitHorizontal) {
      const minSplit = DungeonGenerator.MIN_ROOM_HEIGHT + DungeonGenerator.ROOM_PADDING;
      const maxSplit = node.height - minSplit - DungeonGenerator.ROOM_PADDING;
      if (maxSplit <= minSplit) return;

      const splitPoint = minSplit + Math.floor(Math.random() * (maxSplit - minSplit + 1));

      node.left = {
        x: node.x,
        y: node.y,
        width: node.width,
        height: splitPoint,
      };
      node.right = {
        x: node.x,
        y: node.y + splitPoint,
        width: node.width,
        height: node.height - splitPoint,
      };
    } else {
      const minSplit = DungeonGenerator.MIN_ROOM_WIDTH + DungeonGenerator.ROOM_PADDING;
      const maxSplit = node.width - minSplit - DungeonGenerator.ROOM_PADDING;
      if (maxSplit <= minSplit) return;

      const splitPoint = minSplit + Math.floor(Math.random() * (maxSplit - minSplit + 1));

      node.left = {
        x: node.x,
        y: node.y,
        width: splitPoint,
        height: node.height,
      };
      node.right = {
        x: node.x + splitPoint,
        y: node.y,
        width: node.width - splitPoint,
        height: node.height,
      };
    }

    this.splitNode(node.left!, targetRooms, depth + 1);
    this.splitNode(node.right!, targetRooms, depth + 1);
  }

  private createRooms(node: BSPNode): void {
    if (node.left && node.right) {
      this.createRooms(node.left);
      this.createRooms(node.right);
    } else {
      const room = this.createRoomInNode(node);
      if (room) {
        this.carveRoom(room);
        node.room = room;
        this.rooms.push(room);
      }
    }
  }

  private createRoomInNode(node: BSPNode): Room | null {
    const padding = DungeonGenerator.ROOM_PADDING;
    const minW = DungeonGenerator.MIN_ROOM_WIDTH;
    const minH = DungeonGenerator.MIN_ROOM_HEIGHT;

    const availableW = node.width - padding * 2;
    const availableH = node.height - padding * 2;

    if (availableW < minW || availableH < minH) {
      return null;
    }

    const roomW = minW + Math.floor(Math.random() * Math.min(availableW - minW + 1, 5));
    const roomH = minH + Math.floor(Math.random() * Math.min(availableH - minH + 1, 4));

    const roomX = node.x + padding + Math.floor(Math.random() * (availableW - roomW + 1));
    const roomY = node.y + padding + Math.floor(Math.random() * (availableH - roomH + 1));

    return {
      x: roomX,
      y: roomY,
      width: roomW,
      height: roomH,
      centerX: Math.floor(roomX + roomW / 2),
      centerY: Math.floor(roomY + roomH / 2),
    };
  }

  private carveRoom(room: Room): void {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (this.isInBounds(x, y)) {
          this.tiles[y][x] = 'floor';
        }
      }
    }
  }

  private connectRooms(): void {
    const sortedRooms = [...this.rooms].sort((a, b) => {
      const distA = a.centerX * a.centerX + a.centerY * a.centerY;
      const distB = b.centerX * b.centerX + b.centerY * b.centerY;
      return distA - distB;
    });

    for (let i = 1; i < sortedRooms.length; i++) {
      const prev = sortedRooms[i - 1];
      const curr = sortedRooms[i];
      this.createCorridor(prev.centerX, prev.centerY, curr.centerX, curr.centerY);
    }

    for (let i = 0; i < Math.floor(this.rooms.length / 3); i++) {
      const r1 = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      const r2 = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      if (r1 !== r2) {
        this.createCorridor(r1.centerX, r1.centerY, r2.centerX, r2.centerY);
      }
    }
  }

  private createCorridor(x1: number, y1: number, x2: number, y2: number): void {
    if (Math.random() < 0.5) {
      this.carveHorizontalCorridor(x1, x2, y1);
      this.carveVerticalCorridor(y1, y2, x2);
    } else {
      this.carveVerticalCorridor(y1, y2, x1);
      this.carveHorizontalCorridor(x1, x2, y2);
    }
  }

  private carveHorizontalCorridor(x1: number, x2: number, y: number): void {
    const start = Math.min(x1, x2);
    const end = Math.max(x1, x2);
    for (let x = start; x <= end; x++) {
      if (this.isInBounds(x, y)) {
        this.tiles[y][x] = 'floor';
      }
    }
  }

  private carveVerticalCorridor(y1: number, y2: number, x: number): void {
    const start = Math.min(y1, y2);
    const end = Math.max(y1, y2);
    for (let y = start; y <= end; y++) {
      if (this.isInBounds(x, y)) {
        this.tiles[y][x] = 'floor';
      }
    }
  }

  public isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  public isWalkable(x: number, y: number): boolean {
    return this.isInBounds(x, y) && this.tiles[y][x] === 'floor';
  }

  public getCenterRoom(): Room {
    if (this.rooms.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
    }
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);
    let closest = this.rooms[0];
    let closestDist = Infinity;
    for (const room of this.rooms) {
      const dist = Math.abs(room.centerX - centerX) + Math.abs(room.centerY - centerY);
      if (dist < closestDist) {
        closestDist = dist;
        closest = room;
      }
    }
    return closest;
  }

  public getWalkableCount(): number {
    let count = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.tiles[y][x] === 'floor') {
          count++;
        }
      }
    }
    return count;
  }
}
