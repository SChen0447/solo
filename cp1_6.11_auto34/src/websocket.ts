import type { Action, RemoteUser } from './types';
import { getUserColor } from './themes';

type MessageHandler = (action: Action) => void;

let ws: WebSocket | null = null;
let onMessageHandler: MessageHandler | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

const WS_URL = 'ws://localhost:8080';

export function connect(onMessage: MessageHandler, onConnected?: () => void, onDisconnected?: () => void): void {
  onMessageHandler = onMessage;

  function doConnect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      onConnected?.();
      heartbeatInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'PONG') return;
        if (data.type === 'CURSOR_MOVE') {
          const user: RemoteUser = {
            id: data.payload.userId,
            color: getUserColor(data.payload.userId),
            name: data.payload.userId.slice(0, 6),
            cursorX: data.payload.x,
            cursorY: data.payload.y,
            editingNodeId: data.payload.editingNodeId || null,
          };
          onMessageHandler?.({ type: 'UPDATE_REMOTE_USER', payload: { user } });
          return;
        }
        if (data.type === 'USER_LEFT') {
          onMessageHandler?.({ type: 'REMOVE_REMOTE_USER', payload: { userId: data.payload.userId } });
          return;
        }
        onMessageHandler?.(data as Action);
      } catch (e) {
        console.error('Failed to parse WebSocket message', e);
      }
    };

    ws.onclose = () => {
      onDisconnected?.();
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      reconnectTimeout = setTimeout(doConnect, 3000);
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  doConnect();
}

export function sendAction(action: Action): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(action));
  }
}

export function sendCursorMove(userId: string, x: number, y: number, editingNodeId?: string | null): void {
  sendAction({
    type: 'CURSOR_MOVE' as any,
    payload: { userId, x, y, editingNodeId: editingNodeId || null },
  } as any);
}

export function disconnect(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}
