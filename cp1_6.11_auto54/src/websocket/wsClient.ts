import type { Card, Connection, WSMessage, WSMessageType, ConflictMessageData } from '../types';
import { useStore } from '../store/useStore';

class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private positionUpdateQueue: Map<string, { x: number; y: number; timestamp: number }> = new Map();
  private lastPositionSendTime = 0;
  private positionSendInterval = 16;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.tryReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (e) {
      console.error('Failed to connect WebSocket:', e);
      this.tryReconnect();
    }
  }

  private tryReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting attempt ${this.reconnectAttempts}...`);
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private handleMessage(message: WSMessage) {
    const { type, data, senderId } = message;
    const state = useStore.getState();

    switch (type) {
      case 'state:init': {
        const { cards, connections, users, currentUserId } = data as {
          cards: Card[];
          connections: Connection[];
          users: any[];
          currentUserId: string;
        };
        state.setCards(cards);
        state.setConnections(connections);
        state.setUsers(users.filter((u) => u.id !== currentUserId));
        state.setCurrentUserId(currentUserId);
        break;
      }

      case 'card:create': {
        const card = data as Card;
        if (!state.cards.some((c) => c.id === card.id)) {
          state.addCard(card);
        }
        break;
      }

      case 'card:position': {
        const { id, x, y } = data as { id: string; x: number; y: number };
        state.updateCardPosition(id, x, y);
        break;
      }

      case 'card:update': {
        if (Array.isArray(data)) {
          state.setCards(data);
        } else {
          const { id, content } = data as { id: string; content: string };
          state.updateCard(id, { content, editingBy: undefined });
        }
        break;
      }

      case 'card:delete': {
        const { id } = data as { id: string };
        state.deleteCard(id);
        break;
      }

      case 'card:edit-start': {
        const conflictData = data as ConflictMessageData;
        if (conflictData.conflict) {
          state.showConflict(conflictData);
        } else {
          const { cardId, userId } = data as { cardId: string; userId: string };
          if (userId !== state.currentUserId) {
            state.setCardEditingBy(cardId, userId);
          }
        }
        break;
      }

      case 'card:edit-end': {
        const { cardId } = data as { cardId: string };
        state.setCardEditingBy(cardId, undefined);
        break;
      }

      case 'connection:create': {
        const connection = data as Connection;
        if (!state.connections.some((c) => c.id === connection.id)) {
          state.addConnection(connection);
        }
        break;
      }

      case 'connection:delete': {
        if ('cardId' in data) {
          const { cardId } = data as { cardId: string };
          state.connections
            .filter((c) => c.fromCardId === cardId || c.toCardId === cardId)
            .forEach((c) => state.deleteConnection(c.id));
        } else {
          const { id } = data as { id: string };
          state.deleteConnection(id);
        }
        break;
      }

      case 'user:join': {
        const user = data as any;
        if (user.id !== state.currentUserId) {
          state.addUser(user);
        }
        break;
      }

      case 'user:leave': {
        const { userId } = data as { userId: string };
        state.removeUser(userId);
        break;
      }

      case 'user:cursor': {
        const { userId, x, y } = data as { userId: string; x: number; y: number };
        if (userId !== state.currentUserId) {
          state.updateUserCursor(userId, x, y);
        }
        break;
      }
    }
  }

  send<T>(type: WSMessageType, data: T) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WSMessage<T> = {
        type,
        senderId: useStore.getState().currentUserId || '',
        timestamp: Date.now(),
        data,
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  sendPositionUpdate(cardId: string, x: number, y: number) {
    this.positionUpdateQueue.set(cardId, { x, y, timestamp: Date.now() });
    this.flushPositionUpdates();
  }

  private flushPositionUpdates() {
    const now = Date.now();
    if (now - this.lastPositionSendTime < this.positionSendInterval) {
      requestAnimationFrame(() => this.flushPositionUpdates());
      return;
    }

    this.positionUpdateQueue.forEach(({ x, y }, cardId) => {
      this.send('card:position', { id: cardId, x, y });
    });
    this.positionUpdateQueue.clear();
    this.lastPositionSendTime = now;
  }

  createCard(card: Card) {
    this.send('card:create', card);
  }

  updateCardContent(id: string, content: string) {
    this.send('card:update', { id, content });
  }

  deleteCard(id: string) {
    this.send('card:delete', { id });
  }

  startEditing(cardId: string) {
    this.send('card:edit-start', { cardId });
  }

  endEditing(cardId: string) {
    this.send('card:edit-end', { cardId });
  }

  createConnection(connection: Connection) {
    this.send('connection:create', connection);
  }

  deleteConnection(id: string) {
    this.send('connection:delete', { id });
  }

  updateCursor(x: number, y: number) {
    this.send('user:cursor', { x, y });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const wsClient = new WSClient('ws://localhost:8080');
