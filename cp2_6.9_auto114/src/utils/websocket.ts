export type WSMessageType =
  | 'init'
  | 'node-add'
  | 'node-update'
  | 'node-delete'
  | 'edge-add'
  | 'edge-update'
  | 'edge-delete'
  | 'cursor'
  | 'clear'
  | 'user-join'
  | 'user-leave'
  | 'user-update';

export interface WSMessage {
  type: WSMessageType;
  payload: any;
  clientId?: string;
}

export interface UserInfo {
  id: string;
  name: string;
  color: string;
}

export interface InitPayload {
  diagram: { nodes: any[]; edges: any[] };
  clientId: string;
  name: string;
  color: string;
  users: UserInfo[];
}

type MessageHandler = (msg: WSMessage) => void;

const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export class WebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private shouldReconnect = true;
  private reconnectTimer: any = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    this.shouldReconnect = true;
    this.attemptConnect();
  }

  private attemptConnect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          this.handlers.forEach(h => h(msg));
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        if (this.shouldReconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          console.log(`[WS] Reconnecting (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          this.reconnectTimer = setTimeout(() => this.attemptConnect(), RECONNECT_INTERVAL);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[WS] Error:', err);
      };
    } catch (e) {
      console.error('[WS] Connection failed:', e);
    }
  }

  send(type: WSMessageType, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }
}
