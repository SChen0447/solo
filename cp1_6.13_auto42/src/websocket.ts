export interface SyncMessage {
  type: 'paramUpdate' | 'fullSync' | 'joinRoom' | 'createRoom' | 'roomJoined';
  trackIndex?: number;
  effectIndex?: number;
  paramName?: string;
  value?: number | string | boolean;
  roomCode?: string;
  state?: unknown;
}

type MessageHandler = (msg: SyncMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handler: MessageHandler | null = null;
  private roomCode: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  connect(roomCode?: string) {
    if (roomCode) {
      this.roomCode = roomCode;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      if (this.roomCode) {
        this.send({ type: 'joinRoom', roomCode: this.roomCode });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: SyncMessage = JSON.parse(event.data);
        if (this.handler) {
          this.handler(msg);
        }
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  send(msg: SyncMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  onMessage(handler: MessageHandler) {
    this.handler = handler;
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.roomCode = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WebSocketClient();
