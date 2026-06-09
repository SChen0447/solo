import { useCallback, useEffect, useRef, useState } from 'react';
import type { WsMessage } from '../types';

interface UseWebSocketOptions {
  roomId: string;
  userId: string;
  onMessage?: (msg: WsMessage) => void;
}

interface UseWebSocketReturn {
  send: (msg: WsMessage) => void;
  connected: boolean;
  userId: string;
}

export function useWebSocket({
  roomId,
  userId: initialUserId,
  onMessage,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState(initialUserId);
  const heartbeatRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const reconnectCount = useRef(0);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectCount.current = 0;
      ws.send(
        JSON.stringify({
          type: 'hello',
          userId: initialUserId,
          roomId,
        })
      );
      heartbeatRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage;
        if (msg.type === 'hello') {
          const hello = msg as { type: 'hello'; userId: string };
          setUserId(hello.userId);
        }
        onMessageRef.current?.(msg);
      } catch (e) {
        console.error('Parse message error:', e);
      }
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      const delay = Math.min(1000 * Math.pow(2, reconnectCount.current), 10000);
      reconnectCount.current += 1;
      reconnectRef.current = window.setTimeout(() => {
        connect();
      }, delay);
    };
  }, [roomId, initialUserId]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
    };
  }, [connect]);

  const send = useCallback((msg: WsMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  return { send, connected, userId };
}
