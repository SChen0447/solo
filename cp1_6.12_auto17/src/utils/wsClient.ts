import type { Shape, WSMessage, DrawMessage, UndoMessage, RedoMessage, ClearMessage } from '../types';

type MessageHandler = (message: WSMessage) => void;

const CHANNEL_NAME = 'whiteboard-collab-channel';

export class WSClient {
  private userId: string;
  private channel: BroadcastChannel | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private connected: boolean = false;

  constructor(userId: string) {
    this.userId = userId;
  }

  connect(): Promise<void> {
    return new Promise((resolve) => {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent) => {
          const message = event.data as WSMessage;
          if (message.userId !== this.userId) {
            this.handlers.forEach((handler) => handler(message));
          }
        };
        this.connected = true;
        resolve();
      } catch {
        this.connected = false;
        resolve();
      }
    });
  }

  disconnect(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.connected = false;
    this.handlers.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  sendDraw(shape: Shape): void {
    const message: DrawMessage = {
      type: 'draw',
      userId: this.userId,
      payload: shape
    };
    this.postMessage(message);
  }

  sendUndo(shapeId: string): void {
    const message: UndoMessage = {
      type: 'undo',
      userId: this.userId,
      payload: { shapeId }
    };
    this.postMessage(message);
  }

  sendRedo(shape: Shape): void {
    const message: RedoMessage = {
      type: 'redo',
      userId: this.userId,
      payload: shape
    };
    this.postMessage(message);
  }

  sendClear(): void {
    const message: ClearMessage = {
      type: 'clear',
      userId: this.userId
    };
    this.postMessage(message);
  }

  private postMessage(message: WSMessage): void {
    if (this.channel && this.connected) {
      this.channel.postMessage(message);
    }
  }
}
