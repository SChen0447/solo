import type { Tool, DrawOp } from './canvas';

export interface UserInfo {
  id: string;
  name: string;
  color: string;
  strokeWidth: number;
  tool: string;
}

export interface ChatMsg {
  type: 'chat';
  id: string;
  userId: string;
  userName: string;
  color: string;
  text: string;
  timestamp: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface NetworkCallbacks {
  onWelcome: (userId: string, color: string, users: UserInfo[]) => void;
  onUserJoined: (user: UserInfo) => void;
  onUserLeft: (userId: string) => void;
  onUserList: (users: UserInfo[]) => void;
  onToolChanged: (userId: string, tool: string, strokeWidth: number) => void;
  onHistory: (operations: (DrawOp | ChatMsg)[]) => void;
  onDraw: (op: DrawOp) => void;
  onChat: (msg: ChatMsg) => void;
  onStatusChange: (status: ConnectionStatus) => void;
}

export class NetworkClient {
  private ws: WebSocket | null = null;
  private roomId: string;
  private userId: string;
  private userName: string;
  private callbacks: NetworkCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: number | null = null;
  private status: ConnectionStatus = 'disconnected';

  constructor(roomId: string, userId: string, userName: string, callbacks: NetworkCallbacks) {
    this.roomId = roomId;
    this.userId = userId;
    this.userName = userName;
    this.callbacks = callbacks;
  }

  connect(): void {
    this.setStatus('connecting');

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/ws?roomId=${this.roomId}`;

    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.send({
        type: 'join',
        userId: this.userId,
        userName: this.userName
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    this.ws.onerror = (e) => {
      console.error('WebSocket error:', e);
    };

    this.ws.onclose = () => {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    };
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'welcome':
        this.callbacks.onWelcome(message.userId, message.color, message.users);
        break;
      case 'userJoined':
        this.callbacks.onUserJoined(message.user);
        break;
      case 'userLeft':
        this.callbacks.onUserLeft(message.userId);
        break;
      case 'userList':
        this.callbacks.onUserList(message.users);
        break;
      case 'toolChanged':
        this.callbacks.onToolChanged(message.userId, message.tool, message.strokeWidth);
        break;
      case 'history':
        this.callbacks.onHistory(message.operations);
        break;
      case 'draw':
        this.callbacks.onDraw(message as DrawOp);
        break;
      case 'chat':
        this.callbacks.onChat(message as ChatMsg);
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.callbacks.onStatusChange(status);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  sendDraw(op: DrawOp): void {
    this.send(op);
  }

  sendChat(text: string): void {
    this.send({
      type: 'chat',
      text
    });
  }

  sendToolChange(tool: Tool, strokeWidth: number): void {
    this.send({
      type: 'toolChange',
      tool,
      strokeWidth
    });
  }

  requestHistory(): void {
    this.send({ type: 'requestHistory' });
  }

  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.send({ type: 'leave', userId: this.userId });
      this.ws.close();
      this.ws = null;
    }
  }
}
