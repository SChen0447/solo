import { Room, Stele, Mechanism, NPC, TILE_SIZE, Vector2 } from './types';
import { getRandomWalkablePosition } from './utils';

function createRoom1(): Room {
  const W = 1;
  const F = 0;
  const tiles: number[][] = [
    [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, W, W, W, F, F, F, F, W, W, W, F, F, W],
    [W, F, F, W, F, F, F, F, F, F, F, F, W, F, F, W],
    [W, F, F, W, F, F, F, F, F, F, F, F, W, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, W, F, F, F, F, F, F, F, F, W, F, F, W],
    [W, F, F, W, F, F, F, F, F, F, F, F, W, F, F, W],
    [W, F, F, W, W, W, F, F, F, F, W, W, W, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W]
  ];

  const steles: Stele[] = [
    {
      id: 'stele-1-1',
      position: { x: TILE_SIZE * 7.5, y: TILE_SIZE * 3.5 },
      requiredLight: 3,
      isLit: false,
      color: '#FFD700',
      lightRemaining: 2,
      litTime: 0,
      orderIndex: 0
    },
    {
      id: 'stele-1-2',
      position: { x: TILE_SIZE * 7.5, y: TILE_SIZE * 10.5 },
      requiredLight: 3,
      isLit: false,
      color: '#FFD700',
      lightRemaining: 2,
      litTime: 0,
      orderIndex: 1
    }
  ];

  const mechanisms: Mechanism[] = [
    {
      id: 'door-1',
      type: 'door',
      position: { x: TILE_SIZE * 15, y: TILE_SIZE * 6.5 },
      isActive: false,
      activationTime: 0,
      linkedSteleId: 'all'
    }
  ];

  const npcs: NPC[] = [
    {
      id: 'npc-1',
      position: getRandomWalkablePosition(tiles),
      isOnCooldown: false,
      cooldownEndTime: 0,
      targetPosition: getRandomWalkablePosition(tiles),
      wanderDirection: { x: 1, y: 0 },
      wanderTimer: 2
    }
  ];

  return {
    id: 1,
    name: '入口大厅',
    tiles,
    steles,
    mechanisms,
    timeLimit: 60,
    clueText: '收集光芒点亮两座石碑，开启通往下一房间的大门',
    npcs,
    litOrder: []
  };
}

