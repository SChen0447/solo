const WebSocket = require('ws');
const http = require('http');

const PORT = 4000;
const GRID_SIZE = 20;
const ARENA_WIDTH = 600;
const ARENA_HEIGHT = 600;
const CELL_SIZE = 20;
const MAX_FOOD = 5;
const RESPAWN_DELAY = 5000;
const BROADCAST_INTERVAL = 50;
const MOVE_INTERVAL = 100;

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
];

const EMOJIS = ['🐍', '🦊', '🐸', '🐙', '🦄', '🐲', '🦅', '🐺', '🐯', '🦁'];

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let players = new Map();
let foods = [];
let gameState = {
  snakes: [],
  foods: [],
  scores: {},
  chatMessages: []
};

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function getRandomEmoji() {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

function getRandomPosition() {
  const x = Math.floor(Math.random() * (ARENA_WIDTH / CELL_SIZE)) * CELL_SIZE;
  const y = Math.floor(Math.random() * (ARENA_HEIGHT / CELL_SIZE)) * CELL_SIZE;
  return { x, y };
}

function generateFood() {
  if (foods.length >= MAX_FOOD) return;
  
  let newFood;
  let attempts = 0;
  const maxAttempts = 100;
  
  do {
    const pos = getRandomPosition();
    const isWarm = Math.random() > 0.5;
    let color;
    if (isWarm) {
      const warmColors = ['#FF6B6B', '#FFA500', '#FFD700', '#FF4500', '#FF8C00'];
      color = warmColors[Math.floor(Math.random() * warmColors.length)];
    } else {
      const coolColors = ['#4ECDC4', '#4169E1', '#9370DB', '#00CED1', '#8A2BE2'];
      color = coolColors[Math.floor(Math.random() * coolColors.length)];
    }
    newFood = { ...pos, color, id: Math.random().toString(36).substr(2, 9) };
    attempts++;
  } while (isPositionOccupied(newFood) && attempts < maxAttempts);
  
  if (attempts < maxAttempts) {
    foods.push(newFood);
  }
}

function isPositionOccupied(pos) {
  for (const food of foods) {
    if (food.x === pos.x && food.y === pos.y) return true;
  }
  for (const player of players.values()) {
    if (!player.alive) continue;
    for (const segment of player.body) {
      if (segment.x === pos.x && segment.y === pos.y) return true;
    }
  }
  return false;
}

function createSnake(playerId) {
  let startPos;
  let attempts = 0;
  do {
    startPos = getRandomPosition();
    attempts++;
  } while (isPositionOccupied(startPos) && attempts < 50);
  
  const body = [
    { x: startPos.x, y: startPos.y },
    { x: startPos.x - CELL_SIZE, y: startPos.y },
    { x: startPos.x - CELL_SIZE * 2, y: startPos.y }
  ];
  
  return {
    body,
    direction: 'right',
    nextDirection: 'right',
    color: getRandomColor(),
    emoji: getRandomEmoji(),
    alive: true,
    score: 0
  };
}

function checkCollision(head, body, excludeHead = false) {
  const startIndex = excludeHead ? 1 : 0;
  for (let i = startIndex; i < body.length; i++) {
    if (head.x === body[i].x && head.y === body[i].y) {
      return true;
    }
  }
  return false;
}

function checkWallCollision(head) {
  return head.x < 0 || head.x >= ARENA_WIDTH || head.y < 0 || head.y >= ARENA_HEIGHT;
}

function moveSnake(player) {
  if (!player.alive) return;
  
  player.direction = player.nextDirection;
  
  const head = { ...player.body[0] };
  
  switch (player.direction) {
    case 'up':
      head.y -= CELL_SIZE;
      break;
    case 'down':
      head.y += CELL_SIZE;
      break;
    case 'left':
      head.x -= CELL_SIZE;
      break;
    case 'right':
      head.x += CELL_SIZE;
      break;
  }
  
  if (checkWallCollision(head)) {
    killPlayer(player);
    return;
  }
  
  if (checkCollision(head, player.body, true)) {
    killPlayer(player);
    return;
  }
  
  for (const [otherId, otherPlayer] of players) {
    if (otherId === player.id || !otherPlayer.alive) continue;
    if (checkCollision(head, otherPlayer.body)) {
      killPlayer(player);
      for (const [id, p] of players) {
        if (p.alive) {
          p.score += 1;
        }
      }
      return;
    }
  }
  
  player.body.unshift(head);
  
  let ateFood = false;
  for (let i = foods.length - 1; i >= 0; i--) {
    if (foods[i].x === head.x && foods[i].y === head.y) {
      foods.splice(i, 1);
      player.score += 1;
      ateFood = true;
      break;
    }
  }
  
  if (!ateFood) {
    player.body.pop();
  }
}

function killPlayer(player) {
  player.alive = false;
  
  broadcast(JSON.stringify({
    type: 'death',
    playerId: player.id,
    playerName: player.name
  }));
  
  setTimeout(() => {
    respawnPlayer(player);
  }, RESPAWN_DELAY);
}

function respawnPlayer(player) {
  const newSnake = createSnake(player.id);
  player.body = newSnake.body;
  player.direction = newSnake.direction;
  player.nextDirection = newSnake.nextDirection;
  player.color = newSnake.color;
  player.alive = true;
}

function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function getGameState() {
  const snakes = [];
  const scores = {};
  
  for (const player of players.values()) {
    snakes.push({
      id: player.id,
      name: player.name,
      body: player.body,
      direction: player.direction,
      color: player.color,
      emoji: player.emoji,
      alive: player.alive,
      score: player.score
    });
    scores[player.id] = player.score;
  }
  
  return {
    type: 'gameState',
    snakes,
    foods: [...foods],
    scores,
    timestamp: Date.now()
  };
}

wss.on('connection', (ws) => {
  let playerId = Math.random().toString(36).substr(2, 9);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'join':
          const name = (data.name || 'Player').substring(0, 8);
          const snake = createSnake(playerId);
          
          const player = {
            id: playerId,
            name,
            ws,
            ...snake
          };
          
          players.set(playerId, player);
          
          ws.send(JSON.stringify({
            type: 'joined',
            playerId,
            name,
            color: player.color,
            emoji: player.emoji,
            body: player.body
          }));
          
          broadcast(JSON.stringify({
            type: 'playerJoined',
            playerId,
            name,
            color: player.color,
            emoji: player.emoji
          }));
          break;
          
        case 'move':
          const playerData = players.get(playerId);
          if (playerData && playerData.alive) {
            const currentDir = playerData.direction;
            const newDir = data.direction;
            
            if (
              (currentDir === 'up' && newDir !== 'down') ||
              (currentDir === 'down' && newDir !== 'up') ||
              (currentDir === 'left' && newDir !== 'right') ||
              (currentDir === 'right' && newDir !== 'left')
            ) {
              playerData.nextDirection = newDir;
            }
          }
          break;
          
        case 'chat':
          const chatPlayer = players.get(playerId);
          if (chatPlayer) {
            const chatMsg = {
              type: 'chat',
              playerId,
              playerName: chatPlayer.name,
              message: data.message.substring(0, 50),
              timestamp: Date.now()
            };
            broadcast(JSON.stringify(chatMsg));
          }
          break;
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  });
  
  ws.on('close', () => {
    players.delete(playerId);
    broadcast(JSON.stringify({
      type: 'playerLeft',
      playerId
    }));
  });
});

setInterval(() => {
  for (const player of players.values()) {
    moveSnake(player);
  }
  
  while (foods.length < MAX_FOOD) {
    generateFood();
  }
}, MOVE_INTERVAL);

setInterval(() => {
  const state = getGameState();
  broadcast(JSON.stringify(state));
}, BROADCAST_INTERVAL);

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
