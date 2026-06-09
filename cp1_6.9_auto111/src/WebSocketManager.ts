import { io, Socket } from 'socket.io-client';
import { Building, BuildingType, CityState, LightingState, User } from './types';

type EventCallback<T = any> = (data: T) => void;

export class WebSocketManager {
  private socket: Socket | null = null;
  private messageQueue: Array<{ event: string; data: any }> = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private url: string;

  private listeners: Map<string, EventCallback[]> = new Map();

  constructor(url: string = '') {
    this.url = url || window.location.origin;
  }

  public connect(): Promise<CityState> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.url, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
        });

        this.socket.on('connect', () => {
          this.reconnectAttempts = 0;
          this.flushQueue();
        });

        this.socket.on('sync_state', (state: CityState) => {
          resolve(state);
        });

        this.socket.on('room_full', () => {
          reject(new Error('房间已满，最多支持4位用户同时协作'));
        });

        this.socket.on('user_list', (users: User[]) => {
          this.emit('user_list', users);
        });

        this.socket.on('user_joined', (user: User) => {
          this.emit('user_joined', user);
        });

        this.socket.on('user_left', (data: { id: string }) => {
          this.emit('user_left', data);
        });

        this.socket.on('building_added', (building: Building) => {
          this.emit('building_added', building);
        });

        this.socket.on('lighting_updated', (data: LightingState & { userId: string }) => {
          this.emit('lighting_updated', data);
        });

        this.socket.on('disconnect', () => {
          this.emit('disconnected', null);
        });

        this.socket.on('connect_error', (err: Error) => {
          this.reconnectAttempts++;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('连接失败：' + err.message));
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public sendUserAction(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      this.messageQueue.push({ event, data });
    }
  }

  public sendAddBuilding(gridX: number, gridZ: number, type: BuildingType): void {
    this.sendUserAction('add_building', { gridX, gridZ, type });
  }

  public sendUpdateLighting(hour: number, color: string): void {
    this.sendUserAction('update_lighting', { hour, color });
  }

  public on<T = any>(event: string, callback: EventCallback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback?: EventCallback): void {
    if (!this.listeners.has(event)) return;
    if (!callback) {
      this.listeners.delete(event);
      return;
    }
    const callbacks = this.listeners.get(event)!;
    const idx = callbacks.indexOf(callback);
    if (idx !== -1) {
      callbacks.splice(idx, 1);
    }
  }

  private emit<T = any>(event: string, data: T): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((cb) => cb(data));
    }
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()!;
      this.socket?.emit(msg.event, msg.data);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.messageQueue = [];
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getSocketId(): string | null {
    return this.socket?.id || null;
  }
}