function createRoom2(): Room {
  const W = 1;
  const F = 0;
  const tiles: number[][] = [
    [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
    [W, F, F, F, F, W, F, F, F, F, W, F, F, F, F, W],
    [W, F, F, F, F, W, F, F, F, F, W, F, F, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, W, W, F, F, W, W, W, W, W, W, F, F, W, W, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, W, W, F, F, W, W, W, W, W, W, F, F, W, W, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, F, F, W, F, F, F, F, W, F, F, F, F, W],
    [W, F, F, F, F, W, F, F, F, F, W, F, F, F, F, W],
    [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W]
  ];

  const steles: Stele[] = [
    {
      id: 'stele-2-1',
      position: { x: TILE_SIZE * 2.5, y: TILE_SIZE * 2.5 },
      requiredLight: 3,
      isLit: false,
      color: '#87CEEB',
      lightRemaining: 1,
      litTime: 0,
      orderIndex: 0
    },
    {
      id: 'stele-2-2',
      position: { x: TILE_SIZE * 13.5, y: TILE_SIZE * 2.5 },
      requiredLight: 3,
      isLit: false,
      color: '#90EE90',
      lightRemaining: 1,
      litTime: 0,
      orderIndex: 1
    },
    {
      id: 'stele-2-3',
      position: { x: TILE_SIZE * 7.5, y: TILE_SIZE * 6.5 },
      requiredLight: 4,
      isLit: false,
      color: '#DDA0DD',
      lightRemaining: 2,
      litTime: 0,
      orderIndex: 2
    }
  ];

  const mechanisms: Mechanism[] = [
    {
      id: 'platform-1',
      type: 'platform',
      position: { x: TILE_SIZE * 7.5, y: TILE_SIZE * 11.5 },
      isActive: false,
      activationTime: 0,
      linkedSteleId: 'stele-2-3'
    },
    {
      id: 'door-2',
      type: 'door',
      position: { x: TILE_SIZE * 15, y: TILE_SIZE * 6.5 },
      isActive: false,
      activationTime: 0,
      linkedSteleId: 'all'
    }
  ];

  const npcs: NPC[] = [
    {
      id: 'npc-2',
      position: getRandomWalkablePosition(tiles),
      isOnCooldown: false,
      cooldownEndTime: 0,
      targetPosition: getRandomWalkablePosition(tiles),
      wanderDirection: { x: -1, y: 0.5 },
      wanderTimer: 3
    }
  ];

  return {
    id: 2,
    name: '机关密室',
    tiles,
    steles,
    mechanisms,
    timeLimit: 60,
    clueText: '三座石碑需要不同颜色的光芒，中央石碑需要更多光芒',
    npcs,
    litOrder: []
  };
}

function createRoom3(): Room {
  const W = 1;
  const F = 0;
  const tiles: number[][] = [
    [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, F, W, W, F, F, F, F, W, W, F, F, F, W],
    [W, F, F, F, W, F, F, F, F, F, F, W, F, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, F, W, F, F, F, F, F, F, W, F, F, F, W],
    [W, F, F, F, W, W, F, F, F, F, W, W, F, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
    [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W]
  ];

  const steles: Stele[] = [
    {
      id: 'stele-3-red',
      position: { x: TILE_SIZE * 3.5, y: TILE_SIZE * 6.5 },
      requiredLight: 3,
      isLit: false,
      color: '#FF6B6B',
      lightRemaining: 1,
      litTime: 0,
      orderIndex: 0
    },
    {
      id: 'stele-3-green',
      position: { x: TILE_SIZE * 7.5, y: TILE_SIZE * 2.5 },
      requiredLight: 3,
      isLit: false,
      color: '#4ECDC4',
      lightRemaining: 1,
      litTime: 0,
      orderIndex: 1
    },
    {
      id: 'stele-3-blue',
      position: { x: TILE_SIZE * 11.5, y: TILE_SIZE * 6.5 },
      requiredLight: 3,
      isLit: false,
      color: '#45B7D1',
      lightRemaining: 1,
      litTime: 0,
      orderIndex: 2
    },
    {
      id: 'stele-3-boss',
      position: { x: TILE_SIZE * 7.5, y: TILE_SIZE * 10.5 },
      requiredLight: 0,
      isLit: false,
      color: '#FFD700',
      lightRemaining: 0,
      litTime: 0,
      orderIndex: 3
    }
  ];

  const mechanisms: Mechanism[] = [
    {
      id: 'guardian',
      type: 'platform',
      position: { x: TILE_SIZE * 7.5, y: TILE_SIZE * 10.5 },
      isActive: false,
      activationTime: 0,
      linkedSteleId: 'boss'
    }
  ];

  const npcs: NPC[] = [
    {
      id: 'npc-3-1',
      position: getRandomWalkablePosition(tiles),
      isOnCooldown: false,
      cooldownEndTime: 0,
      targetPosition: getRandomWalkablePosition(tiles),
      wanderDirection: { x: 0.5, y: 0.5 },
      wanderTimer: 2
    },
    {
      id: 'npc-3-2',
      position: getRandomWalkablePosition(tiles),
      isOnCooldown: false,
      cooldownEndTime: 0,
      targetPosition: getRandomWalkablePosition(tiles),
      wanderDirection: { x: -0.5, y: -0.5 },
      wanderTimer: 3
    }
  ];

  return {
    id: 3,
    name: '守护者圣殿',
    tiles,
    steles,
    mechanisms,
    timeLimit: 60,
    clueText: '墙上符文提示：红→青→蓝，按顺序点亮分支石碑唤醒守护者',
    npcs,
    requiredOrder: ['stele-3-red', 'stele-3-green', 'stele-3-blue'],
    litOrder: []
  };
}

export class LevelManager {
  private rooms: Room[];
  private currentRoomIndex: number;
  private currentRoom: Room;

  constructor() {
    this.rooms = [createRoom1(), createRoom2(), createRoom3()];
    this.currentRoomIndex = 0;
    this.currentRoom = this.cloneRoom(this.rooms[0]);
  }

  private cloneRoom(room: Room): Room {
    return {
      ...room,
      steles: room.steles.map(s => ({ ...s, position: { ...s.position } })),
      mechanisms: room.mechanisms.map(m => ({ ...m, position: { ...m.position } })),
      npcs: room.npcs.map(n => ({
        ...n,
        position: { ...n.position },
        targetPosition: { ...n.targetPosition },
        wanderDirection: { ...n.wanderDirection }
      })),
      tiles: room.tiles.map(row => [...row]),
      litOrder: []
    };
  }

  getCurrentRoom(): Room {
    return this.currentRoom;
  }

  getCurrentRoomIndex(): number {
    return this.currentRoomIndex;
  }

  getTotalRooms(): number {
    return this.rooms.length;
  }

  getPlayerStartPosition(): Vector2 {
    return { x: TILE_SIZE * 1.5, y: TILE_SIZE * 6.5 };
  }

  attemptLightStele(
    steleIndex: number,
    lightAmount: number,
    currentTime: number
  ): { success: boolean; lightUsed: number; isWrongOrder: boolean; steleId: string } {
    const stele = this.currentRoom.steles[steleIndex];
    if (!stele || stele.isLit) {
      return { success: false, lightUsed: 0, isWrongOrder: false, steleId: stele?.id || '' };
    }

    if (stele.id === 'stele-3-boss') {
      const allBranchesLit = this.currentRoom.steles
        .filter(s => s.id !== 'stele-3-boss')
        .every(s => s.isLit);
      if (allBranchesLit) {
        stele.isLit = true;
        stele.litTime = currentTime;
        return { success: true, lightUsed: 0, isWrongOrder: false, steleId: stele.id };
      }
      return { success: false, lightUsed: 0, isWrongOrder: false, steleId: stele.id };
    }

    if (this.currentRoom.requiredOrder) {
      const expectedIndex = this.currentRoom.litOrder.length;
      const expectedId = this.currentRoom.requiredOrder[expectedIndex];
      if (stele.id !== expectedId) {
        return { success: false, lightUsed: 0, isWrongOrder: true, steleId: stele.id };
      }
    }

    if (lightAmount >= stele.requiredLight) {
      stele.isLit = true;
      stele.litTime = currentTime;
      this.currentRoom.litOrder.push(stele.id);
      this.activateMechanisms(stele.id, currentTime);
      return { success: true, lightUsed: stele.requiredLight, isWrongOrder: false, steleId: stele.id };
    }

    return { success: false, lightUsed: 0, isWrongOrder: false, steleId: stele.id };
  }

  private activateMechanisms(steleId: string, currentTime: number): void {
    for (const mechanism of this.currentRoom.mechanisms) {
      if (mechanism.linkedSteleId === steleId) {
        mechanism.isActive = true;
        mechanism.activationTime = currentTime;
      }
    }

    const allStelesLit = this.currentRoom.steles
      .filter(s => s.id !== 'stele-3-boss')
      .every(s => s.isLit);

    if (allStelesLit) {
      for (const mechanism of this.currentRoom.mechanisms) {
        if (mechanism.linkedSteleId === 'all') {
          mechanism.isActive = true;
          mechanism.activationTime = currentTime;
        }
        if (mechanism.linkedSteleId === 'boss' && this.currentRoomIndex === 2) {
          const bossStele = this.currentRoom.steles.find(s => s.id === 'stele-3-boss');
          if (bossStele?.isLit) {
            mechanism.isActive = true;
            mechanism.activationTime = currentTime;
          }
        }
      }
    }
  }

  checkRoomComplete(): boolean {
    const stelesToCheck = this.currentRoom.steles.filter(s => s.id !== 'stele-3-boss');
    const allLit = stelesToCheck.every(s => s.isLit);
    if (!allLit) return false;

    if (this.currentRoomIndex === 2) {
      return this.currentRoom.steles.find(s => s.id === 'stele-3-boss')?.isLit || false;
    }

    return true;
  }

  checkCanExitRoom(playerPos: Vector2): boolean {
    if (!this.checkRoomComplete()) return false;

    const exitMechanism = this.currentRoom.mechanisms.find(
      m => m.type === 'door' && m.linkedSteleId === 'all'
    );

    if (!exitMechanism || !exitMechanism.isActive) return false;

    const distToExit = Math.sqrt(
      (playerPos.x - exitMechanism.position.x) ** 2 +
      (playerPos.y - exitMechanism.position.y) ** 2
    );

    return distToExit < TILE_SIZE * 1.5;
  }

  nextRoom(): boolean {
    if (this.currentRoomIndex >= this.rooms.length - 1) {
      return false;
    }
    this.currentRoomIndex++;
    this.currentRoom = this.cloneRoom(this.rooms[this.currentRoomIndex]);
    return true;
  }

  resetCurrentRoom(): void {
    this.currentRoom = this.cloneRoom(this.rooms[this.currentRoomIndex]);
  }

  isFinalRoom(): boolean {
    return this.currentRoomIndex === this.rooms.length - 1;
  }

  getNPCs(): NPC[] {
    return this.currentRoom.npcs;
  }

  getTiles(): number[][] {
    return this.currentRoom.tiles;
  }
}
