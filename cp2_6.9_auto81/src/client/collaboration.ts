import { io, Socket } from 'socket.io-client';
import type { Operation, RoomUser, Version, DrawElement } from '../shared/types';

export interface CollaborationCallbacks {
  onRoomState: (state: { users: RoomUser[]; elements: DrawElement[]; version: number; currentUserId: string }) => void;
  onUserJoined: (user: RoomUser) => void;
  onUserLeft: (data: { userId: string }) => void;
  onRemoteOperation: (op: Operation) => void;
  onVersionsList: (versions: Version[]) => void;
  onVersionRestored: (data: { elements: DrawElement[]; version: number }) => void;
}

export class CollaborationClient {
  private socket: Socket | null = null;
  private roomId: string | null = null;
  private callbacks: CollaborationCallbacks;
  private currentUserId: string | null = null;

  constructor(callbacks: CollaborationCallbacks) {
    this.callbacks = callbacks;
  }

  connect(): void {
    this.socket = io({
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[Collab] Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('[Collab] Disconnected from server');
    });

    this.socket.on('room-state', (state: { users: RoomUser[]; elements: DrawElement[]; version: number; currentUserId: string }) => {
      this.currentUserId = state.currentUserId;
      this.callbacks.onRoomState(state);
    });

    this.socket.on('user-joined', (user: RoomUser) => {
      this.callbacks.onUserJoined(user);
    });

    this.socket.on('user-left', (data: { userId: string }) => {
      this.callbacks.onUserLeft(data);
    });

    this.socket.on('remote-operation', (op: Operation) => {
      if (op.userId !== this.currentUserId) {
        this.callbacks.onRemoteOperation(op);
      }
    });

    this.socket.on('versions-list', (versions: Version[]) => {
      this.callbacks.onVersionsList(versions);
    });

    this.socket.on('version-restored', (data: { elements: DrawElement[]; version: number }) => {
      this.callbacks.onVersionRestored(data);
    });
  }

  joinRoom(roomId: string, nickname: string): void {
    this.roomId = roomId;
    if (this.socket) {
      this.socket.emit('join-room', { roomId, nickname });
    }
  }

  sendOperation(op: Operation): void {
    if (this.socket && this.currentUserId) {
      const opWithUser = { ...op, userId: this.currentUserId };
      this.socket.emit('draw-operation', opWithUser);
    }
  }

  getVersions(): void {
    if (this.socket) {
      this.socket.emit('get-versions');
    }
  }

  restoreVersion(versionId: string): void {
    if (this.socket) {
      this.socket.emit('restore-version', { versionId });
    }
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
