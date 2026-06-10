import { useState, useEffect, useRef, useCallback } from 'react';

export interface User {
  id: string;
  name: string;
  color: string;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
}

export interface Step {
  id: string;
  order: number;
  content: string;
}

export interface RecipeDocument {
  ingredients: Ingredient[];
  steps: Step[];
}

export interface VersionRecord {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  timestamp: number;
  summary: string;
  snapshot: RecipeDocument;
}

export type WSMessage =
  | { type: 'init'; clientId: string; user: User; document: RecipeDocument; history: VersionRecord[]; onlineCount: number }
  | { type: 'online_count'; count: number }
  | { type: 'user_joined'; user: User; onlineCount: number }
  | { type: 'user_left'; user: User; onlineCount: number }
  | { type: 'ingredient_update'; id: string; changes: Partial<Ingredient>; updatedBy?: string }
  | { type: 'ingredient_add'; ingredient: Ingredient; updatedBy?: string }
  | { type: 'ingredient_delete'; id: string; updatedBy?: string }
  | { type: 'step_update'; id: string; changes: Partial<Step>; updatedBy?: string }
  | { type: 'step_add'; step: Step; updatedBy?: string }
  | { type: 'step_delete'; id: string; updatedBy?: string }
  | { type: 'step_reorder'; fromIndex: number; toIndex: number; updatedBy?: string }
  | { type: 'rollback'; document: RecipeDocument; version: VersionRecord; updatedBy?: string };

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [document, setDocument] = useState<RecipeDocument | null>(null);
  const [history, setHistory] = useState<VersionRecord[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<{ type: string; id?: string; updatedBy?: string } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(1000);
  const shouldReconnectRef = useRef(true);

  const send = useCallback((message: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectDelayRef.current = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          switch (msg.type) {
            case 'init':
              setCurrentUser(msg.user);
              setDocument(msg.document);
              setHistory(msg.history);
              setOnlineCount(msg.onlineCount);
              break;
            case 'online_count':
              setOnlineCount(msg.count);
              break;
            case 'user_joined':
              setOnlineCount(msg.onlineCount);
              setLastUpdate({ type: 'user_joined' });
              setTimeout(() => setLastUpdate(null), 600);
              break;
            case 'user_left':
              setOnlineCount(msg.onlineCount);
              break;
            case 'ingredient_update':
              setDocument(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  ingredients: prev.ingredients.map(ing =>
                    ing.id === msg.id ? { ...ing, ...msg.changes } : ing
                  )
                };
              });
              setLastUpdate({ type: 'ingredient_update', id: msg.id, updatedBy: msg.updatedBy });
              setTimeout(() => setLastUpdate(null), 800);
              break;
            case 'ingredient_add':
              setDocument(prev => prev ? { ...prev, ingredients: [...prev.ingredients, msg.ingredient] } : prev);
              setLastUpdate({ type: 'ingredient_add', id: msg.ingredient.id, updatedBy: msg.updatedBy });
              setTimeout(() => setLastUpdate(null), 800);
              break;
            case 'ingredient_delete':
              setDocument(prev => prev ? { ...prev, ingredients: prev.ingredients.filter(i => i.id !== msg.id) } : prev);
              break;
            case 'step_update':
              setDocument(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  steps: prev.steps.map(st =>
                    st.id === msg.id ? { ...st, ...msg.changes } : st
                  )
                };
              });
              setLastUpdate({ type: 'step_update', id: msg.id, updatedBy: msg.updatedBy });
              setTimeout(() => setLastUpdate(null), 800);
              break;
            case 'step_add':
              setDocument(prev => prev ? { ...prev, steps: [...prev.steps, msg.step] } : prev);
              setLastUpdate({ type: 'step_add', id: msg.step.id, updatedBy: msg.updatedBy });
              setTimeout(() => setLastUpdate(null), 800);
              break;
            case 'step_delete':
              setDocument(prev => {
                if (!prev) return prev;
                const newSteps = prev.steps.filter(s => s.id !== msg.id).map((s, i) => ({ ...s, order: i + 1 }));
                return { ...prev, steps: newSteps };
              });
              break;
            case 'step_reorder':
              setDocument(prev => {
                if (!prev) return prev;
                const newSteps = [...prev.steps];
                const [removed] = newSteps.splice(msg.fromIndex, 1);
                newSteps.splice(msg.toIndex, 0, removed);
                return { ...prev, steps: newSteps.map((s, i) => ({ ...s, order: i + 1 })) };
              });
              break;
            case 'rollback':
              setDocument(msg.document);
              setHistory(h => {
                const exists = h.find(v => v.id === msg.version.id);
                if (exists) return h;
                return [msg.version, ...h];
              });
              setLastUpdate({ type: 'rollback' });
              setTimeout(() => setLastUpdate(null), 800);
              break;
          }
        } catch (e) {
          console.error('WS message error:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (shouldReconnectRef.current) {
          setTimeout(connect, reconnectDelayRef.current);
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { isConnected, currentUser, document, history, onlineCount, lastUpdate, send };
}
