import { createGame, Game } from './Game';
import { createPlayerManager, PlayerManager, ChatMessage, PlayerInfo } from './PlayerManager';
import { Direction } from './Snake';
import './style.css';

let game: Game;
let playerManager: PlayerManager;
let currentDirection: Direction = Direction.RIGHT;

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

let stars: Star[] = [];

function initStars(): void {
  const starsBg = document.getElementById('starsBg');
  if (!starsBg) return;
  
  const starCount = 80;
  stars = [];
  
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.02 + 0.005,
      opacity: Math.random() * 0.5 + 0.2
    });
  }
  
  animateStars();
}

function animateStars(): void {
  const starsBg = document.getElementById('starsBg');
  if (!starsBg) return;
  
  starsBg.innerHTML = '';
  
  for (const star of stars) {
    star.y += star.speed;
    if (star.y > 100) {
      star.y = 0;
      star.x = Math.random() * 100;
    }
    
    const starEl = document.createElement('div');
    starEl.className = 'star';
    starEl.style.left = `${star.x}%`;
    starEl.style.top = `${star.y}%`;
    starEl.style.width = `${star.size}px`;
    starEl.style.height = `${star.size}px`;
    starEl.style.opacity = star.opacity.toString();
    
    starsBg.appendChild(starEl);
  }
  
  requestAnimationFrame(animateStars);
}

function init(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const minimapCanvas = document.getElementById('minimapCanvas') as HTMLCanvasElement;
  
  if (!canvas || !minimapCanvas) {
    console.error('Canvas elements not found');
    return;
  }
  
  game = createGame(canvas, minimapCanvas);
  playerManager = createPlayerManager(game);
  
  setupEventListeners();
  setupUIHandlers();
  initStars();
}

function setupEventListeners(): void {
  document.addEventListener('keydown', handleKeyDown);
  
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', handleStartGame);
  }
  
  const nicknameInput = document.getElementById('nicknameInput') as HTMLInputElement;
  if (nicknameInput) {
    nicknameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleStartGame();
      }
    });
  }
  
  const chatInput = document.getElementById('chatInput') as HTMLInputElement;
  const chatSendBtn = document.getElementById('chatSendBtn');
  
  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', sendChatMessage);
  }
  
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendChatMessage();
      }
    });
  }
  
  const emojis = document.querySelectorAll('.emoji');
  emojis.forEach((emoji) => {
    emoji.addEventListener('click', () => {
      const chatInput = document.getElementById('chatInput') as HTMLInputElement;
      if (chatInput && emoji.textContent) {
        chatInput.value += emoji.textContent;
        chatInput.focus();
      }
    });
  });
}

function setupUIHandlers(): void {
  playerManager.setOnPlayerListUpdate((players: PlayerInfo[]) => {
    renderPlayerList(players);
  });
  
  playerManager.setOnChatUpdate((messages: ChatMessage[]) => {
    renderChatMessages(messages);
  });
  
  playerManager.setOnDeath((playerName: string) => {
    console.log(`${playerName} died!`);
  });
}

function handleStartGame(): void {
  const nicknameInput = document.getElementById('nicknameInput') as HTMLInputElement;
  const nickname = nicknameInput?.value?.trim() || 'Player';
  
  if (!nickname) {
    alert('请输入昵称！');
    return;
  }
  
  playerManager.connect(nickname)
    .then(() => {
      const loginOverlay = document.getElementById('loginOverlay');
      if (loginOverlay) {
        loginOverlay.style.display = 'none';
      }
      
      game.start();
    })
    .catch((error) => {
      console.error('Failed to connect:', error);
      alert('连接服务器失败，请稍后重试。');
    });
}

function handleKeyDown(e: KeyboardEvent): void {
  if (!playerManager.getPlayerId()) return;
  
  let newDirection: Direction | null = null;
  
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      newDirection = Direction.UP;
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      newDirection = Direction.DOWN;
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      newDirection = Direction.LEFT;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      newDirection = Direction.RIGHT;
      break;
  }
  
  if (newDirection) {
    e.preventDefault();
    
    if (canChangeDirection(newDirection)) {
      currentDirection = newDirection;
      playerManager.sendMove(newDirection);
    }
  }
}

function canChangeDirection(newDirection: Direction): boolean {
  const opposites: Record<Direction, Direction> = {
    [Direction.UP]: Direction.DOWN,
    [Direction.DOWN]: Direction.UP,
    [Direction.LEFT]: Direction.RIGHT,
    [Direction.RIGHT]: Direction.LEFT
  };
  
  return opposites[currentDirection] !== newDirection;
}

function sendChatMessage(): void {
  const chatInput = document.getElementById('chatInput') as HTMLInputElement;
  if (!chatInput) return;
  
  const message = chatInput.value.trim();
  if (!message) return;
  
  playerManager.sendChat(message);
  chatInput.value = '';
  chatInput.focus();
}

function renderPlayerList(players: PlayerInfo[]): void {
  const playerListEl = document.getElementById('playerList');
  if (!playerListEl) return;
  
  const playerId = playerManager.getPlayerId();
  
  playerListEl.innerHTML = '';
  
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const isSelf = player.id === playerId;
    
    const playerItem = document.createElement('div');
    playerItem.className = `player-item ${isSelf ? 'self' : ''}`;
    
    const rankEl = document.createElement('span');
    rankEl.className = 'player-rank';
    rankEl.textContent = `${i + 1}`;
    
    const avatarEl = document.createElement('span');
    avatarEl.className = 'player-avatar';
    avatarEl.textContent = player.emoji;
    avatarEl.style.backgroundColor = player.color + '30';
    
    const nameEl = document.createElement('span');
    nameEl.className = 'player-name';
    nameEl.textContent = player.name;
    
    const scoreEl = document.createElement('span');
    scoreEl.className = 'player-score';
    scoreEl.textContent = player.score.toString();
    
    playerItem.appendChild(rankEl);
    playerItem.appendChild(avatarEl);
    playerItem.appendChild(nameEl);
    playerItem.appendChild(scoreEl);
    
    playerListEl.appendChild(playerItem);
  }
}

function renderChatMessages(messages: ChatMessage[]): void {
  const chatMessagesEl = document.getElementById('chatMessages');
  if (!chatMessagesEl) return;
  
  chatMessagesEl.innerHTML = '';
  
  for (const msg of messages) {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${msg.isOwn ? 'own' : ''}`;
    
    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'chat-bubble';
    
    if (!msg.isOwn) {
      const nameEl = document.createElement('div');
      nameEl.className = 'chat-sender';
      nameEl.textContent = msg.playerName;
      bubbleEl.appendChild(nameEl);
    }
    
    const textEl = document.createElement('div');
    textEl.className = 'chat-text';
    textEl.textContent = msg.message;
    bubbleEl.appendChild(textEl);
    
    msgEl.appendChild(bubbleEl);
    chatMessagesEl.appendChild(msgEl);
  }
  
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
