import { Game, Food } from './Game';
import { SnakeData, Direction } from './Snake';

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  isOwn?: boolean;
}

export interface PlayerInfo {
  id: string;
  name: string;
  score: number;
  color: string;
  emoji: string;
  alive: boolean;
}

type MessageHandler = (data: any) => void;

export class PlayerManager {
  private game: Game;
  private ws: WebSocket | null;
  private playerId: string | null;
  private playerName: string | null;
  private playerColor: string | null;
  private playerEmoji: string | null;
  
  private localSnake: SnakeData | null;
  private remoteSnakes: Map<string, SnakeData>;
  
  private chatMessages: ChatMessage[];
  private onChatUpdate: ((messages: ChatMessage[]) => void) | null;
  private onPlayerListUpdate: ((players: PlayerInfo[]) => void) | null;
  private onJoined: ((playerId: string) => void) | null;
  private onDeath: ((playerName: string) => void) | null;
  
  private messageHandlers: Map<string, MessageHandler>;
  
  private lastMoveDirection: Direction | null;

  constructor(game: Game) {
    this.game = game;
    this.ws = null;
    this.playerId = null;
    this.playerName = null;
    this.playerColor = null;
    this.playerEmoji = null;
    
    this.localSnake = null;
    this.remoteSnakes = new Map();
    
    this.chatMessages = [];
    this.onChatUpdate = null;
    this.onPlayerListUpdate = null;
    this.onJoined = null;
    this.onDeath = null;
    
    this.messageHandlers = new Map();
    this.lastMoveDirection = null;
    
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    this.messageHandlers.set('joined', this.handleJoined.bind(this));
    this.messageHandlers.set('gameState', this.handleGameState.bind(this));
    this.messageHandlers.set('playerJoined', this.handlePlayerJoined.bind(this));
    this.messageHandlers.set('playerLeft', this.handlePlayerLeft.bind(this));
    this.messageHandlers.set('chat', this.handleChat.bind(this));
    this.messageHandlers.set('death', this.handleDeath.bind(this));
  }

  public connect(nickname: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api`;
      
      this.ws = new WebSocket(wsUrl);
      this.playerName = nickname.substring(0, 8);
      
      this.ws.onopen = () => {
        this.sendJoin(nickname);
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
          
          if (data.type === 'joined' && this.playerId) {
            resolve(this.playerId);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
      };
    });
  }

  private sendJoin(nickname: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'join',
        name: nickname
      }));
    }
  }

  public sendMove(direction: Direction): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.playerId) return;
    
    if (this.lastMoveDirection === direction) return;
    this.lastMoveDirection = direction;
    
    this.ws.send(JSON.stringify({
      type: 'move',
      direction
    }));
  }

  public sendChat(message: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!message.trim()) return;
    
    this.ws.send(JSON.stringify({
      type: 'chat',
      message: message.substring(0, 50)
    }));
  }

  private handleMessage(data: any): void {
    const handler = this.messageHandlers.get(data.type);
    if (handler) {
      handler(data);
    }
  }

  private handleJoined(data: any): void {
    this.playerId = data.playerId;
    this.playerColor = data.color;
    this.playerEmoji = data.emoji;
    
    this.game.setPlayerSnakeId(data.playerId);
    
    const snakeData: SnakeData = {
      id: data.playerId,
      name: data.name,
      body: data.body,
      direction: Direction.RIGHT,
      color: data.color,
      emoji: data.emoji,
      alive: true,
      score: 0
    };
    
    this.localSnake = snakeData;
    this.game.addSnake(snakeData);
    
    if (this.onJoined) {
      this.onJoined(data.playerId);
    }
  }

  private handleGameState(data: any): void {
    const snakes: SnakeData[] = data.snakes;
    const foods: Food[] = data.foods;
    
    const snakeIds = new Set<string>();
    
    for (const snakeData of snakes) {
      snakeIds.add(snakeData.id);
      
      if (snakeData.id === this.playerId) {
        this.localSnake = snakeData;
      } else {
        this.remoteSnakes.set(snakeData.id, snakeData);
      }
      
      this.game.updateSnake(snakeData);
    }
    
    for (const [id] of this.remoteSnakes) {
      if (!snakeIds.has(id)) {
        this.remoteSnakes.delete(id);
        this.game.removeSnake(id);
      }
    }
    
    this.game.setFoods(foods);
    
    this.updatePlayerList();
  }

  private handlePlayerJoined(data: any): void {
    if (data.playerId === this.playerId) return;
    
    console.log(`Player joined: ${data.name}`);
  }

  private handlePlayerLeft(data: any): void {
    this.remoteSnakes.delete(data.playerId);
    this.game.removeSnake(data.playerId);
    this.updatePlayerList();
  }

  private handleChat(data: any): void {
    const message: ChatMessage = {
      playerId: data.playerId,
      playerName: data.playerName,
      message: data.message,
      timestamp: data.timestamp,
      isOwn: data.playerId === this.playerId
    };
    
    this.chatMessages.push(message);
    
    if (this.chatMessages.length > 50) {
      this.chatMessages.shift();
    }
    
    if (this.onChatUpdate) {
      this.onChatUpdate([...this.chatMessages]);
    }
  }

  private handleDeath(data: any): void {
    if (this.onDeath && data.playerName) {
      this.onDeath(data.playerName);
    }
  }

  private updatePlayerList(): void {
    if (!this.onPlayerListUpdate) return;
    
    const players: PlayerInfo[] = [];
    
    if (this.localSnake) {
      players.push({
        id: this.localSnake.id,
        name: this.localSnake.name,
        score: this.localSnake.score,
        color: this.localSnake.color,
        emoji: this.localSnake.emoji,
        alive: this.localSnake.alive
      });
    }
    
    for (const snake of this.remoteSnakes.values()) {
      players.push({
        id: snake.id,
        name: snake.name,
        score: snake.score,
        color: snake.color,
        emoji: snake.emoji,
        alive: snake.alive
      });
    }
    
    players.sort((a, b) => b.score - a.score);
    
    this.onPlayerListUpdate(players);
  }

  public setOnChatUpdate(callback: (messages: ChatMessage[]) => void): void {
    this.onChatUpdate = callback;
  }

  public setOnPlayerListUpdate(callback: (players: PlayerInfo[]) => void): void {
    this.onPlayerListUpdate = callback;
  }

  public setOnJoined(callback: (playerId: string) => void): void {
    this.onJoined = callback;
  }

  public setOnDeath(callback: (playerName: string) => void): void {
    this.onDeath = callback;
  }

  public getPlayerId(): string | null {
    return this.playerId;
  }

  public getPlayerName(): string | null {
    return this.playerName;
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public getChatMessages(): ChatMessage[] {
    return [...this.chatMessages];
  }
}

let playerManagerInstance: PlayerManager | null = null;

export function createPlayerManager(game: Game): PlayerManager {
  playerManagerInstance = new PlayerManager(game);
  return playerManagerInstance;
}

export function getPlayerManager(): PlayerManager | null {
  return playerManagerInstance;
}
